# K9X Ecosystem

The K9X Ecosystem is a layered platform for building, visualizing, and operating governed agentic AI systems using the K9-AIF Framework.

---

## Architecture

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
│                      PLATFORM LAYER                         │
│                                                             │
│   ┌─────────────────────┐   ┌─────────────────────────┐    │
│   │   k9-aif-intake     │   │   k9-aif-methodology    │    │
│   │  Intake / Scaffold  │   │   Patterns / Guidance   │    │
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

## Components

| Component | Folder | Description |
|---|---|---|
| **K9-AIF Framework** | `../k9-aif-framework` | Foundation ABB/SBB library |
| **k9x_studio** | `k9x_studio/` | Visual drag-and-drop architecture builder |
| **k9x_inspector** | `k9x_inspector/` | Runtime inspector: audit trails, traces, graph |
| **k9-aif-intake** | `../k9-aif-intake` | Project intake → scaffold generation |
| **k9-aif-methodology** | `../k9-aif-methodology` | Architecture patterns and guidance |

---

## k9x_studio

A browser-based visual builder for K9-AIF systems. Drag components onto a canvas, configure them in a property inspector, and export production-ready YAML + Python scaffold.

**Workflow:**
1. Fill in project details (name, author, domain)
2. Drag Router → Orchestrator → Squads → Agents onto canvas
3. Connect components via the visual flow
4. Configure each node in the right-panel property inspector
5. Export: generates `config.yaml`, `agents/yaml/`, `squads/yaml/`, Python stubs

**Component palette maps directly to k9_aif_abb:**

| Canvas Node | ABB Class |
|---|---|
| Router | `BaseRouter` → `K9EventRouter` |
| Orchestrator | `BaseOrchestrator` |
| Squad | `BaseSquad` |
| Agent | `BaseAgent` |
| Validation Loop | `K9ValidationLoopAgent` |
| Critic-Actor | `K9CriticActorAgent` |
| Guard | `BaseGovernance` |
| LLM | `OllamaLLM` via `LLMFactory` |

→ [k9x_studio/README.md](k9x_studio/README.md)

---

## k9x_inspector

Runtime inspection UI for running K9-AIF deployments. Connects to live infrastructure (PostgreSQL, Neo4j, Kafka) to surface execution traces, routing decisions, governance audit trails, and architecture graph.

→ [k9x_inspector/README.md](k9x_inspector/README.md)

---

## Prerequisites

All tools in this ecosystem reference the K9-AIF Framework. Clone siblings into the same parent directory:

```bash
git clone https://github.com/k9aif/k9-aif-framework
git clone https://github.com/k9aif/k9x-ecosystem
```

Shared infrastructure (always-on):

| Service | Address |
|---|---|
| Ollama | `http://192.168.1.98:11434` |
| PostgreSQL | `192.168.1.98:5432` |
| Kafka / Redpanda | `192.168.1.98:9092` |
| Neo4j | `bolt://192.168.1.98:7687` |

---

## Running locally

Each tool runs independently:

```bash
# K9X Studio
cd k9x_studio && ./run.sh

# K9X Inspector
cd k9x_inspector && ./run.sh
```

---

*K9X Ecosystem — https://k9x.ai*
