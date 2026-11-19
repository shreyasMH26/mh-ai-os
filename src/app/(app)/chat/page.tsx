'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, PanelLeftOpen, PanelLeftClose, Zap } from 'lucide-react';
import PageTransition from '@/components/layout/PageTransition';
import ChatInput from '@/components/chat/ChatInput';
import ChatMessageComponent from '@/components/chat/ChatMessage';
import DemoBanner from '@/components/chat/DemoBanner';
import ConversationHistory from '@/components/chat/ConversationHistory';
import ModelSelector from '@/components/chat/ModelSelector';
import { useChat } from '@/hooks/useChat';
import { useProviderStatus } from '@/hooks/useProviderStatus';
import { useConversationStore } from '@/stores/conversations';
import { useModelSelectionStore } from '@/stores/modelSelection';
import type { ModelProvider } from '@/lib/types/model';

// ─── Starter prompts — always visible, populate composer on click ─────────────

const STARTER_PROMPTS = [
  { label: 'Build a landing page for XTICH', category: 'Build' },
  { label: 'Explain dynamic programming', category: 'College' },
  { label: 'Review my code for best practices', category: 'Code' },
  { label: 'Research a business idea', category: 'Strategy' },
  { label: 'Write a Python data pipeline', category: 'Build' },
  { label: 'Plan this week across all projects', category: 'Plan' },
];

