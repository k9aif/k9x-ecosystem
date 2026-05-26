# k9x_studio

**Visual Architecture Builder for K9-AIF Systems**

k9x_studio is a browser-based drag-and-drop IDE for designing K9-AIF multi-agent systems. It reads the `k9_aif_abb` component library, lets architects compose systems visually on a canvas, and generates production-ready YAML configuration and Python scaffold — the same output as `k9_generator.sh`, but designed rather than typed.

---

## Workflow

```
1. Project Setup
   └── Name, author, domain, description

2. Canvas Design (drag-and-drop)
   ├── Palette (left): Router, Orchestrator, Squad, Agent, ...
   ├── Canvas (center): drop nodes, draw connections
   └── Inspector (right): configure selected node

3. Live Preview
   └── YAML + Python scaffold updates in real time

4. Export
   └── Downloads zip: config/ + agents/ + squads/ + Python stubs
       OR writes directly to ../k9-aif-framework/k9_projects/<AppName>/
```

---

## Architecture

```
┌──────────┐    ┌────────────────────────────────────────────┐    ┌────────────────┐
│          │    │                  CANVAS                     │    │   INSPECTOR    │
│ PALETTE  │    │                                             │    │                │
│          │    │  [Router]────►[Orchestrator]                │    │ Node: Agent    │
│ Router   │    │                    │                        │    │ Name: FraudDet │
│ Orch.    │    │              [ClaimsSquad]                  │    │ Model: reason  │
│ Squad    │    │              ┌─────┴──────┐                 │    │ Pattern: loop  │
│ Agent    │    │          [Triage]  [Fraud] [Audit]          │    │ Role: ...      │
│ ValLoop  │    │                                             │    │                │
│ CritAct  │    │                                             │    │ [Generate YAML]│
│ Guard    │    │                                             │    │ [Preview Code] │
│ LLM      │    │                                             │    │                │
└──────────┘    └────────────────────────────────────────────┘    └────────────────┘
```

---

## Component Palette → ABB Mapping

| Palette Node | K9-AIF ABB | Output |
|---|---|---|
| **Router** | `BaseRouter` / `K9EventRouter` | `router/` Python + config |
| **Orchestrator** | `BaseOrchestrator` | `orchestrators/` Python + config |
| **Squad** | `BaseSquad` | `squads/yaml/<name>.yaml` |
| **Agent** | `BaseAgent` | `agents/yaml/<name>.yaml` + `agents/src/<name>.py` |
| **Validation Loop** | `K9ValidationLoopAgent` | Agent with loop methods scaffold |
| **Critic-Actor** | `K9CriticActorAgent` | Agent with actor/critic scaffold |
| **Guard** | `BaseGovernance` | Governance config entry |
| **LLM** | `OllamaLLM` via `LLMFactory` | `inference.llm_factory.models` entry |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend canvas | React + [React Flow](https://reactflow.dev) |
| Frontend UI | TypeScript + Tailwind CSS |
| Backend API | Python FastAPI |
| ABB introspection | reads `../k9-aif-framework/k9_aif_abb/` |
| Scaffold generation | extends `k9_generator.sh` logic |
| Export | ZIP (config + code) or write to `k9_projects/` |

---

## Development Phases

### Phase 1 — Project setup + scaffold (MVP)
- Project details form (name, author, domain, description)
- Component form: add Agents, Squads, Orchestrator via guided form
- Backend generates the same scaffold as `k9_generator.sh`
- Download as ZIP

### Phase 2 — Visual canvas
- React Flow canvas with draggable nodes
- Palette: all ABB component types
- Connect nodes with edges (Squad → Agent, Orchestrator → Squad)
- Property inspector panel (right side)
- Real-time YAML preview

### Phase 3 — ABB introspection
- Backend reads `k9_aif_abb/` source + YAML examples
- Palette populated dynamically from ABB registry
- Property fields driven by ABB contract signatures

### Phase 4 — k9x_inspector integration
- "Inspect" button on deployed nodes opens k9x_inspector
- Live routing decisions, governance trails, agent traces

---

## Running

```bash
cd k9x_studio
./run.sh          # starts backend (port 8080) + frontend (port 3000)
```

Backend references `../k9-aif-framework` for ABB introspection and scaffold generation.

---

## References

- K9-AIF Framework: `../k9-aif-framework`
- ABB contracts: `../k9-aif-framework/k9_aif_abb/`
- Reference examples: `../k9-aif-framework/examples/`
- Generator script: `../k9-aif-framework/k9_generator.sh`
- Developer Guide: `../k9-aif-framework/docs/developers/Developer-guide.md`
