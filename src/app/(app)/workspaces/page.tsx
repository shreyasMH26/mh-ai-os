import PageTransition from '@/components/layout/PageTransition';
import Link from 'next/link';

const WORKSPACES = [
  {
    id: 'xtich',
    name: 'XTICH',
    description: 'Student-focused apparel and branding startup. Run business operations, manage leads, plan content, and grow the brand with AI support.',
    color: '#e8d5b7',
    href: '/workspaces/xtich',
    sections: ['Overview', 'Projects', 'Leads', 'Tasks', 'Content', 'Documents', 'Analytics'],
    status: 'Active',
  },
  {
    id: 'college',
    name: 'College',
    description: 'CSE academic workspace. Understand concepts deeply, prepare for exams and vivas, manage assignments, and build real projects.',
    color: '#93c5fd',
    href: '/workspaces/college',
    sections: ['Subjects', 'Assignments', 'Projects', 'Notes', 'Study Plans', 'Research', 'AI Tutor'],
    status: 'Active',
  },
  {
    id: 'build',
    name: 'Build',
    description: 'Software and web development workspace. Architect, code, deploy, and iterate on software projects with an AI engineering team.',
    color: '#86efac',
    href: '/workspaces/build',
    sections: ['Projects', 'Repositories', 'Tasks', 'Architecture', 'Code', 'Deployments', 'Bugs'],
    status: 'Active',
  },
];

export default function WorkspacesPage() {
  return (
    <PageTransition>
      <div className="px-8 py-8">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="label" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
              WORKSPACES
            </span>
          </div>
          <h1 className="display-md mb-2" style={{ color: 'var(--text-primary)' }}>
            Your Contexts
          </h1>
          <p className="body-lg" style={{ color: 'var(--text-secondary)' }}>
            Each workspace maintains its own memory, projects, agents, and context.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {WORKSPACES.map((ws) => (
            <Link key={ws.id} href={ws.href}>
              <div
                className="group p-6 rounded-xl h-full cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${ws.color}30`,
                }}
              >
                {/* Color bar */}
                <div
                  className="w-8 h-1 rounded-full mb-5"
                  style={{ background: ws.color }}
                />
                <h2 className="heading-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                  {ws.name}
                </h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {ws.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ws.sections.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-2 py-0.5 rounded-md"
                      style={{
                        background: `${ws.color}12`,
                        color: ws.color,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
