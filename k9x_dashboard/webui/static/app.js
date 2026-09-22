async function api(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function appUrl(app) {
  return app.url_prod || app.url_local || null;
}

function renderCatalog(apps) {
  const el = document.getElementById("catalog-grid");
  if (!apps.length) {
    el.innerHTML = `<p class="muted">No applications configured.</p>`;
    return;
  }
  el.innerHTML = apps.map((app) => {
    const url = appUrl(app);
    const linkHtml = url
      ? `<a class="open-link" href="${url}" target="_blank" rel="noopener">Open →</a>`
      : `<span class="muted">no URL configured</span>`;
    return `
      <div class="app-card">
        <div class="app-card-top">
          <span class="app-card-name">${app.name}</span>
          <span class="status-dot ${app.status}" title="${app.status}"></span>
        </div>
        <div class="app-card-desc">${app.description || ""}</div>
        <div class="app-card-footer">
          <span class="status-label">${app.status}</span>
          ${linkHtml}
        </div>
      </div>
    `;
  }).join("");
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

function telemetryRow(label, value, pct, level) {
  const cls = level ? ` ${level}` : "";
  const bar = pct != null
    ? `<div class="telemetry-bar-track"><div class="telemetry-bar-fill" style="width:${Math.min(100, Math.max(0, pct))}%"></div></div>`
    : "";
  return `<div class="telemetry-row${cls}"><div class="label">${label}</div><div class="value">${value}</div>${bar}</div>`;
}

function renderGpuTelemetry(d) {
  const el = document.getElementById("gpu-telemetry");
  if (!el) return;

  if (d.error || d.temperatureC == null) {
    el.innerHTML = `<div class="telemetry-offline">Telemetry server unreachable</div>`;
    return;
  }

  const limit = d.temp_limit_c ?? 85;
  const temp = d.temperatureC;
  const tempLevel = temp >= limit ? "critical" : temp >= limit - 10 ? "warn" : "";
  const gpuLoadLevel = d.gpuUtilizationPct >= 90 ? "warn" : "";
  const memPct = d.memoryTotalMiB ? (d.memoryUsedMiB / d.memoryTotalMiB) * 100 : null;

  let html = "";
  html += telemetryRow("GPU Load", `${d.gpuUtilizationPct ?? "--"}%`, d.gpuUtilizationPct, gpuLoadLevel);
  html += telemetryRow("GPU Temperature", `${temp}°C`, (temp / limit) * 100, tempLevel);
  html += telemetryRow(
    "GPU Memory",
    `${d.memoryUsedMiB ?? "--"} / ${d.memoryTotalMiB ?? "--"} MiB`,
    memPct,
    memPct != null && memPct >= 90 ? "warn" : "",
  );
  if (d.cpuLoadPct != null) {
    html += telemetryRow("CPU Load", `${d.cpuLoadPct}%`, d.cpuLoadPct, d.cpuLoadPct >= 90 ? "warn" : "");
  }
  if (d.cpuMemory) {
    const cpuMemPct = d.cpuMemory.totalMiB ? (d.cpuMemory.usedMiB / d.cpuMemory.totalMiB) * 100 : null;
    html += telemetryRow(
      "CPU Memory",
      `${d.cpuMemory.usedMiB} / ${d.cpuMemory.totalMiB} MiB`,
      cpuMemPct,
      cpuMemPct != null && cpuMemPct >= 90 ? "warn" : "",
    );
  }
  if (d.cpuTempC != null) {
    html += telemetryRow("CPU Temperature", `${d.cpuTempC}°C`, null, "");
  }

  el.innerHTML = html;
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
    document.getElementById("catalog-grid").innerHTML =
      `<p class="muted">Failed to load catalog: ${e.message}</p>`;
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
}

init();
