/**
 * POST /api/ai/orchestrate
 *
 * Multi-step AI orchestration endpoint.
 * Accepts a high-level objective and streams execution events + synthesis
 * back as Server-Sent Events (SSE).
 *
 * This is a separate route from /api/ai/chat.
 * Normal single-turn chat still uses /api/ai/chat unchanged.
 *
 * SSE event types:
 *   data: { type: "timeline", event: TimelineEvent }  — execution progress
 *   data: { type: "synthesis_chunk", chunk: "..." }   — streaming synthesis text
 *   data: { type: "complete", planId: "...", taskCount: N }
 *   data: { type: "error", message: "...", code: "..." }
 *   data: [DONE]
 *
 * Request body:
 *   {
 *     objective: string
 *     mode?: "auto" | "manual" | "council"   (default: "auto")
 *     workspace?: string                      (e.g. "xtich" | "build" | "college")
 *     conversationId?: string
 *   }
 */

import { NextRequest } from 'next/server';
import { runOrchestrator } from '@/lib/ai/orchestrator';
import { AIError } from '@/lib/ai/registry';
import type { ExecutionMode, TimelineEvent } from '@/lib/types/task';

export const runtime = 'nodejs';
export const maxDuration = 120; // orchestration can take up to 2 minutes

interface OrchestrateRequestBody {
  objective: string;
  mode?: ExecutionMode;
  workspace?: string;
  conversationId?: string;
}

export async function POST(req: NextRequest) {
  let body: OrchestrateRequestBody;

  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { objective, mode = 'auto', workspace } = body;

  if (!objective?.trim()) {
    return new Response('objective is required', { status: 400 });
  }

  const encoder = new TextEncoder();
  const abortController = new AbortController();
  req.signal.addEventListener('abort', () => abortController.abort());

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller closed
        }
      };

      const done = () => {
        try {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          // already closed
        }
      };

      // Timeline event counter for ID generation
      let eventSeq = 0;

      try {
        await runOrchestrator({
          objective: objective.trim(),
          mode,
          workspace,
          signal: abortController.signal,

          onEvent(partial) {
            eventSeq++;
            const event: TimelineEvent = {
              id: `orch-${Date.now()}-${eventSeq}`,
              timestamp: new Date().toISOString(),
              ...partial,
            };
            send({ type: 'timeline', event });
          },

          onSynthesisChunk(chunk) {
            send({ type: 'synthesis_chunk', chunk });
          },

          onComplete(plan, _synthesis) {
            send({
              type: 'complete',
              planId: plan.id,
              taskCount: plan.tasks.length,
              status: plan.status,
            });
            done();
          },

          onError(err) {
            send({ type: 'error', message: err.userMessage, code: err.code });
            done();
          },
        });
      } catch (err) {
        const aiErr =
          err instanceof AIError
            ? err
            : new AIError({
                code: 'UNKNOWN',
                message: String(err),
                userMessage: 'Orchestration failed unexpectedly. Please try again.',
                retryable: true,
              });
        send({ type: 'error', message: aiErr.userMessage, code: aiErr.code });
        done();
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
