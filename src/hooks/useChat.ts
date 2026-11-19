'use client';

import { useCallback, useRef } from 'react';
import { useConversationStore, generateMessageId } from '@/stores/conversations';
import { useTimelineStore } from '@/stores/timeline';
import { useModelSelectionStore } from '@/stores/modelSelection';
import { useMemoryStore } from '@/stores/memory';
import { extractMemoryFact, inferCategory } from '@/lib/memory/extractMemory';
import type { AIMessage } from '@/lib/ai/types';
import type { ModelProvider } from '@/lib/types/model';

// ─── Types ────────────────────────────────────────────────────────────────────

// Re-export for backward compatibility with existing components
export type { ConversationMessage as ChatMessage } from '@/stores/conversations';

export type ChatStatus = 'idle' | 'streaming' | 'error';

export interface UseChatReturn {
  messages: import('@/stores/conversations').ConversationMessage[];
  status: ChatStatus;
  error: string | null;
  conversationId: string | null;
  send: (content: string, provider?: ModelProvider, model?: string) => Promise<void>;
  stop: () => void;
  retry: () => void;
  clear: () => void;
  editAndResend: (messageId: string, newContent: string) => void;
}

// ─── Status Map — keyed by conversation id ────────────────────────────────────
// We keep streaming status outside Zustand (no re-render storms)
const statusMap = new Map<string, ChatStatus>();
const errorMap = new Map<string, string | null>();
const abortMap = new Map<string, AbortController>();
const lastUserMsgMap = new Map<string, string>();

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useChat(conversationIdOverride?: string): UseChatReturn {
  const store = useConversationStore();
  const timelineStore = useTimelineStore();

  // Get or resolve a conversation for this chat instance.
  // Uses getOrCreateEmpty (idempotent) rather than newConversation to prevent
  // duplicate creation when send() is called with no active conversation.
  const resolveConversationId = useCallback((): string => {
    if (conversationIdOverride) return conversationIdOverride;
    if (store.activeId) return store.activeId;
    // Use idempotent create — won't stack duplicates
    return store.getOrCreateEmpty();
  }, [conversationIdOverride, store]);


  // We need to force re-renders from outside Zustand for status/error.
  // Using a ref-based approach with a useState trigger is the clean pattern.
  // For simplicity in this phase, we derive status from message streaming flags.
  const abortRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>('');

  // Get active conversation
  const convId = conversationIdOverride ?? store.activeId;
  const conversation = convId
    ? store.conversations.find((c) => c.id === convId) ?? null
    : null;
  const messages = conversation?.messages ?? [];

  // Derive status from messages
  const isStreaming = messages.some((m) => m.isStreaming);
  const hasError = messages.some((m) => m.role === 'assistant' && m.error && !m.content);
  const status: ChatStatus = isStreaming ? 'streaming' : hasError ? 'error' : 'idle';
  const lastErrorMsg = messages
    .filter((m) => m.role === 'assistant' && m.error)
    .at(-1)?.error ?? null;

  // ── send ──────────────────────────────────────────────────────────────────

  const send = useCallback(
    async (content: string, providerOverride?: ModelProvider, modelOverride?: string) => {
      if (!content.trim() || isStreaming) return;

      const cid = resolveConversationId();
      const { addMessage, updateMessage, autoTitle, setConversationProvider } =
        useConversationStore.getState();

      lastUserMessageRef.current = content;

      // Determine provider + model for this request.
      // Priority:
      //   1. Explicit providerOverride (from per-message ModelSelector in Chat toolbar)
      //   2. Global model selection from Settings → AI Models (persisted in localStorage)
      //   3. undefined → server calls getDefaultProvider() (Auto)
      const globalSelection = useModelSelectionStore.getState().selected;
      const provider: ModelProvider | undefined = providerOverride ?? globalSelection?.provider;
      const model: string | undefined = modelOverride ?? (providerOverride ? undefined : globalSelection?.model);

      // ── Memory: detect trigger phrases and save new facts ───────────────────
      // This runs BEFORE adding the user message to state so that the memory
      // is already persisted when the AI responds (in case of stream error).
      const memoryFact = extractMemoryFact(content);
      if (memoryFact) {
        const category = inferCategory(memoryFact);
        useMemoryStore.getState().addMemory(memoryFact, 'user', category);
      }

      // Read all current memories to inject into this request
      const currentMemories = useMemoryStore.getState().memories;

      // Add user message
      const userMsgId = generateMessageId('user');
      addMessage(cid, {
        id: userMsgId,
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      });

      // Auto-title from first message
      const convNow = useConversationStore.getState().conversations.find((c) => c.id === cid);
      const isFirstMessage = (convNow?.messages.length ?? 0) === 0;
      if (isFirstMessage) {
        autoTitle(cid, content);
      }

      // Add streaming assistant placeholder
      const assistantId = generateMessageId('assistant');
      addMessage(cid, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      });

      // Build conversation history for API
      const currentMessages = useConversationStore.getState().conversations.find(
        (c) => c.id === cid
      )?.messages ?? [];
      const history: AIMessage[] = currentMessages
        .filter((m) => m.id !== assistantId) // exclude the placeholder
        .map((m) => ({ role: m.role, content: m.content }));

      // Push timeline event: user sent message
      timelineStore.pushEvent({
        type: 'user',
        message: `User: ${content.trim().slice(0, 80)}${content.length > 80 ? '…' : ''}`,
        status: 'completed',
        conversationId: cid,
        source: 'live',
      });

      // Push timeline event: AI processing
      const processingEventId = generateMessageId('evt');
      timelineStore.pushEvent({
        type: 'orchestrator',
        message: `Routing to ${provider ?? 'default provider'}…`,
        status: 'running',
        conversationId: cid,
        source: 'live',
      });

      // Abort controller
      const abortController = new AbortController();
      abortRef.current = abortController;
      abortMap.set(cid, abortController);

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            provider,
            model, // specific model ID (e.g. "gpt-4o", "gemini-2.5-pro") or undefined for provider default
            conversationId: cid,
            memories: currentMemories, // user's persistent memory facts
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          let errorMessage = 'Failed to connect to AI provider.';
          try {
            const errData = await response.json();
            errorMessage = errData.error ?? errorMessage;
          } catch {
            // ignore parse error
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error('No response body from server.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let resolvedProvider: ModelProvider | undefined;
        let resolvedModel: string | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;

            try {
              const parsed = JSON.parse(raw);

              if (parsed.type === 'meta') {
                resolvedProvider = parsed.provider;
                resolvedModel = parsed.model;
                updateMessage(cid, assistantId, {
                  provider: resolvedProvider,
                  model: resolvedModel,
                });
                if (resolvedProvider) {
                  setConversationProvider(cid, resolvedProvider);
                }
                continue;
              }

              if (parsed.type === 'error') {
                throw new Error(parsed.message ?? 'AI provider error');
              }

              if (parsed.chunk) {
                updateMessage(cid, assistantId, {
                  // Append to existing content via functional update is not directly possible
                  // — we need to read current content first
                  content: (
                    useConversationStore
                      .getState()
                      .conversations.find((c) => c.id === cid)
                      ?.messages.find((m) => m.id === assistantId)?.content ?? ''
                  ) + parsed.chunk,
                });
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'JSON parse error') {
                throw parseErr;
              }
            }
          }
        }

        // Mark complete
        updateMessage(cid, assistantId, {
          isStreaming: false,
          provider: resolvedProvider,
          model: resolvedModel,
        });

        // Mark conversation as live (real AI response)
        useConversationStore.setState((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === cid ? { ...c, isDemo: false } : c
          ),
        }));

        // Timeline: AI completed
        timelineStore.pushEvent({
          type: 'model',
          agent: resolvedProvider ?? 'AI',
          model: resolvedModel,
          message: 'Response generated successfully',
          status: 'completed',
          conversationId: cid,
          source: 'live',
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          updateMessage(cid, assistantId, { isStreaming: false });
          timelineStore.pushEvent({
            type: 'system',
            message: 'Generation stopped by user',
            status: 'cancelled',
            conversationId: cid,
            source: 'live',
          });
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred.';
        updateMessage(cid, assistantId, {
          isStreaming: false,
          error: errorMessage,
          content: '',
        });

        timelineStore.pushEvent({
          type: 'system',
          message: `Error: ${errorMessage.slice(0, 60)}`,
          status: 'failed',
          conversationId: cid,
          source: 'live',
        });
      } finally {
        abortRef.current = null;
        abortMap.delete(cid);
      }
    },
    [isStreaming, resolveConversationId, timelineStore]
  );

  // ── stop ──────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (convId) abortMap.get(convId)?.abort();
  }, [convId]);

  // ── retry ─────────────────────────────────────────────────────────────────

  const retry = useCallback(() => {
    if (!convId) return;
    const { updateMessage } = useConversationStore.getState();
    // Find last errored assistant message and clear it
    const conv = useConversationStore.getState().conversations.find((c) => c.id === convId);
    const lastErr = conv?.messages.filter((m) => m.role === 'assistant' && m.error).at(-1);
    if (lastErr) {
      updateMessage(convId, lastErr.id, { error: undefined, content: '', isStreaming: false });
    }
    if (lastUserMessageRef.current) {
      setTimeout(() => send(lastUserMessageRef.current), 50);
    }
  }, [convId, send]);

  // ── clear ─────────────────────────────────────────────────────────────────

  const clear = useCallback(() => {
    if (!convId) return;
    useConversationStore.getState().clearConversation(convId);
    lastUserMessageRef.current = '';
  }, [convId]);

  // ── editAndResend ─────────────────────────────────────────────────────────

  const editAndResend = useCallback(
    (messageId: string, newContent: string) => {
      if (!convId || isStreaming) return;

      // Find the message index
      const conv = useConversationStore.getState().conversations.find((c) => c.id === convId);
      if (!conv) return;
      const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      // Truncate messages from that point
      useConversationStore.setState((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.slice(0, msgIndex) }
            : c
        ),
      }));

      // Resend with new content
      send(newContent);
    },
    [convId, isStreaming, send]
  );

  return {
    messages,
    status,
    error: lastErrorMsg,
    conversationId: convId,
    send,
    stop,
    retry,
    clear,
    editAndResend,
  };
}
