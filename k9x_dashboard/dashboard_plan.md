# k9x_dashboard — Plan

## Why this, why now

`k9x_dashboard` was scoped once before and parked (see memory
`project_k9x_dashboard_parked`) for two reasons: no concrete need beyond
"it'd be nice to have one index page," and no structured event source to
build a live view on top of — only scattered log files per app.

Both objections are gone:

1. **Concrete need is real now.** The ecosystem has grown into a real set
   of independently-run apps (Studio, HIL, Continuum, Enterprise Repository,
   Satan, the AP sample, EOC, DAS, testcases...) each on its own port/
   subdomain with no shared index. Ravi's ask is specific: applications
   catalog + a live HIL snapshot + one-click hop into HIL — not a vague
   "wouldn't it be nice."
2. **The event-source gap is closed.** `k9-aif-framework`'s new
   `trace_events` bus (`k9_aif_abb/k9_utils/trace_events.py`) gives any app
   a real structured trace instead of log-scraping — already proven by the
   AP sample's demo UI. The `k9x_shield_event_streaming` idea (Shield/
   governance events → Kafka, `k9x_event_logs`, by criticality) is the
   natural next step to make that live across apps, not just within one
   process.

## Scope — staying inside the original guardrail

When this was parked, the scoping note said: *"thin launcher + link list,
never a runtime proxy in front of other components."* This plan keeps that
constraint. `k9x_dashboard` is a **read-only aggregation and launch point**,
not a gateway, not an auth broker, not a place that mutates state in any
other app. Every action a user actually takes (approve a task, edit a
project, run a squad) happens by leaving the dashboard and landing in the
real app, in its own tab, under its own login.

Concretely, three things, nothing more, for the MVP:

1. **Applications catalog** — what K9-AIF apps exist, where they run, what
   they are.
2. **HIL snapshot** — read-only summary of tasks/queues/applications, no
   task actions taken from here.
3. **Deep links** — "Open in HIL" (and same for Studio/Continuum/etc.)
   opens the real app in a new tab; that app's own login gate applies.

## Open source tooling — evaluated, and why the answer is "don't adopt a platform"

Considered against the actual ask (catalog + live snapshot + deep links,
self-hosted, small user count):

| Option | Verdict | Why |
|---|---|---|
| **Backstage** (Spotify) | Rejected | The canonical OSS answer to "developer portal," but it's a whole platform: Node/TypeScript, its own DB, a plugin architecture meant for dozens of engineering teams and hundreds of services. We have ~10 apps and one operator. Adopting it would mean learning and running a second stack heavier than everything it's cataloging. |
| **Grafana** | Rejected for the shell, keep in mind for later | Excellent once Shield events are flowing through Kafka into a real metrics/time-series store — could be embedded via iframe panels for the "Alerts over time" view in Phase 2. Not worth standing up just to show today's task counts, which are a handful of SQL queries. |
| **Metabase** | Rejected | Same reasoning as Grafana — a real BI tool for the HIL Postgres schema, but a new self-hosted service + container for what is currently a handful of grouped-count queries the HIL dashboard endpoint (`GET /dashboard`) already computes. Revisit only if the "snapshot" grows into real ad-hoc analytics. |
| **Retool / Appsmith / Windmill** | Rejected | Low-code internal-tool builders. Fast for a one-off, but it's a new hosted component with its own auth/storage model, stylistically and operationally divergent from how every other k9x app is built (FastAPI + static JS, no build step, no separate low-code runtime). |
| **Kafdrop / AKHQ / Redpanda Console** | Keep as an ops sidecar, not the dashboard | Good for eyeballing that `k9x_event_logs` is actually flowing once Phase 2 ships. A Kafka topic browser, not an application dashboard — different job. |
| **Tremor / shadcn-admin style component kits** | Rejected | These are React component libraries, not full tools — would only make sense if we were switching the whole ecosystem to a React frontend, which nothing else here does. |

**Decision: build it the same way every other k9x app is built.** FastAPI
backend + a single static HTML/CSS/JS frontend (same pattern as
`k9x-hil`, `k9x_continuum`, `k9x_enterprise_repository` — no build step,
no new frontend framework, no new hosted platform). This keeps the whole
ecosystem operable by one person with `run.sh` and a Cloudflare tunnel,
which is the actual constraint that ruled out Backstage/Retool/Appsmith.
Grafana/Metabase/Kafdrop stay as **candidate embeds for Phase 2**, once
there's a real event stream worth visualizing — not part of the MVP.

## Architecture

```
k9x_dashboard/
  backend/
    main.py            # FastAPI app, same shape as k9x-hil/main.py
    catalog.py          # loads apps.yaml, no DB needed for this part
    hil_snapshot.py      # read-only queries against k9hil schema
    database.py          # reuses the k9x Postgres instance, read-only role
  webui/
    index.html
    static/app.js, app.css   # same visual language as hil/continuum/repo
  apps.yaml              # the catalog — see below
  run.sh
```

- **Port**: 8087 (next free slot after HIL's 8086; Studio/Continuum/
  Satan/Repo already own their own ports — confirm no clash before first
  run).
