# SPDX-License-Identifier: Apache-2.0
# k9x_studio API routes

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import zipfile
from pathlib import Path

from backend.services.scaffold_service import generate_scaffold
from backend.services.bpmn_service import parse_bpmn, extract_process_name

router = APIRouter()


# ── Component palette ──────────────────────────────────────────────────────────

PALETTE = [
    {
        "type": "router",
        "label": "Router",
        "abbClass": "K9EventRouter",
        "color": "#6366f1",
        "description": "Routes events by event_type to the correct orchestrator.",
        "singleton": True,
    },
    {
        "type": "orchestrator",
        "label": "Orchestrator",
        "abbClass": "BaseOrchestrator",
        "color": "#8b5cf6",
        "description": "Coordinates squad execution for a domain workflow.",
    },
    {
        "type": "squad",
        "label": "Squad",
        "abbClass": "BaseSquad",
        "color": "#0ea5e9",
        "description": "Executes a defined flow of agents in sequence.",
    },
    {
        "type": "agent",
        "label": "Agent",
        "abbClass": "BaseAgent",
        "color": "#10b981",
        "description": "One-shot agent: execute(payload) → dict.",
    },
    {
        "type": "validation_loop",
        "label": "Validation Loop",
        "abbClass": "K9ValidationLoopAgent",
        "color": "#f59e0b",
        "description": "Iterative hypothesis-validate-reason loop agent.",
    },
    {
        "type": "critic_actor",
        "label": "Critic-Actor",
        "abbClass": "K9CriticActorAgent",
        "color": "#ef4444",
        "description": "Generate-critique-refine-accept agent.",
    },
    {
        "type": "guard",
        "label": "Guard",
        "abbClass": "BaseGovernance",
        "color": "#64748b",
        "description": "Governance / zero-trust guard.",
    },
]


@router.get("/components")
def get_components():
    return {"components": PALETTE}


# ── Architecture suggestion ────────────────────────────────────────────────────

class SuggestRequest(BaseModel):
    project_name: str
    author: str = ""
    domain: str = ""
    description: str = ""


@router.post("/suggest")
def suggest(req: SuggestRequest):
    """
    Call Ollama to suggest an initial K9-AIF architecture based on project description.
    Falls back to a sensible default if LLM is unavailable.
    """
    import json, re, requests as http

    prompt = f"""You are a K9-AIF architect. Suggest a multi-agent architecture for this project.

Project: {req.project_name}
Domain: {req.domain}
Description: {req.description}

Return ONLY a JSON object — no explanation, no markdown, no code fences — with this exact structure:
{{
  "orchestrators": [
    {{"name": "ExampleOrchestrator"}}
  ],
  "squads": [
    {{"name": "ExampleSquad", "agents": ["AgentOne", "AgentTwo", "AgentThree"]}}
  ],
  "agents": [
    {{"name": "AgentOne", "type": "BaseAgent", "model": "general", "description": "What this agent does"}},
    {{"name": "AgentTwo", "type": "K9ValidationLoopAgent", "model": "reasoning", "description": "What this agent does"}},
    {{"name": "AgentThree", "type": "BaseAgent", "model": "general", "description": "What this agent does"}}
  ]
}}

Rules:
- All agent names must end with "Agent"
- Use K9ValidationLoopAgent for agents that need iterative verification or confidence scoring
- Use K9CriticActorAgent for agents that generate and refine output (drafting, reports, contracts)
- Use BaseAgent for simple one-shot classification or audit agents
- Suggest 3-5 agents that make sense for the domain
- Name everything based on the {req.domain} domain

Return ONLY valid JSON.
"""

    default = _default_suggestion(req.project_name, req.domain)

    import os
    ollama_base = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")

    try:
        resp = http.post(
            f"{ollama_base}/api/generate",
            json={"model": "granite3-dense:2b", "prompt": prompt, "stream": False},
            timeout=30,
        )
        raw = resp.json().get("response", "")
        # strip markdown fences if present
        raw = re.sub(r"```(?:json)?", "", raw).strip()
        # extract first JSON object
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            suggestion = json.loads(match.group())
            # validate minimal structure
            if "agents" in suggestion and "squads" in suggestion:
                return {"suggestion": suggestion, "source": "llm"}
    except Exception:
        pass

    return {"suggestion": default, "source": "default"}


