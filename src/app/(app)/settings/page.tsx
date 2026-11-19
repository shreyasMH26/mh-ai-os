'use client';

/**
 * Settings — AI Models + Personal Memory
 *
 * AI Models: live provider status, clickable model selection.
 * Memory: persistent user facts injected into every chat session.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Trash2, Plus, Brain } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import { PROVIDERS } from '@/lib/constants/models';
import { useProviderStore } from '@/stores/providerStatus';
import { useModelSelectionStore } from '@/stores/modelSelection';
import { useMemoryStore } from '@/stores/memory';
import type { ModelProvider } from '@/lib/types/model';

const SETTINGS_SECTIONS = [
  'General',
  'Appearance',
  'AI Models',
  'Routing',
  'Memory',
  'Integrations',
  'Notifications',
  'Security',
  'Usage',
];

const ENV_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d4a36e',
  google: '#4285f4',
};

type ActiveSection = 'AI Models' | 'Memory';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('AI Models');
  const [newMemoryText, setNewMemoryText] = useState('');

  const { providers, anyConfigured, loading, error, fetch: fetchStatus } = useProviderStore();
  const { selected, setSelected } = useModelSelectionStore();
  const { memories, addMemory, removeMemory, clearAll } = useMemoryStore();

  // Force fresh provider status on mount
  useEffect(() => {
    useProviderStore.setState({ fetched: false });
    fetchStatus();
  }, [fetchStatus]);

  const statusMap = new Map<string, boolean>(
    providers.map((p) => [p.provider, p.configured])
  );

  const handleSelectModel = (provider: ModelProvider, modelId: string, isConfigured: boolean) => {
    if (!isConfigured) return;
    if (selected?.provider === provider && selected?.model === modelId) {
      setSelected(null);
    } else {
      setSelected({ provider, model: modelId });
    }
  };

  const handleAddMemory = () => {
    const text = newMemoryText.trim();
    if (text.length >= 5) {
      addMemory(text, 'user');
      setNewMemoryText('');
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-full">

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <div className="w-48 shrink-0 p-4" style={{ borderRight: '1px solid var(--border)' }}>
          <p className="label mb-3" style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
            SETTINGS
          </p>
          <div className="space-y-0.5">
            {SETTINGS_SECTIONS.map((section) => {
              const navigable = section === 'AI Models' || section === 'Memory';
              const isActive = section === activeSection;
              return (
                <button
                  key={section}
                  onClick={() => {
                    if (section === 'AI Models') setActiveSection('AI Models');
                    if (section === 'Memory') setActiveSection('Memory');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-all duration-150 hover:bg-[var(--surface-raised)]"
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--surface-raised)' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                    cursor: navigable ? 'pointer' : 'default',
                    opacity: navigable ? 1 : 0.45,
                  }}
                >
                  <span className="flex items-center justify-between">
                    {section}
                    {section === 'Memory' && memories.length > 0 && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--accent)', color: 'white', lineHeight: 1.4 }}
                      >
                        {memories.length}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="flex-1 px-6 sm:px-8 py-8 max-w-2xl">

          {/* ══ AI Models ══════════════════════════════════════════════════════ */}
          {activeSection === 'AI Models' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="heading-lg" style={{ color: 'var(--text-primary)' }}>AI Models</h1>
                <div className="flex items-center gap-3">
                  {selected && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: `${PROVIDER_COLORS[selected.provider] ?? 'var(--accent)'}18`,
                        color: PROVIDER_COLORS[selected.provider] ?? 'var(--accent)',
                        border: `1px solid ${PROVIDER_COLORS[selected.provider] ?? 'var(--accent)'}30`,
                      }}
                    >
                      Active: {selected.model}
                    </span>
                  )}
                  {!loading && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: anyConfigured ? 'var(--status-active)' : 'var(--status-idle)',
                          boxShadow: anyConfigured ? '0 0 6px var(--status-active)' : 'none',
                        }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {anyConfigured ? 'Live' : 'Demo Mode'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                Select a model to use in Chat. API keys are stored server-side only.
              </p>
              <p className="text-xs mb-8" style={{ color: 'var(--text-tertiary)' }}>
                {selected
                  ? <>All Chat messages will use <strong style={{ color: 'var(--text-secondary)' }}>{selected.model}</strong>. Click it again to switch back to Auto.</>
                  : 'No model selected — Chat uses the default configured provider automatically.'}
              </p>

              {error && !loading && (
                <div
                  className="mb-6 px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}
                >
                  Could not load provider status: {error}
                </div>
              )}

              <div className="space-y-4">
                {PROVIDERS.map((provider, idx) => {
                  const isConfigured = statusMap.get(provider.provider) ?? false;
                  const color = PROVIDER_COLORS[provider.provider] ?? 'var(--accent)';
                  return (
                    <motion.div
                      key={provider.provider}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      className="p-5 rounded-xl"
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid ${isConfigured && !loading ? `${color}22` : 'var(--border)'}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: color, opacity: isConfigured && !loading ? 1 : 0.3 }} />
                          <div>
                            <p className="heading-sm" style={{ color: 'var(--text-primary)' }}>{provider.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Default: {provider.defaultModel}</p>
                          </div>
                        </div>
                        {loading ? (
                          <span className="text-xs px-2.5 py-1 rounded-full animate-pulse"
                            style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)', border: '1px solid var(--border)', minWidth: 80, display: 'inline-block', textAlign: 'center' }}>
                            Checking...
                          </span>
                        ) : isConfigured ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ background: `${color}14`, color, border: `1px solid ${color}30` }}>
                            Connected
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                            Not configured
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        {provider.models.map((model) => {
                          const isActive = selected?.provider === provider.provider && selected?.model === model.id;
                          const isSelectable = isConfigured && !loading;
                          return (
                            <button
                              key={model.id}
                              onClick={() => handleSelectModel(provider.provider as ModelProvider, model.id, isConfigured)}
                              disabled={!isSelectable}
                              className="w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all duration-150"
                              style={{
                                background: isActive ? `${color}12` : 'var(--surface-raised)',
                                border: `1px solid ${isActive ? `${color}40` : 'transparent'}`,
                                cursor: isSelectable ? 'pointer' : 'default',
                                opacity: isSelectable ? 1 : 0.5,
                              }}
                              title={!isSelectable ? `${provider.name} not configured` : isActive ? 'Active — click to deselect' : `Select ${model.name}`}
                            >
                              <div>
                                <p className="text-sm font-medium" style={{ color: isActive ? color : 'var(--text-primary)' }}>
                                  {model.name}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                  {(model.contextLimit / 1000).toFixed(0)}k ctx · {model.costTier} cost · {model.latencyTier} latency
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex gap-1.5 flex-wrap justify-end max-w-[120px]">
                                  {model.capabilities.slice(0, 3).map((cap) => (
                                    <span key={cap} className="text-[9px] px-1.5 py-0.5 rounded"
                                      style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
                                      {cap}
                                    </span>
                                  ))}
                                </div>
                                {isActive && (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: color }}>
                                    <Check size={11} color="white" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 p-3 rounded-lg text-xs"
                        style={{
                          background: isConfigured ? `${color}08` : 'var(--surface-raised)',
                          color: 'var(--text-tertiary)',
                          border: isConfigured ? `1px dashed ${color}25` : '1px dashed var(--border)',
                        }}>
                        <code style={{ color: isConfigured ? color : 'var(--text-secondary)', opacity: isConfigured ? 0.8 : 1 }}>
                          {ENV_KEYS[provider.provider]}=
                        </code>
                        <span>{isConfigured ? '✓ configured in .env.local' : '→ Add to .env.local to enable'}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-xs mt-8" style={{ color: 'var(--text-tertiary)' }}>
                Keys are read server-side from <code style={{ color: 'var(--text-secondary)' }}>.env.local</code> and are never sent to the browser.
                Restart the dev server after adding a key.
              </p>
            </>
          )}

          {/* ══ Memory ═════════════════════════════════════════════════════════ */}
          {activeSection === 'Memory' && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Brain size={20} style={{ color: 'var(--accent)' }} />
                <h1 className="heading-lg" style={{ color: 'var(--text-primary)' }}>Personal Memory</h1>
                {memories.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--accent)18', color: 'var(--accent)', border: '1px solid var(--accent)30' }}>
                    {memories.length} {memories.length === 1 ? 'fact' : 'facts'}
                  </span>
                )}
              </div>

              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                Facts saved here are injected into every chat session, across all providers.
              </p>
              <p className="text-xs mb-8" style={{ color: 'var(--text-tertiary)' }}>
                Save from Chat by saying:{' '}
                <code style={{ color: 'var(--accent)' }}>&quot;Remember that I am a CSE student.&quot;</code>
              </p>

              {/* Manual add */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Add a memory manually…"
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddMemory(); }}
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleAddMemory}
                  disabled={newMemoryText.trim().length < 5}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-opacity duration-150"
                  style={{ background: 'var(--accent)', color: 'white', opacity: newMemoryText.trim().length >= 5 ? 1 : 0.4 }}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              {/* Memory list */}
              {memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}>
                  <Brain size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '12px', opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No memories saved yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Say &quot;Remember that…&quot; in Chat or add one above
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map((memory, idx) => (
                    <motion.div
                      key={memory.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{memory.fact}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {memory.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
                              {memory.category}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {new Date(memory.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeMemory(memory.id)}
                        className="shrink-0 p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--surface-raised)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Delete this memory"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {memories.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Delete all ${memories.length} memories? This cannot be undone.`)) {
                      clearAll();
                    }
                  }}
                  className="mt-6 text-xs px-3 py-1.5 rounded-lg transition-colors duration-150"
                  style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)' }}
                >
                  Clear all memories
                </button>
              )}
            </>
          )}

        </div>
      </div>
    </PageTransition>
  );
}
