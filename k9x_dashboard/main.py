# SPDX-License-Identifier: Apache-2.0
"""k9x_dashboard -- read-only ecosystem catalog + HIL snapshot + deep links.

Same shape as k9x-hil/main.py: FastAPI + static webui, no build step.
Never a proxy -- this app never calls another app's write endpoints and
never embeds another app's UI. See dashboard_plan.md for the full design.
"""

import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from dotenv import load_dotenv

load_dotenv()

from backend.catalog import get_catalog_with_status
from backend.hil_snapshot import get_hil_snapshot
from backend.gpu_telemetry import get_telemetry as get_gpu_telemetry

_ROOT   = Path(__file__).resolve().parent
_WEBUI  = _ROOT / "webui"
_STATIC = _WEBUI / "static"
_INDEX  = _WEBUI / "index.html"

app = FastAPI(title="k9x Dashboard", version="1.0.0")

if _STATIC.exists():
    app.mount("/static", StaticFiles(directory=str(_STATIC)), name="static")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/catalog")
def catalog():
    return {"apps": get_catalog_with_status()}


@app.get("/api/hil-snapshot")
def hil_snapshot():
    return get_hil_snapshot()


@app.get("/api/gpu-telemetry")
def gpu_telemetry():
    return get_gpu_telemetry()


def _versioned(match: re.Match) -> str:
    """/static/app.js -> /static/app.js?v=<content hash>, so a changed file gets a new URL."""
    path = match.group(1)
    f = _STATIC / path
    v = hashlib.sha256(f.read_bytes()).hexdigest()[:10] if f.is_file() else "0"
    return f"/static/{path}?v={v}"


@app.get("/{full_path:path}")
def serve_ui(full_path: str):
    # Static asset URLs are stamped with a content hash on every page load:
    # browsers never keep an old app.js/app.css after a deploy, and nobody has
    # to bump a version by hand.
    if _INDEX.exists():
        html = re.sub(r"/static/([\w./-]+\.(?:js|css))", _versioned, _INDEX.read_text())
        return HTMLResponse(html, headers={"Cache-Control": "no-cache"})
    return {"error": "webui not found"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8089, reload=True)
