'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTimelineStore } from '@/stores/timeline';
import { MOCK_TIMELINE } from '@/lib/mock/timeline';

/**
 * ExecutionTimeline
 *
 * Displays a chronological log of AI execution events.
 *
 * DEMO MODE: Shows simulated activity from MOCK_TIMELINE when no
 * real AI calls have been made in this session.
 *
 * LIVE MODE: As soon as a real AI call happens, demo events are
 * replaced with real execution events from useTimelineStore.
 *
 * Architecture for Phase 8 orchestrator:
 *   The orchestrator will push events via:
 *   useTimelineStore.getState().pushEvent({ type: 'orchestrator', ... })
 *   This component will automatically display them without changes.
 */

const TYPE_META: Record<string, { color: string }> = {
  orchestrator: { color: 'var(--accent)' },
  agent: { color: '#93c5fd' },
  model: { color: '#86efac' },
  user: { color: 'var(--text-secondary)' },
  system: { color: 'var(--text-tertiary)' },
};

const STATUS_DOT: Record<string, string> = {
  completed: 'var(--status-active)',
  running: 'var(--status-busy)',
  queued: 'var(--border)',
  failed: 'var(--status-error)',
  cancelled: 'var(--text-tertiary)',
};

function RelativeTime({ timestamp }: { timestamp: string }) {
  const [label, setLabel] = useState<string>('—');

  useEffect(() => {
    function compute() {
      const diff = Date.now() - new Date(timestamp).getTime();
      const sec = Math.floor(diff / 1000);
      const min = Math.floor(diff / 60000);
      const hr = Math.floor(diff / 3600000);
      if (sec < 10) return 'just now';
      if (min < 1) return `${sec}s ago`;
      if (min < 60) return `${min}m ago`;
      return `${hr}h ago`;
    }
    setLabel(compute());
    const id = setInterval(() => setLabel(compute()), 30000);
    return () => clearInterval(id);
  }, [timestamp]);

  return <>{label}</>;
}

export default function ExecutionTimeline() {
  const { events, hasLiveEvents, setDemoEvents } = useTimelineStore();

  // Seed with demo events on first mount — only if no live events exist
  useEffect(() => {
    setDemoEvents(MOCK_TIMELINE);
  }, [setDemoEvents]);

  const isLive = hasLiveEvents;
  const displayEvents = [...events].reverse().slice(0, 12); // newest first, cap at 12

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="label" style={{ color: 'var(--text-tertiary)' }}>
          EXECUTION TIMELINE
        </p>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isLive ? 'var(--status-active)' : '#fbbf24' }}
          />
          <span
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: isLive ? 'var(--status-active)' : '#fbbf24' }}
          >
            {isLive ? 'Live' : 'Demo Activity'}
          </span>
        </div>
      </div>

      {/* Context note — only in demo mode */}
      {!isLive && (
        <p
          className="text-[11px] mb-4 pb-4"
          style={{
            color: 'var(--text-tertiary)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          Simulated multi-agent workflow. Send a message in the Command Center
          above to see real execution events here.
        </p>
      )}

      {/* Event list */}
      <div className="relative">
        {/* Vertical rail */}
        <div
          className="absolute left-2 top-0 bottom-0 w-px"
          style={{ background: 'var(--border)' }}
        />

        <div className="space-y-4 pl-7">
          {displayEvents.map((event, i) => {
            const meta = TYPE_META[event.type] ?? TYPE_META.system;
            const dotColor = STATUS_DOT[event.status ?? 'queued'];
            const isDemo = event.source === 'demo';

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {/* Timeline dot */}
                <div
                  className="absolute -left-[1.4rem] top-1 w-2 h-2 rounded-full"
                  style={{
                    background: 'var(--background)',
                    border: `1.5px solid ${dotColor}`,
                  }}
                >
                  {event.status === 'running' && (
                    <div
                      className="absolute inset-0.5 rounded-full animate-pulse"
                      style={{ background: dotColor }}
                    />
                  )}
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold" style={{ color: meta.color }}>
                      {event.type === 'orchestrator'
                        ? 'Orchestrator'
                        : event.agent ?? event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </span>
                    {event.model && (
                      <>
                        <span style={{ color: 'var(--border)', fontSize: '10px' }}>·</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {event.model}
                        </span>
                      </>
                    )}
                    {isDemo && (
                      <span
                        className="text-[9px] px-1 py-px rounded"
                        style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}
                      >
                        sim
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>
                    {event.message}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    <RelativeTime timestamp={event.timestamp} />
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
