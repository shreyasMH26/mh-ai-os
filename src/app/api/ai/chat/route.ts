/**
 * POST /api/ai/chat
 *
 * Streaming AI chat endpoint. Server-side only.
 * Calls the configured AI provider and streams the response back
 * as Server-Sent Events (SSE).
 *
 * Request body:
 *   {
 *     messages: AIMessage[],
 *     provider?: ModelProvider,
 *     model?: string,
 *     conversationId?: string,
 *     systemPrompt?: string,      // custom system prompt override
 *     mode?: ExecutionMode,       // auto | manual | council
 *     workspace?: string,         // e.g. 'xtich' | 'build' | 'college'
 *   }
 *
 * Response:
 *   text/event-stream — chunks of "data: <json>\n\n"
 *   Metadata: data: { type: "meta", provider, model }\n\n
 *   Content:  data: { chunk: "..." }\n\n
 *   End:      data: [DONE]\n\n
 *   Error:    data: { type: "error", message, code }\n\n
 */

import { NextRequest } from 'next/server';
import { getProvider, getDefaultProvider, AIError } from '@/lib/ai/registry';
import type { AIMessage } from '@/lib/ai/types';
import type { ModelProvider } from '@/lib/types/model';
import type { ExecutionMode } from '@/lib/types/task';
import type { MemoryEntry } from '@/stores/memory';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── System prompt builder ────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are MH AI OS — an intelligent personal AI operating system. You help with:
- Software development and technical projects
- Business operations and startup work
- University coursework and research
- Project planning, analysis, and execution

Be direct, precise, and helpful. Format your responses clearly using markdown when appropriate.
Code should always be in proper code blocks with language hints.`;

function buildSystemPrompt(
  customPrompt?: string,
  mode?: ExecutionMode,
  workspace?: string,
  memories?: MemoryEntry[]
): string {
  const parts: string[] = [];

  // ── Persistent user memory ───────────────────────────────────────────────
  // Injected first so it takes priority over generic instructions.
  if (memories && memories.length > 0) {
    const facts = memories.map((m) => `- ${m.fact}`).join('\n');
    parts.push(
      `## Persistent memory about the user\n` +
      `The following facts have been explicitly saved by the user and MUST be referenced ` +
      `when relevant. When the user asks "what do you remember about me?", list these facts ` +
      `exactly. Never say you have no memory of the user when these facts exist.\n\n${facts}`
    );
  }

  // ── Base identity ────────────────────────────────────────────────────────
  parts.push(customPrompt ?? BASE_SYSTEM_PROMPT);

  // ── Workspace context ────────────────────────────────────────────────────
  if (workspace) {
    const workspaceContext: Record<string, string> = {
      xtich: 'Current workspace: XTICH — a premium student apparel brand. Focus on brand identity, e-commerce, marketing, and business strategy.',
      build: 'Current workspace: Build Lab — software development projects. Focus on clean code, architecture, and engineering best practices.',
      college: 'Current workspace: College — university coursework. Focus on academic explanations, problem-solving, and learning outcomes.',
    };
    const ctx = workspaceContext[workspace];
    if (ctx) parts.push(ctx);
  }

  // ── Execution mode ───────────────────────────────────────────────────────
  if (mode && mode !== 'auto') {
    const modeContext: Record<string, string> = {
      manual: 'Execution mode: Manual — the user is directing task assignment. Be explicit about what you are doing and why.',
      council: 'Execution mode: Council — synthesizing multiple perspectives. Present balanced analysis before concluding.',
    };
    const ctx = modeContext[mode];
    if (ctx) parts.push(ctx);
  }

  return parts.join('\n\n');
}

// ─── Request body type ────────────────────────────────────────────────────────

interface ChatRequestBody {
  messages: AIMessage[];
  provider?: ModelProvider;
  model?: string;
  conversationId?: string;
  systemPrompt?: string;
  mode?: ExecutionMode;
  workspace?: string;
  memories?: MemoryEntry[];  // user's persistent memory facts from client store
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;

  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const {
    messages,
    provider: providerKey,
    model,
    systemPrompt,
    mode,
    workspace,
    memories,
  } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response('messages array is required', { status: 400 });
  }

  // ─── Resolve provider ───────────────────────────────────────────────────────
  let provider;
  try {
    provider = providerKey ? getProvider(providerKey) : getDefaultProvider();
  } catch (err) {
    const aiErr = err instanceof AIError ? err : new AIError({
      code: 'PROVIDER_NOT_CONFIGURED',
      message: String(err),
      userMessage: 'No AI provider is configured. Add an API key in Settings → AI Models.',
    });
    return new Response(
      JSON.stringify({ error: aiErr.userMessage, code: aiErr.code }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ─── Build system prompt (with memory injection) ────────────────────────────
  const resolvedSystemPrompt = buildSystemPrompt(systemPrompt, mode, workspace, memories);

  // ─── Set up SSE stream ──────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const abortController = new AbortController();

  req.signal.addEventListener('abort', () => abortController.abort());

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
        } catch {
          // Controller closed
        }
      };

      const sendMeta = (meta: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(meta)}\n\n`));
        } catch {
          // Controller closed
        }
      };

      // Send provider metadata first
      sendMeta({
        type: 'meta',
        provider: provider.provider,
        model: model ?? provider.defaultModel,
      });

      try {
        await provider.stream({
          messages,
          model,
          systemPrompt: resolvedSystemPrompt,
          signal: abortController.signal,
          onChunk: (chunk) => send(chunk),
          onComplete: () => {
            try {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch {
              // Already closed
            }
          },
          onError: (err) => {
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'error', message: err.userMessage, code: err.code })}\n\n`
                )
              );
              controller.close();
            } catch {
              // Already closed
            }
          },
        });
      } catch (err) {
        const aiErr =
          err instanceof AIError
            ? err
            : new AIError({
                code: 'UNKNOWN',
                message: String(err),
                userMessage: 'An unexpected error occurred. Please try again.',
              });

        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: aiErr.userMessage, code: aiErr.code })}\n\n`
            )
          );
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
