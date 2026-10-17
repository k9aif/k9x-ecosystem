# CLAUDE.md — k9x-ecosystem

This file guides Claude Code (or any coding assistant) working anywhere under `k9x-ecosystem/`. Read it before touching any project in this repo, even without prior conversation context.

## What this repo is

`k9x-ecosystem` is the collection of products **built on top of** the K9-AIF framework — not the framework itself. Every project here is a consumer of `k9_aif_abb`, extending its ABB contracts with concrete SBBs; none of them re-implement or fork framework internals.

```
k9x-ecosystem/
├── k9x_satan/       Adversarial red-team harness — fires attacks at a K9-AIF
│                    pipeline to prove K9X Shield containment.
├── k9x_studio/       Visual drag-and-drop K9-AIF builder — reads the k9_aif_abb
│                    component library, generates YAML + Python scaffold.
├── k9x_continuum/    Enterprise Continuum catalog — governed SBB/ABB publish,
│                    promote, harvest workflow.
├── k9x_inspector/    Continuous conformance inspector (own repo): inspects
│                    K9-AIF solutions on push/schedule with the framework's
│                    k9_inspect rules; compliance report + guidelines doc.
├── k9x_streams/      Live, governed context for agents from event streams (own
│                    repo): reference model on the K9-AIF context fabric.
├── k9x_deploy/       TODO (own repo, private): deployment requirements → sized
│                    deployment architecture, manifests, ADRs.
├── k9x_coe/          Center of Excellence playbook — how to run an Agentic AI
│                    architecture practice; not runnable code.
├── deployment/       Shared deployment scripts across ecosystem projects.
└── docs/             Ecosystem-level documentation.
```

## K9X component catalog — check this before proposing anything new

Every component that exists, live or not. **Before suggesting a new tool, store, page or
service, check this list** — an existing component may already do it (2026-10-12: a whole
discussion about where architecture artifacts should live went by before anyone remembered
repo.k9x.ai). The dashboard's `k9x_dashboard/apps.yaml` is the runtime catalog
(dashboard.k9x.ai health-checks it); keep both in step when a component is added.

| Component | Folder | Live | What it is |
|---|---|---|---|
| K9X Studio | `k9x_studio/` | studio.k9x.ai | Visual K9-AIF builder → scaffold (the only Studio) |
| K9X Enterprise Continuum | `k9x_continuum/` | continuum.k9x.ai | Governed ABB/SBB catalog: publish, promote, harvest |
| **K9X Enterprise Repository** | `k9x_enterprise_repository/` | **repo.k9x.ai** | **TOGAF Architecture Repository**: architecture artifacts, Standards Information Base, compliance, dispensations; Wikipedia-style. It records and links to the source repos (GitHub / Bitbucket), not a replacement for them. Home for architecture artifacts (reference models, diagrams, ADRs) |
| K9X HIL | `~/ai/k9x-hil` (own repo) | hil.k9x.ai | Kafka-native human-in-the-loop case management |
| K9X Satan | `k9x_satan/` | satan.k9x.ai | Adversarial harness proving k9x Shield holds |
| K9X Sentinel | `k9x_sentinel/` | sentinel.k9x.ai | Daily AI-security threat watch vs the framework's capability catalog → HIL |
| K9X Newswatch | `~/ai/k9x-newswatch` (own repo, private) | newswatch.k9x.ai | Vendor-neutral AI governance briefing: what shipped in each vendor's stack and what to check; verified, unattended, per-stack email |
| K9X Inspector | `k9x_inspector/` (own repo) | inspector.k9x.ai | Conformance rules on every push, remediation guide |
| K9X Arena | `k9x_arena/` | arena.k9x.ai | LLMs head to head, graded, feeding the model router |
| K9X Streams | `k9x_streams/` (own repo) | streams.k9x.ai | Live, governed context for agents; reference model on the 1.17 context fabric |
| K9X Dashboard | `k9x_dashboard/` | dashboard.k9x.ai | Catalog + health of the live components (`apps.yaml`) |
| K9X Deploy | `k9x_deploy/` (own repo, private) | — (TODO) | Deployment requirements → sized architecture, manifests, Terraform, ADRs |
| DAS | `~/ai/dow-k9-aif` (k9aif/dow-k9x) | das.k9x.ai | Defense Acquisition System, the flagship application built on K9-AIF |
| Also here | `k9x_coe/`, `k9x_contexthub/` (parked), `k9x_fleet/` (future), `k9x_testcases/` | — | CoE playbook; parked / future / generator experiments |

## Framework dependency — read this first

**Read `/Users/ravinatarajan/ai/k9-aif-framework/CLAUDE.md` before writing code in any project here.** It is the single authoritative source for:
- ABB/SBB separation and the Router → Orchestrator → Squad → Agent decoupling rules
- Factory pattern conventions (`Base<Concern>` → `<Provider>Adapter` → `<Concern>Factory>`)
- Governance enforcement rules (`K9_ENV`, `enforce_governance()`, `PermissionError` semantics)
- The Pre-Push Checklist (no hardcoded IPs, no credentials in config, `.env` never staged, three-layer decoupling)

Every project in `k9x-ecosystem/` **must** comply with that document. A project here diverging from framework convention is a bug in the project, not a valid local variation — see `k9x_satan/CLAUDE.md`'s "ABB vs Satan-local — who owns what" section for the pattern every project should follow: frameworks ABBs/OOB are never modified from a consumer project; new capability is either a new framework `BaseVulnerabilityCheck`-style ABB (contributed upstream) or a project-local class extending an existing ABB contract.

## sys.path bootstrap pattern

Every ecosystem project assumes the fixed sibling layout `ai/k9x-ecosystem/<project>/` next to `ai/k9-aif-framework/`. The standard bootstrap (see `k9x_satan/target/*.py` for the canonical example):

```python
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "k9-aif-framework"))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
```

Adjust the `".."` count to the file's actual depth under its project. Preserve this pattern in any new project — never a hardcoded absolute path (see "no hardcoded IPs" rule below, which extends to hardcoded local filesystem paths in general).

Note: `k9x-ecosystem/k9-aif-framework/` (a small, mostly-empty directory containing only a `generator/` stub) also exists as of this writing — it is **not** the framework used by the sys.path bootstrap above, which points to the sibling `ai/k9-aif-framework/` three levels up. Don't confuse the two; if working on whatever the nested stub is for, confirm with the user what it's for before assuming it's stale/removable.

## Per-project CLAUDE.md files

Projects with enough project-specific convention have their own `CLAUDE.md` (e.g. `k9x_satan/CLAUDE.md` — the fullest example, covering its Shield architecture, governance backends, and harvesting-into-framework history). Read the project's own file first for anything specific to it; this file only covers what's common across the ecosystem. If a project under here grows enough project-specific convention and doesn't yet have its own `CLAUDE.md`, consider adding one following `k9x_satan/CLAUDE.md`'s structure (What this project proves → repo structure → pipeline/architecture → ABB vs local ownership → conventions to preserve).

## Pre-Push Checklist (same as the framework's, applies identically here)

- No hardcoded IP addresses or absolute local filesystem paths — env vars with `localhost`/relative defaults
- No credentials in config files — `.env` only, never staged
- No `__pycache__`/`.pyc` — `.gitignore` present before first commit in any new project
- Framework ABBs referenced via `k9_aif_abb` imports, never copied/forked into a project's own source tree
