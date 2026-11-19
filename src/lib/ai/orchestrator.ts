/**
 * MH AI OS — Orchestrator
 *
 * Server-side only. Never import this in client components.
 *
 * Accepts a high-level objective and:
 *   1. Decomposes it into structured Tasks using the best configured provider
 *   2. Assigns each task to the appropriate agent + model
 *   3. Executes tasks in dependency order (independent tasks first)
 *   4. Records execution via TimelineEvent callbacks
 *   5. Synthesizes completed outputs into a final result
 *
 * All AI calls use the existing provider registry — no direct SDK imports.
 *
 * Memory: execution plans live in memory only (no DB in this phase).
 */

import { getProvider, getDefaultProvider } from './registry';
import type { AIProvider } from './types';
import { AIError } from './types';
import type { Task, ExecutionPlan, TaskStatus, TimelineEvent } from '@/lib/types/task';
import type { ExecutionMode } from '@/lib/types/task';
import type { ModelProvider } from '@/lib/types/model';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrchestratorParams {
  objective: string;
  mode: ExecutionMode;
  workspace?: string;
  systemPrompt?: string;
  /** Called whenever a timeline event is emitted */
  onEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  /** Called with incremental synthesis text chunks */
  onSynthesisChunk: (chunk: string) => void;
  /** Called when orchestration completes with the full synthesis */
  onComplete: (plan: ExecutionPlan, synthesis: string) => void;
  /** Called on fatal error */
  onError: (error: AIError) => void;
  /** AbortSignal for client disconnects */
  signal?: AbortSignal;
}

export interface DecomposedTask {
  id: string;
  objective: string;
  agentId: string;
  agentName: string;
  provider: ModelProvider;
  model: string;
  dependencies: string[]; // task IDs this task depends on
  rationale: string;
}

// ─── Agent → Provider/Model mapping ──────────────────────────────────────────
// Maps agent IDs to their preferred provider + model.
// Falls back to the default provider if preferred one is not configured.

interface AgentSpec {
  agentId: string;
  agentName: string;
  preferredProvider: ModelProvider;
  preferredModel: string;
  capabilities: string[];
}

const AGENT_SPECS: AgentSpec[] = [
  {
    agentId: 'research-agent',
    agentName: 'Research Agent',
    preferredProvider: 'google',
    preferredModel: 'gemini-2.5-flash',
    capabilities: ['research', 'analysis', 'information gathering'],
  },
  {
    agentId: 'business-agent',
    agentName: 'Business Agent',
    preferredProvider: 'openai',
    preferredModel: 'gpt-4o-mini',
    capabilities: ['business strategy', 'market analysis', 'planning', 'operations'],
  },
  {
    agentId: 'coding-agent',
    agentName: 'Coding Agent',
    preferredProvider: 'anthropic',
    preferredModel: 'claude-opus-4-5',
    capabilities: ['coding', 'software development', 'technical implementation'],
  },
  {
    agentId: 'content-agent',
    agentName: 'Content Agent',
    preferredProvider: 'anthropic',
    preferredModel: 'claude-haiku-3-5',
    capabilities: ['writing', 'content creation', 'copywriting', 'marketing'],
  },
  {
    agentId: 'website-agent',
    agentName: 'Website Agent',
    preferredProvider: 'anthropic',
    preferredModel: 'claude-opus-4-5',
    capabilities: ['web design', 'landing page', 'UI/UX', 'front-end'],
  },
  {
    agentId: 'college-agent',
    agentName: 'College Agent',
    preferredProvider: 'anthropic',
    preferredModel: 'claude-haiku-3-5',
    capabilities: ['academic', 'coursework', 'study', 'learning'],
  },
  {
    agentId: 'review-agent',
    agentName: 'Review Agent',
    preferredProvider: 'google',
    preferredModel: 'gemini-2.5-flash',
    capabilities: ['review', 'quality check', 'critique', 'feedback'],
  },
  {
    agentId: 'project-manager',
    agentName: 'Project Manager',
    preferredProvider: 'google',
    preferredModel: 'gemini-2.5-flash',
    capabilities: ['project planning', 'task management', 'coordination'],
  },
];

