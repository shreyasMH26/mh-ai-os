'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface DemoBannerProps {
  message?: string;
}

export default function DemoBanner({ message }: DemoBannerProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: 'rgba(251, 191, 36, 0.06)',
        border: '1px solid rgba(251, 191, 36, 0.18)',
      }}
      role="alert"
    >
      <AlertCircle size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>
          Demo Mode
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {message ?? 'No AI provider is configured. Add an API key to enable real responses.'}
        </p>
      </div>
      <Link
        href="/settings"
        className="flex items-center gap-1 text-xs font-medium shrink-0 transition-all duration-150 hover:opacity-80"
        style={{ color: '#fbbf24' }}
      >
        Settings
        <ArrowRight size={11} />
      </Link>
    </div>
  );
}
