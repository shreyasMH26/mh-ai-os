export type TaskStatus = 
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'awaiting_approval'
  | 'cancelled';

export type ExecutionMode = 'auto' | 'manual' | 'council';

export interface Task {
  task_id: string;
  parent_task_id?: string;
  objective: string;
  input_context?: string;
  assigned_agent?: string;
  assigned_model?: string;
  assigned_provider?: string;
  dependencies?: string[];
  status: TaskStatus;
  output?: string;
  errors?: string[];
  artifacts?: TaskArtifact[];
  created_at: string;
  completed_at?: string;
  requires_approval?: boolean;
}

export interface TaskArtifact {
  id: string;
  type: 'code' | 'document' | 'image' | 'data' | 'url';
  title: string;
  content: string;
  created_at: string;
}

export interface ExecutionPlan {
  id: string;
  objective: string;
  mode: ExecutionMode;
  tasks: Task[];
  status: TaskStatus;
  created_at: string;
  completed_at?: string;
}

export interface TimelineEvent {
  id: string;
  task_id?: string;
  type: 'orchestrator' | 'agent' | 'model' | 'user' | 'system';
  agent?: string;
  model?: string;
  message: string;
  status?: TaskStatus;
  timestamp: string;
}
