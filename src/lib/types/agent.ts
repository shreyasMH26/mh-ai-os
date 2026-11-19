export type AgentStatus = 'active' | 'idle' | 'busy' | 'offline';
export type AgentCapability = 
  | 'coding'
  | 'research'
  | 'writing'
  | 'planning'
  | 'analysis'
  | 'review'
  | 'business'
  | 'learning'
  | 'orchestration'
  | 'qa';

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: AgentCapability[];
  preferredModel: string;
  preferredProvider: 'openai' | 'anthropic' | 'google';
  status: AgentStatus;
  tasksCompleted: number;
  lastActive?: string;
  icon: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  taskId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
}
