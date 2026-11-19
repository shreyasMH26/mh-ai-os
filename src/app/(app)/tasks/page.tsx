import PageTransition from '@/components/layout/PageTransition';
import { CheckSquare } from 'lucide-react';

export default function TasksPage() {
  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <CheckSquare size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <h1 className="display-md mb-3" style={{ color: 'var(--text-primary)' }}>
          Tasks
        </h1>
        <p className="body-lg max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Cross-workspace task management. Coming in Phase 14 with full project system integration.
        </p>
        <div
          className="inline-flex items-center gap-2 mt-6 px-3 py-1.5 rounded-full text-xs"
          style={{
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            color: '#fbbf24',
          }}
        >
          Coming in Phase 14
        </div>
      </div>
    </PageTransition>
  );
}
