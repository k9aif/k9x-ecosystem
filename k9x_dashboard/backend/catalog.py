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
        status = _probe(probe_url, app.get("health_path", "/health")) if probe_url else "unknown"
        result.append({**app, "status": status})

    _cache["data"] = result
    _cache["ts"] = now
    return result
