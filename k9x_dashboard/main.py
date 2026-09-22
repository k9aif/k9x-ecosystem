# SPDX-License-Identifier: Apache-2.0
"""k9x_dashboard -- read-only ecosystem catalog + HIL snapshot + deep links.

Same shape as k9x-hil/main.py: FastAPI + static webui, no build step.
Never a proxy -- this app never calls another app's write endpoints and
never embeds another app's UI. See dashboard_plan.md for the full design.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

from backend.catalog import get_catalog_with_status
from backend.hil_snapshot import get_hil_snapshot

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


@app.get("/{full_path:path}")
def serve_ui(full_path: str):
    if _INDEX.exists():
        return FileResponse(str(_INDEX))
    return {"error": "webui not found"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8087, reload=True)
