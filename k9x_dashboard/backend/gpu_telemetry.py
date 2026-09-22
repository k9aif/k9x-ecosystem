# SPDX-License-Identifier: Apache-2.0
"""GPU/CPU telemetry -- proxies the real nvidia-smi-backed server (Node/
Express, GET /gpu) already running on the PowerAI host, same one k9chat's
own gpu_telemetry.py proxies. Never fabricates a reading -- an unreachable
server reports {"error": ...}, not a fake number.

Meaningful here (unlike k9chat's own now-removed telemetry panel, killed
because per-chat-message GPU% was misleading when other things share the
GPU): this dashboard's whole purpose is showing what's running on the
host as a whole, so aggregate load is exactly the right thing to show,
not a misleading per-request number.

URL is env-configurable, not hardcoded to localhost -- this app runs
containerized (ubuntu/build-run.sh), and localhost inside that container
never reaches the host's telemetry server. Same host.containers.internal
pattern k9x_studio already uses for its Ollama URL.
"""

from __future__ import annotations

import os
import time
from typing import Optional

import requests

_URL = os.environ.get("K9X_GPU_TELEMETRY_URL", "http://host.containers.internal:5000/gpu")
_CACHE_TTL_SECONDS = 2.0

_cache: Optional[dict] = None
_cache_at: float = 0.0


def get_telemetry(force: bool = False) -> dict:
    """Returns the real telemetry dict, or {"error": "..."} if the
    telemetry server isn't reachable. Cached briefly so the dashboard's
    own polling doesn't hammer nvidia-smi harder than necessary."""
    global _cache, _cache_at
    now = time.monotonic()
    if not force and _cache is not None and (now - _cache_at) < _CACHE_TTL_SECONDS:
        return _cache

    try:
        resp = requests.get(_URL, timeout=3)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        data = {"error": str(exc)}

    _cache = data
    _cache_at = now
    return data
