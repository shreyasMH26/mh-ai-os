'use client';

/**
 * useOrchestrator
 *
 * Client hook for multi-step AI orchestration.
 * Connects to /api/ai/orchestrate and streams:
 *   - Timeline events (pushed to the global TimelineStore)
 *   - Synthesis text chunks (streamed to local state)
 *
 * Normal single-turn chat is entirely separate — use useChat for that.
 *
 * Usage:
 *   const { run, stop, status, synthesis, error } = useOrchestrator();
 *   run({ objective: 'Build a landing page for XTICH', mode: 'auto' });
 */

import { useState, useRef, useCallback } from 'react';
import { useTimelineStore } from '@/stores/timeline';
import type { ExecutionMode, TimelineEvent } from '@/lib/types/task';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrchestratorStatus = 'idle' | 'decomposing' | 'executing' | 'synthesizing' | 'complete' | 'error';

export interface OrchestratorRunParams {
  objective: string;
  mode?: ExecutionMode;
  workspace?: string;
  conversationId?: string;
}

export interface OrchestratorState {
  status: OrchestratorStatus;
  synthesis: string;
  error: string | null;
  run: (params: OrchestratorRunParams) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

// ─── SSE event types from the server ─────────────────────────────────────────

type OrchestrateSSEEvent =
  | { type: 'timeline'; event: TimelineEvent }
  | { type: 'synthesis_chunk'; chunk: string }
  | { type: 'complete'; planId: string; taskCount: number; status: string }
  | { type: 'error'; message: string; code: string };

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrchestrator(): OrchestratorState {
  const [status, setStatus] = useState<OrchestratorStatus>('idle');
  const [synthesis, setSynthesis] = useState('');
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const { pushEvent } = useTimelineStore();

  const reset = useCallback(() => {
    setStatus('idle');
    setSynthesis('');
    setError(null);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
  }, []);

  const run = useCallback(async (params: OrchestratorRunParams) => {
    abortRef.current?.abort(); // cancel any in-flight

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('decomposing');
    setSynthesis('');
    setError(null);

    try {
      const res = await fetch('/api/ai/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: params.objective,
          mode: params.mode ?? 'auto',
          workspace: params.workspace,
          conversationId: params.conversationId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;

          let evt: OrchestrateSSEEvent;
          try {
            evt = JSON.parse(raw);
          } catch {
            continue; // skip malformed lines
          }

          switch (evt.type) {
            case 'timeline': {
              // Push the live event into the global timeline store
              pushEvent({
                ...evt.event,
                source: 'live',
              });

              // Update status based on event content
              if (evt.event.type === 'orchestrator') {
                const msg = evt.event.message.toLowerCase();
                if (msg.includes('decompos') || msg.includes('planning')) {
                  setStatus('decomposing');
                } else if (msg.includes('synthesis')) {
                  setStatus('synthesizing');
                } else {
                  setStatus('executing');
                }
              } else if (evt.event.type === 'agent' || evt.event.type === 'model') {
                setStatus('executing');
              }
              break;
            }

            case 'synthesis_chunk': {
              setStatus('synthesizing');
              setSynthesis((prev) => prev + evt.chunk);
              break;
            }

            case 'complete': {
              setStatus('complete');
              break;
            }

            case 'error': {
              setError(evt.message);
              setStatus('error');
              break;
            }
          }
        }
      }

      // If we finished the stream without a 'complete' event, mark done
      setStatus((s) => (s === 'synthesizing' || s === 'executing' ? 'complete' : s));
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setError(err instanceof Error ? err.message : 'Orchestration failed');
      setStatus('error');
    }
  }, [pushEvent]);

  return { status, synthesis, error, run, stop, reset };
}
