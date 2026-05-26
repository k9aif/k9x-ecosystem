# K9X Ecosystem

Visual tooling for building, designing, and operating governed agentic AI systems on the [K9-AIF Framework](https://github.com/k9aif/k9-aif-framework).

---

## k9x_studio

A browser-based drag-and-drop architecture builder for K9-AIF systems.

**Design your architecture visually → generate a production-ready scaffold → implement in VS Code + Claude Code.**

No LLM required. Fully air-gapped. Works with Podman or Docker.

> See the [launch post on LinkedIn](https://www.linkedin.com/posts/ravi-natarajan-1015683b7_ai-multiagentai-aiarchitecture-share-7465094355217842176-OEii/) for a walkthrough and live demo screenshot.
> Built something with K9X Studio? Share it on LinkedIn — tag [#K9XStudio](https://www.linkedin.com/search/results/content/?keywords=%23K9XStudio) and the community will see it.

---

## Quick start — no git clone needed

Requires [Podman](https://podman.io/docs/installation) or [Docker](https://docs.docker.com/get-docker/).

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
~/k9x-studio-working   ← your machine (Mac / Linux)
        ↕  mounted as
/k9x/projects          ← inside the container
```

Generated project scaffolds land in `~/k9x-studio-working/k9_projects/<your-project>/` on your machine.

Open **http://localhost:8080** — Studio opens directly, no setup required.

> **Docker users:** replace `podman` with `docker` and drop the `:Z` flag from the volume mount.

---

## Stop / restart

```bash
podman stop k9x_studio    # pause
podman start k9x_studio   # resume
```

To pull the latest image and restart fresh:

```bash
podman stop k9x_studio && podman rm k9x_studio
podman pull ghcr.io/k9aif/k9x-studio:latest
podman run -d --name k9x_studio -p 8080:8080 \
  -e K9X_PROJECTS_ROOT="/k9x/projects" \
  -v ~/k9x-studio-working:/k9x/projects:Z \
  ghcr.io/k9aif/k9x-studio:latest
```

---

## Custom port or working folder

```bash
# Custom port (host 9090 → container 8080)
podman run -d --name k9x_studio -p 9090:8080 \
  -e K9X_PROJECTS_ROOT="/k9x/projects" \
  -v ~/k9x-studio-working:/k9x/projects:Z \
  ghcr.io/k9aif/k9x-studio:latest

# Custom local folder (~/my-projects on host → /k9x/projects in container)
podman run -d --name k9x_studio -p 8080:8080 \
  -e K9X_PROJECTS_ROOT="/k9x/projects" \
  -v ~/my-projects:/k9x/projects:Z \
  ghcr.io/k9aif/k9x-studio:latest
```

The container-side path `/k9x/projects` is fixed — always mount your chosen host folder there.

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

Move this folder alongside your `k9-aif-framework` clone. Set the **k9-aif-framework path on your machine** field in Project Info — it gets written into the generated `.env` so your project can find the framework at runtime.

### Implement in VS Code + Claude Code

Open the project folder in VS Code, launch Claude Code, and the `CLAUDE.md` guides it through the K9-AIF patterns automatically.

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

## Run from source (optional)

For contributors or local development. Requires Python 3.11+ and Node.js 20+.

```bash
git clone https://github.com/k9aif/k9x-ecosystem.git
git clone https://github.com/k9aif/k9-aif-framework.git
cd k9x-ecosystem/k9x_studio
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

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

## Self-hosted deployment (any Podman server)

Deploy to any SSH-accessible machine running Podman — Linux, Mac, or a cloud VM.

```bash
git clone https://github.com/k9aif/k9x-ecosystem.git
cd k9x-ecosystem
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