export default function ChatPage() {
  const [inputValue, setInputValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { anyConfigured, loading: statusLoading } = useProviderStatus();
  const {
    activeId,
    conversations,
    getOrCreateEmpty,
    newConversation,
    setConversationProvider,
    setConversationMode,
  } = useConversationStore();

  // Idempotent init — reuse existing empty conversation, don't stack duplicates
  useEffect(() => {
    getOrCreateEmpty();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty deps — runs once on mount

  const { messages, status, error, send, stop, retry, editAndResend } = useChat();
  const activeConversation = conversations.find((c) => c.id === activeId);

  const isStreaming = status === 'streaming';
  const hasMessages = messages.length > 0;

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Global model selection from Settings — the persisted choice.
  // This is what the user set in Settings → AI Models.
  const { selected: globalSelection } = useModelSelectionStore();

  // Local per-session provider override — used by the in-Chat ModelSelector
  // to override the global selection for a single send without changing settings.
  // Initializes from the global selection so the UI reflects the current setting.
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider | undefined>(
    globalSelection?.provider
  );

  // Sync the local override whenever the global selection changes
  // (e.g. user updates in Settings in another tab — or navigates back from Settings)
  useEffect(() => {
    setSelectedProvider(globalSelection?.provider);
  }, [globalSelection?.provider]);

  // Reset local override to the global default when switching conversations,
  // NOT to undefined — preserve the user's selected provider across conversations.
  useEffect(() => {
    setSelectedProvider(globalSelection?.provider);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]); // intentionally does not re-run on globalSelection change (handled above)


  const handleSubmit = () => {
    if (!inputValue.trim() || isStreaming) return;
    // Pass selectedProvider (undefined = Auto) — never pass conv.provider directly
    send(inputValue.trim(), selectedProvider);
    setInputValue('');
  };

  const handleModelChange = (provider: ModelProvider | undefined) => {
    setSelectedProvider(provider);
    // Also persist to the conversation so the indicator updates after response
    if (activeId) setConversationProvider(activeId, provider as ModelProvider);
  };

  const handleNewConversation = () => {
    // If the current conversation is already empty, don't create another one —
    // just focus the composer so the user can start typing.
    if (activeConversation && activeConversation.messages.length === 0) {
      setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
      }, 50);
      return;
    }
    newConversation(activeConversation?.provider, activeConversation?.mode);
  };

  // On mobile, auto-close history sidebar
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setHistoryOpen(false);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <PageTransition>
      <div className="flex h-full">

        {/* ── Conversation History Sidebar ─────────────────────────── */}
        <AnimatePresence initial={false}>
          {historyOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? '100vw' : 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 overflow-hidden flex flex-col"
              style={{
                borderRight: '1px solid var(--border)',
                background: 'var(--surface)',
                // On mobile: full overlay
                ...(isMobile && {
                  position: 'absolute',
                  inset: 0,
                  zIndex: 50,
                  width: '100%',
                }),
              }}
            >
              <div className="flex-1 overflow-hidden p-3 pt-4">
                <ConversationHistory onSelect={() => isMobile && setHistoryOpen(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main chat area ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Top bar */}
          <div
            className="flex items-center justify-between px-3 sm:px-4 py-2 shrink-0 gap-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* History toggle */}
              <button
                onClick={() => setHistoryOpen((p) => !p)}
                className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-[var(--surface-raised)]"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={historyOpen ? 'Hide history' : 'Show history'}
              >
                {historyOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              </button>

              {/* Conversation title */}
              <span
                className="text-sm font-medium truncate"
                style={{ color: 'var(--text-secondary)', maxWidth: '180px' }}
              >
                {activeConversation?.title ?? 'New conversation'}
              </span>

              {/* Demo badge */}
              {activeConversation?.isDemo && hasMessages && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}
                >
                  Demo
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Model selector */}
              <ModelSelector
                value={selectedProvider}
                onChange={handleModelChange}
                compact
              />

              {/* Divider */}
              <div className="w-px h-3 hidden sm:block" style={{ background: 'var(--border)' }} />

              {/* New conversation */}
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all duration-150 hover:bg-[var(--surface-raised)]"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="New conversation"
              >
                <Plus size={12} />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          </div>

          {/* Messages / Empty state */}
          <div className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center min-h-full px-6 sm:px-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full max-w-md"
                >
                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
                  >
                    <Zap size={18} style={{ color: 'var(--accent)' }} />
                  </div>

                  <h1 className="heading-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                    Start a conversation
                  </h1>
                  <p
                    className="text-sm leading-relaxed mb-2"
                    style={{ color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto 1.5rem' }}
                  >
                    Route tasks to the right model. Build, research, plan, code — all from one place.
                  </p>

                  {/* Demo banner — only when unconfigured */}
                  {!statusLoading && !anyConfigured && (
                    <div className="mb-6 text-left">
                      <DemoBanner />
                    </div>
                  )}

                  {/* Starter prompts — always shown so user knows what to do */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt.label}
                        onClick={() => {
                          setInputValue(prompt.label);
                          // Focus textarea
                          setTimeout(() => {
                            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
                          }, 50);
                        }}
                        className="group flex items-start gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-150 hover:border-[var(--border)]"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border-subtle)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                            {prompt.label}
                          </p>
                          <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                            {prompt.category}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              /* ── Message list ── */
              <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full">
                {messages.map((message, i) => (
                  <ChatMessageComponent
                    key={message.id}
                    message={message}
                    onRetry={retry}
                    onEditAndResend={editAndResend}
                    isLastAssistant={
                      message.role === 'assistant' && i === messages.length - 1
                    }
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area — always anchored at bottom */}
          <div
            className="shrink-0 px-4 sm:px-6 pb-4 sm:pb-6 pt-3"
            style={{ borderTop: hasMessages ? '1px solid var(--border)' : 'none' }}
          >
            <div className="max-w-3xl mx-auto w-full">
              {/* Error bar */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mb-3 flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                    style={{
                      background: 'rgba(248,113,113,0.06)',
                      border: '1px solid rgba(248,113,113,0.15)',
                      color: '#f87171',
                    }}
                  >
                    <span>{error}</span>
                    <button
                      onClick={retry}
                      className="ml-3 underline underline-offset-2 hover:opacity-80"
                    >
                      Retry
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                onStop={stop}
                isStreaming={isStreaming}
                disabled={false} // Always enabled; server returns error if no key
              />

              {/* Provider status hint */}
              {!statusLoading && !anyConfigured && (
                <p className="text-center text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  Demo Mode —{' '}
                  <a
                    href="/settings"
                    className="underline underline-offset-2 transition-colors hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    add an API key
                  </a>
                  {' '}to enable real AI responses.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