/** Returns the best available provider for an agent, falling back to default */
function resolveAgentProvider(spec: AgentSpec): { provider: AIProvider; providerKey: ModelProvider; model: string } {
  // Try preferred provider first
  try {
    const p = getProvider(spec.preferredProvider);
    if (p.isConfigured()) {
      return { provider: p, providerKey: spec.preferredProvider, model: spec.preferredModel };
    }
  } catch {
    // preferred not available, fall through
  }

  // Fall back to default provider
  const fallback = getDefaultProvider();
  return {
    provider: fallback,
    providerKey: fallback.provider,
    model: fallback.defaultModel,
  };
}

// ─── Task decomposition ────────────────────────────────────────────────────────

const DECOMPOSITION_SYSTEM_PROMPT = `You are the MH AI OS Orchestrator. Your job is to decompose a high-level objective into a structured list of subtasks.

Rules:
- Output ONLY valid JSON — no markdown, no explanation outside the JSON.
- Create 2–5 subtasks. Never more than 5.
- Each task must be self-contained and executable by one AI agent.
- Use ONLY these agentIds: research-agent, business-agent, coding-agent, content-agent, website-agent, college-agent, review-agent, project-manager
- Dependencies must reference valid task IDs within this plan.
- The last task should always synthesize or review prior results.
- Keep each task objective concise (under 80 words).

Output this exact JSON structure:
{
  "tasks": [
    {
      "id": "task-1",
      "objective": "...",
      "agentId": "research-agent",
      "agentName": "Research Agent",
      "dependencies": [],
      "rationale": "..."
    }
  ]
}`;

async function decompose(
  objective: string,
  workspace: string | undefined,
  provider: AIProvider,
): Promise<DecomposedTask[]> {
  const workspaceCtx = workspace
    ? `\nCurrent workspace: ${workspace}. Tailor the task assignments accordingly.`
    : '';

  const response = await provider.generate({
    messages: [
      {
        role: 'user',
        content: `Decompose this objective into subtasks:\n\n"${objective}"${workspaceCtx}`,
      },
    ],
    systemPrompt: DECOMPOSITION_SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 1024,
  });

  // Strip markdown fences if model wraps the JSON
  const raw = response.content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: { tasks: DecomposedTask[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AIError({
      code: 'MALFORMED_RESPONSE',
      message: `Orchestrator decomposition returned invalid JSON: ${raw.slice(0, 200)}`,
      userMessage: 'The orchestrator could not parse the task plan. Please try again.',
      retryable: true,
    });
  }

  if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
    throw new AIError({
      code: 'MALFORMED_RESPONSE',
      message: 'Decomposition returned no tasks',
      userMessage: 'The orchestrator returned an empty plan. Please try again.',
      retryable: true,
    });
  }

  // Attach provider/model based on agent spec
  return parsed.tasks.map((t) => {
    const spec = AGENT_SPECS.find((s) => s.agentId === t.agentId) ?? AGENT_SPECS[0];
    const resolved = resolveAgentProvider(spec);
    return {
      ...t,
      agentId: spec.agentId,
      agentName: spec.agentName,
      provider: resolved.providerKey,
      model: resolved.model,
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
    };
  });
}

// ─── Execution helpers ─────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function now(): string {
  return new Date().toISOString();
}

const TASK_EXECUTION_SYSTEM = `You are a specialized AI agent in the MH AI OS system. Execute the given task thoroughly and return a complete, well-structured result. Be specific and actionable. Use markdown formatting where it improves clarity.`;

async function executeTask(
  task: Task & { agentName: string; providerKey: ModelProvider; modelId: string },
  completedOutputs: Map<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  const { providerKey, modelId } = task;

  // Build context from completed dependencies
  const depContext = task.dependencies?.length
    ? task.dependencies
        .map((depId) => {
          const out = completedOutputs.get(depId);
          return out ? `[Output from ${depId}]:\n${out}` : null;
        })
        .filter(Boolean)
        .join('\n\n---\n\n')
    : '';

  const userContent = depContext
    ? `Context from prior tasks:\n\n${depContext}\n\n---\n\nYour task:\n${task.objective}`
    : `Your task:\n${task.objective}`;

  // Try preferred provider first, fall back to default on any error (e.g. quota/rate-limit)
  const providerFactories: Array<() => AIProvider> = [
    () => {
      const p = getProvider(providerKey);
      if (!p.isConfigured()) throw new Error('not configured');
      return p;
    },
    () => getDefaultProvider(),
  ];

  let lastError: unknown;
  for (const getP of providerFactories) {
    if (signal?.aborted) {
      throw new AIError({ code: 'UNKNOWN', message: 'Aborted', userMessage: 'Cancelled.', retryable: false });
    }
    try {
      const agentProvider = getP();
      const result = await agentProvider.generate({
        messages: [{ role: 'user', content: userContent }],
        systemPrompt: TASK_EXECUTION_SYSTEM,
        maxTokens: 2048,
        temperature: 0.7,
      });
      if (signal?.aborted) {
        throw new AIError({ code: 'UNKNOWN', message: 'Aborted', userMessage: 'Cancelled.', retryable: false });
      }
      return result.content;
    } catch (err) {
      lastError = err;
    }
  }

  // Both preferred and default failed
  throw lastError instanceof AIError
    ? lastError
    : new AIError({
        code: 'PROVIDER_UNAVAILABLE',
        message: String(lastError),
        userMessage: `Task failed: no available provider could complete the task.`,
        retryable: true,
      });
}

