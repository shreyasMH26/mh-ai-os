'use client';

/**
 * AppShell — True two-column layout. No fixed-position overlap.
 *
 * Structure:
 *   <body>
 *     <div.app-root>              ← full viewport, flex-col
 *       <TopBar />                ← sticky header, never fixed
 *       <div.app-body>            ← flex-row, fills remaining height
 *         <Sidebar />             ← real flow element, shrink-0, h-full, sticky
 *         <main />                ← flex-1, independent scroll
 *       </div>
 *     </div>
 *   </body>
 *
 * The sidebar occupies genuine layout space. It NEVER overlays main content.
 * On mobile it slides in as an overlay drawer over the main area only.
 */

import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Track mobile breakpoint
  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse when switching to mobile
      if (mobile) setCollapsed(true);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close drawer when navigating (any route change closes mobile drawer)
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const handleToggle = useCallback(() => {
    if (isMobile) {
      setDrawerOpen((p) => !p);
    } else {
      setCollapsed((p) => !p);
    }
  }, [isMobile]);

  // Desktop sidebar width (animated by Sidebar internally via framer-motion)
  const sidebarWidth = collapsed ? 56 : 240;

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', overflow: 'hidden', background: 'var(--background)' }}
    >
      {/* ── TopBar: sticky, full-width, never fixed ───────────────────────── */}
      <TopBar
        sidebarCollapsed={isMobile ? true : collapsed}
        sidebarWidth={isMobile ? 0 : sidebarWidth}
        onToggleSidebar={handleToggle}
        isMobile={isMobile}
      />

      {/* ── Body row: sidebar + main ──────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Desktop sidebar: real flex column, never overlays main ───── */}
        {!isMobile && (
          <div
            className="shrink-0 flex flex-col"
            style={{
              width: sidebarWidth,
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              // overflow:hidden during transition so content doesn't spill
              overflow: 'hidden',
              borderRight: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <Sidebar
              collapsed={collapsed}
              onToggle={handleToggle}
              isDesktop
            />
          </div>
        )}

        {/* ── Mobile drawer overlay (only on mobile) ────────────────────── */}
        {isMobile && (
          <>
            {/* Backdrop */}
            {drawerOpen && (
              <div
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
              />
            )}
            {/* Drawer */}
            <div
              className="fixed inset-y-0 left-0 z-50 flex flex-col"
              style={{
                width: 240,
                transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
              }}
            >
              <Sidebar
                collapsed={false}
                onToggle={() => setDrawerOpen(false)}
                isDesktop={false}
              />
            </div>
          </>
        )}

        {/* ── Main content: always fills remaining space, never obscured ── */}
        <main
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{ background: 'var(--background)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
