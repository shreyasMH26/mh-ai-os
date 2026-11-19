/**
 * Conversation Store — Zustand persistent state
 *
 * Central store for all chat conversations in MH AI OS.
 * Messages persist across navigation between /dashboard and /chat.
 * Conversations can be created, switched, renamed, and deleted.
 *
 * Architecture:
 *   - Each Conversation has a list of ChatMessages
 *   - The active conversation ID controls what is shown in the UI
 *   - New conversations are created with a generated title
 *   - Real titles are auto-generated from the first user message
 *
 * Persistence:
 *   - localStorage key: "mh-ai-os-conversations"
 *   - Persisted fields: conversations[], activeId
 *   - Functions are NOT persisted (Zustand handles this via partialize)
 *
 * Normalization:
 *   - On every hydration, normalizeConversations() runs before state is applied.
 *   - It removes duplicate empty conversations (title = "New conversation", 0 messages).
 *   - Conversations with real messages are NEVER removed.
 *   - At most ONE empty draft is retained after normalization.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModelProvider } from '@/lib/types/model';
import type { ExecutionMode } from '@/lib/types/task';

// ─── Message Type ─────────────────────────────────────────────────────────────

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: ModelProvider;
  model?: string;
  timestamp: string; // ISO string — serializable for persistence
  isStreaming?: boolean;
  error?: string;
}

// ─── Conversation Type ────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  provider?: ModelProvider;  // selected provider for this conversation
  mode: ExecutionMode;
  createdAt: string;
  updatedAt: string;
  isDemo: boolean; // true = no real API was used in this conversation
}

// ─── Store State ──────────────────────────────────────────────────────────────

interface ConversationStore {
  conversations: Conversation[];
  activeId: string | null;

  // Selectors
  active: () => Conversation | null;

  // Conversation management
  newConversation: (provider?: ModelProvider, mode?: ExecutionMode) => string;
  getOrCreateEmpty: () => string; // idempotent — reuses/deduplicates empty conversations
  switchConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  clearConversation: (id: string) => void;

  // Message management (called by useChat)
  addMessage: (conversationId: string, message: ConversationMessage) => void;
  updateMessage: (conversationId: string, messageId: string, patch: Partial<ConversationMessage>) => void;
  setConversationProvider: (conversationId: string, provider: ModelProvider) => void;
  setConversationMode: (conversationId: string, mode: ExecutionMode) => void;

  // Auto-title from first user message
  autoTitle: (conversationId: string, firstUserMessage: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateMessageId(role: string): string {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeTitleFromMessage(msg: string): string {
  const trimmed = msg.trim().slice(0, 60);
  return trimmed.length < msg.trim().length ? `${trimmed}…` : trimmed;
}

function now(): string {
  return new Date().toISOString();
}

function createEmptyConversation(
  provider?: ModelProvider,
  mode: ExecutionMode = 'auto'
): Conversation {
  const id = generateId();
  return {
    id,
    title: 'New conversation',
    messages: [],
    provider,
    mode,
    createdAt: now(),
    updatedAt: now(),
    isDemo: true,
  };
}

// ─── Normalization ────────────────────────────────────────────────────────────
//
// Called during hydration AND after any operation that may have created
// duplicates in a previous session. This is the canonical guard against
// stale persisted duplicate empty conversations.
//
// Rules:
//   1. Keep ALL conversations that have at least one message.
//   2. Among empty conversations (0 messages, title "New conversation"),
//      keep only the MOST RECENTLY UPDATED one.
//   3. Adjust activeId: if it pointed to a removed duplicate, point to
//      the surviving empty conversation or the most recent real conversation.

interface NormalizeResult {
  conversations: Conversation[];
  activeId: string | null;
}

function normalizeConversations(
  conversations: Conversation[],
  activeId: string | null
): NormalizeResult {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return { conversations: [], activeId: null };
  }

  // Strip stale streaming flags from crashed sessions.
  // Also clear the persisted `provider` field — it must not feed back into
  // routing. Provider is written AFTER a response (from the SSE meta event)
  // and is display-only. Stale "openai" values here caused requests to bypass
  // getDefaultProvider() and go directly to OpenAI even after the default
  // provider was changed to Google.
  const cleaned = conversations.map((c) => ({
    ...c,
    provider: undefined, // cleared — routing uses getDefaultProvider() on server
    messages: c.messages.map((m) =>
      m.isStreaming ? { ...m, isStreaming: false, content: m.content || '[interrupted]' } : m
    ),
  }));

  // Separate real (has messages) from empty
  const real = cleaned.filter((c) => c.messages.length > 0);
  const empty = cleaned.filter((c) => c.messages.length === 0);

  // Among empty conversations, keep only the most recently updated one
  const survivingEmpty: Conversation[] = [];
  if (empty.length > 0) {
    const newest = empty.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
    survivingEmpty.push(newest);
  }

  // Final list: real conversations sorted newest-first + surviving empty (if any)
  const normalized = [
    ...real.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    ...survivingEmpty,
  ];

  // Fix activeId if it was pointing to a removed duplicate
  const validIds = new Set(normalized.map((c) => c.id));
  let newActiveId = activeId && validIds.has(activeId) ? activeId : null;
  if (!newActiveId) {
    // Default to most recent real conversation, or the surviving empty
    newActiveId = normalized[0]?.id ?? null;
  }

  return { conversations: normalized, activeId: newActiveId };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,

      active() {
        const { conversations, activeId } = get();
        return conversations.find((c) => c.id === activeId) ?? null;
      },

      newConversation(provider, mode = 'auto') {
        // Always creates a genuinely new conversation (user explicitly requested one)
        const conv = createEmptyConversation(provider, mode);
        set((state) => ({
          conversations: [conv, ...state.conversations],
          activeId: conv.id,
        }));
        return conv.id;
      },

      // ── Idempotent init ───────────────────────────────────────────────────
      // Reuses an existing empty conversation rather than stacking duplicates.
      // Also normalizes the store on every call — removes any legacy duplicates
      // that slipped through before this guard was added.
      getOrCreateEmpty() {
        const { conversations, activeId } = get();

        // Run normalization first (clears any stale duplicates)
        const { conversations: normalized, activeId: fixedActiveId } =
          normalizeConversations(conversations, activeId);

        // Check if normalization changed anything
        const changed =
          normalized.length !== conversations.length ||
          fixedActiveId !== activeId;
        if (changed) {
          set({ conversations: normalized, activeId: fixedActiveId });
        }

        // After normalization, re-read state
        const current = changed ? normalized : conversations;
        const currentActiveId = changed ? fixedActiveId : activeId;

        // If there's a valid active conversation, use it
        if (currentActiveId && current.some((c) => c.id === currentActiveId)) {
          return currentActiveId;
        }

        // If there's already one empty conversation, activate it
        const emptyConv = current.find(
          (c) => c.messages.length === 0 && c.title === 'New conversation'
        );
        if (emptyConv) {
          set({ activeId: emptyConv.id });
          return emptyConv.id;
        }

        // Create a fresh empty conversation
        const conv = createEmptyConversation();
        set((state) => ({
          conversations: [conv, ...state.conversations],
          activeId: conv.id,
        }));
        return conv.id;
      },

      switchConversation(id) {
        set({ activeId: id });
      },

      renameConversation(id, title) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title: title.trim() || 'Untitled', updatedAt: now() } : c
          ),
        }));
      },

      deleteConversation(id) {
        set((state) => {
          const remaining = state.conversations.filter((c) => c.id !== id);
          const newActive =
            state.activeId === id
              ? (remaining[0]?.id ?? null)
              : state.activeId;
          return { conversations: remaining, activeId: newActive };
        });
      },

      clearConversation(id) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id
              ? { ...c, messages: [], title: 'New conversation', isDemo: true, updatedAt: now() }
              : c
          ),
        }));
      },

      addMessage(conversationId, message) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: now(),
                }
              : c
          ),
        }));
      },

      updateMessage(conversationId, messageId, patch) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, ...patch } : m
                  ),
                  updatedAt: now(),
                }
              : c
          ),
        }));
      },

      setConversationProvider(conversationId, provider) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, provider, updatedAt: now() } : c
          ),
        }));
      },

      setConversationMode(conversationId, mode) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, mode, updatedAt: now() } : c
          ),
        }));
      },

      autoTitle(conversationId, firstUserMessage) {
        const title = makeTitleFromMessage(firstUserMessage);
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId && c.title === 'New conversation'
              ? { ...c, title, updatedAt: now() }
              : c
          ),
        }));
      },
    }),
    {
      name: 'mh-ai-os-conversations',

      // Only persist conversations[] and activeId — not functions
      partialize: (state) => ({
        conversations: state.conversations,
        activeId: state.activeId,
      }),

      // ── Hydration normalization ─────────────────────────────────────────
      // Runs when Zustand rehydrates from localStorage on every page load.
      // This is the PRIMARY guard that fixes stale persisted duplicates.
      merge: (persisted, current) => {
        const raw = persisted as { conversations?: Conversation[]; activeId?: string | null };
        const { conversations, activeId } = normalizeConversations(
          raw.conversations ?? [],
          raw.activeId ?? null
        );
        return {
          ...current,
          conversations,
          activeId,
        };
      },
    }
  )
);

// ─── Exported helpers ─────────────────────────────────────────────────────────

export { generateMessageId };
export { normalizeConversations };