- **No proxy.** The dashboard never calls another app's write endpoints
  and never embeds another app's UI in an iframe for the MVP — a card with
  a name, status, and an "Open →" link that does `window.open(url,
  "_blank")`.
- **HIL snapshot data access**: read directly against the `k9hil` Postgres
  schema with a **read-only DB role**, the same Postgres instance
  `k9x-hil` itself uses (I already have `.env`-configured DB access there
  today, per prior sessions). This avoids needing the dashboard to hold
  its own HIL login/service-account token just to show counts — it reuses
  the same grouped-by-application query shape the HIL dashboard endpoint
  (`backend/routes.py`'s `GET /dashboard`) already proves out, so the
  dashboard's snapshot and HIL's own dashboard never disagree by
  construction (same SQL logic, read-only copy).
- **Deep link, not SSO**: "Open in HIL" is a plain link to `hil.k9x.ai`
  (or `localhost:8086` locally, via the same env-driven URL pattern
  `k9x_enterprise_repository` already uses for its `CONTINUUM_URL`
  config). The user logs into HIL there, normally. No shared session, no
  token passing — keeps the "never a proxy/auth broker" guarantee literal.

## The applications catalog

For the MVP, the catalog is a **hand-maintained `apps.yaml`**, not a
database table and not auto-discovered. Reasoning: there are ~10 apps,
they change rarely, and a live "is it up" probe (see below) already tells
you if an entry is stale. A DB-backed catalog would be more machinery than
the problem justifies right now — same "don't add abstraction without
proven need" standard applied everywhere else in this ecosystem.

```yaml
# apps.yaml
- name: HIL
  slug: hil
  description: Human-in-the-Loop case management
  url_prod: https://hil.k9x.ai
  url_local: http://localhost:8086
  health_path: /health
  category: platform

- name: Studio
  slug: studio
  description: Visual K9-AIF architecture builder
  url_prod: https://studio.k9x.ai
  url_local: http://localhost:8080
  health_path: /health
  category: platform

# ... Continuum, Enterprise Repository, Satan, AP sample, EOC, DAS, testcases
```

The dashboard backend polls each entry's `health_path` on a short interval
(e.g. every 30s, cached) and shows a live up/down dot on its card — cheap,
honest, no fake "all green" status. Apps without a `/health` route today
(check each before shipping) show "unknown" rather than a guessed status.

## HIL snapshot panel

Read-only, refreshed on load + a manual refresh button (no need for
websockets yet — this isn't the live event stream, it's a summary).
Reuses the exact grouped-by-application shape already built for HIL's own
dashboard this same week:

- Per application: open task count, by priority/status, oldest-open age.
- Total across all applications.
- "Open in HIL →" per application row, deep-linking straight to that
  application's filtered view in HIL (HIL's own frontend already supports
  `filterByApplication`, so the link can pre-filter).

No task actions (claim/approve/reject) are ever performed from
`k9x_dashboard` — that's HIL's job, on HIL's own page, under HIL's own
auth and audit trail. Duplicating that here would violate the "never a
proxy" guardrail and would split the audit trail across two systems.

## Phase 2 (not built now, sequenced deliberately)

Only once `k9x_shield_event_streaming` actually ships (Shield/governance
events published to Kafka topic `k9x_event_logs`, by criticality, 48h
TTL, respecting the framework's Kafka-ownership rule that only
Router/Orchestrator may publish):

- A **Logs tab**: live tail of governance events across all apps that
  publish to that topic, via a small FastAPI WebSocket relay consuming
  Kafka and forwarding to the browser — same pattern DAS already uses for
  its SSE 3-pane UI, just WebSocket instead of SSE (Kafka consumer doesn't
  map cleanly onto Server-Sent Events' single-direction-from-request
  model the way a job-scoped SSE stream does).
- An **Alerts tab**: filtered to BLOCK-severity events only.
- At that point, and only then, Grafana becomes worth evaluating again —
  as an embedded panel for "events over time," not a replacement for the
  Logs/Alerts tabs themselves.

## Explicitly out of scope (for this plan and the MVP)

- MCP server configuration UI — real, separate gap (`project_mcp_registry_gap`),
  not part of this dashboard.
- Any write path into HIL, Studio, or any other app from the dashboard.
- Auto-discovery of running apps (mDNS/port-scanning) — `apps.yaml` is
  hand-maintained until there's a real reason to automate it.
- Public hosting — follows the same pattern as every other k9x subdomain
  (`project_k9x_deployment_subdomains`): test locally first, tunnel to
  `dashboard.k9x.ai` later, only when it's actually ready to be shown.

## Decisions needed from Ravi before building

1. **Port 8087** — confirm no clash with anything already claiming it.
2. **Read-only DB role for `k9hil`** — OK to create one, or prefer the
   dashboard call HIL's existing `/dashboard` API endpoint instead of
   querying Postgres directly? (API call is a cleaner boundary; direct DB
   read is fewer moving parts and matches how I already access `k9hil`
   today. Recommendation: start with the API call — it's the more honest
   "never a proxy, never shares HIL's internals" version of read-only
   access, and `GET /dashboard` already returns exactly the grouped shape
   needed.)
3. **Which apps go in `apps.yaml` v1** — full list, plus prod vs.
   local-only URLs for each, so cards don't show dead links.
