# K9X Studio: Architecture-First AI Development with K9-AIF

*Build governed multi-agent AI systems the right way — design first, implement second.*

---

## Table of Contents

- [For Architects — Design Multi-Agent Systems Visually](#for-architects--design-multi-agent-systems-visually)
  - [The Architecture-First Philosophy](#the-architecture-first-philosophy)
  - [The K9-AIF Hierarchy](#the-k9-aif-hierarchy)
  - [Designing on the Canvas](#designing-on-the-canvas)
  - [Import from BPMN](#import-from-bpmn)
  - [Generate Architecture from a Description](#generate-architecture-from-a-description)
  - [What the Scaffold Contains](#what-the-scaffold-contains)
- [For Developers — Get Running in Minutes](#for-developers--get-running-in-minutes)
  - [Quick Start](#quick-start)
  - [What Gets Generated](#what-gets-generated)
  - [Implement with VS Code and Claude Code](#implement-with-vs-code-and-claude-code)
  - [The CLAUDE.md Contract](#the-claudemd-contract)

---

## For Architects — Design Multi-Agent Systems Visually

### The Architecture-First Philosophy

Most AI agent frameworks start with code. You write a Python class, wire it to an LLM, and figure out the architecture as you go. This works for prototypes. It does not work for production systems that need governance, auditability, and the ability to evolve.

K9-AIF (K9 Agentic Integration Framework) flips this. You define the architecture first — who owns what event, which orchestrator coordinates which squad, which agents execute which tasks — and then generate the code scaffold from that definition.

K9X Studio is the visual tool that makes this possible without writing a single line of configuration by hand.

### The K9-AIF Hierarchy

Every K9-AIF system is built from a fixed set of building blocks:

```
K9EventRouter
  └── BaseOrchestrator          (one per domain workflow)
        └── BaseSquad           (executes a sequence of agents)
              ├── BaseAgent                  (one-shot execution)
              ├── K9ValidationLoopAgent      (iterative reasoning)
              ├── K9CriticActorAgent         (generate → critique → refine)
              └── BaseGovernance             (zero-trust guard)
```

| Component | K9-AIF Class | Responsibility |
|---|---|---|
| Router | `K9EventRouter` | Routes incoming events by `event_type` to the correct orchestrator |
| Orchestrator | `BaseOrchestrator` | Owns a domain workflow; coordinates squad execution |
| Squad | `BaseSquad` | Executes agents in sequence; each agent enriches a shared context |
| Agent | `BaseAgent` | One-shot: `execute(payload) → dict` |
| Validation Loop | `K9ValidationLoopAgent` | Hypothesis → validate → reason — iterates until confident |
| Critic-Actor | `K9CriticActorAgent` | Generates output, critiques it, refines until accepted |
| Guard | `BaseGovernance` | Enforces policy before or after agent execution |

This is not arbitrary. The hierarchy maps directly to enterprise architecture patterns: the Router is your event bus consumer, the Orchestrator is your domain service, the Squad is your process flow, and the Agents are your capability components.

### Designing on the Canvas

K9X Studio gives you a drag-and-drop canvas. You drag a Router, connect it to an Orchestrator, connect the Orchestrator to a Squad, and connect the Squad to Agents. The canvas enforces the hierarchy — you cannot connect an Agent directly to a Router, because that is architecturally incorrect.

As you design, the right-hand Inspector lets you configure each node: name, agent type, LLM model preference, description. The bottom panel shows the live YAML being generated — `config.yaml`, `flows.yaml`, `orchestrators.yaml`, `squads.yaml` — so you always see the architecture as code, not just as a diagram.

### Import from BPMN

If you already have a process defined in a BPMN tool — IBM BlueWorks Live, Camunda, Bizagi — K9X Studio can import it directly. Upload a `.bpmn`, `.xml`, or BlueWorks Live `.zip` export and Studio maps the process tasks to K9-AIF agents automatically, pre-populating the canvas with a suggested architecture.

This is useful for teams that have existing process documentation and want to migrate it to an AI-native implementation without starting from scratch.

### Generate Architecture from a Description

No BPMN? Just describe what the system should do in plain language and click **Generate Architecture**. Studio calls a local Ollama instance (if available) or falls back to a sensible default, and builds a suggested canvas:

- Orchestrators named for your domain
- Squads grouping related agents
- Agent types chosen based on the task (validation loops for iterative reasoning, critic-actor for drafting and refinement, base agents for classification)

You review, adjust, drag in additional components, and when it looks right — generate the scaffold.

### What the Scaffold Contains

Clicking **Generate Scaffold** writes a complete project structure to your working folder:

```
<project>/
├── CLAUDE.md          ← the implementation contract for Claude Code
├── .env               ← K9_FRAMEWORK_PATH, PYTHONPATH
├── run.sh             ← bootstrap script
├── config/
│   └── config.yaml    ← full architecture definition (source of truth)
├── agents/yaml/       ← per-agent configuration
├── squads/yaml/       ← squad definitions with agent sequences
└── agents/            ← Python implementation stubs, one per agent
```

The `config.yaml` is the single source of truth for the entire system. Everything else is derived from it. If the architecture changes, you update the config and regenerate — the stubs are additive, so existing implementation is not overwritten.

---

## For Developers — Get Running in Minutes

### Quick Start

K9X Studio runs as a container. No installation, no build step, no Python environment to set up.

```bash
mkdir -p ~/k9x-studio-working

podman run -d \
  --name k9x_studio \
  -p 8080:8080 \
  -e K9X_PROJECTS_ROOT="/k9x/projects" \
  -v ~/k9x-studio-working:/k9x/projects:Z \
  ghcr.io/k9aif/k9x-studio:latest
```

The volume mount maps your local folder into the container:

```
~/k9x-studio-working   ← your machine
        ↕  mounted as
/k9x/projects          ← inside the container
```

Open **http://localhost:8080**. Studio opens directly on the canvas — no setup screen, no configuration required.

> Docker users: replace `podman` with `docker` and drop the `:Z` flag.

### What Gets Generated

Type a project name in **Project Info**, design your architecture on the canvas, and click **Generate Scaffold**. The success banner tells you exactly where the files landed on your machine:

```
~/k9x-studio-working/k9_projects/automotive_dealership_ai/
```

Move that folder alongside your `k9-aif-framework` clone. If you set the **k9-aif-framework path on your machine** field in Project Info before generating, the path gets written into the `.env` automatically — no manual editing needed.

### Implement with VS Code and Claude Code

Open the generated project folder in VS Code and launch Claude Code. The first thing Claude Code reads is `CLAUDE.md`.

This file contains the complete implementation contract:
- Which agents need implementing and what each one does
- Which K9-AIF base class each agent extends
- The squad flow and how context is enriched between agents
- The configuration reference so Claude Code knows the full architecture

Claude Code reads the scaffolded stubs in `agents/`, understands the K9-AIF patterns from `CLAUDE.md`, and guides you through implementing each agent's `execute()` method — one at a time, with full context.

### The CLAUDE.md Contract

The `CLAUDE.md` is not documentation. It is a contract between the architect (who designed in K9X Studio) and the developer (who implements in VS Code + Claude Code).

It specifies:

```
## Architecture
- Router: K9EventRouter handles event_type routing
- Orchestrator: AutomotiveDealershipAIOrchestrator owns the domain workflow
- Squad: AutomotiveDealershipAISquad executes 3 agents in sequence

## Agents
1. InventoryTriageAgent (BaseAgent) — classify incoming inventory events
2. PricingValidationAgent (K9ValidationLoopAgent) — iterative pricing recommendation
3. ComplianceAuditAgent (BaseAgent) — audit trail and governance check

## Implementation Notes
- Each agent's execute(payload) receives the full squad context
- Return a dict; the squad merges it into the shared context for the next agent
- K9_FRAMEWORK_PATH is set in .env — ensure venv is activated before running
```

The developer does not need to understand K9-AIF internals to implement. The scaffold and the `CLAUDE.md` provide everything Claude Code needs to guide the implementation correctly.

---

*K9X Studio is open source — [github.com/k9aif/k9x-ecosystem](https://github.com/k9aif/k9x-ecosystem)*

*Built on the [K9-AIF Framework](https://github.com/k9aif/k9-aif-framework) — architecture-first agentic AI for enterprise.*
