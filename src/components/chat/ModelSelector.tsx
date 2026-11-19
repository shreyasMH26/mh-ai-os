'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProviderStatus } from '@/hooks/useProviderStatus';
import type { ModelProvider } from '@/lib/types/model';

interface ModelSelectorProps {
  value?: ModelProvider;
  onChange: (provider: ModelProvider | undefined) => void;
  compact?: boolean;
}

const PROVIDER_META: Record<string, { label: string; color: string; model: string }> = {
  openai: { label: 'OpenAI', color: '#10a37f', model: 'gpt-4o-mini' },
  anthropic: { label: 'Anthropic', color: '#d4a36e', model: 'claude-opus-4-5' },
  google: { label: 'Google', color: '#4285f4', model: 'gemini-2.5-flash' },
};

export default function ModelSelector({ value, onChange, compact = false }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { providers, loading } = useProviderStatus();

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedMeta = value ? PROVIDER_META[value] : null;
  const label = selectedMeta?.label ?? 'Auto';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 transition-all duration-150 hover:opacity-80"
        style={{ color: 'var(--text-tertiary)' }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model: ${label}`}
      >
        {selectedMeta && (
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: selectedMeta.color }}
          />
        )}
        <span className={compact ? 'text-[11px]' : 'text-xs'}>
          {label}
        </span>
        <ChevronDown size={10} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full mb-2 left-0 w-52 rounded-xl overflow-hidden z-50"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
            role="listbox"
          >
            {/* Auto option */}
            <button
              onClick={() => { onChange(undefined); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-100 hover:bg-[var(--surface)]"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
              }}
              role="option"
              aria-selected={value === undefined}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-tertiary)' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: value === undefined ? 'var(--accent)' : 'var(--text-primary)' }}>
                  Auto
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  Use best available provider
                </p>
              </div>
            </button>

            {/* Provider options */}
            {loading ? (
              <div className="px-3 py-3">
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Loading providers…</p>
              </div>
            ) : (
              providers.map((p) => {
                const meta = PROVIDER_META[p.provider];
                if (!meta) return null;
                const isSelected = value === p.provider;

                return (
                  <button
                    key={p.provider}
                    onClick={() => {
                      if (p.configured) {
                        onChange(p.provider as ModelProvider);
                        setOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-100 hover:bg-[var(--surface)]"
                    style={{
                      opacity: p.configured ? 1 : 0.45,
                      cursor: p.configured ? 'pointer' : 'not-allowed',
                    }}
                    disabled={!p.configured}
                    role="option"
                    aria-selected={isSelected}
                    title={!p.configured ? `${p.name} is not configured — add API key in Settings` : undefined}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: p.configured ? meta.color : 'var(--border)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium"
                        style={{ color: isSelected ? meta.color : 'var(--text-primary)' }}
                      >
                        {p.name}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {p.configured ? p.defaultModel : 'Not configured'}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-1 h-1 rounded-full" style={{ background: meta.color }} />
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
