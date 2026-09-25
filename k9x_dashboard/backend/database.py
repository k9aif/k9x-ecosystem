# SPDX-License-Identifier: Apache-2.0
"""Read-only connection to HIL's own Postgres schema (k9hil).

Direct DB read, not HIL's /api/dashboard endpoint -- that endpoint requires
an authenticated HIL session (get_current_user) and only returns one scope
per call (all tasks, or one application_id), not a grouped-by-application
breakdown in a single request. Building token-based auth against another
app's login blind, without real HIL credentials, is a worse "never a
proxy" violation than a read-only DB connection: it would mean holding a
service credential for HIL's own auth system. This dashboard never writes
to k9hil, and the query in hil_snapshot.py mirrors HIL's own dashboard()
endpoint's grouping logic exactly (verified live against the real database
before this file was written) so the two never disagree by construction.

Revisit if HIL ever exposes an unauthenticated read-only summary endpoint
of its own -- that would be the cleaner boundary per dashboard_plan.md's
own stated preference.
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

_HOST   = os.getenv("POSTGRES_HOST", "localhost")
_PORT   = os.getenv("POSTGRES_PORT", "5432")
_USER   = os.getenv("POSTGRES_USER", "postgres")
_PASS   = os.getenv("POSTGRES_PASSWORD", "postgres")
_DB     = os.getenv("POSTGRES_DB", "k9x")
_SCHEMA = os.getenv("HIL_SCHEMA", "k9hil")

# Name the driver explicitly. A bare "postgresql://" URL means psycopg2 on
# SQLAlchemy 2.0 but psycopg (v3) on 2.1+ -- and `sqlalchemy>=2.0` resolves
# 2.1 on a fresh build, while this app installs psycopg2-binary: the import
# fails with ModuleNotFoundError: psycopg and the container crash-loops
# (hit live by k9x-hil 2026-09-25; same bug as k9-aif G-20).
# POSTGRES_DRIVER=psycopg switches to v3 for anyone who installs it instead.
_DRIVER = os.getenv("POSTGRES_DRIVER", "psycopg2")

# URL.create escapes the password, so characters like @ / : # can't break it.
DATABASE_URL = URL.create(
    drivername=f"postgresql+{_DRIVER}",
    username=_USER,
    password=_PASS or None,
    host=_HOST,
    port=int(_PORT),
    database=_DB,
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def hil_reachable() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text(f'SET search_path TO "{_SCHEMA}"'))
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
