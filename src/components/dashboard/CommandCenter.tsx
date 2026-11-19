'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Square, RotateCcw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/useChat';
import { useOrchestrator } from '@/hooks/useOrchestrator';
import { useProviderStatus } from '@/hooks/useProviderStatus';
import { useConversationStore } from '@/stores/conversations';
import type { ExecutionMode } from '@/lib/types/task';
import type { ModelProvider } from '@/lib/types/model';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
import ModelIndicator from '@/components/chat/ModelIndicator';
import DemoBanner from '@/components/chat/DemoBanner';
import ModelSelector from '@/components/chat/ModelSelector';

const EXAMPLE_PROMPTS = [
  'Build a landing page for XTICH',
  'Explain dynamic programming with examples',
  'Design a REST API for EchoVerse',
  'Research competitor landscape for student brands',
  'Write a Python script to automate this task',
  'Plan this week across all my projects',
];

const MODE_CONFIG: Record<ExecutionMode, { label: string; description: string }> = {
  auto: { label: 'Auto', description: 'Orchestrator routes to best model' },
  manual: { label: 'Manual', description: 'You assign tasks to models' },
  council: { label: 'Council', description: 'All models respond and vote' },
};

export default function CommandCenter() {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<ExecutionMode>('auto');
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider | undefined>(undefined);
  const [promptIndex, setPromptIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const { anyConfigured, loading: statusLoading } = useProviderStatus();
  const { getOrCreateEmpty, activeId, setConversationMode } = useConversationStore();

  // Idempotent init — reuse existing empty conversation, don't stack duplicates
  useEffect(() => {
    getOrCreateEmpty();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally once on mount

  const { messages, status: chatStatus, send, stop: stopChat, retry } = useChat();
  const { status: orchStatus, synthesis, error: orchError, run: runOrchestrator, stop: stopOrch, reset: resetOrch } = useOrchestrator();

  // Routing: auto + council → orchestrator; manual → plain chat
  const useOrchestratorMode = mode === 'auto' || mode === 'council';

  const isStreaming = chatStatus === 'streaming';
  const isOrchestrating = orchStatus === 'decomposing' || orchStatus === 'executing' || orchStatus === 'synthesizing';
  const isProcessing = useOrchestratorMode ? isOrchestrating : isStreaming;

  const lastResponse = messages.filter((m) => m.role === 'assistant').at(-1);
  // Show orchestrator synthesis if in orch mode and synthesis exists, else show chat response
  const hasChatResponse = !useOrchestratorMode && Boolean(lastResponse?.content);
  const hasOrchResponse = useOrchestratorMode && (orchStatus === 'synthesizing' || orchStatus === 'complete') && synthesis.length > 0;
  const hasResponse = hasChatResponse || hasOrchResponse;
  const canSubmit = Boolean(value.trim()) && !isProcessing;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  // Scroll to response
  useEffect(() => {
    if (messages.length > 0 && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length]);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || isProcessing) return;
    if (activeId) setConversationMode(activeId, mode);
    const trimmed = value.trim();
    setValue('');

    if (useOrchestratorMode) {
      // Reset any prior orchestration before starting new one
      resetOrch();
      runOrchestrator({ objective: trimmed, mode });
    } else {
      // Manual mode: plain chat with selected provider
      send(trimmed, selectedProvider);
    }
  }, [value, isProcessing, send, selectedProvider, mode, activeId, setConversationMode, useOrchestratorMode, runOrchestrator, resetOrch]);

  const handleStop = useCallback(() => {
    if (useOrchestratorMode) stopOrch();
    else stopChat();
  }, [useOrchestratorMode, stopOrch, stopChat]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleModeChange = (newMode: ExecutionMode) => {
    setMode(newMode);
    if (activeId) setConversationMode(activeId, newMode);
    // Reset orchestrator output when switching modes
    resetOrch();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Demo banner — only when unconfigured */}
      <AnimatePresence>
        {!statusLoading && !anyConfigured && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <DemoBanner />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input surface */}
      <div
        className="relative rounded-xl overflow-hidden transition-shadow duration-200"
        style={{
          background: 'var(--surface)',
          border: `1px solid ${isFocused ? 'rgba(232,213,183,0.3)' : 'var(--border)'}`,
          boxShadow: isFocused ? '0 0 0 3px rgba(232,213,183,0.06)' : 'none',
        }}
      >
        {/* Text input */}
        <div className="px-5 pt-5 pb-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={EXAMPLE_PROMPTS[promptIndex]}
            rows={2}
            disabled={isStreaming}
            aria-label="What are we building today?"
            className={cn(
              'w-full resize-none bg-transparent outline-none leading-relaxed',
              'placeholder:text-[var(--text-tertiary)]',
              isStreaming && 'opacity-50',
            )}
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-sans)',
              fontSize: '0.9375rem',
              minHeight: '3.5rem',
              maxHeight: '180px',
            }}
          />
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {/* Left: Mode + Model + Utilities */}
          <div className="flex items-center gap-1">
            {/* Mode tabs */}
            {(Object.entries(MODE_CONFIG) as [ExecutionMode, typeof MODE_CONFIG[ExecutionMode]][]).map(([m, cfg]) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                title={cfg.description}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium transition-all duration-150',
                  mode === m
                    ? 'text-[var(--background)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
                style={{
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  letterSpacing: '0.02em',
                }}
              >
                {cfg.label}
              </button>
            ))}

            {/* Divider */}
            <div className="w-px h-3 mx-1.5" style={{ background: 'var(--border)' }} />

            {/* Model selector */}
            <ModelSelector
              value={selectedProvider}
              onChange={setSelectedProvider}
              compact
            />

            {/* Divider */}
            <div className="w-px h-3 mx-1.5" style={{ background: 'var(--border)' }} />

            {/* Cycle example */}
            <button
              onClick={() => {
                const next = (promptIndex + 1) % EXAMPLE_PROMPTS.length;
                setPromptIndex(next);
                setValue(EXAMPLE_PROMPTS[next]);
              }}
              disabled={isStreaming}
              className="text-xs transition-all duration-150 hover:text-[var(--text-secondary)] disabled:opacity-40 px-1.5 py-1"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Try example prompt"
            >
              Example
            </button>

            <Link
              href="/chat"
              className="flex items-center gap-1 text-xs transition-all duration-150 hover:text-[var(--text-secondary)] px-1.5 py-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Full chat
              <ExternalLink size={9} />
            </Link>
          </div>

          {/* Right: Submit / Stop */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>
              {isOrchestrating
                ? orchStatus === 'decomposing' ? 'Planning…' : orchStatus === 'synthesizing' ? 'Synthesising…' : 'Executing…'
                : isStreaming ? 'Generating…' : '↵ Send'}
            </span>

            {isProcessing ? (
              <button
                onClick={handleStop}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 hover:opacity-80"
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
                aria-label="Stop"
              >
                <Square size={11} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200',
                  canSubmit ? 'hover:opacity-90 active:scale-95' : 'opacity-25 cursor-not-allowed'
                )}
                style={{
                  background: canSubmit ? 'var(--accent)' : 'var(--surface-raised)',
                  color: canSubmit ? 'var(--accent-fg)' : 'var(--text-tertiary)',
                }}
                aria-label="Send prompt"
              >
                <ArrowUp size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick chips — only when no response */}
      <AnimatePresence>
        {!hasResponse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap gap-2 mt-3"
          >
            {['Build website', 'Review code', 'Research topic', 'Plan project'].map((label) => (
              <button
                key={label}
                onClick={() => setValue(label)}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-full text-xs transition-all duration-150 hover:border-[var(--text-tertiary)] disabled:opacity-40"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline response panel */}
      <AnimatePresence>
        {hasResponse && (
          <motion.div
            ref={responseRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              overflow: 'hidden',
            }}
          >
            {/* Response header */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {hasOrchResponse ? (
                /* Orchestrator header */
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: orchStatus === 'synthesizing' ? 'var(--status-busy)' : 'var(--status-active)' }}
                  />
                  <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: 'var(--accent)' }}>
                    {orchStatus === 'synthesizing' ? 'Synthesising…' : 'Orchestration Complete'}
                  </span>
                  {orchStatus === 'complete' && (
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      · Multi-agent
                    </span>
                  )}
                </div>
              ) : (
                /* Chat header */
                <ModelIndicator
                  provider={lastResponse?.provider}
                  model={lastResponse?.model}
                  isStreaming={lastResponse?.isStreaming}
                />
              )}

              {/* Actions */}
              {hasOrchResponse && orchStatus === 'complete' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { resetOrch(); setValue(''); }}
                    className="flex items-center gap-1 text-xs transition-all duration-150 hover:opacity-80"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <RotateCcw size={10} />
                    New
                  </button>
                  <Link
                    href="/chat"
                    className="text-xs transition-all duration-150 hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Continue →
                  </Link>
                </div>
              )}
              {hasChatResponse && !lastResponse?.isStreaming && !lastResponse?.error && lastResponse?.content && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={retry}
                    className="flex items-center gap-1 text-xs transition-all duration-150 hover:opacity-80"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label="Regenerate"
                  >
                    <RotateCcw size={10} />
                    Regenerate
                  </button>
                  <Link
                    href="/chat"
                    className="text-xs transition-all duration-150 hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Continue →
                  </Link>
                </div>
              )}
            </div>

            {/* Response body */}
            <div className="px-4 py-4 max-h-80 overflow-y-auto text-sm">
              {hasOrchResponse ? (
                orchError ? (
                  <p style={{ color: '#f87171' }}>{orchError}</p>
                ) : synthesis ? (
                  <MarkdownRenderer content={synthesis} />
                ) : (
                  <div className="flex gap-1 items-center py-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-tertiary)' }} />
                  </div>
                )
              ) : lastResponse?.error ? (
                <p style={{ color: '#f87171' }}>{lastResponse.error}</p>
              ) : lastResponse?.content ? (
                <MarkdownRenderer content={lastResponse.content} />
              ) : lastResponse?.isStreaming ? (
                <div className="flex gap-1 items-center py-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-tertiary)' }} />
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