def _default_suggestion(project_name: str, domain: str) -> dict:
    from backend.services.scaffold_service import to_pascal
    prefix = to_pascal(project_name)
    d = domain.strip().title() if domain else prefix
    return {
        "orchestrators": [{"name": f"{prefix}Orchestrator"}],
        "squads": [{"name": f"{prefix}Squad", "agents": [
            f"TriageAgent", f"ProcessingAgent", f"AuditAgent"
        ]}],
        "agents": [
            {"name": "TriageAgent", "type": "BaseAgent", "model": "general",
             "description": f"Triage and classify incoming {d} requests"},
            {"name": "ProcessingAgent", "type": "K9ValidationLoopAgent", "model": "reasoning",
             "description": f"Core {d} processing with iterative validation"},
            {"name": "AuditAgent", "type": "BaseAgent", "model": "general",
             "description": f"Audit and compliance check for {d} outcomes"},
        ],
    }


# ── BPMN import ───────────────────────────────────────────────────────────────

@router.post("/bpmn/import")
async def bpmn_import(file: UploadFile = File(...)):
    """
    Parse a BPMN 2.0 file or IBM BlueWorks Live ZIP export.
    ZIP: skips .xsd and Glossaries.bpmn, parses the main process .bpmn.
    """
    import io as _io

    fname = (file.filename or "").lower()
    if not fname.endswith((".bpmn", ".xml", ".zip")):
        raise HTTPException(status_code=400, detail="Upload a .bpmn, .xml, or .zip file")

    raw = await file.read()

    # ── Unzip if needed ────────────────────────────────────────────────────────
    if fname.endswith(".zip"):
        try:
            with zipfile.ZipFile(_io.BytesIO(raw)) as zf:
                candidates = [
                    n for n in zf.namelist()
                    if n.lower().endswith(".bpmn")
                    and "glossar" not in n.lower()
                ]
                if not candidates:
                    raise HTTPException(status_code=422,
                        detail="No process .bpmn file found inside the ZIP")
                # Prefer files that aren't just resources/participants
                main = next(
                    (c for c in candidates if "resource" not in c.lower()), candidates[0]
                )
                raw = zf.read(main)
        except zipfile.BadZipFile:
            raise HTTPException(status_code=422, detail="Not a valid ZIP file")

    content = raw.decode("utf-8", errors="replace")
    try:
        suggestion = parse_bpmn(content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    process_name = extract_process_name(content)
    return {
        "suggestion": suggestion,
        "process_name": process_name,
        "source": "bpmn",
    }


# ── Project generation ─────────────────────────────────────────────────────────

class AgentDef(BaseModel):
    name: str
    type: str = "BaseAgent"
    model: str = "general"
    pattern: str = "reasoning"
    description: str = ""

class SquadDef(BaseModel):
    name: str
    agents: List[str]

class OrchestratorDef(BaseModel):
    name: str
    squad: str

class ProjectDef(BaseModel):
    project_name: str
    author: str = ""
    domain: str = ""
    description: str = ""
    project_folder: str = ""
    framework_path: str = ""
    platforms: List[str] = Field(default_factory=list)
    output_path: str = ""
    orchestrators: List[OrchestratorDef] = Field(default_factory=list)
    squads: List[SquadDef] = Field(default_factory=list)
    agents: List[AgentDef] = Field(default_factory=list)


@router.post("/generate")
def generate(project: ProjectDef):
    zip_buf = generate_scaffold(project.model_dump())
    filename = project.project_name.lower().replace(" ", "_") + "_scaffold.zip"
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/generate-to-disk")
def generate_to_disk(project: ProjectDef):
    """Generate scaffold directly into a folder on the server's filesystem."""
    import os
    output_path = (project.output_path or project.project_folder).strip()
    if not output_path:
        raise HTTPException(status_code=400, detail="output_path is required")

    out_dir = Path(output_path).expanduser().resolve()

    # Guard: if a projects root is configured, the output path must be inside it.
    # This prevents writes landing inside the container instead of the mounted volume.
    projects_root = os.environ.get("K9X_PROJECTS_ROOT", "")
    if projects_root:
        root_dir = Path(projects_root).resolve()
        try:
            out_dir.relative_to(root_dir)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Output path must be inside {projects_root} (your mounted projects folder). "
                    f"Got: {out_dir}. Use a path starting with {projects_root}."
                ),
            )

    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot create directory: {e}")

    zip_buf = generate_scaffold(project.model_dump())

    import os
    with zipfile.ZipFile(zip_buf, "r") as zf:
        zf.extractall(out_dir)

    for sh in out_dir.rglob("*.sh"):
        sh.chmod(0o755)

    return {"status": "ok", "path": str(out_dir)}


