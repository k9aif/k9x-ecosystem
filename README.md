# K9X Ecosystem

Visual tooling for building, designing, and operating governed agentic AI systems on the [K9-AIF Framework](https://github.com/k9aif/k9-aif-framework).

---

## k9x_studio

A browser-based drag-and-drop architecture builder for K9-AIF systems.

**Design your architecture visually → generate a production-ready scaffold → implement in VS Code + Claude Code.**

No LLM required. Fully air-gapped. Works with Podman or Docker.

---

## Install locally

### Prerequisites

- [Podman](https://podman.io/docs/installation) or [Docker](https://docs.docker.com/get-docker/)
- That's it.

### Step 1 — Run the install script

```bash
curl -fsSL https://raw.githubusercontent.com/k9aif/k9x-ecosystem/main/deployment/run-local.sh | bash
```

This will:
- Pull `ghcr.io/k9aif/k9x-studio:latest` from GitHub Container Registry
- Start the container on port `8080`
- Mount `~/k9x-projects` on your machine as the projects folder

### Step 2 — Open the Studio

```
http://localhost:8080
```

### Step 3 — Point to the K9-AIF Framework

On first launch, K9X Studio will ask you to set up the framework:

- **Already have it?** Enter the path to your local `k9-aif-framework` clone.
- **Don't have it?** Enter a folder path — Studio will clone it from GitHub for you.

The framework provides the scaffold templates and the `CLAUDE.md` that guides Claude Code through implementation.

### Step 4 — Design your architecture

1. Fill in **Project Info** (name, author, domain, description)
2. Click **Generate Architecture** for an AI-suggested layout, or build manually
3. Drag components onto the canvas: Router → Orchestrator → Squad → Agents
4. Connect and configure each node in the right-hand inspector

### Step 5 — Generate the scaffold

Click **Generate Scaffold** in the left panel.

Your project lands in `~/k9x-projects/k9_projects/<your-project>/` with:

```
<project>/
├── CLAUDE.md          ← guides Claude Code through K9-AIF patterns
├── .env               ← framework path, Python path
├── run.sh             ← bootstrap script
├── config/
│   └── config.yaml    ← full architecture definition
├── agents/yaml/       ← per-agent configuration
├── squads/yaml/       ← squad definitions
└── agents/            ← Python stubs ready to implement
```

### Step 6 — Implement in VS Code + Claude Code

Open the project folder in VS Code, launch Claude Code, and the `CLAUDE.md` will guide it through the K9-AIF patterns automatically.

---

## Custom port or projects folder

```bash
# Different port
PORT=9090 ./deployment/run-local.sh

# Different projects folder
K9X_HOST_PROJECTS=/my/projects ./deployment/run-local.sh
```

---

## Stop / restart

```bash
podman rm -f k9x_studio   # stop
```

Re-run the install script any time to pull the latest image and restart.

---

## Component palette

| Canvas Node | K9-AIF ABB Class | Description |
|---|---|---|
| Router | `K9EventRouter` | Routes events by type to the correct orchestrator |
| Orchestrator | `BaseOrchestrator` | Coordinates squad execution for a domain workflow |
| Squad | `BaseSquad` | Executes a defined flow of agents in sequence |
| Agent | `BaseAgent` | One-shot agent: execute(payload) → dict |
| Validation Loop | `K9ValidationLoopAgent` | Iterative hypothesis-validate-reason loop |
| Critic-Actor | `K9CriticActorAgent` | Generate-critique-refine-accept pattern |
| Guard | `BaseGovernance` | Governance / zero-trust guard |

---

## Self-hosted deployment (RHEL / Podman)

```bash
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
