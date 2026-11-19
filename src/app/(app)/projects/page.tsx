import PageTransition from '@/components/layout/PageTransition';
import { MOCK_PROJECTS } from '@/lib/mock/timeline';
import { formatRelativeTime } from '@/lib/utils';

const WORKSPACE_META: Record<string, { label: string; color: string }> = {
  xtich: { label: 'XTICH', color: '#e8d5b7' },
  build: { label: 'Build', color: '#86efac' },
  college: { label: 'College', color: '#93c5fd' },
};

export default function ProjectsPage() {
  return (
    <PageTransition>
      <div className="px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="label" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
              ALL PROJECTS
            </span>
          </div>
          <h1 className="display-md mb-2" style={{ color: 'var(--text-primary)' }}>
            Projects
          </h1>
          <p className="body-lg" style={{ color: 'var(--text-secondary)' }}>
            Every active project across all workspaces, with shared AI context and memory.
          </p>
        </div>

        <div className="space-y-3">
          {MOCK_PROJECTS.map((project) => {
            const ws = WORKSPACE_META[project.workspace];
            const progress = Math.round((project.tasksCompleted / project.tasksTotal) * 100);
            return (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-150 hover:bg-[var(--surface-raised)]"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-2 h-10 rounded-full shrink-0"
                    style={{ background: ws.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {project.title}
                      </p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: `${ws.color}15`, color: ws.color }}
                      >
                        {ws.label}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {project.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {progress}%
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {project.tasksCompleted}/{project.tasksTotal} tasks
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }} suppressHydrationWarning>
                      {formatRelativeTime(project.lastActivity)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
