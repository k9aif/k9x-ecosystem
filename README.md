# K9X Ecosystem

Visual tooling for building, designing, and operating governed agentic AI systems on the [K9-AIF Framework](https://github.com/k9aif/k9-aif-framework).

---

## k9x_studio

A browser-based drag-and-drop architecture builder for K9-AIF systems.

**Design your architecture visually → generate a production-ready scaffold → implement in VS Code + Claude Code.**

No LLM required. Fully air-gapped. Works with Podman or Docker.

---

## Install locally

### Step 1 — Clone the repo

```bash
git clone https://github.com/k9aif/k9x-ecosystem.git
cd k9x-ecosystem
```

---

### Option A — Container (recommended, no build needed)

Requires [Podman](https://podman.io/docs/installation) or [Docker](https://docs.docker.com/get-docker/).

#### Step 2 — Run the Studio

```bash
./deployment/run-local.sh
```

This pulls `ghcr.io/k9aif/k9x-studio:latest` and starts the Studio. Generated project scaffolds land in `~/k9x-studio-working/k9_projects/` on your machine.

Use a custom folder if you prefer:

```bash
K9X_HOST_PROJECTS=~/my-projects ./deployment/run-local.sh
```

#### Step 3 — Open the Studio

```
http://localhost:8080
```

Studio opens directly — no setup required. Fill in your project details and start designing.

---

### Option B — Run from source

Requires Python 3.11+ and Node.js 20+.

#### Step 2 — Clone the K9-AIF Framework

```bash
git clone https://github.com/k9aif/k9-aif-framework.git
```

#### Step 3 — Set up the Python backend

```bash
cd k9x_studio
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

#### Step 4 — Set up the React frontend

```bash
cd frontend
npm install
```

#### Step 5 — Start both servers

Terminal 1 — backend:

```bash
cd k9x_studio
source .venv/bin/activate
K9X_GENERATOR_TEMPLATES_DIR=../k9-aif-framework/generator/templates \
  uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```

Terminal 2 — frontend:

```bash
cd k9x_studio/frontend
npm run dev
```

Open **http://localhost:5173**

---

## Using K9X Studio

### Design your architecture

1. Fill in **Project Info** (name, author, domain, description)
2. Click **Generate Architecture** for an AI-suggested layout, or build manually
3. Drag components onto the canvas: Router → Orchestrator → Squad → Agents
4. Connect and configure each node in the right-hand inspector

### Generate the scaffold

Click **Generate Scaffold** in the left panel.

Your project lands in `~/k9x-studio-working/k9_projects/<your-project>/` with:

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

### Implement in VS Code + Claude Code

Open the project folder in VS Code, launch Claude Code, and the `CLAUDE.md` guides it through the K9-AIF patterns automatically.

---

## Custom port or working folder

```bash
PORT=9090 ./deployment/run-local.sh
K9X_HOST_PROJECTS=/my/projects ./deployment/run-local.sh
```

## Stop / restart

```bash
podman stop k9x_studio    # pause
podman start k9x_studio   # resume
```

Re-run `run-local.sh` any time to pull the latest image and restart with a fresh container.

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

## Self-hosted deployment (any Podman server)

Deploy to any SSH-accessible machine running Podman — Linux, Mac, or a cloud VM.

```bash
REMOTE_HOST=your-server REMOTE_USER=you ./deployment/deploy-remote.sh
```

Builds the image locally, ships it over SSH, starts the pod on the remote machine. No internet access required on the remote host.

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
