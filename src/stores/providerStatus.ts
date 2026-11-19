/**
 * Provider Status Store — shared singleton via Zustand
 *
 * Replaces multiple useProviderStatus hook instances fetching independently.
 * Any component that mounts first triggers the fetch; subsequent mounts reuse
 * the cached result. This eliminates the 5–8x /api/ai/status calls per page.
 */

import { create } from 'zustand';
import type { ProviderConfigStatus } from '@/lib/ai/types';

interface ProviderStatusState {
  providers: ProviderConfigStatus[];
  anyConfigured: boolean;
  loading: boolean;
  error: string | null;
  fetched: boolean;
  fetch: () => Promise<void>;
}

export const useProviderStore = create<ProviderStatusState>((set, get) => ({
  providers: [],
  anyConfigured: false,
  loading: false,
  error: null,
  fetched: false,

  async fetch() {
    // Avoid redundant fetches once resolved
    if (get().fetched || get().loading) return;
    set({ loading: true });

    try {
      const res = await fetch('/api/ai/status');
      if (!res.ok) throw new Error('Failed to fetch provider status');
      const data = await res.json();
      set({
        providers: data.providers,
        anyConfigured: data.anyConfigured,
        loading: false,
        error: null,
        fetched: true,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        fetched: true,
      });
    }
  },
}));
