async function api(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function appUrl(app) {
  return app.url_prod || app.url_local || null;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function host(app) {
  if (app.plate) return app.plate;            // internal units: a role label, never an address
  const u = app.url_prod || app.url_local;
  try { return u ? new URL(u).host : app.slug; } catch (e) { return app.slug; }
}

// A drive-activity light with its own random rhythm, so no two lights (or servers) flicker in step.
function activity() {
  const dur = (0.9 + Math.random() * 2.6).toFixed(2), delay = (-Math.random() * 4).toFixed(2);
  return `<i style="--dur:${dur}s;--delay:${delay}s"></i>`;
}

// One slim 1U server per component: LED, name and hostname plate, a one-line description, activity lights, buttons.
function unit(app) {
  const repoOnly = app.status === "repo";
  const url = repoOnly || app.probe ? null : appUrl(app);
  const state = repoOnly ? "run locally" : app.status === "up" ? "online" : app.status === "down" ? "down" : "unknown";
  const btns = [
    url ? `<a class="btn go" href="${esc(url)}" target="_blank" rel="noopener">Open</a>` : "",
    app.repo_url ? `<a class="btn" href="${esc(app.repo_url)}" target="_blank" rel="noopener" title="GitHub">Git</a>` : "",
  ].filter(Boolean).join("");
  const desc = app.category === "demo" ? (app.demo_text || app.description) : app.description;
  return `
    <section class="unit ${esc(app.status)}" aria-label="${esc(app.name)}: ${state}">
      <div class="ear"></div>
      <div class="face">
        <span class="led ${esc(app.status)}" title="${state}"></span>
        <div class="who">
          <div class="line1"><span class="name">${esc(app.name)}</span><span class="plate">${esc(host(app))}</span></div>
          <div class="desc" title="${esc(desc)}">${esc(desc)}</div>
        </div>
        <div class="bays3" aria-hidden="true">${activity()}${activity()}${activity()}</div>
        <div class="btns">${btns || (app.probe ? `<span class="intl">INTERNAL</span>` : `<span class="muted">no URL</span>`)}</div>
      </div>
      <div class="ear"></div>
    </section>`;
}

function renderCatalog(apps) {
  const el = document.getElementById("rack-units");
  if (!apps.length) { el.innerHTML = `<p class="muted pad">No applications configured.</p>`; return; }
  // apps.yaml decides the layout: `column` (1 left, 2 right), file order top to bottom; no column: the shorter one.
  const cols = [[], []];
  apps.forEach((a) => {
    const c = a.column === 1 || a.column === 2 ? a.column - 1 : (cols[0].length <= cols[1].length ? 0 : 1);
    cols[c].push(a);
  });
  el.innerHTML = cols.map((list) => `<div class="col">${list.map(unit).join("")}</div>`).join("");
  const up = apps.filter((a) => a.status === "up").length, down = apps.filter((a) => a.status === "down").length;
  document.getElementById("rack-summary").innerHTML =
    `<b>${apps.length}</b> components · <b>${up}</b> online${down ? ` · <b style="color:var(--down)">${down} down</b>` : ""}`;
}

function renderHilSnapshot(snapshot) {
  const el = document.getElementById("hil-snapshot");

  if (!snapshot.reachable) {
    el.innerHTML = `<p class="muted">HIL is not reachable right now${snapshot.detail ? ` (${snapshot.detail})` : ""}.</p>`;
    return;
  }

  if (!snapshot.applications.length) {
    el.innerHTML = `<p class="muted">No applications registered in HIL yet.</p>`;
    return;
  }

  // HIL's own filterByApplication query param, per dashboard_plan.md --
  // "Open in HIL" pre-filters straight to that application's view.
  const hilAppUrl = window.__K9X_HIL_URL__ || "";

  const rows = snapshot.applications.map((a) => {
    const openHref = hilAppUrl ? `${hilAppUrl}/?application_id=${a.id}` : hilAppUrl;
    const openLink = hilAppUrl
      ? `<a href="${openHref}" target="_blank" rel="noopener">Open in HIL →</a>`
      : "";
    const critical = a.critical > 0
      ? `<span class="critical-badge">${a.critical}</span>`
      : a.critical;
    return `
      <tr>
        <td>${a.name}</td>
        <td>${a.total}</td>
        <td>${a.pending}</td>
        <td>${a.in_progress}</td>
        <td>${a.escalated}</td>
        <td>${critical}</td>
        <td>${a.oldest_open ? new Date(a.oldest_open).toLocaleDateString() : "—"}</td>
        <td>${openLink}</td>
      </tr>
    `;
  }).join("");

  const t = snapshot.totals;
  el.innerHTML = `
    <table class="hil-table">
      <thead>
        <tr>
          <th>Application</th><th>Total</th><th>Pending</th><th>In Progress</th>
          <th>Escalated</th><th>Critical</th><th>Oldest Open</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="font-weight:600">
          <td>Total</td><td>${t.total}</td><td>${t.pending}</td><td>${t.in_progress}</td>
          <td>${t.escalated}</td><td>${t.critical}</td><td></td><td></td>
        </tr>
      </tbody>
    </table>
  `;
}

function meter(label, value, pct, level) {
  const bar = pct != null ? `<div class="bar"><i style="width:${Math.min(100, Math.max(0, pct))}%"></i></div>` : "";
  return `<div class="meter ${level || ""}"><div class="k">${label}<b>${value}</b></div>${bar}</div>`;
}

function renderGpuTelemetry(d) {
  const el = document.getElementById("gpu-telemetry");
  const led = document.getElementById("host-led");
  if (!el) return;
  if (d.error || d.temperatureC == null) {
    el.innerHTML = `<div class="offline">Telemetry unreachable</div>`;
    if (led) led.className = "led down";
    return;
  }
  if (led) led.className = "led up";
  const limit = d.temp_limit_c ?? 85, temp = d.temperatureC;
  const tempLevel = temp >= limit ? "critical" : temp >= limit - 10 ? "warn" : "";
  const memPct = d.memoryTotalMiB ? (d.memoryUsedMiB / d.memoryTotalMiB) * 100 : null;
  let html = "";
  html += meter("GPU load", `${d.gpuUtilizationPct ?? "--"}%`, d.gpuUtilizationPct, d.gpuUtilizationPct >= 90 ? "warn" : "");
  html += meter("GPU temp", `${temp}°C`, (temp / limit) * 100, tempLevel);
  html += meter("GPU memory", `${((d.memoryUsedMiB ?? 0) / 1024).toFixed(1)} / ${((d.memoryTotalMiB ?? 0) / 1024).toFixed(0)} GB`,
                memPct, memPct != null && memPct >= 90 ? "warn" : "");
  if (d.cpuLoadPct != null) html += meter("CPU load", `${d.cpuLoadPct}%`, d.cpuLoadPct, d.cpuLoadPct >= 90 ? "warn" : "");
  if (d.cpuMemory) {
    const p = d.cpuMemory.totalMiB ? (d.cpuMemory.usedMiB / d.cpuMemory.totalMiB) * 100 : null;
    html += meter("CPU memory", `${(d.cpuMemory.usedMiB / 1024).toFixed(1)} / ${(d.cpuMemory.totalMiB / 1024).toFixed(0)} GB`,
                  p, p != null && p >= 90 ? "warn" : "");
  }
  if (d.cpuTempC != null) html += meter("CPU temp", `${d.cpuTempC}°C`, null, "");
  el.innerHTML = html;
}

// ── per-core CPU graph: one line per core, last few minutes (Prometheus-style) ──
function coreColor(i, n) {
  const hue = Math.round((i / Math.max(1, n)) * 270);           // spread over red..violet, clear of pink
  return `hsl(${hue}, 85%, 60%)`;
}

function drawCpu(d) {
  const cv = document.getElementById("cpu-chart"), foot = document.getElementById("cpu-foot"), avgEl = document.getElementById("cpu-avg");
  if (!cv) return;
  if (!d.available || !d.samples || d.samples.length < 2) {
    foot.textContent = d.available ? "Collecting… (first points in a few seconds)" : "Per-core graph runs on the Linux host";
    avgEl.textContent = "";
    return;
  }
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  // grid: 25 / 50 / 75 %
  g.strokeStyle = "rgba(111, 191, 142, .14)"; g.lineWidth = 1;
  for (const y of [.25, .5, .75]) { g.beginPath(); g.moveTo(0, Math.round(H * y) + .5); g.lineTo(W, Math.round(H * y) + .5); g.stroke(); }
  // the box fills while history builds up after a restart, then scrolls with the newest point at the right
  const s = d.samples, n = d.cores, span = Math.max(1, Math.min(d.window || s.length, Math.max(30, s.length)) - 1);
  const x = (k) => W - ((s.length - 1 - k) / span) * W;           // newest at the right edge
  const y = (p) => H - (Math.min(100, Math.max(0, p)) / 100) * (H - 2) - 1;
  g.lineWidth = 1.1; g.globalAlpha = .9;
  for (let c = 0; c < n; c++) {
    g.strokeStyle = coreColor(c, n); g.beginPath();
    s.forEach((pt, k) => { const px = x(k), py = y(pt.p[c] ?? 0); k ? g.lineTo(px, py) : g.moveTo(px, py); });
    g.stroke();
  }
  g.globalAlpha = 1;
  const last = s[s.length - 1].p, avg = last.reduce((a, b) => a + b, 0) / last.length, peak = Math.max(...last);
  avgEl.textContent = `${avg.toFixed(0)}%`;
  foot.textContent = `${n} cores · peak ${peak.toFixed(0)}% · last ${Math.round(((s.length - 1) * d.interval) / 60) || 1} min`;
}

async function pollCpu() {
  try { drawCpu(await api("/api/cpu-history")); }
  catch (e) { drawCpu({ available: false }); }
}

async function pollGpuTelemetry() {
  try {
    const d = await api("/api/gpu-telemetry");
    renderGpuTelemetry(d);
  } catch (e) {
    renderGpuTelemetry({ error: e.message });
  }
}

async function refreshCatalog() {
  try {
    const catalogRes = await api("/api/catalog");
    renderCatalog(catalogRes.apps);

    // Resolve HIL's own URL from the catalog itself, so the snapshot's
    // deep link stays consistent with whatever apps.yaml actually says --
    // no separate hardcoded HIL URL here.
    const hilApp = catalogRes.apps.find((a) => a.slug === "hil");
    window.__K9X_HIL_URL__ = hilApp ? (hilApp.url_prod || hilApp.url_local || "") : "";
  } catch (e) {
    document.getElementById("rack-units").innerHTML = `<p class="muted pad">Failed to load catalog: ${esc(e.message)}</p>`;
  }
}

async function refreshHilSnapshot() {
  try {
    const snapshot = await api("/api/hil-snapshot");
    renderHilSnapshot(snapshot);
  } catch (e) {
    document.getElementById("hil-snapshot").innerHTML =
      `<p class="muted">Failed to load HIL snapshot: ${e.message}</p>`;
  }
}

async function init() {
  await refreshCatalog();
  await refreshHilSnapshot();

  // Auto-refresh -- a card showing Down might actually be back up (or
  // vice versa) since the last load; re-check rather than requiring a
  // manual browser reload. 30s matches the backend's own catalog cache
  // TTL (catalog.py) -- polling faster would just re-fetch the same
  // cached result. HIL snapshot has no backend cache, but 30s is a
  // reasonable cadence for task-queue counts (not truly real-time data).
  setInterval(refreshCatalog, 30000);
  setInterval(refreshHilSnapshot, 30000);

  pollGpuTelemetry();
  setInterval(pollGpuTelemetry, 3000);
  pollCpu();
  setInterval(pollCpu, 2000);
}

init();
