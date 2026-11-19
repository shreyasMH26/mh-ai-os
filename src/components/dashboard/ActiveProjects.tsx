'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MOCK_PROJECTS } from '@/lib/mock/timeline';

const WORKSPACE_META: Record<string, { label: string; color: string }> = {
  xtich: { label: 'XTICH', color: '#e8d5b7' },
  build: { label: 'Build', color: '#86efac' },
  college: { label: 'College', color: '#93c5fd' },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'var(--status-active)' },
  paused: { label: 'Paused', color: 'var(--status-busy)' },
  completed: { label: 'Done', color: 'var(--text-tertiary)' },
};

function formatRelativeTimeClient(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return 'Recently';
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ActiveProjects() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="label" style={{ color: 'var(--text-tertiary)' }}>
          ACTIVE PROJECTS
        </p>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-xs transition-colors duration-150 hover:text-[var(--accent)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          All projects
          <ArrowRight size={10} />
        </Link>
      </div>

      <div>
        {MOCK_PROJECTS.map((project, i) => {
          const ws = WORKSPACE_META[project.workspace];
          const st = STATUS_META[project.status];
          const progress = Math.round((project.tasksCompleted / project.tasksTotal) * 100);
          const isLast = i === MOCK_PROJECTS.length - 1;

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="group py-4 cursor-pointer hover:bg-[var(--surface-raised)] -mx-3 px-3 rounded-lg transition-colors duration-150"
              style={!isLast ? { borderBottom: '1px solid var(--border-subtle)' } : {}}
            >
              {/* Row: workspace tag + title + meta */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Top line: workspace + status */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: ws.color }}
                    >
                      {ws.label}
                    </span>
                    <span style={{ color: 'var(--border)', fontSize: '10px' }}>·</span>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-1 h-1 rounded-full"
                        style={{ background: st.color }}
                      />
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {project.title}
                  </p>

                  {/* Description */}
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {project.description}
                  </p>
                </div>

                {/* Right meta */}
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {project.tasksCompleted}/{project.tasksTotal}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }} suppressHydrationWarning>
                    {formatRelativeTimeClient(project.lastActivity)}
                  </p>
                </div>
              </div>

              {/* Progress bar — thin, accent colored */}
              <div
                className="mt-3 h-0.5 rounded-full overflow-hidden"
                style={{ background: 'var(--border)' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06 + 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{ background: ws.color, opacity: 0.7 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
