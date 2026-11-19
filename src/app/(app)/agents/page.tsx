import PageTransition from '@/components/layout/PageTransition';
import AgentCard from '@/components/agents/AgentCard';
import { AGENTS } from '@/lib/constants/agents';

export default function AgentsPage() {
  return (
    <PageTransition>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="label" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
              INTELLIGENCE LAYER
            </span>
          </div>
          <h1 className="display-md mb-2" style={{ color: 'var(--text-primary)' }}>
            Your AI Team
          </h1>
          <p className="body-lg max-w-lg" style={{ color: 'var(--text-secondary)' }}>
            Ten specialized agents ready to be orchestrated across your work. Each agent has a preferred model, distinct capabilities, and a defined role in the system.
          </p>
        </div>

        {/* Stats bar */}
        <div
          className="flex items-center gap-8 mb-8 pb-6"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {[
            { value: '10', label: 'Total agents' },
            { value: '1', label: 'Active' },
            { value: '9', label: 'Idle' },
            { value: '3', label: 'Models used' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {stat.value}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {AGENTS.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} />
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