// ─── Synthesis ────────────────────────────────────────────────────────────────

const SYNTHESIS_SYSTEM = `You are the MH AI OS Orchestrator synthesizing the outputs of multiple specialized agents into a single coherent final response. 

Write a complete, well-structured final answer that:
- Directly addresses the original objective
- Integrates all agent outputs into a unified whole
- Is formatted with clear markdown sections
- Includes actionable next steps where appropriate
- Does not mention internal agent names or task IDs`;

async function synthesize(
  objective: string,
  tasks: Array<{ objective: string; output: string; agentName: string }>,
  synthesisProvider: AIProvider,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const context = tasks
    .map((t, i) => `## ${t.agentName} Output (${i + 1}/${tasks.length})\n\n${t.output}`)
    .join('\n\n---\n\n');

  const userContent = `Original objective: "${objective}"\n\n---\n\n${context}\n\n---\n\nSynthesize the above into a final, complete response for the user.`;

  let fullText = '';

  await synthesisProvider.stream({
    messages: [{ role: 'user', content: userContent }],
    systemPrompt: SYNTHESIS_SYSTEM,
    maxTokens: 3000,
    temperature: 0.6,
    signal,
    onChunk: (chunk) => {
      fullText += chunk;
      onChunk(chunk);
    },
  });

  return fullText;
}

// ─── Council mode ─────────────────────────────────────────────────────────────

