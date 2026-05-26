# K9X Ecosystem

Visual tooling for building, designing, and operating governed agentic AI systems on the [K9-AIF Framework](https://github.com/k9aif/k9-aif-framework).

---

## k9x_studio

A browser-based drag-and-drop architecture builder for K9-AIF systems.

**Design your architecture visually → generate a production-ready scaffold → implement in VS Code + Claude Code.**

No LLM required. Fully air-gapped. Works with Podman or Docker.

### Quickstart

```bash
# Run with Podman (or Docker — script detects both)
curl -fsSL https://raw.githubusercontent.com/k9aif/k9x-ecosystem/main/deployment/run-local.sh | bash

# Then open:
# http://localhost:8080
```

Your framework clones and generated projects are saved to `~/k9x-projects` on your machine.

### What it does

1. Fill in project details (name, author, domain, description)
2. Click **Generate Architecture** for an AI-suggested layout — or build manually
3. Drag Router → Orchestrators → Squads → Agents onto the canvas
4. Connect components and configure each node in the inspector
5. Click **Generate Scaffold** → project lands in your `k9_projects/` folder
6. Open the folder in **VS Code + Claude Code** — the framework's `CLAUDE.md` guides implementation

### Component palette

| Canvas Node | K9-AIF ABB Class |
|---|---|
| Router | `K9EventRouter` |
| Orchestrator | `BaseOrchestrator` |
| Squad | `BaseSquad` |
| Agent | `BaseAgent` |
| Validation Loop | `K9ValidationLoopAgent` |
| Critic-Actor | `K9CriticActorAgent` |
| Guard | `BaseGovernance` |

### Container configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Host port |
| `OLLAMA_BASE_URL` | `http://host.containers.internal:11434` | Optional — for Generate Architecture |
| `K9X_PROJECTS_ROOT` | `/k9x/projects` | Path inside container for projects |
| `K9X_HOST_PROJECTS` | `~/k9x-projects` | Host directory mounted as projects root |

### Self-hosted / RHEL

```bash
# Build and deploy to a RHEL Podman host
RHEL_HOST=your-server RHEL_USER=you ./deployment/deploy-rhel.sh
```

---

## K9X Ecosystem architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        TOOLS LAYER                          │
│                                                             │
│   ┌─────────────────────┐   ┌─────────────────────────┐    │
│   │    k9x_studio       │   │     k9x_inspector        │    │
│   │  Visual Builder     │   │   Runtime Inspector      │    │
│   │  drag-and-drop      │   │   audit · trace · graph  │    │
│   └─────────────────────┘   └─────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                     FOUNDATION LAYER                        │
│                                                             │
│            ┌──────────────────────────────┐                 │
│            │      k9-aif-framework        │                 │
│            │   ABB/SBB · Router/Orch      │                 │
│            │   Squad/Agent · Governance   │                 │
│            └──────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

*K9X Ecosystem — https://k9x.ai*
