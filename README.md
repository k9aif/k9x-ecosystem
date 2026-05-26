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

#### Step 2 — Choose a projects folder on your machine

The container needs a folder on your machine to store the K9-AIF Framework clone and generated projects. Pick any folder — it will be mounted into the container.

```bash
mkdir -p ~/k9x-projects   # or any folder you prefer, e.g. ~/work/k9x
```

#### Step 3 — Run the Studio

```bash
# Default — uses ~/k9x-projects
./deployment/run-local.sh

# Custom folder
K9X_HOST_PROJECTS=~/work/k9x ./deployment/run-local.sh
```

This pulls `ghcr.io/k9aif/k9x-studio:latest` and starts the container with your chosen folder mounted inside it. The Studio reads and writes directly to your Mac (or Linux) filesystem through this mount — no files are stored inside the container itself.

#### Step 4 — Open the Studio

```
http://localhost:8080
```

#### Step 5 — Set up the K9-AIF Framework

On first launch, Studio will ask where to find the K9-AIF Framework:

- **Already have it?** Enter the **container-side path**: your projects folder is mounted at `/k9x/projects` inside the container.
  - Example: if your projects folder is `~/k9x-projects` and your framework is at `~/k9x-projects/k9-aif-framework`, enter `/k9x/projects/k9-aif-framework`
- **Don't have it?** Use **"Set it up for me"** — Studio will clone the framework into your projects folder automatically. The default path shown is already correct.

> **Why container paths?** The Studio backend runs inside the container. It can only access your machine's files through the mounted folder, which always appears as `/k9x/projects` inside the container regardless of where it lives on your machine.

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

### Point to the K9-AIF Framework

On first launch, Studio will ask you to set up the framework:

- **Already have it?** Enter the path to your local `k9-aif-framework` clone.
- **Don't have it?** Enter a folder path — Studio will clone it from GitHub for you.

The framework provides the scaffold templates and the `CLAUDE.md` that guides Claude Code through implementation.

### Design your architecture

1. Fill in **Project Info** (name, author, domain, description)
2. Click **Generate Architecture** for an AI-suggested layout, or build manually
3. Drag components onto the canvas: Router → Orchestrator → Squad → Agents
4. Connect and configure each node in the right-hand inspector

### Generate the scaffold

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

### Implement in VS Code + Claude Code

Open the project folder in VS Code, launch Claude Code, and the `CLAUDE.md` guides it through the K9-AIF patterns automatically.

---

## Custom port or projects folder

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
