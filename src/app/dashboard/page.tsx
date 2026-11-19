import PageTransition from '@/components/layout/PageTransition';
import HeroSection from '@/components/dashboard/HeroSection';
import CommandCenter from '@/components/dashboard/CommandCenter';
import ActiveProjects from '@/components/dashboard/ActiveProjects';
import AITeamStatus from '@/components/dashboard/AITeamStatus';
import ExecutionTimeline from '@/components/orchestrator/ExecutionTimeline';

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="min-h-screen">

        {/* ── Hero + Command — primary action zone ─────────────────────── */}
        <div
          className="px-6 md:px-8 pt-10 pb-10"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <HeroSection />

          {/* Command Center — primary interaction, generous spacing */}
          <div className="mt-10 max-w-2xl">
            <CommandCenter />
          </div>
        </div>

        {/* ── Secondary content ─────────────────────────────────────────── */}
        {/* Desktop: 3-col grid. Tablet: 2-col. Mobile: single column */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">

          {/* Active Projects — 2 cols on desktop */}
          <div
            className="md:col-span-2 px-6 md:px-8 py-8"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <ActiveProjects />
          </div>

          {/* Right panel — AI Team + Timeline */}
          <div
            className="flex flex-col"
            style={{ borderLeft: '0px', borderTop: '0px' }}
          >
            {/* AI Team Status */}
            <div
              className="px-6 py-8"
              style={{ borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}
            >
              <AITeamStatus />
            </div>

            {/* Execution Timeline */}
            <div
              className="px-6 py-8"
              style={{ borderLeft: '1px solid var(--border)' }}
            >
              <ExecutionTimeline />
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
