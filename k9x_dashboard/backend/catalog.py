# SPDX-License-Identifier: Apache-2.0
"""Application catalog -- loads apps.yaml, polls each entry's health_path.

No DB, no auto-discovery (see apps.yaml's own header comment). Health is
polled on demand with a short cache (30s), not on a background timer --
this dashboard has no persistent state and doesn't need one; a page load
triggers fresh checks, cached briefly so rapid repeat requests (e.g. two
browser tabs) don't hammer every app's /health endpoint.
"""

from __future__ import annotations
import time
from pathlib import Path
from typing import Any, Dict, List

import requests
import yaml

_ROOT = Path(__file__).resolve().parent.parent
_APPS_YAML = _ROOT / "apps.yaml"

_CACHE_TTL = 30.0
_cache: Dict[str, Any] = {"ts": 0.0, "data": None}


def load_apps() -> List[Dict[str, Any]]:
    with open(_APPS_YAML) as f:
        return yaml.safe_load(f) or []


def _probe(url: str, health_path: str, timeout: float = 3.0) -> str:
    """Returns 'up', 'down', or 'unknown' (no url configured)."""
    if not url:
        return "unknown"
    try:
        resp = requests.get(url.rstrip("/") + health_path, timeout=timeout)
        return "up" if resp.status_code < 400 else "down"
    except Exception:
        return "down"


def _probe_internal(kind: str) -> str:
    """'postgres': SELECT 1 on the shared server. 'mcp': the MCP server answers HTTP at MCP_SERVER_URL (a
    streamable-HTTP endpoint answers a bare GET with 4xx: that still means it is up; no answer or 5xx is down).
    Not configured: unknown."""
    import os
    if kind == "postgres":
        from backend.database import postgres_reachable
        return "up" if postgres_reachable() else "down"
    if kind == "mcp":
        url = os.getenv("MCP_SERVER_URL", "").strip()
        if not url:
            return "unknown"
        try:
            return "up" if requests.get(url, timeout=3.0).status_code < 500 else "down"
        except Exception:
            return "down"
    return "unknown"


def get_catalog_with_status() -> List[Dict[str, Any]]:
    now = time.monotonic()
    if _cache["data"] is not None and (now - _cache["ts"]) < _CACHE_TTL:
        return _cache["data"]

    apps = load_apps()
    result = []
    for app in apps:
        # Prefer prod (the real, publicly reachable instance) for the
        # status dot; fall back to local if prod isn't configured.
        probe_url = app.get("url_prod") or app.get("url_local")
        if app.get("probe"):
            # Internal infrastructure (database, MCP server): checked from here, on the intranet; its address
            # stays in .env and never reaches the page.
            status = _probe_internal(app["probe"])
            app = {k: v for k, v in app.items() if k not in ("url_prod", "url_local")}
        elif app.get("repo_url") and not app.get("url_prod"):
            # Download-and-run tool: nothing hosted to probe (a url_local on
            # the dashboard's own host says nothing about the viewer's machine).
            status = "repo"
        else:
            status = _probe(probe_url, app.get("health_path") or "/health") if probe_url else "unknown"
        result.append({**app, "status": status})

    _cache["data"] = result
    _cache["ts"] = now
    return result
