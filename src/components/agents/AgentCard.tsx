'use client';

import { motion } from 'framer-motion';
import {
  Network,
  Briefcase,
  Code2,
  GraduationCap,
  Search,
  Globe,
  PenLine,
  LayoutList,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import type { Agent } from '@/lib/types/agent';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Network,
  Briefcase,
  Code2,
  GraduationCap,
  Search,
  Globe,
  PenLine,
  LayoutList,
  CheckCircle,
  ShieldCheck,
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d4a36e',
  google: '#4285f4',
};

const CAPABILITY_LABELS: Record<string, string> = {
  coding: 'Coding',
  research: 'Research',
  writing: 'Writing',
  planning: 'Planning',
  analysis: 'Analysis',
  review: 'Review',
  business: 'Business',
  learning: 'Learning',
  orchestration: 'Orchestration',
  qa: 'QA',
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  active: { color: 'var(--status-active)', label: 'Active' },
  idle: { color: 'var(--status-idle)', label: 'Idle' },
  busy: { color: 'var(--status-busy)', label: 'Busy' },
  offline: { color: 'var(--status-error)', label: 'Offline' },
};

interface AgentCardProps {
  agent: Agent;
  index: number;
}

export default function AgentCard({ agent, index }: AgentCardProps) {
  const Icon = ICON_MAP[agent.icon] || Network;
  const statusMeta = STATUS_META[agent.status];
  const providerColor = PROVIDER_COLORS[agent.preferredProvider];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className="group p-5 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `${providerColor}15`,
            color: providerColor,
          }}
        >
          <Icon size={18} />
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              agent.status === 'active' && 'animate-pulse'
            )}
            style={{ background: statusMeta.color }}
          />
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Name and role */}
      <div className="mb-3">
        <h3 className="heading-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
          {agent.name}
        </h3>
        <p className="text-xs font-medium" style={{ color: providerColor }}>
          {agent.role}
        </p>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
        {agent.description}
      </p>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1 mb-4">
        {agent.capabilities.map((cap) => (
          <span
            key={cap}
            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--text-secondary)',
            }}
          >
            {CAPABILITY_LABELS[cap]}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-bold"
            style={{ background: `${providerColor}20`, color: providerColor }}
          >
            {agent.preferredProvider === 'openai' ? 'OA' : agent.preferredProvider === 'anthropic' ? 'AN' : 'GM'}
          </div>
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {agent.preferredModel}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          Demo mode
        </span>
      </div>
    </motion.div>
  );
}
