# SPDX-License-Identifier: Apache-2.0
"""Read-only HIL task summary, grouped by application.

Query mirrors HIL's own GET /api/dashboard grouping logic exactly (status/
priority column names and semantics taken directly from k9x-hil/backend/
models.py's Task/Queue/Application tables, and cross-checked live against
the real database before this file was written -- see hil_snapshot.py's
column names against that project's models.py if the schema ever changes
there). Read-only: SELECT only, never writes to k9hil.
"""

from __future__ import annotations
from typing import Any, Dict, List
from sqlalchemy import text
from backend.database import engine

_SCHEMA_SQL = 'SET search_path TO k9hil'

_QUERY = """
SELECT a.id, a.name,
  COUNT(t.id) AS total,
  COUNT(*) FILTER (WHERE t.status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE t.status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE t.status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE t.status = 'escalated') AS escalated,
  COUNT(*) FILTER (WHERE t.status = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE t.priority = 'critical'
                    AND t.status IN ('pending', 'in_progress')) AS critical,
  MIN(t.created_at) FILTER (WHERE t.status IN ('pending', 'in_progress')) AS oldest_open
FROM applications a
LEFT JOIN queues q ON q.application_id = a.id
LEFT JOIN tasks t ON t.queue_id = q.id
GROUP BY a.id, a.name
ORDER BY a.name
"""


def get_hil_snapshot() -> Dict[str, Any]:
    """Returns {"reachable": bool, "applications": [...], "totals": {...}}.

    Never raises -- HIL being unreachable is a real, expected state (it
    might not be running), reported in the result like every other health
    check in this dashboard, not an exception that breaks the page.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text(_SCHEMA_SQL))
            rows = conn.execute(text(_QUERY)).mappings().all()
    except Exception as exc:
        return {"reachable": False, "detail": str(exc), "applications": [], "totals": None}

    apps: List[Dict[str, Any]] = []
    totals = {"total": 0, "pending": 0, "in_progress": 0, "completed": 0,
              "escalated": 0, "rejected": 0, "critical": 0}

    for r in rows:
        entry = {
            "id": r["id"], "name": r["name"],
            "total": r["total"], "pending": r["pending"],
            "in_progress": r["in_progress"], "completed": r["completed"],
            "escalated": r["escalated"], "rejected": r["rejected"],
            "critical": r["critical"],
            "oldest_open": r["oldest_open"].isoformat() if r["oldest_open"] else None,
        }
        apps.append(entry)
        for k in totals:
            totals[k] += entry[k]

    return {"reachable": True, "applications": apps, "totals": totals}
