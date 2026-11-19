# MH AI OS — Architecture

## System Overview

```
User Input
    ↓
MH AI OS (Next.js Frontend)
    ↓
Command Center / Chat Interface
    ↓
Orchestrator Agent  ← Central intelligence layer
    ↓
Task Decomposition Engine
    ↓
Model Router  ← Selects provider + model per subtask
    ↓
┌─────────────┬──────────────┬─────────────┐
│   OpenAI    │  Anthropic   │   Google    │
│  Provider   │  Provider    │  Provider   │
└─────────────┴──────────────┴─────────────┘
    ↓
Agent Layer (10 specialized agents)
    ↓
Agent Handoff System  ← Structured task objects
    ↓
Review / QA
    ↓
Synthesis
    ↓
Human Approval (when required)
    ↓
Final Result
```

---

## Provider Abstraction

All AI provider integrations are behind a unified interface. The application NEVER calls OpenAI, Anthropic, or Google APIs directly from application logic.

```typescript
// Conceptual interface — implemented in Phase 4+
interface AIService {
  generate(params: GenerateParams): Promise<string>;
  stream(params: GenerateParams): AsyncIterable<string>;
  analyze(params: AnalyzeParams): Promise<AnalysisResult>;
  embed(text: string): Promise<number[]>;
  route(task: Task): Promise<ModelSelection>;
}

// Providers implement AIProvider
class OpenAIProvider implements AIProvider { ... }
class AnthropicProvider implements AIProvider { ... }
class GeminiProvider implements AIProvider { ... }
```

---

## Multi-Agent Architecture

### Agent Registry (10 agents)
```
Orchestrator       → AI Project Manager       → OpenAI GPT-4o
Business Agent     → Business Operations      → OpenAI GPT-4o
Coding Agent       → Software Engineer        → Anthropic Claude Opus 4.5
College Agent      → Academic Assistant       → Anthropic Claude Opus 4.5
Research Agent     → Intelligence Analyst     → Google Gemini 2.5 Pro
Website Agent      → Web Builder              → Anthropic Claude Opus 4.5
Content Agent      → Content Creator          → Anthropic Claude Opus 4.5
Project Manager    → Workflow Coordinator     → OpenAI GPT-4o
Review Agent       → Quality Reviewer         → Anthropic Claude Opus 4.5
QA Agent           → Quality Assurance        → Google Gemini 2.5 Pro
```

Preferred models are configurable and not permanently hardcoded.

---

## Task Object Schema

```typescript
interface Task {
  task_id: string;
  parent_task_id?: string;
  objective: string;
  input_context?: string;
  assigned_agent?: string;
  assigned_model?: string;
  assigned_provider?: string;
  dependencies?: string[];         // task_ids this task depends on
  status: TaskStatus;
  output?: string;
  errors?: string[];
  artifacts?: TaskArtifact[];
  created_at: string;
  completed_at?: string;
  requires_approval?: boolean;     // pause for human input
}
```

---

## Execution Modes

### AUTO (default)
The Orchestrator fully manages task decomposition, model selection, execution order, parallelism, and synthesis.

### MANUAL
The user explicitly assigns:
- ChatGPT → Planning
- Claude → Coding  
- Gemini → Research

The Orchestrator respects user assignments.

### COUNCIL
The same problem is sent independently to all three models. A Synthesizer Agent merges the responses into a final recommendation.

---

## Model Router Logic (Phase 8)

```
Task Type + Required Capabilities + Context Size
    +
Vision Requirements + Cost Preference + Latency
    +
User Routing Preferences + Model Availability
    ↓
Selected Model + Provider
```

Initial routing preferences (configurable):
- Coding → Claude Opus 4.5
- Planning → GPT-4o
- Research → Gemini 2.5 Pro
- Visual Analysis → Gemini 2.5 Pro
- General → GPT-4o Mini (cheapest suitable)

---

## Workspaces

| Workspace | Purpose | Key Agents |
|---|---|---|
| XTICH | Business operations | Business Agent, Content Agent |
| College | CSE academics | College Agent, Research Agent |
| Build | Software development | Coding Agent, Website Agent, QA Agent |

Each workspace maintains isolated memory, projects, and context.

---

## Database Schema (Phase 39)

```sql
users, workspaces, projects, tasks, task_dependencies,
agents, agent_runs, conversations, messages, files,
memories, integrations, automations, model_usage, model_capabilities
```

---

## Security Principles

1. API keys stored in server-side `.env.local` only
2. All AI calls routed through Next.js API routes (server-side)
3. No secrets in client bundles — ever
4. Human approval required for irreversible actions
5. Context isolation between workspaces
6. Memory can be viewed, edited, and deleted

---

## Phase Status

| Phase | Status |
|---|---|
| 1 — Application shell | ✅ Complete |
| 2–23 | 🔲 Planned |
