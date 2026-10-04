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
├── k9x_coe/          Center of Excellence playbook — how to run an Agentic AI
│                    architecture practice; not runnable code.
├── deployment/       Shared deployment scripts across ecosystem projects.
└── docs/             Ecosystem-level documentation.
```

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
