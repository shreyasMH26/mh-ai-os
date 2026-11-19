'use client';

/**
 * Sidebar — fills its container. NOT fixed. NOT absolute.
 *
 * On desktop: rendered inside a flex child of AppShell that has an explicit width.
 *   The sidebar fills that container 100% — it occupies REAL layout space.
 *   It never overlaps main content.
 *
 * On mobile: rendered inside an absolute drawer div managed by AppShell.
 *   The sidebar content is the same, but the container is the drawer.
 *
 * The collapse toggle is now in TopBar. The sidebar itself only has the content.
 */

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  GraduationCap,
  Code2,
  Bot,
  FolderKanban,
  CheckSquare,
  Files,
  Plug,
  Settings,
  Network,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NAV_GROUPS } from '@/lib/constants/navigation';
import { cn } from '@/lib/utils';
import { useProviderStatus } from '@/hooks/useProviderStatus';
import { useConversationStore } from '@/stores/conversations';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  LayoutDashboard,
  MessageSquare,
  Building2,
  GraduationCap,
  Code2,
  Bot,
  FolderKanban,
  CheckSquare,
  Files,
  Plug,
  Settings,
  Network,
};

const WORKSPACE_COLORS: Record<string, string> = {
  xtich: '#e8d5b7',
  college: '#93c5fd',
  build: '#86efac',
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isDesktop: boolean;
}

export default function Sidebar({ collapsed, onToggle, isDesktop }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { createConversation } = useConversationStore();

  function handleNewConversation() {
    const id = createConversation();
    router.push('/chat');
    // slight delay so navigation settles before we set active
    setTimeout(() => {
      useConversationStore.getState().setActive(id);
    }, 50);
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--surface)' }}
    >
      {/* ── Logo row ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center px-3.5 shrink-0"
        style={{ height: 52, borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Logo mark */}
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-semibold text-xs"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            MH
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col min-w-0"
              >
                <span
                  className="text-sm font-semibold tracking-tight leading-none"
                  style={{ color: 'var(--text-primary)' }}
                >
                  MH AI OS
                </span>
                <span
                  className="text-[10px] mt-0.5 leading-none"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Personal OS
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle — desktop only (mobile uses TopBar hamburger) */}
        {isDesktop && (
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 hover:bg-[var(--surface-raised)] shrink-0"
            style={{
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border)',
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
          </button>
        )}
      </div>

      {/* ── New Conversation button ──────────────────────────────────────── */}
      <div className="px-2 pt-3 pb-2 shrink-0">
        <button
          onClick={handleNewConversation}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
            collapsed && 'justify-center px-0'
          )}
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
          }}
          title={collapsed ? 'New Conversation' : undefined}
        >
          <Plus size={14} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="truncate"
              >
                New Conversation
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1 px-0">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-1">
            {/* Group label */}
            <AnimatePresence>
              {!collapsed && group.label && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3.5 pb-1 pt-3"
                >
                  <span className="label" style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
                    {group.label.toUpperCase()}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nav items */}
            {group.items.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const accentColor = WORKSPACE_COLORS[item.id];

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 mx-1.5 px-2 py-2 rounded-md transition-all duration-150 group relative',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                  style={{
                    background: isActive ? 'var(--surface-raised)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--border-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active indicator stripe */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                      style={{ background: accentColor || 'var(--accent)' }}
                    />
                  )}

                  {Icon && (
                    <Icon
                      size={15}
                      className="shrink-0"
                      style={{
                        color: isActive ? accentColor || 'var(--accent)' : 'currentColor',
                      }}
                    />
                  )}

                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        transition={{ duration: 0.15 }}
                        className="text-sm font-medium truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Bottom: provider status ──────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)' }} className="p-3 shrink-0">
        <SidebarModelStatus collapsed={collapsed} />
      </div>
    </div>
  );
}

// ── Provider status sub-component ────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d4a36e',
  google: '#4285f4',
};

function SidebarModelStatus({ collapsed }: { collapsed: boolean }) {
  const { providers, loading } = useProviderStatus();

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--border)' }} />
        ))}
      </div>
    );
  }

  if (!collapsed) {
    return (
      <div className="space-y-1.5">
        <p className="label" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>AI MODELS</p>
        {providers.map((provider) => (
          <div key={provider.provider} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: provider.configured ? 'var(--status-active)' : 'var(--status-idle)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{provider.name}</span>
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: provider.configured ? 'var(--status-active)' : 'var(--text-tertiary)' }}
            >
              {provider.configured ? 'Live' : 'Demo'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {providers.map((provider) => (
        <div
          key={provider.provider}
          className="w-1.5 h-1.5 rounded-full"
          title={`${provider.name}: ${provider.configured ? 'Connected' : 'Not configured'}`}
          style={{
            background: provider.configured
              ? PROVIDER_COLORS[provider.provider] ?? 'var(--status-active)'
              : 'var(--status-idle)',
          }}
        />
      ))}
    </div>
  );
}
