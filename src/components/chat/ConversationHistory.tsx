'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useConversationStore } from '@/stores/conversations';
import { cn } from '@/lib/utils';

import type { Conversation } from '@/stores/conversations';

interface ConversationHistoryProps {
  onSelect?: (id: string) => void;
}

function groupByDate(items: Conversation[]) {
  const now = Date.now();
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const older: Conversation[] = [];

  for (const item of items) {
    const diff = now - new Date(item.updatedAt).getTime();
    const hours = diff / 3600000;
    if (hours < 24) today.push(item);
    else if (hours < 48) yesterday.push(item);
    else older.push(item);
  }

  return { today, yesterday, older };
}

function ConversationItem({
  id,
  title,
  isActive,
  isDemo,
  onSelect,
}: {
  id: string;
  title: string;
  isActive: boolean;
  isDemo: boolean;
  onSelect: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const { renameConversation, deleteConversation } = useConversationStore();

  const handleRename = () => {
    if (editValue.trim()) {
      renameConversation(id, editValue.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') { setEditing(false); setEditValue(title); }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group relative flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-100',
        isActive ? 'bg-[var(--surface-raised)]' : 'hover:bg-[var(--surface-raised)]'
      )}
      onClick={() => !editing && onSelect(id)}
    >
      {/* Active indicator */}
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      )}

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-xs outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        ) : (
          <p
            className="text-xs truncate"
            style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {title}
          </p>
        )}
      </div>

      {/* Demo badge */}
      {!editing && isDemo && (
        <span
          className="text-[9px] px-1 py-0.5 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}
        >
          Demo
        </span>
      )}

      {/* Actions */}
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); setEditValue(title); }}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[var(--surface)]"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Rename conversation"
          >
            <Pencil size={10} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteConversation(id); }}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[var(--surface)]"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Delete conversation"
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}

      {editing && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={handleRename} className="w-5 h-5 flex items-center justify-center rounded" style={{ color: 'var(--status-active)' }} aria-label="Confirm rename">
            <Check size={10} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setEditing(false); setEditValue(title); }} className="w-5 h-5 flex items-center justify-center rounded" style={{ color: 'var(--status-error)' }} aria-label="Cancel rename">
            <X size={10} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function ConversationHistory({ onSelect }: ConversationHistoryProps) {
  const { conversations, activeId, newConversation, switchConversation } =
    useConversationStore();

  const handleSelect = (id: string) => {
    switchConversation(id);
    onSelect?.(id);
  };

  // Use getOrCreateEmpty so "New" doesn't stack if an empty one already exists
  const handleNew = () => {
    const existing = conversations.find(
      (c) => c.messages.length === 0 && c.title === 'New conversation'
    );
    if (existing) {
      switchConversation(existing.id);
      onSelect?.(existing.id);
      return;
    }
    const id = newConversation();
    onSelect?.(id);
  };

  // Sort by updatedAt desc
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const { today, yesterday, older } = groupByDate(sorted);

  const renderGroup = (label: string, items: typeof sorted) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </p>
        <AnimatePresence mode="popLayout">
          {items.map((conv) => (
            <ConversationItem
              key={conv.id}
              id={conv.id}
              title={conv.title}
              isActive={conv.id === activeId}
              isDemo={conv.isDemo}
              onSelect={handleSelect}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="label" style={{ color: 'var(--text-tertiary)' }}>
          CONVERSATIONS
        </p>
        <button
          onClick={handleNew}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all duration-150 hover:bg-[var(--surface-raised)]"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="New conversation"
        >
          <Plus size={11} />
          New
        </button>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="flex-1 flex flex-col items-start px-2 py-6">
          <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
            No conversations yet.
          </p>
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all duration-150 hover:bg-[var(--surface-raised)]"
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              background: 'transparent',
            }}
          >
            <Plus size={11} />
            New conversation
          </button>
        </div>
      )}

      {/* Groups */}
      <div className="flex-1 overflow-y-auto">
        {renderGroup('Today', today)}
        {renderGroup('Yesterday', yesterday)}
        {renderGroup('Older', older)}
      </div>
    </div>
  );
}
