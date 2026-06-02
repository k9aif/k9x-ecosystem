# SPDX-License-Identifier: Apache-2.0
# k9x_studio API routes

import os as _os
import re
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

# Set K9X_BLOCK_LOCAL=true in .env only for public-hosted instances.
# Default (local / intranet use): localhost endpoints are allowed.
_BLOCK_LOCAL = _os.environ.get("K9X_BLOCK_LOCAL", "false").lower() == "true"
_LOCAL_ADDRS = ("localhost", "127.0.0.1", "::1", "0.0.0.0")


def _is_local_blocked(endpoint: str) -> bool:
    return _BLOCK_LOCAL and any(loc in endpoint for loc in _LOCAL_ADDRS)
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
        "type": "intent_squad",
        "label": "Intent Orchestrator",
        "abbClass": "IntentOrchestrator",
        "color": "#06b6d4",
        "description": "Optional pre-router squad. Contains one IntentAgent that classifies incoming event intent for non-deterministic routing.",
        "singleton": True,
    },
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

class LlmSessionConfig(BaseModel):
    provider: str = "ollama"
    endpoint: str = ""
    model: str = ""
    api_key: str = ""


class SuggestRequest(BaseModel):
    project_name: str
    author: str = ""
    domain: str = ""
    description: str = ""
    llm: Optional[LlmSessionConfig] = None


@router.post("/suggest")
def suggest(req: SuggestRequest):
    """
    Suggest a K9-AIF architecture using the session-provided LLM config.
    LLM config is transient — passed per-request, never stored on disk.
    Falls back to a sensible default if no LLM is configured or call fails.
    """
    import json, re, requests as http
    from backend.services.context_service import get_llm_context
    _fw = get_llm_context()

    prompt = f"""{_fw}

---

## Project to design

Project name: {req.project_name}
Domain: {req.domain}
Description: {req.description}

---

Design a complete K9-AIF multi-agent architecture for this project.
Identify the distinct workflows in the description — each major workflow becomes a Squad.
For each Squad define 2–5 agents in execution order.

Return ONLY a JSON object — no explanation, no markdown, no code fences:
{{
  "orchestrators": [{{"name": "ExampleOrchestrator"}}],
  "squads": [{{"name": "ExampleSquad", "agents": ["AgentOne", "AgentTwo", "AgentThree"]}}],
  "agents": [
    {{"name": "AgentOne", "type": "BaseAgent", "model": "general", "description": "Triage and classify incoming requests"}},
    {{"name": "AgentTwo", "type": "K9ValidationLoopAgent", "model": "reasoning", "description": "Iteratively validates business rules until confidence threshold is met"}},
    {{"name": "AgentThree", "type": "K9CriticActorAgent", "model": "reasoning", "description": "Drafts and refines the output report"}}
  ]
}}

Return ONLY valid JSON. Every agent name in squads[].agents must have a matching entry in agents[].
"""

    default = _default_suggestion(req.project_name, req.domain)

    import os as _os
    from backend.services.config_service import get_llm_config

    # Priority: session config (browser UI) → env vars (.env / docker) → config.yaml → no LLM
    llm = req.llm
    if llm and llm.endpoint.strip():
        provider = llm.provider.strip() or "ollama"
        endpoint = llm.endpoint.strip().rstrip("/")
        model    = llm.model.strip() or "granite3.3:2b"
        api_key  = llm.api_key or ""
    elif _os.environ.get("LLM_ENDPOINT", "").strip():
        endpoint = _os.environ.get("LLM_ENDPOINT", "").strip().rstrip("/")
        provider = _os.environ.get("LLM_PROVIDER", "ollama").strip()
        model    = _os.environ.get("LLM_MODEL", "granite3.3:2b").strip()
        api_key  = _os.environ.get("LLM_API_KEY", "").strip()
    else:
        cfg = get_llm_config()
        endpoint = cfg.get("endpoint", "").strip().rstrip("/")
        provider = cfg.get("provider", "ollama")
        model    = cfg.get("model", "granite3.3:2b")
        api_key  = cfg.get("api_key", "")

    if not endpoint:
        return {"suggestion": default, "source": "default"}

    # Normalise scheme — requests requires http:// or https://
    if not endpoint.startswith(("http://", "https://")):
        endpoint = "http://" + endpoint

    if _is_local_blocked(endpoint):
        return {"suggestion": default, "source": "default"}

    try:
        raw = _call_llm(endpoint, provider, model, api_key, prompt)
        raw = re.sub(r"```(?:json)?", "", raw).strip()
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            suggestion = json.loads(match.group())
            if "agents" in suggestion and "squads" in suggestion:
                return {"suggestion": suggestion, "source": "llm"}
    except Exception:
        pass

    return {"suggestion": default, "source": "default"}


