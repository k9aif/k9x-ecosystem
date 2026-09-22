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

## Quick start

Requires [Podman](https://podman.io/docs/installation). Builds and runs locally — there is no published image to pull; GitHub only stores this source.

```bash
git clone https://github.com/k9aif/k9x-ecosystem.git
cd k9x-ecosystem/k9x_studio
cp .env.sample .env    # fill in your LLM endpoint and any other values first
./ubuntu/build-run.sh all
```

Open **http://localhost:8081** — Studio opens directly.

Generated project scaffolds land in `~/containers/volumes/k9x-studio/projects/k9_projects/<your-project>/` on the host running the container.

---

## Stop / rebuild

```bash
./ubuntu/build-run.sh stop     # stop the container
./ubuntu/build-run.sh logs     # tail logs
./ubuntu/build-run.sh all      # rebuild + restart after pulling new code
```

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

---

## Developer prerequisites — after you generate the scaffold

### Step 1 — Clone the K9-AIF Framework

```bash
git clone https://github.com/k9aif/k9-aif-framework.git ~/k9-aif-framework
```

### Step 2 — Move your scaffold alongside it

```bash
mv ~/k9x-studio-working/k9_projects/<your-project> ~/k9-aif-framework/k9_projects/
cd ~/k9-aif-framework/k9_projects/<your-project>
```

### Step 3 — Set up the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 4 — Edit `.env` — set the absolute framework path

Open `.env` and set `K9_FRAMEWORK_PATH` to the **absolute path** of your `k9-aif-framework` clone. Do not use `~` — use the full path:

```bash
# correct
K9_FRAMEWORK_PATH="/Users/you/k9-aif-framework"

# wrong — ~ is not expanded when .env is sourced
K9_FRAMEWORK_PATH="~/k9-aif-framework"
```

Also set `K9_ENV=development` to allow agents to run without a governance pipeline:

```bash
K9_ENV=development
```

### Step 5 — Edit `config/config.yaml` — point to your LLM

Open `config/config.yaml` and set `base_url` under `inference.llm_factory` to your Ollama instance:

```yaml
inference:
  llm_factory:
    backend: ollama
    base_url: "http://localhost:11434"       # local Ollama
    # base_url: "http://192.168.1.x:11434"  # remote Ollama on your network
```

Make sure Ollama is running and the models listed under `models:` are pulled:

```bash
ollama pull llama3.2:1b
ollama pull granite3-dense:2b
```

### Step 6 — Run the scaffold as-is

The generated stubs are runnable without any implementation changes. Run the smoke test to confirm the environment is wired correctly before writing any agent logic:

```bash
./run.sh
```

A successful run confirms Python path, framework imports, and agent wiring are all correct. You should see each agent execute — with Ollama running, agents will return real LLM output.

### Step 6 — Implement in VS Code + Claude Code

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
K9X_GENERATOR_TEMPLATES_DIR=./k9x/_generator_templates \
  uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```

Terminal 2 — frontend:

```bash
cd k9x_studio/frontend
npm run dev
```

Open **http://localhost:5173**

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
