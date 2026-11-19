import PageTransition from '@/components/layout/PageTransition';

const INTEGRATIONS = [
  {
    category: 'AI Providers',
    items: [
      { id: 'openai', name: 'OpenAI', desc: 'GPT-4o and GPT-4o Mini', color: '#10a37f', symbol: 'OA', phase: 5 },
      { id: 'anthropic', name: 'Anthropic', desc: 'Claude Opus 4.5 and Haiku 3.5', color: '#d4a36e', symbol: 'AN', phase: 6 },
      { id: 'google', name: 'Google Gemini', desc: 'Gemini 2.5 Pro and 2.0 Flash', color: '#4285f4', symbol: 'GM', phase: 7 },
    ],
  },
  {
    category: 'Development',
    items: [
      { id: 'github', name: 'GitHub', desc: 'Repositories, PRs, and code review', color: '#f0f0f0', symbol: 'GH', phase: 17 },
      { id: 'vercel', name: 'Vercel', desc: 'Deployments and preview URLs', color: '#ffffff', symbol: 'VL', phase: 23 },
    ],
  },
  {
    category: 'Productivity',
    items: [
      { id: 'gdrive', name: 'Google Drive', desc: 'Documents and file storage', color: '#34a853', symbol: 'GD', phase: 18 },
      { id: 'gcal', name: 'Google Calendar', desc: 'Events and scheduling', color: '#4285f4', symbol: 'GC', phase: 18 },
      { id: 'gmail', name: 'Gmail', desc: 'Email with AI assist', color: '#ea4335', symbol: 'GM', phase: 18 },
      { id: 'notion', name: 'Notion', desc: 'Docs and knowledge base', color: '#ffffff', symbol: 'NT', phase: 18 },
    ],
  },
  {
    category: 'Automation',
    items: [
      { id: 'n8n', name: 'n8n', desc: 'Workflow automation engine', color: '#ff6d5a', symbol: 'N8', phase: 18 },
    ],
  },
  {
    category: 'Messaging',
    items: [
      { id: 'telegram', name: 'Telegram', desc: 'Notifications and bot commands', color: '#2aabee', symbol: 'TG', phase: 18 },
    ],
  },
];

export default function IntegrationsPage() {
  return (
    <PageTransition>
      <div className="px-8 py-8">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="label" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
              INTEGRATIONS
            </span>
          </div>
          <h1 className="display-md mb-2" style={{ color: 'var(--text-primary)' }}>
            Connect Your Stack
          </h1>
          <p className="body-lg" style={{ color: 'var(--text-secondary)' }}>
            Connect external services. API keys are stored server-side and never exposed to the client.
          </p>
        </div>

        <div className="space-y-8">
          {INTEGRATIONS.map((group) => (
            <div key={group.category}>
              <p className="label mb-4" style={{ color: 'var(--text-tertiary)' }}>
                {group.category.toUpperCase()}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-xl transition-all duration-150 hover:bg-[var(--surface-raised)]"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                        style={{
                          background: `${item.color}18`,
                          color: item.color,
                        }}
                      >
                        {item.symbol}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span
                        className="text-[10px] px-2 py-1 rounded-full font-medium"
                        style={{
                          background: 'rgba(251, 191, 36, 0.1)',
                          color: '#fbbf24',
                          border: '1px solid rgba(251, 191, 36, 0.15)',
                        }}
                      >
                        Phase {item.phase}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-8 p-4 rounded-xl text-sm"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-tertiary)',
          }}
        >
          🔒 All API keys are stored as server-side environment variables and never exposed to the frontend. Configure in{' '}
          <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}>
            .env.local
          </code>
          .
        </div>
      </div>
    </PageTransition>
  );
}
