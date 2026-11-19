'use client';

import { useRef, useEffect, useState } from 'react';
import { Paperclip, ArrowUp, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  disabled,
  placeholder = 'Message your AI team...',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  const canSubmit = !isStreaming && Boolean(value.trim()) && !disabled;

  return (
    <div
      className="rounded-xl transition-all duration-200"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isFocused ? 'rgba(232,213,183,0.35)' : 'var(--border)'}`,
        boxShadow: isFocused ? '0 0 0 3px rgba(232,213,183,0.07)' : 'none',
      }}
    >
      {/* Text area */}
      <div className="flex items-end gap-3 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={1}
          disabled={disabled || isStreaming}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed',
            'placeholder:text-[var(--text-tertiary)]',
            (disabled || isStreaming) && 'opacity-60 cursor-default'
          )}
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-sans)',
            minHeight: '1.5rem',
            maxHeight: '200px',
          }}
          aria-label="Chat message input"
        />

        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          {/* Attachment */}
          <button
            className="p-1.5 rounded-md transition-all duration-150 hover:bg-[var(--surface-raised)] disabled:opacity-30"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Attach file"
            disabled={isStreaming || disabled}
            title="Attach file (coming soon)"
          >
            <Paperclip size={14} />
          </button>

          {/* Stop / Send */}
          {isStreaming ? (
            <button
              onClick={onStop}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:opacity-80 active:scale-95"
              style={{
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              aria-label="Stop generation"
            >
              <Square size={12} />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                canSubmit ? 'hover:opacity-90 active:scale-95' : 'opacity-25 cursor-not-allowed'
              )}
              style={{
                background: canSubmit ? 'var(--accent)' : 'var(--surface-raised)',
                color: canSubmit ? 'var(--accent-fg)' : 'var(--text-tertiary)',
              }}
              aria-label="Send message"
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div
        className="flex items-center justify-between px-4 pb-2.5"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {isStreaming ? (
            <span className="flex items-center gap-1">
              <Loader2 size={9} className="animate-spin" />
              Generating
            </span>
          ) : (
            '↵ Send · ⇧↵ New line'
          )}
        </span>

        {/* Right: character count when value is long */}
        {value.length > 200 && !isStreaming && (
          <span className="text-[10px]" style={{ color: value.length > 3000 ? '#f87171' : 'var(--text-tertiary)' }}>
            {value.length}
          </span>
        )}
      </div>
    </div>
  );
}
