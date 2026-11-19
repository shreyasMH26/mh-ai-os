'use client';

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useProviderStatus } from '@/hooks/useProviderStatus';

const PROVIDER_META: Record<string, { symbol: string; color: string }> = {
  openai: { symbol: 'GPT', color: '#10a37f' },
  anthropic: { symbol: 'CLD', color: '#d4a36e' },
  google: { symbol: 'GEM', color: '#4285f4' },
};

export default function AITeamStatus() {
  const { providers, loading, anyConfigured } = useProviderStatus();

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <p className="label" style={{ color: 'var(--text-tertiary)' }}>
          AI TEAM
        </p>
        <a
          href="/settings"
          className="flex items-center gap-1 text-xs transition-colors duration-150 hover:text-[var(--accent)]"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Configure AI models"
        >
          Configure
          <ExternalLink size={9} />
        </a>
      </div>

      {/* Provider list — typographic, minimal separators */}
      <div>
        {loading ? (
          // Skeleton
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded animate-pulse"
                  style={{ background: 'var(--surface-raised)' }}
                />
                <div
                  className="w-16 h-2.5 rounded animate-pulse"
                  style={{ background: 'var(--surface-raised)' }}
                />
              </div>
              <div className="w-12 h-2 rounded animate-pulse" style={{ background: 'var(--border)' }} />
            </div>
          ))
        ) : (
          providers.map((provider, i) => {
            const meta = PROVIDER_META[provider.provider] ?? {
              symbol: provider.name.slice(0, 3).toUpperCase(),
              color: 'var(--text-tertiary)',
            };
            const isLast = i === providers.length - 1;

            return (
              <motion.div
                key={provider.provider}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-between py-3"
                style={!isLast ? { borderBottom: '1px solid var(--border-subtle)' } : {}}
              >
                {/* Left: provider identity */}
                <div className="flex items-center gap-2.5">
                  {/* Status dot — green if configured, dim if not */}
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: provider.configured
                        ? meta.color
                        : 'var(--border)',
                    }}
                  />
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {provider.name}
                    </span>
                  </div>
                </div>

                {/* Right: model + status */}
                <div className="text-right">
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    {provider.defaultModel}
                  </p>
                  <p
                    className="text-[10px] font-semibold mt-0.5"
                    style={{
                      color: provider.configured ? meta.color : 'var(--text-tertiary)',
                    }}
                  >
                    {provider.configured ? 'Connected' : 'Not configured'}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <p
          className="text-[10px] mt-4"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {anyConfigured
            ? `${providers.filter((p) => p.configured).length} of ${providers.length} connected`
            : (
              <>
                Add keys in{' '}
                <a
                  href="/settings"
                  className="underline underline-offset-2 hover:text-[var(--accent)] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Settings → AI Models
                </a>
              </>
            )
          }
        </p>
      )}
    </div>
  );
}
