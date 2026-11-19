# MH AI OS

**A premium personal multi-agent AI operating system.**

One intelligent workspace for business operations, software development, college work, research, and everything you're building.

---

## What It Is

MH AI OS is not a chatbot wrapper. It is an AI orchestration layer that:

- Accepts high-level objectives
- Decomposes them into structured subtasks
- Routes each subtask to the appropriate AI agent and model
- Executes independent tasks in parallel
- Passes context between dependent agents
- Validates and synthesizes final results
- Presents coherent outputs with execution transparency

The Orchestrator manages three AI providers — OpenAI, Anthropic, Google — as tools, not as the product itself.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| State | Zustand |
| Database | PostgreSQL / Supabase |
| Auth | Supabase Auth |
| AI — OpenAI | `openai` SDK |
| AI — Anthropic | `@anthropic-ai/sdk` |
| AI — Google | `@google/generative-ai` |

---

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Add your API keys to .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

See `.env.local` for the full list.

---

## Phase Roadmap

| Phase | What |
|---|---|
| 1 | Application shell + visual system ✅ |
| 2 | Dashboard + real-time updates |
| 3 | Chat interface with streaming |
| 4 | AI provider abstraction layer |
| 5 | Connect OpenAI |
| 6 | Connect Claude |
| 7 | Connect Gemini |
| 8 | Intelligent model router |
| 9 | Orchestrator + task decomposition |
| 10 | Agent handoffs + dependencies |
| 11 | AUTO / MANUAL / COUNCIL modes |
| 12 | Execution timeline / observability |
| 13 | Workspaces (XTICH, College, Build) |
| 14 | Project system |
| 15 | Memory system |
| 16 | File system |
| 17 | GitHub integration |
| 18 | Automation layer |
| 19 | Website builder agent |
| 20 | Security hardening |
| 21 | Performance optimization |
| 22 | Mobile polish |
| 23 | Deployment |

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical architecture.

---

## Security

- API keys are **never** stored client-side
- All AI calls go through Next.js server routes
- `.env.local` is gitignored
- No secrets in source code
