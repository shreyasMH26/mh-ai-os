'use client';

/**
 * TopBar — sticky header, NOT fixed.
 *
 * Lives inside the flex-col AppShell as the first child.
 * Occupies its own row. Never overlaps anything below it.
 */

import { Menu, Search, Bell, PanelLeft } from 'lucide-react';
import { useProviderStatus } from '@/hooks/useProviderStatus';

interface TopBarProps {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  onToggleSidebar: () => void;
  isMobile: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d4a36e',
  google: '#4285f4',
};

export default function TopBar({ sidebarCollapsed, onToggleSidebar, isMobile }: TopBarProps) {
  const { providers, loading, anyConfigured } = useProviderStatus();

  return (
    <header
      className="flex items-center justify-between px-4 shrink-0"
      style={{
        height: 52,
        background: 'var(--background)',
        borderBottom: '1px solid var(--border)',
        // No left/right/position — it's a normal flex child occupying the full row width
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Sidebar toggle (always visible — hamburger on mobile, panel toggle on desktop) */}
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-[var(--surface-raised)]"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={isMobile ? 'Open navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isMobile ? <Menu size={16} /> : <PanelLeft size={16} />}
        </button>

        {/* Demo / Live badge */}
        {!loading && (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
            style={{
              background: anyConfigured ? 'rgba(74,222,128,0.08)' : 'rgba(251,191,36,0.08)',
              color: anyConfigured ? 'var(--status-active)' : '#fbbf24',
              border: `1px solid ${anyConfigured ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)'}`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: anyConfigured ? 'var(--status-active)' : '#fbbf24',
              }}
            />
            {anyConfigured ? 'Live' : 'Demo Mode'}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Provider dots — desktop only */}
        {!loading && (
          <div className="hidden md:flex items-center gap-2 mr-2">
            {providers.map((p) => (
              <div
                key={p.provider}
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-tertiary)' }}
                title={`${p.name}: ${p.configured ? 'Connected' : 'Not configured'}`}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: p.configured
                      ? PROVIDER_COLORS[p.provider] ?? 'var(--status-active)'
                      : 'var(--border)',
                  }}
                />
                <span className="text-[10px]">{p.name}</span>
              </div>
            ))}
          </div>
        )}

        <button
          className="w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-[var(--surface-raised)]"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Search"
        >
          <Search size={15} />
        </button>

        <button
          className="w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-[var(--surface-raised)]"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Notifications"
        >
          <Bell size={15} />
        </button>

        <div
          className="w-7 h-7 rounded-full ml-1 flex items-center justify-center text-xs font-semibold cursor-pointer"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          aria-label="User menu"
        >
          MH
        </div>
      </div>
    </header>
  );
}
