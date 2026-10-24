# SPDX-License-Identifier: Apache-2.0
"""Read-only forum summary: open threads and which ones wait for a maintainer.

The forum is GitHub Discussions (forum.k9x.ai redirects there). Read through
GitHub's public REST API, which needs no token for a public repository; an
optional GITHUB_TOKEN only raises the rate limit. Anonymous calls get 60 an
hour per IP, so the summary is cached for 10 minutes and a thread's comments
are re-read only when the thread itself changed.

Never raises: GitHub being unreachable or rate-limited is reported in the
result, like every other check on this dashboard.
"""

from __future__ import annotations

import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import requests

_API = "https://api.github.com"
_TTL_SECONDS = 600
_MAX_THREADS = 10

_lock = threading.Lock()
_cache: Dict[str, Any] = {"at": 0.0, "value": None}
_last_commenter: Dict[int, Tuple[str, Optional[str]]] = {}   # number -> (updated_at, login)


def _config() -> Dict[str, Any]:
    return {
        "repo": os.getenv("FORUM_REPO", "k9aif/k9-aif-framework"),
        "url": os.getenv("FORUM_URL", "https://forum.k9x.ai"),
        "maintainers": {m.strip().lower() for m in os.getenv("FORUM_MAINTAINERS", "k9aif").split(",") if m.strip()},
    }


def _get(path: str, **params) -> Any:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(f"{_API}{path}", headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _last_comment_author(repo: str, d: Dict[str, Any]) -> Optional[str]:
    """Login of the latest top-level comment, or None when there are none."""
    if not d.get("comments"):
        return None
    number, updated = d["number"], d.get("updated_at")
    cached = _last_commenter.get(number)
    if cached and cached[0] == updated:
        return cached[1]
    comments = _get(f"/repos/{repo}/discussions/{number}/comments", per_page=100)
    login = ((comments[-1].get("user") or {}).get("login")) if comments else None
    _last_commenter[number] = (updated, login)
    return login


def _build() -> Dict[str, Any]:
    cfg = _config()
    repo, maintainers = cfg["repo"], cfg["maintainers"]
    discussions = _get(f"/repos/{repo}/discussions", per_page=50, sort="updated", direction="desc")

    threads: List[Dict[str, Any]] = []
    totals = {"open": 0, "needs_reply": 0, "unanswered_qa": 0}
    for d in discussions:
        if d.get("state") != "open" or d.get("locked"):
            continue
        totals["open"] += 1
        category = d.get("category") or {}
        author = ((d.get("user") or {}).get("login") or "").lower()
        last_by = _last_comment_author(repo, d) if len(threads) < _MAX_THREADS else None
        latest = (last_by or author).lower()
        needs_reply = latest not in maintainers
        unanswered = bool(category.get("is_answerable")) and not d.get("answer_chosen_at")
        totals["needs_reply"] += needs_reply
        totals["unanswered_qa"] += unanswered
        if len(threads) < _MAX_THREADS:
            threads.append({
                "number": d["number"], "title": d.get("title", ""), "url": d.get("html_url"),
                "category": category.get("name", ""), "author": author,
                "comments": d.get("comments", 0), "updated_at": d.get("updated_at"),
                "last_by": latest, "needs_reply": needs_reply, "unanswered": unanswered,
            })
    return {"reachable": True, "forum_url": cfg["url"], "repo": repo, "totals": totals, "threads": threads}


def get_forum_snapshot() -> Dict[str, Any]:
    with _lock:
        if _cache["value"] is not None and time.time() - _cache["at"] < _TTL_SECONDS:
            return _cache["value"]
        try:
            value = _build()
        except Exception as exc:
            cfg = _config()
            stale = _cache["value"]
            value = {"reachable": False, "detail": str(exc), "forum_url": cfg["url"],
                     "totals": stale["totals"] if stale else None,
                     "threads": stale["threads"] if stale else []}
        _cache.update(at=time.time(), value=value)
        return value
