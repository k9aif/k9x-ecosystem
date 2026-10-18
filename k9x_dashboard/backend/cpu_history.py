# SPDX-License-Identifier: Apache-2.0
"""Per-core CPU history for the rack's CPU box.

Reads the kernel's per-core counters in /proc/stat every few seconds and keeps a short rolling window. In a
container on PowerAI, /proc/stat is the host's (containers share the kernel), so this is the host's load with
no agent, exporter or extra dependency. Elsewhere (a Mac running the dashboard locally) there is no /proc/stat:
the endpoint says so and the page shows a note instead of a graph. Never fabricates a reading.
"""

from __future__ import annotations

import os
import threading
import time
from collections import deque
from typing import Any, Deque, Dict, List, Optional, Tuple

_PROC = os.getenv("K9X_PROC_STAT", "/proc/stat")      # override only for testing off-Linux
INTERVAL = float(os.getenv("K9X_CPU_SAMPLE_SECONDS", "2"))
WINDOW = int(float(os.getenv("K9X_CPU_WINDOW_SECONDS", "300")) / INTERVAL)

_samples: Deque[Tuple[float, List[float]]] = deque(maxlen=WINDOW)
_lock = threading.Lock()
_started = False


def _read() -> Optional[List[Tuple[int, int]]]:
    """[(busy, total)] per core from /proc/stat, or None where the file does not exist."""
    try:
        with open(_PROC) as f:
            lines = [ln.split() for ln in f if ln.startswith("cpu") and ln[3:4].isdigit()]
    except OSError:
        return None
    out = []
    for parts in lines:
        v = [int(x) for x in parts[1:]]
        idle = v[3] + (v[4] if len(v) > 4 else 0)          # idle + iowait
        total = sum(v[:8])                                  # user..steal (guest time is already in user)
        out.append((total - idle, total))
    return out


def _loop() -> None:
    prev = _read()
    while True:
        time.sleep(INTERVAL)
        cur = _read()
        if not cur or not prev or len(cur) != len(prev):
            prev = cur
            continue
        pct = []
        for (b1, t1), (b0, t0) in zip(cur, prev):
            dt = t1 - t0
            pct.append(round(100.0 * (b1 - b0) / dt, 1) if dt > 0 else 0.0)
        with _lock:
            _samples.append((time.time(), pct))
        prev = cur


def start() -> None:
    """Start the sampler once (at app start-up). Does nothing where /proc/stat is missing."""
    global _started
    if _started or _read() is None:
        return
    _started = True
    threading.Thread(target=_loop, name="cpu-history", daemon=True).start()


def history() -> Dict[str, Any]:
    if not _started:
        return {"available": False, "reason": "per-core CPU history comes from /proc/stat on the Linux host"}
    with _lock:
        samples = list(_samples)
    cores = len(samples[-1][1]) if samples else 0
    return {"available": True, "interval": INTERVAL, "window": WINDOW, "cores": cores,
            "samples": [{"t": round(t, 1), "p": p} for t, p in samples]}