async function executeCouncil(
  objective: string,
  onEvent: OrchestratorParams['onEvent'],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const providerKeys: ModelProvider[] = ['google', 'openai', 'anthropic'];
  const responses: Array<{ provider: ModelProvider; content: string }> = [];

  for (const key of providerKeys) {
    if (signal?.aborted) break;
    try {
      const p = getProvider(key);
      if (!p.isConfigured()) continue;

      onEvent({
        type: 'agent',
        agent: `${key.charAt(0).toUpperCase() + key.slice(1)} Model`,
        model: p.defaultModel,
        message: `Council: querying ${key}...`,
        status: 'running',
      });

      const result = await p.generate({
        messages: [{ role: 'user', content: objective }],
        maxTokens: 1500,
        temperature: 0.7,
      });

      responses.push({ provider: key, content: result.content });

      onEvent({
        type: 'model',
        agent: `${key.charAt(0).toUpperCase() + key.slice(1)} Model`,
        model: p.defaultModel,
        message: `Response received from ${key}`,
        status: 'completed',
      });
    } catch {
      onEvent({
        type: 'system',
        message: `${key} skipped — not configured or failed`,
        status: 'failed',
      });
    }
  }

  if (responses.length === 0) {
    throw new AIError({
      code: 'PROVIDER_NOT_CONFIGURED',
      message: 'No providers responded in council mode',
      userMessage: 'No configured AI providers available for council mode.',
      retryable: false,
    });
  }

  // Synthesize council responses
  onEvent({ type: 'orchestrator', message: 'Synthesizing council responses…', status: 'running' });

  const synthesisProvider = getDefaultProvider();
  const councilContext = responses
    .map((r) => `## ${r.provider.charAt(0).toUpperCase() + r.provider.slice(1)} Perspective\n\n${r.content}`)
    .join('\n\n---\n\n');

  const councilSynthesisSystem = `You are synthesizing responses from multiple AI models into the best possible answer. Combine their insights, resolve contradictions, and produce a single superior response. Do not mention model names.`;

  let fullText = '';
  await synthesisProvider.stream({
    messages: [
      {
        role: 'user',
        content: `Original question: "${objective}"\n\n---\n\n${councilContext}\n\nSynthesize these into the best possible answer.`,
      },
    ],
    systemPrompt: councilSynthesisSystem,
    maxTokens: 2000,
    temperature: 0.5,
    signal,
    onChunk: (chunk) => {
      fullText += chunk;
      onChunk(chunk);
    },
  });

  return fullText;
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function runOrchestrator(params: OrchestratorParams): Promise<void> {
  const { objective, mode, workspace, onEvent, onSynthesisChunk, onComplete, onError, signal } = params;

  // ── Council mode: separate fast path ───────────────────────────────────────
  if (mode === 'council') {
    const planId = generateId('plan');
    const councilPlan: ExecutionPlan = {
      id: planId,
      objective,
      mode: 'council',
      tasks: [],
      status: 'running',
      created_at: now(),
    };

    try {
      onEvent({ type: 'orchestrator', message: `Council mode — querying all configured providers for: "${objective.slice(0, 60)}"`, status: 'running' });

      const synthesis = await executeCouncil(objective, onEvent, onSynthesisChunk, signal);

      onEvent({ type: 'orchestrator', message: 'Council synthesis complete', status: 'completed' });
      councilPlan.status = 'completed';
      councilPlan.completed_at = now();
      onComplete(councilPlan, synthesis);
    } catch (err) {
      councilPlan.status = 'failed';
      onError(err instanceof AIError ? err : new AIError({ code: 'UNKNOWN', message: String(err), userMessage: 'Council mode failed. Please try again.', retryable: true }));
    }
    return;
  }

  // ── Auto / Manual mode: task decomposition path ────────────────────────────
  const planId = generateId('plan');
  const planCreatedAt = now();

  onEvent({
    type: 'orchestrator',
    message: `Objective received — decomposing: "${objective.slice(0, 60)}${objective.length > 60 ? '…' : ''}"`,
    status: 'running',
  });

  // Step 1: Decompose using best available provider
  let decomposedTasks: DecomposedTask[];
  try {
    const decompositionProvider = getDefaultProvider();
    onEvent({
      type: 'orchestrator',
      message: `Planning subtasks with ${decompositionProvider.defaultModel}…`,
      status: 'running',
    });

    decomposedTasks = await decompose(objective, workspace, decompositionProvider);
  } catch (err) {
    const aiErr = err instanceof AIError ? err : new AIError({ code: 'UNKNOWN', message: String(err), userMessage: 'Failed to decompose objective into tasks.', retryable: true });
    onError(aiErr);
    return;
  }

  if (signal?.aborted) return;

  // Step 2: Build the ExecutionPlan
  const tasks: Task[] = decomposedTasks.map((dt) => ({
    task_id: dt.id,
    parent_task_id: planId,
    objective: dt.objective,
    assigned_agent: dt.agentId,
    assigned_model: dt.model,
    assigned_provider: dt.provider,
    dependencies: dt.dependencies,
    status: 'pending' as TaskStatus,
    created_at: now(),
  }));

  const plan: ExecutionPlan = {
    id: planId,
    objective,
    mode,
    tasks,
    status: 'running',
    created_at: planCreatedAt,
  };

  const taskCount = tasks.length;
  onEvent({
    type: 'orchestrator',
    message: `Plan created — ${taskCount} task${taskCount !== 1 ? 's' : ''} queued`,
    status: 'completed',
  });

  // Queue events for all tasks
  decomposedTasks.forEach((dt) => {
    onEvent({
      type: 'agent',
      agent: dt.agentName,
      model: dt.model,
      message: `Queued: ${dt.objective.slice(0, 70)}${dt.objective.length > 70 ? '…' : ''}`,
      status: 'queued',
    });
  });

  // Step 3: Execute in dependency order (topological execution)
  const completedOutputs = new Map<string, string>(); // taskId → output
  const taskStatuses = new Map<string, TaskStatus>(tasks.map((t) => [t.task_id, 'pending']));

  const tasksByAgent = new Map<string, DecomposedTask>(decomposedTasks.map((t) => [t.id, t]));

  function canRun(taskId: string): boolean {
    const dt = tasksByAgent.get(taskId);
    if (!dt) return false;
    return dt.dependencies.every((depId) => taskStatuses.get(depId) === 'completed');
  }

  let iteration = 0;
  const MAX_ITERATIONS = taskCount + 2; // guard against infinite loops

  while (completedOutputs.size < taskCount && iteration < MAX_ITERATIONS) {
    if (signal?.aborted) {
      onError(new AIError({ code: 'UNKNOWN', message: 'Aborted', userMessage: 'Orchestration cancelled.', retryable: false }));
      return;
    }

    iteration++;

    // Find all tasks that can run now (dependencies satisfied, not yet started)
    const runnable = decomposedTasks.filter(
      (dt) => taskStatuses.get(dt.id) === 'pending' && canRun(dt.id)
    );

    if (runnable.length === 0) {
      // Check for a deadlock (pending tasks with unresolvable dependencies)
      const pendingWithFailedDeps = decomposedTasks.filter((dt) => {
        if (taskStatuses.get(dt.id) !== 'pending') return false;
        return dt.dependencies.some((depId) => taskStatuses.get(depId) === 'failed');
      });

      if (pendingWithFailedDeps.length > 0) {
        pendingWithFailedDeps.forEach((dt) => {
          taskStatuses.set(dt.id, 'cancelled');
          onEvent({
            type: 'agent',
            agent: dt.agentName,
            message: `Cancelled — dependency failed`,
            status: 'cancelled',
          });
        });
        break;
      }

      // Nothing runnable but tasks remain — break to avoid spin
      break;
    }

    // Execute runnable tasks concurrently
    await Promise.all(
      runnable.map(async (dt) => {
        taskStatuses.set(dt.id, 'running');

        const taskForExecution = {
          ...tasks.find((t) => t.task_id === dt.id)!,
          agentName: dt.agentName,
          providerKey: dt.provider,
          modelId: dt.model,
        } as Task & { agentName: string; providerKey: ModelProvider; modelId: string };

        onEvent({
          type: 'agent',
          agent: dt.agentName,
          model: dt.model,
          message: `Started: ${dt.objective.slice(0, 70)}${dt.objective.length > 70 ? '…' : ''}`,
          status: 'running',
        });

        try {
          const output = await executeTask(taskForExecution, completedOutputs, signal);
          completedOutputs.set(dt.id, output);
          taskStatuses.set(dt.id, 'completed');

          onEvent({
            type: 'model',
            agent: dt.agentName,
            model: dt.model,
            message: `Completed: ${dt.agentName} finished task`,
            status: 'completed',
          });
        } catch (err) {
          taskStatuses.set(dt.id, 'failed');
          const msg = err instanceof AIError ? err.userMessage : String(err);
          onEvent({
            type: 'agent',
            agent: dt.agentName,
            model: dt.model,
            message: `Failed: ${msg.slice(0, 100)}`,
            status: 'failed',
          });
        }
      })
    );
  }

  if (signal?.aborted) return;

  // Step 4: Synthesize completed outputs
  const completedTaskData = decomposedTasks
    .filter((dt) => completedOutputs.has(dt.id))
    .map((dt) => ({
      objective: dt.objective,
      output: completedOutputs.get(dt.id)!,
      agentName: dt.agentName,
    }));

  if (completedTaskData.length === 0) {
    onError(new AIError({
      code: 'UNKNOWN',
      message: 'No tasks completed successfully',
      userMessage: 'All tasks in the plan failed. Please try again.',
      retryable: true,
    }));
    return;
  }

  onEvent({
    type: 'orchestrator',
    message: `Synthesis started — combining ${completedTaskData.length} agent output${completedTaskData.length !== 1 ? 's' : ''}…`,
    status: 'running',
  });

  try {
    const synthesisProvider = getDefaultProvider();
    const synthesis = await synthesize(
      objective,
      completedTaskData,
      synthesisProvider,
      onSynthesisChunk,
      signal,
    );

    onEvent({
      type: 'orchestrator',
      message: 'Orchestration complete',
      status: 'completed',
    });

    plan.status = 'completed';
    plan.completed_at = now();

    // Write back task statuses to plan
    plan.tasks = tasks.map((t) => ({
      ...t,
      status: taskStatuses.get(t.task_id) ?? 'failed',
      output: completedOutputs.get(t.task_id),
      completed_at: taskStatuses.get(t.task_id) === 'completed' ? now() : undefined,
    }));

    onComplete(plan, synthesis);
  } catch (err) {
    plan.status = 'failed';
    onError(
      err instanceof AIError
        ? err
        : new AIError({ code: 'UNKNOWN', message: String(err), userMessage: 'Synthesis failed. Please try again.', retryable: true })
    );
  }
}
