import { useState, useEffect } from 'react';
import { useStore } from '../store';

type CloneState = 'idle' | 'cloning' | 'done' | 'error';

const FRAMEWORK_REPO = 'https://github.com/k9aif/k9-aif-framework.git';

function dateSuffix(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function buildDefaultClonePath(projectsRoot: string): string {
  const ds = dateSuffix();
  if (projectsRoot) {
    const base = projectsRoot.endsWith('/') ? projectsRoot : `${projectsRoot}/`;
    return `${base}${ds}/k9-aif-framework`;
  }
  return `~/${ds}/k9x/k9-aif-framework`;
}

export function SetupScreen() {
  const { setScreen, setProject, project } = useStore();

  // ── Fetch runtime config (projects_root from env) ─────────────
  const [projectsRoot, setProjectsRoot] = useState('');
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.projects_root) setProjectsRoot(cfg.projects_root);
      })
      .catch(() => {});
  }, []);

  // ── Option A: already have it ─────────────────────────────────
  const [existingPath, setExistingPath] = useState('');
  const [pathError, setPathError] = useState('');

  const handleUseExisting = () => {
    const p = existingPath.trim();
    if (!p) { setPathError('Enter the path to your k9-aif-framework folder'); return; }
    const base = p.endsWith('/') ? p : `${p}/`;
    setProject({ ...project, framework_path: p, project_folder: `${base}k9_projects/` });
    setScreen('studio');
  };

  // ── Option B: clone into a new folder ────────────────────────
  const [clonePath, setClonePath] = useState(() => buildDefaultClonePath(''));
  useEffect(() => {
    setClonePath((prev) => {
      // Only update if user hasn't typed anything custom
      const defaultNoRoot = buildDefaultClonePath('');
      if (prev === defaultNoRoot || prev === '') return buildDefaultClonePath(projectsRoot);
      return prev;
    });
  }, [projectsRoot]);

  const [cloneState, setCloneState] = useState<CloneState>('idle');
  const [cloneError, setCloneError] = useState('');
  const [clonedAt, setClonedAt] = useState('');

  const handleClone = async () => {
    const p = clonePath.trim();
    if (!p) return;
    setCloneState('cloning');
    setCloneError('');
    try {
      const res = await fetch('/api/setup/clone-framework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_path: p, repo_url: FRAMEWORK_REPO }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Clone failed');
      const resolved = data.path as string;
      const base = resolved.endsWith('/') ? resolved : `${resolved}/`;
      setClonedAt(data.note === 'already_exists' ? `${resolved} (already exists — reusing)` : resolved);
      setProject({ ...project, framework_path: resolved, project_folder: `${base}k9_projects/` });
      setCloneState('done');
    } catch (err: any) {
      setCloneState('error');
      setCloneError(err.message ?? 'Clone failed');
    }
  };

  return (
    <div className="setup-screen">
      <div className="setup-card">

        <div className="setup-logo">
          <a className="logo-k9" href="https://k9x.ai" target="_blank" rel="noopener noreferrer">K9X</a>
          <span className="logo-studio">Studio</span>
        </div>
        <div className="setup-tagline">Architecture-First AI Builder · K9-AIF Framework</div>

        <div className="setup-prompt">
          K9X Studio needs the <strong>k9-aif-framework</strong> to generate project scaffolds.<br />
          Point me to it, or let me set it up for you.
        </div>

        {/* ── Option A ──────────────────────────────────────── */}
        <div className="setup-option">
          <div className="setup-option-label">I already have it</div>
          <div className="setup-option-sub">Point to the folder where you cloned k9-aif-framework</div>
          <div className="setup-input-row">
            <input
              className="setup-input"
              placeholder="~/path/to/k9-aif-framework"
              value={existingPath}
              onChange={(e) => { setExistingPath(e.target.value); setPathError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleUseExisting()}
              autoFocus
            />
            <button
              className="setup-browse-btn"
              title="Browse"
              onClick={async () => {
                try {
                  const dir = await (window as any).showDirectoryPicker({ mode: 'read' });
                  setExistingPath(dir.name);
                  setPathError('');
                } catch { /* cancelled */ }
              }}
            >⋯</button>
          </div>
          {pathError && <div className="setup-field-error">{pathError}</div>}
          <button
            className="setup-btn-primary"
            onClick={handleUseExisting}
            disabled={!existingPath.trim()}
          >
            Use this folder →
          </button>
        </div>

        <div className="setup-or"><span>or</span></div>

        {/* ── Option B ──────────────────────────────────────── */}
        <div className="setup-option">
          <div className="setup-option-label">Set it up for me</div>
          <div className="setup-option-sub">
            Point to a folder — K9X Studio will clone the framework from GitHub and prepare it for development
          </div>
          <div className="setup-input-row">
            <input
              className="setup-input"
              placeholder="~/k9-aif-framework"
              value={clonePath}
              onChange={(e) => { setClonePath(e.target.value); setCloneState('idle'); }}
              disabled={cloneState === 'cloning' || cloneState === 'done'}
            />
          </div>
          <div className="setup-repo-hint">↓ {FRAMEWORK_REPO}</div>

          {cloneState !== 'done' && (
            <button
              className="setup-btn-primary"
              onClick={handleClone}
              disabled={!clonePath.trim() || cloneState === 'cloning'}
            >
              {cloneState === 'cloning' ? '⟳  Cloning framework…' : 'Clone & Setup →'}
            </button>
          )}
          {cloneState === 'error' && (
            <div className="setup-field-error">✕ {cloneError}</div>
          )}
          {cloneState === 'done' && (
            <div className="setup-clone-success">
              <div className="setup-clone-ok">✓ Framework ready · {clonedAt}</div>
              <div className="setup-clone-hint">
                Scaffold projects will be generated into <code>{clonedAt}/k9_projects/</code>
              </div>
              <button className="setup-btn-primary" onClick={() => setScreen('studio')}>
                Open Studio →
              </button>
            </div>
          )}
        </div>

        <div className="setup-footer-skip">
          <button className="setup-skip-btn" onClick={() => setScreen('studio')}>
            Skip — I'll configure the framework path in Project Info
          </button>
        </div>

      </div>
    </div>
  );
}
