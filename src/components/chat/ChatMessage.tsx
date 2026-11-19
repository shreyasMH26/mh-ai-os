'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Copy, Check, Pencil } from 'lucide-react';
import type { ConversationMessage } from '@/stores/conversations';
import MarkdownRenderer from './MarkdownRenderer';
import ModelIndicator from './ModelIndicator';

interface ChatMessageProps {
  message: ConversationMessage;
  onRetry?: () => void;
  onEditAndResend?: (messageId: string, newContent: string) => void;
  isLastAssistant?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback silently
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] transition-all duration-150 hover:opacity-80"
      style={{ color: copied ? 'var(--status-active)' : 'var(--text-tertiary)' }}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function EditableUserMessage({
  message,
  onEditAndResend,
}: {
  message: ConversationMessage;
  onEditAndResend?: (messageId: string, newContent: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  const handleSubmit = () => {
    if (editValue.trim() && editValue.trim() !== message.content) {
      onEditAndResend?.(message.id, editValue.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setEditValue(message.content);
    }
  };

  if (editing) {
    return (
      <div className="flex justify-end mb-6">
        <div
          className="max-w-[75%] rounded-2xl rounded-tr-md overflow-hidden"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--accent)' }}
        >
          <textarea
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full bg-transparent text-sm px-4 pt-3 pb-2 outline-none resize-none leading-relaxed"
            style={{ color: 'var(--text-primary)', minWidth: '240px' }}
          />
          <div
            className="flex items-center justify-end gap-2 px-4 py-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => { setEditing(false); setEditValue(message.content); }}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!editValue.trim()}
              className="text-xs px-2 py-1 rounded-md disabled:opacity-40"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Resend ↵
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="group flex justify-end mb-6"
    >
      <div className="relative max-w-[75%]">
        <div
          className="px-4 py-3 rounded-2xl rounded-tr-md text-sm leading-relaxed"
          style={{
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        >
          {message.content}
        </div>

        {/* Edit button — on hover */}
        {onEditAndResend && (
          <button
            onClick={() => setEditing(true)}
            className="absolute -left-6 top-2 w-5 h-5 flex items-center justify-center rounded transition-all duration-150 opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-raised)]"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Edit message"
          >
            <Pencil size={11} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatMessageComponent({
  message,
  onRetry,
  onEditAndResend,
  isLastAssistant,
}: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <EditableUserMessage
        message={message}
        onEditAndResend={onEditAndResend}
      />
    );
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <ModelIndicator
        provider={message.provider}
        model={message.model}
        isStreaming={message.isStreaming}
      />

      {/* Error state */}
      {message.error ? (
        <div
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{
            background: 'rgba(248, 113, 113, 0.06)',
            border: '1px solid rgba(248, 113, 113, 0.15)',
          }}
        >
          <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
          <div className="flex-1">
            <p className="text-sm mb-2" style={{ color: '#f87171' }}>
              {message.error}
            </p>
            {onRetry && isLastAssistant && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs transition-all duration-150 hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                <RefreshCw size={11} />
                Try again
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="group relative text-sm">
          {message.content ? (
            <>
              <MarkdownRenderer content={message.content} />
              {/* Copy button — appears on hover when streaming is done */}
              {!message.isStreaming && (
                <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <CopyButton text={message.content} />
                  {onRetry && isLastAssistant && (
                    <button
                      onClick={onRetry}
                      className="flex items-center gap-1 text-[10px] transition-all duration-150 hover:opacity-80"
                      style={{ color: 'var(--text-tertiary)' }}
                      aria-label="Regenerate response"
                    >
                      <RefreshCw size={11} />
                      Regenerate
                    </button>
                  )}
                </div>
              )}
            </>
          ) : message.isStreaming ? (
            <div className="flex gap-1 items-center py-1">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-tertiary)' }} />
            </div>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}
