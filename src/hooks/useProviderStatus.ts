'use client';

import { useEffect } from 'react';
import { useProviderStore } from '@/stores/providerStatus';

/**
 * Hook to read AI provider configuration status.
 * Backed by a shared Zustand store — only one fetch is made per page load
 * regardless of how many components call this hook.
 */
export function useProviderStatus() {
  const { providers, anyConfigured, loading, error, fetch } = useProviderStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { providers, anyConfigured, loading, error };
}
