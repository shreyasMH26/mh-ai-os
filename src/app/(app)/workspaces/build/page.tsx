import PageTransition from '@/components/layout/PageTransition';

const SECTIONS = [
  { label: 'Projects', desc: 'All software and web projects' },
  { label: 'Repositories', desc: 'GitHub integration (Phase 17)' },
  { label: 'Tasks', desc: 'Development task management' },
  { label: 'Architecture', desc: 'System design and diagrams' },
  { label: 'Code', desc: 'AI-assisted code editor' },
  { label: 'Deployments', desc: 'Vercel and hosting status' },
  { label: 'Bugs', desc: 'Issue tracking and debugging' },
  { label: 'AI Coding Agents', desc: 'Coding Agent and Review Agent' },
];

export default function BuildPage() {
  return (
    <PageTransition>
      <div className="px-4 sm:px-8 py-6 sm:py-8 overflow-x-hidden">
        <div
          className="mb-10 pb-8"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-3 rounded-full" style={{ background: '#86efac' }} />
            <span className="label" style={{ color: '#86efac', letterSpacing: '0.12em' }}>
              WORKSPACE
            </span>
          </div>
          <h1 className="display-md mb-2" style={{ color: 'var(--text-primary)' }}>
            Build
          </h1>
          <p className="body-lg max-w-lg" style={{ color: 'var(--text-secondary)' }}>
            Software and web development workspace. The Coding Agent, Website Agent, and QA Agent operate here. Architect, build, deploy, and iterate at the speed of thought.
          </p>
          <div
            className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full text-xs"
            style={{
              background: 'rgba(134, 239, 172, 0.08)',
              border: '1px solid rgba(134, 239, 172, 0.2)',
              color: '#86efac',
            }}
          >
            Dev workspace — Phase 1 placeholder
          </div>
        </div>

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
