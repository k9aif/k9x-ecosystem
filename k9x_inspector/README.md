# k9x_inspector

**Runtime Inspector for K9-AIF Systems**

k9x_inspector is a browser-based inspection UI for running K9-AIF deployments. It connects to live infrastructure (PostgreSQL, Neo4j, Kafka) to surface execution traces, routing decisions, governance audit trails, and architecture topology.

---

## Panels

| Panel | Data source | What you see |
|---|---|---|
| **Routing Decisions** | PostgreSQL `routing_decisions` | Which model was selected, score, latency |
| **Session Traces** | PostgreSQL `sessions` / `session_turns` | Full turn-by-turn execution trace |
| **Governance Audit** | PostgreSQL `context_artifacts` | Pre/post governance hook results |
| **Architecture Graph** | Neo4j | Live topology: Orchestrators → Squads → Agents |
| **Event Stream** | Kafka `eoc-results` / `eoc-events` | Real-time event feed |

---

## Running

```bash
cd k9x_inspector
./run.sh      # starts inspector UI on port 8090
```

---

*Planned for Phase 4 of k9x_studio — inspector integration into canvas nodes.*
