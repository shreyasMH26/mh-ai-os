import PageTransition from '@/components/layout/PageTransition';

const SECTIONS = [
  { label: 'Subjects', desc: 'Course-wise subject breakdown and notes' },
  { label: 'Assignments', desc: 'Deadlines, progress, and AI assistance' },
  { label: 'Projects', desc: 'CSE lab and academic projects' },
  { label: 'Notes', desc: 'Structured notes with AI summaries' },
  { label: 'Study Plans', desc: 'AI-generated study schedules' },
  { label: 'Research', desc: 'Academic research and paper analysis' },
  { label: 'Documents', desc: 'PDFs, papers, and reference material' },
  { label: 'Viva Prep', desc: 'Mock Q&A and concept reinforcement' },
  { label: 'AI Tutor', desc: 'Deep concept explanations on demand' },
];

export default function CollegePage() {
  return (
    <PageTransition>
      <div className="px-4 sm:px-8 py-6 sm:py-8 overflow-x-hidden">
        <div
          className="mb-10 pb-8"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-3 rounded-full" style={{ background: '#93c5fd' }} />
            <span className="label" style={{ color: '#93c5fd', letterSpacing: '0.12em' }}>
              WORKSPACE
            </span>
          </div>
          <h1 className="display-md mb-2" style={{ color: 'var(--text-primary)' }}>
            College
          </h1>
          <p className="body-lg max-w-lg" style={{ color: 'var(--text-secondary)' }}>
            CSE academic workspace. The College Agent helps you understand, not just complete. It explains concepts, challenges your thinking, and prepares you for evaluations.
          </p>
          <div
            className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full text-xs"
            style={{
              background: 'rgba(147, 197, 253, 0.08)',
              border: '1px solid rgba(147, 197, 253, 0.2)',
              color: '#93c5fd',
            }}
          >
            Academic workspace — Phase 1 placeholder
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