def _call_llm(endpoint: str, provider: str, model: str, api_key: str, prompt: str) -> str:
    """Call the configured LLM and return the raw text response. Raises on failure."""
    import requests as http
    if provider == "ollama":
        resp = http.post(
            f"{endpoint}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json().get("response", "")
    elif provider in ("openai", "custom"):
        headers: dict = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        resp = http.post(
            f"{endpoint}/chat/completions",
            headers=headers,
            json={"model": model, "messages": [{"role": "user", "content": prompt}]},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    elif provider == "anthropic":
        resp = http.post(
            f"{endpoint}/v1/messages",
            headers={"Content-Type": "application/json", "x-api-key": api_key,
                     "anthropic-version": "2023-06-01"},
            json={"model": model, "max_tokens": 2048,
                  "messages": [{"role": "user", "content": prompt}]},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
    raise ValueError(f"Unknown provider: {provider}")


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
async def bpmn_import(file: UploadFile = File(...), llm_config: Optional[str] = Form(None)):
    """
    Parse a BPMN 2.0 file or IBM BlueWorks Live ZIP export.
    If llm_config JSON is provided, uses LLM to intelligently group tasks into squads.
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
        base_suggestion = parse_bpmn(content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    process_name = extract_process_name(content)

    # ── LLM regrouping — if a session LLM config was provided ─────────────────
    if llm_config:
        import json as _json, re as _re
        try:
            cfg = _json.loads(llm_config)
            endpoint = cfg.get("endpoint", "").strip().rstrip("/")
            provider = cfg.get("provider", "ollama").strip()
            model    = cfg.get("model", "granite3.3:2b").strip()
            api_key  = cfg.get("api_key", "")
            if endpoint and not _is_local_blocked(endpoint):
                if not endpoint.startswith(("http://", "https://")):
                    endpoint = "http://" + endpoint
                from backend.services.context_service import get_llm_context as _get_ctx
                _fw = _get_ctx()
                agent_names = [a["name"].replace("Agent", "") for a in base_suggestion["agents"]]
                task_list   = "\n".join(f"- {n}" for n in agent_names)
                prompt = f"""{_fw}

---

## BPMN tasks to organise into K9-AIF squads

Process: {process_name or 'Process'}
Tasks extracted from the BPMN diagram:
{task_list}

Group these tasks into logical squads. Each squad represents a distinct workflow stage.
Assign the correct agent type to each task based on what it does.
Never put all tasks in one squad — identify 2–5 logical groupings.

Return ONLY a JSON object — no explanation, no markdown, no code fences:
{{
  "orchestrators": [{{"name": "ExampleOrchestrator"}}],
  "squads": [{{"name": "ExampleSquad", "agents": ["AgentOne", "AgentTwo"]}}],
  "agents": [{{"name": "AgentOne", "type": "BaseAgent", "model": "general", "description": "What this agent does"}}]
}}

Every agent name in squads[].agents must have a matching entry in agents[]. Return ONLY valid JSON.
"""
                raw_text = _call_llm(endpoint, provider, model, api_key, prompt)
                raw_text = _re.sub(r"```(?:json)?", "", raw_text).strip()
                match = _re.search(r"\{.*\}", raw_text, _re.DOTALL)
                if match:
                    llm_suggestion = _json.loads(match.group())
                    if "agents" in llm_suggestion and "squads" in llm_suggestion:
                        return {
                            "suggestion": llm_suggestion,
                            "process_name": process_name,
                            "source": "bpmn+llm",
                        }
        except Exception:
            pass  # fall through to rule-based result

    return {
        "suggestion": base_suggestion,
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
    safe_name = project.project_name.encode("ascii", "ignore").decode("ascii")
    filename = re.sub(r"[^a-z0-9]+", "_", safe_name.lower()).strip("_") + "_scaffold.zip"
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


@router.get("/stats")
def get_stats():
    """Increment and return studio visit counter. Stored in projects root."""
    import json, os, threading
    _lock = getattr(get_stats, "_lock", None)
    if _lock is None:
        get_stats._lock = threading.Lock()  # type: ignore[attr-defined]
        _lock = get_stats._lock

    projects_root = os.environ.get("K9X_PROJECTS_ROOT", ".")
    stats_path = Path(projects_root) / "stats.json"

    with _lock:
        stats: dict = {"visits": 0}
        if stats_path.exists():
            try:
                stats = json.loads(stats_path.read_text())
            except Exception:
                stats = {"visits": 0}
        stats["visits"] = stats.get("visits", 0) + 1
        try:
            stats_path.parent.mkdir(parents=True, exist_ok=True)
            stats_path.write_text(json.dumps(stats))
        except Exception:
            pass

    return {"visits": stats["visits"]}


@router.post("/llm/verify")
def verify_llm(req: LlmSessionConfig):
    """Lightweight connectivity check for a user-supplied LLM endpoint."""
    import requests as http

    endpoint = req.endpoint.strip().rstrip("/")
    if not endpoint:
        raise HTTPException(status_code=400, detail="Endpoint is required")
    if not endpoint.startswith(("http://", "https://")):
        endpoint = "http://" + endpoint

    if _is_local_blocked(endpoint):
        raise HTTPException(status_code=400, detail="Local addresses are not allowed on this instance")

    provider = req.provider.strip() or "ollama"
    headers: dict = {}
    if req.api_key:
        headers["Authorization"] = f"Bearer {req.api_key}"

    try:
        if provider == "ollama":
            # POST /api/generate with stream:false — same call OllamaLLM.generate() uses
            model = req.model.strip() or "llama3.1:latest"
            r = http.post(
                f"{endpoint}/api/generate",
                json={"model": model, "prompt": "hi", "stream": False},
                timeout=30,
            )
            if r.status_code == 404:
                raise HTTPException(status_code=502, detail=f"Model '{model}' not found on this Ollama server")
            r.raise_for_status()
            return {"ok": True, "detail": f"Connected · model {model} responded"}

        elif provider in ("openai", "custom"):
            r = http.get(f"{endpoint}/models", headers=headers, timeout=8)
            r.raise_for_status()
            return {"ok": True, "detail": "Connected"}

        elif provider == "anthropic":
            # Anthropic has no free health endpoint — send a minimal 1-token message
            r = http.post(
                f"{endpoint}/v1/messages",
                headers={**headers, "x-api-key": req.api_key or "", "anthropic-version": "2023-06-01"},
                json={"model": req.model or "claude-haiku-4-5-20251001",
                      "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]},
                timeout=12,
            )
            if r.status_code in (200, 400, 529):
                return {"ok": True, "detail": "Connected"}
            r.raise_for_status()
            return {"ok": True, "detail": "Connected"}

        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    except http.exceptions.ConnectionError:
        raise HTTPException(status_code=502, detail=f"Cannot reach {endpoint}")
    except http.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Endpoint timed out")
    except http.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Endpoint returned {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/docs")
def list_docs(folder: str = ""):
    import os
    if not folder:
        return {"files": []}
    projects_root = os.environ.get("K9X_PROJECTS_ROOT", "")
    out_dir = Path(folder).expanduser().resolve()
    if projects_root:
        root_dir = Path(projects_root).resolve()
        try:
            out_dir.relative_to(root_dir)
        except ValueError:
            return {"files": []}
    if not out_dir.exists():
        return {"files": []}
    files = []
    for f in sorted(out_dir.glob("*")):
        if f.is_file() and f.suffix in (".md", ".zip"):
            files.append({"name": f.name, "path": str(f), "size": f.stat().st_size})
    return {"files": files}


@router.get("/download")
def download_file(path: str = ""):
    import os
    from fastapi.responses import FileResponse
    if not path:
        raise HTTPException(status_code=400, detail="path required")
    projects_root = os.environ.get("K9X_PROJECTS_ROOT", "")
    file_path = Path(path).expanduser().resolve()
    if projects_root:
        root_dir = Path(projects_root).resolve()
        try:
            file_path.relative_to(root_dir)
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(file_path), filename=file_path.name)


@router.get("/health")
def health():
    return {"status": "ok", "service": "k9x_studio"}


# ── Work Intake Form ──────────────────────────────────────────────────────────

class WIFRequest(BaseModel):
    project_folder: str
    project_name: str = ""
    author: str = ""
    domain: str = ""
    description: str = ""
    vision: str = ""
    current_state: str = ""
    target_goals: str = ""
    notes: str = ""


@router.post("/save-wif")
def save_wif(req: WIFRequest):
    import os
    from datetime import date

    projects_root = os.environ.get("K9X_PROJECTS_ROOT", "")
    folder = req.project_folder.strip()
    if not folder:
        raise HTTPException(status_code=400, detail="project_folder is required")

    out_dir = Path(folder).expanduser().resolve()

    if projects_root:
        root_dir = Path(projects_root).resolve()
        try:
            out_dir.relative_to(root_dir)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"project_folder must be inside {projects_root}",
            )

    out_dir.mkdir(parents=True, exist_ok=True)

    def section(title: str, content: str) -> str:
        return f"\n## {title}\n\n{content.strip() or '_Not provided_'}\n" if True else ""

    md = f"""# Work Intake Form — {req.project_name or 'Untitled'}

**Date:** {date.today().isoformat()}
**Author:** {req.author or '—'}
**Domain:** {req.domain or '—'}
**Description:** {req.description or '—'}
{section("Business Vision", req.vision)}{section("Current State", req.current_state)}{section("Target Goals", req.target_goals)}{section("Notes", req.notes)}
---
*Generated by K9X Studio*
"""

    slug_proj = re.sub(r"[^a-z0-9]+", "_", req.project_name.lower()).strip("_")
    slug_app  = re.sub(r"[^a-z0-9]+", "_", (req.project_name or "").lower()).strip("_")
    filename  = f"{slug_proj}_intake.md" if not slug_app or slug_app == slug_proj else f"{slug_proj}_{slug_app}_intake.md"
    wif_path = out_dir / filename
    wif_path.write_text(md.strip())
    return {"status": "ok", "path": str(wif_path)}


# ── Spec doc import ───────────────────────────────────────────────────────────

def _parse_spec_doc(content: str) -> tuple:
    intake: dict = {}
    agents_raw: list = []

    h1 = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if h1:
        intake['project_name'] = h1.group(1).strip()

    outcome = re.search(r'\*\*Target Outcome:\*\*\s*(.+?)(?:\n|$)', content)
    if outcome:
        intake['description'] = outcome.group(1).strip()
        intake['vision'] = outcome.group(1).strip()

    kpi_matches = re.findall(r'(\d+[-–]\d+%[^;,\n]{0,60})', content)
    if kpi_matches:
        intake['target_goals'] = '; '.join(kpi_matches[:4])

    text_lower = content.lower()
    if any(k in text_lower for k in ('claim', 'insurance', 'policy', 'fnol')):
        intake['domain'] = 'Insurance'
    elif any(k in text_lower for k in ('invoice', 'accounts payable', 'expense reimburs')):
        intake['domain'] = 'Finance / AP'
    elif any(k in text_lower for k in ('patient', 'clinical', 'ehr')):
        intake['domain'] = 'Healthcare'
    elif any(k in text_lower for k in ('loan', 'mortgage', 'credit')):
        intake['domain'] = 'Banking'

    # Section 3.1.8 — Agent Definition Register (preferred, has Zone column)
    sec318 = re.search(r'###\s+3\.1\.8[^\n]*\n(.*?)(?=\n###|\Z)', content, re.DOTALL)
    if sec318:
        agents_raw = _parse_table(sec318.group(1), col_name=0, col_desc=1, col_zone=5)

    # Section 3.3.1 — Agent Roster (fallback, no Zone column)
    if not agents_raw:
        sec331 = re.search(r'###\s+3\.3\.1[^\n]*\n(.*?)(?=\n###|\Z)', content, re.DOTALL)
        if sec331:
            agents_raw = _parse_table(sec331.group(1), col_name=0, col_desc=2, col_zone=-1)

    return intake, agents_raw


def _parse_table(table_text: str, col_name: int, col_desc: int, col_zone: int) -> list:
    agents = []
    rows = [l.strip() for l in table_text.split('\n') if l.strip().startswith('|')]
    for row in rows[2:]:  # skip header + separator
        cols = [c.strip() for c in row.split('|')]
        cols = [c for c in cols if c]  # drop empty edge cells
        if len(cols) <= col_name:
            continue
        name = cols[col_name]
        desc = cols[col_desc] if col_desc < len(cols) else ''
        zone = cols[col_zone].upper() if col_zone >= 0 and col_zone < len(cols) else 'GREEN'
        if name and name != '---':
            agents.append({'name': name, 'description': desc, 'zone': zone})
    return agents


def _build_suggestion_from_spec(project_name: str, agents_raw: list) -> dict:
    from backend.services.scaffold_service import to_pascal
    prefix = to_pascal(project_name)

    green = [a for a in agents_raw if a['zone'] == 'GREEN']
    ai    = [a for a in agents_raw if a['zone'] in ('AMBER', 'RED')]

    if not green and not ai:
        half = max(1, len(agents_raw) // 2)
        green, ai = agents_raw[:half], agents_raw[half:]

    def zone_to_type(z: str) -> str:
        if z == 'RED':   return 'K9CriticActorAgent'
        if z == 'AMBER': return 'K9ValidationLoopAgent'
        return 'BaseAgent'

    orchestrators, squads, all_agents = [], [], []

    if green:
        orchestrators.append({'name': f'{prefix}OperationsOrchestrator'})
        squads.append({'name': f'{prefix}OperationsSquad', 'agents': [a['name'] for a in green]})
        for a in green:
            all_agents.append({'name': a['name'], 'type': 'BaseAgent',
                               'model': 'general', 'description': a['description']})
    if ai:
        orchestrators.append({'name': f'{prefix}IntelligenceOrchestrator'})
        squads.append({'name': f'{prefix}IntelligenceSquad', 'agents': [a['name'] for a in ai]})
        for a in ai:
            all_agents.append({'name': a['name'], 'type': zone_to_type(a['zone']),
                               'model': 'reasoning', 'description': a['description']})

    return {'orchestrators': orchestrators, 'squads': squads, 'agents': all_agents}


@router.post("/spec/import")
async def spec_import(file: UploadFile = File(...), llm_config: Optional[str] = Form(None)):
    """Parse a project spec .md and return intake fields + canvas suggestion."""
    fname = (file.filename or "").lower()
    if not fname.endswith((".md", ".txt")):
        raise HTTPException(status_code=400, detail="Upload a .md or .txt file")

    content = (await file.read()).decode("utf-8", errors="replace")
    intake, agents_raw = _parse_spec_doc(content)

    if llm_config and agents_raw:
        import json as _json, re as _re
        try:
            cfg = _json.loads(llm_config)
            endpoint = cfg.get("endpoint", "").strip().rstrip("/")
            provider = cfg.get("provider", "ollama").strip()
            model    = cfg.get("model", "granite3.3:2b").strip()
            api_key  = cfg.get("api_key", "")
            if endpoint and not _is_local_blocked(endpoint):
                if not endpoint.startswith(("http://", "https://")):
                    endpoint = "http://" + endpoint
                from backend.services.context_service import get_llm_context as _get_ctx
                _fw = _get_ctx()
                task_list = "\n".join(
                    f"- {a['name']} [{a['zone']}]: {a['description']}" for a in agents_raw
                )
                prompt = f"""{_fw}

---

## Spec document agents to organise into K9-AIF squads

Process: {intake.get('project_name', 'Process')}
Domain: {intake.get('domain', '')}
Agents extracted from the specification:
{task_list}

Group these agents into logical squads. Each squad represents a distinct workflow stage.
Assign the correct agent type (BaseAgent for GREEN/deterministic, K9ValidationLoopAgent for AMBER, K9CriticActorAgent for RED/high-risk).
Identify 2-4 logical groupings — never put all agents in one squad.

Return ONLY a JSON object — no explanation, no markdown, no code fences:
{{
  "orchestrators": [{{"name": "ExampleOrchestrator"}}],
  "squads": [{{"name": "ExampleSquad", "agents": ["AgentOne", "AgentTwo"]}}],
  "agents": [{{"name": "AgentOne", "type": "BaseAgent", "model": "general", "description": "What this agent does"}}]
}}

Every agent name in squads[].agents must have a matching entry in agents[]. Return ONLY valid JSON.
"""
                raw_text = _call_llm(endpoint, provider, model, api_key, prompt)
                raw_text = _re.sub(r"```(?:json)?", "", raw_text).strip()
                match = _re.search(r"\{.*\}", raw_text, _re.DOTALL)
                if match:
                    llm_suggestion = _json.loads(match.group())
                    if "agents" in llm_suggestion and "squads" in llm_suggestion:
                        return {"suggestion": llm_suggestion, "intake": intake, "source": "spec+llm"}
        except Exception:
            pass

    if agents_raw:
        suggestion = _build_suggestion_from_spec(intake.get('project_name', 'Project'), agents_raw)
        source = "spec"
    else:
        suggestion = _default_suggestion(intake.get('project_name', 'Project'), intake.get('domain', ''))
        source = "spec-fallback"
    return {"suggestion": suggestion, "intake": intake, "source": source}


@router.get("/config")
def get_config():
    """Return runtime configuration visible to the frontend."""
    import os
    return {
        "projects_root": os.environ.get("K9X_PROJECTS_ROOT", ""),
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