class ScaffoldDownloadRequest(BaseModel):
    path: str


@router.post("/scaffold/download")
def download_scaffold(req: ScaffoldDownloadRequest):
    """Stream a ZIP of an already-written scaffold directory."""
    import io as _io
    path = Path(req.path).expanduser().resolve()
    if not path.exists() or not path.is_dir():
        raise HTTPException(status_code=404, detail=f"Scaffold folder not found: {path}")

    buf = _io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in path.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(path))
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={path.name}.zip"},
    )


class FeedbackRequest(BaseModel):
    text: str
    project: str = ""


@router.post("/feedback")
def submit_feedback(req: FeedbackRequest):
    """Append feedback entry to feedback.jsonl in the projects root."""
    import json, os
    from datetime import datetime, timezone

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Feedback text is required")

    projects_root = os.environ.get("K9X_PROJECTS_ROOT", ".")
    feedback_dir = Path(projects_root) / "feedback"
    feedback_dir.mkdir(parents=True, exist_ok=True)

    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "project": req.project or "",
        "text": text,
    }
    with open(feedback_dir / "feedback.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")

    return {"status": "ok"}


@router.get("/health")
def health():
    return {"status": "ok", "service": "k9x_studio"}


@router.get("/config")
def get_config():
    """Return runtime configuration visible to the frontend."""
    import os
    return {
        "projects_root": os.environ.get("K9X_PROJECTS_ROOT", ""),
        "ollama_url": os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
    }


# ── Framework setup ───────────────────────────────────────────────────────────

class CloneRequest(BaseModel):
    target_path: str
    repo_url: str = "https://github.com/k9aif/k9-aif-framework.git"


class VerifyRequest(BaseModel):
    path: str


@router.post("/setup/verify-framework")
def verify_framework(req: VerifyRequest):
    """Check whether a path contains a valid k9-aif-framework clone."""
    raw = req.path.strip()
    if not raw.startswith('/') and not raw.startswith('~'):
        raw = f"~/{raw}"
    target = Path(raw).expanduser().resolve()
    valid = (target / "generator" / "templates").exists()
    return {"valid": valid, "path": str(target)}


@router.post("/setup/clone-framework")
def clone_framework(req: CloneRequest):
    """
    Clone k9-aif-framework into target_path.
    If the directory already contains a valid clone, pull latest instead.
    """
    import subprocess

    raw = req.target_path.strip()
    # Relative paths → resolve from $HOME, not backend CWD
    if not raw.startswith('/') and not raw.startswith('~'):
        raw = f"~/{raw}"
    target = Path(raw).expanduser().resolve()

    try:
        target.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot create directory: {e}")

    git_dir = target / ".git"
    templates_dir = target / "generator" / "templates"
    try:
        if git_dir.exists() and templates_dir.exists():
            # Already a valid framework clone — nothing to do
            (target / "k9_projects").mkdir(exist_ok=True)
            return {"status": "ok", "path": str(target), "note": "already_exists"}
        elif git_dir.exists():
            # Repo present but incomplete — pull to complete it
            subprocess.run(
                ["git", "-C", str(target), "pull", "--depth=1"],
                check=True, capture_output=True, timeout=120,
            )
        else:
            # Fresh clone
            subprocess.run(
                ["git", "clone", "--depth=1", req.repo_url, str(target)],
                check=True, capture_output=True, timeout=180,
            )
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode() if e.stderr else ""
        raise HTTPException(status_code=500, detail=f"git failed: {stderr.strip() or str(e)}")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="git clone timed out — check your network")

    # Ensure k9_projects/ exists inside the framework folder
    (target / "k9_projects").mkdir(exist_ok=True)

    return {"status": "ok", "path": str(target)}
