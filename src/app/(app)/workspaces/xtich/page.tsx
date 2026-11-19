import PageTransition from '@/components/layout/PageTransition';

const SECTIONS = [
  { label: 'Overview', desc: 'Business health, KPIs, and recent AI activity' },
  { label: 'Projects', desc: 'Active projects and their status' },
  { label: 'Leads', desc: 'Customer enquiries and pipeline' },
  { label: 'Tasks', desc: 'Business operations tasks' },
  { label: 'Content', desc: 'Content calendar and drafts' },
  { label: 'Documents', desc: 'Brand assets and business docs' },
  { label: 'AI Agents', desc: 'Business Agent and Content Agent' },
  { label: 'Analytics', desc: 'Business performance insights' },
  { label: 'Settings', desc: 'Workspace preferences' },
];

export default function XTICHPage() {
  return (
    <PageTransition>
      <div className="px-4 sm:px-8 py-6 sm:py-8 overflow-x-hidden">
        {/* Workspace header */}
        <div
          className="mb-10 pb-8"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-3 rounded-full" style={{ background: '#e8d5b7' }} />
            <span className="label" style={{ color: '#e8d5b7', letterSpacing: '0.12em' }}>
              WORKSPACE
            </span>
          </div>
          <h1 className="display-md mb-2" style={{ color: 'var(--text-primary)' }}>
            XTICH
          </h1>
          <p className="body-lg max-w-lg" style={{ color: 'var(--text-secondary)' }}>
            Student-focused apparel and branding startup. The Business Agent and Content Agent operate within this workspace with full context of your brand.
          </p>
          <div
            className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full text-xs"
            style={{
              background: 'rgba(232, 213, 183, 0.08)',
              border: '1px solid rgba(232, 213, 183, 0.2)',
              color: '#e8d5b7',
            }}
          >
            Business workspace — Phase 1 placeholder
          </div>
        </div>

        {/* Sections grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SECTIONS.map((section) => (
            <div
              key={section.label}
              className="p-4 rounded-xl cursor-pointer transition-all duration-150 hover:bg-[var(--surface-raised)]"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                {section.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {section.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
