/**
 * Personal Memory Store — Zustand + localStorage
 *
 * Stores user facts that persist across:
 * - page refreshes
 * - conversation switches
 * - provider/model changes
 *
 * localStorage key: "mh-ai-os-memory"
 *
 * Facts are extracted from explicit user triggers and injected into every
 * chat request's system prompt, provider-independently.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  fact: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
  source: 'user' | 'auto';
  category?: string;   // optional tag e.g. "personal", "work", "prefs"
}

interface MemoryState {
  memories: MemoryEntry[];
  /** Add a fact. Returns the entry (existing or new). Returns null if blank. */
  addMemory: (fact: string, source?: 'user' | 'auto', category?: string) => MemoryEntry | null;
  /** Remove a memory by id. */
  removeMemory: (id: string) => void;
  /** Update the text of an existing memory. */
  updateMemory: (id: string, fact: string) => void;
  /** Delete all memories. */
  clearAll: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Normalize for duplicate detection: lowercase, collapse spaces, strip trailing punctuation. */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?;:]+$/, '');
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],

      addMemory(fact, source = 'user', category) {
        const trimmed = fact.trim();
        if (trimmed.length < 5) return null;          // too short to be meaningful

        // Duplicate guard — case-insensitive, punctuation-agnostic
        const norm = normalize(trimmed);
        const existing = get().memories.find((m) => normalize(m.fact) === norm);
        if (existing) return existing;                // already stored, return as-is

        const entry: MemoryEntry = {
          id: genId(),
          fact: trimmed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source,
          category,
        };
        set((state) => ({ memories: [...state.memories, entry] }));
        return entry;
      },

      removeMemory(id) {
        set((state) => ({ memories: state.memories.filter((m) => m.id !== id) }));
      },

      updateMemory(id, fact) {
        const trimmed = fact.trim();
        if (!trimmed) return;
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id
              ? { ...m, fact: trimmed, updatedAt: new Date().toISOString() }
              : m
          ),
        }));
      },

      clearAll() {
        set({ memories: [] });
      },
    }),
    {
      name: 'mh-ai-os-memory',
      version: 1,
    }
  )
);
