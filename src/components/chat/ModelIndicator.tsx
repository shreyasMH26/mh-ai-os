'use client';

import type { ModelProvider } from '@/lib/types/model';

const PROVIDER_META: Record<string, { label: string; color: string }> = {
  openai: { label: 'OpenAI', color: '#10a37f' },
  anthropic: { label: 'Anthropic', color: '#d4a36e' },
  google: { label: 'Google', color: '#4285f4' },
};

interface ModelIndicatorProps {
  provider?: ModelProvider;
  model?: string;
  isStreaming?: boolean;
}

export default function ModelIndicator({ provider, model, isStreaming }: ModelIndicatorProps) {
  const meta = provider ? PROVIDER_META[provider] : null;
  const providerLabel = meta?.label ?? 'Assistant';
  const modelShort = model?.split('-').slice(0, 2).join('-') ?? '';

  return (
    <div className="flex items-center gap-1.5 mb-2">
      {/* Streaming pulse or dot */}
      {isStreaming ? (
        <div className="flex gap-0.5 items-center">
          <span
            className="w-1 h-1 rounded-full animate-bounce"
            style={{ background: meta?.color ?? 'var(--text-tertiary)', animationDelay: '0ms' }}
          />
          <span
            className="w-1 h-1 rounded-full animate-bounce"
            style={{ background: meta?.color ?? 'var(--text-tertiary)', animationDelay: '150ms' }}
          />
          <span
            className="w-1 h-1 rounded-full animate-bounce"
            style={{ background: meta?.color ?? 'var(--text-tertiary)', animationDelay: '300ms' }}
          />
        </div>
      ) : (
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: meta?.color ?? 'var(--text-tertiary)' }}
        />
      )}
      <span
        className="text-xs font-medium"
        style={{ color: meta?.color ?? 'var(--text-tertiary)' }}
      >
        {providerLabel}
      </span>
      {modelShort && (
        <>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>·</span>
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {modelShort}
          </span>
        </>
      )}
    </div>
  );
}
