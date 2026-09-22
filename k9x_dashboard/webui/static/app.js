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

async function init() {
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

  try {
    const snapshot = await api("/api/hil-snapshot");
    renderHilSnapshot(snapshot);
  } catch (e) {
    document.getElementById("hil-snapshot").innerHTML =
      `<p class="muted">Failed to load HIL snapshot: ${e.message}</p>`;
  }
}

init();
