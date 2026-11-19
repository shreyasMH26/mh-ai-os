/**
 * Timeline Store — Real vs Demo execution events
 *
 * Tracks AI execution events from the conversation system.
 * Events are clearly marked as DEMO (mock) or LIVE (real AI call).
 *
 * When the orchestrator is implemented in Phase 8, it will push
 * live events through pushEvent(). Until then, the timeline
 * displays demo activity with unmistakable labeling.
 *
 * Phase 8 integration point:
 *   import { useTimelineStore } from '@/stores/timeline';
 *   useTimelineStore.getState().pushEvent({ type: 'orchestrator', ... });
 */

import { create } from 'zustand';
import type { TimelineEvent } from '@/lib/types/task';

export type TimelineEventSource = 'demo' | 'live';

export interface TrackedTimelineEvent extends TimelineEvent {
  source: TimelineEventSource;
  conversationId?: string;
}

interface TimelineStore {
  events: TrackedTimelineEvent[];
  hasLiveEvents: boolean;

  // Push a real event (from an actual AI call)
  pushEvent: (event: Omit<TrackedTimelineEvent, 'id' | 'timestamp' | 'source'> & { source?: TimelineEventSource }) => void;

  // Replace all events (used on first load to set demo events)
  setDemoEvents: (events: TimelineEvent[]) => void;

  // Clear all events
  clear: () => void;
}

function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  events: [],
  hasLiveEvents: false,

  pushEvent(partial) {
    const event: TrackedTimelineEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      source: partial.source ?? 'live',
      ...partial,
    };
    const isLive = event.source === 'live';
    set((state) => ({
      events: [...state.events.slice(-49), event], // keep max 50 events
      hasLiveEvents: state.hasLiveEvents || isLive,
    }));
  },

  setDemoEvents(events) {
    // Only set if no live events have been pushed yet
    if (get().hasLiveEvents) return;
    set({
      events: events.map((e) => ({ ...e, source: 'demo' as TimelineEventSource })),
    });
  },

  clear() {
    set({ events: [], hasLiveEvents: false });
  },
}));
