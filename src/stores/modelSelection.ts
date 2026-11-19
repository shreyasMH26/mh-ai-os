/**
 * Model Selection Store
 *
 * Persists the user's globally selected provider + model across page refreshes
 * and navigation. This is the single source of truth for which model the user
 * has chosen in Settings → AI Models.
 *
 * Rules:
 * - Selection survives page refresh (localStorage via Zustand persist)
 * - When null: server calls getDefaultProvider() (auto routing)
 * - When set: both provider AND model are sent to /api/ai/chat
 * - Settings writes here when user clicks a model card
 * - Chat reads this as the default selection
 * - The user can still override per-message via the ModelSelector in Chat
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModelProvider } from '@/lib/types/model';

export interface ModelSelection {
  provider: ModelProvider;
  model: string;
}

interface ModelSelectionState {
  /** The globally selected provider + model, or null for Auto (server default) */
  selected: ModelSelection | null;
  /** Set a specific provider + model as active */
  setSelected: (selection: ModelSelection | null) => void;
}

export const useModelSelectionStore = create<ModelSelectionState>()(
  persist(
    (set) => ({
      selected: null,
      setSelected: (selection) => set({ selected: selection }),
    }),
    {
      name: 'mh-ai-model-selection',
      version: 1,
    }
  )
);
