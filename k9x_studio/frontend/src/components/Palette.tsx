import { useEffect, useState } from 'react';
import type { PaletteComponent, ComponentType, NodeData } from '../types';
import { useStore } from '../store';
import { VALID_TARGETS, VALID_NEXT_LABEL } from '../rules';
import { PROJECT_TEMPLATES } from '../templates';
import type { ProjectTemplate } from '../templates';

const COMPONENT_COLORS: Record<string, string> = {
  router: '#6366f1', orchestrator: '#8b5cf6', squad: '#0ea5e9',
  agent: '#10b981', validation_loop: '#f59e0b', critic_actor: '#ef4444', guard: '#64748b',
};
const AGENT_TYPE_MAP: Record<string, string> = {
  BaseAgent: 'agent', K9ValidationLoopAgent: 'validation_loop', K9CriticActorAgent: 'critic_actor',
};
const ABB_MAP: Record<string, string> = {
  BaseAgent: 'BaseAgent', K9ValidationLoopAgent: 'K9ValidationLoopAgent', K9CriticActorAgent: 'K9CriticActorAgent',
};
const ICONS: Record<string, string> = {
  router: '⇄', orchestrator: '◈', squad: '◫', agent: '◉',
  validation_loop: '↻', critic_actor: '⇌', guard: '⊛',
};

let _pid = 200;
const uid2 = () => `regen-${_pid++}`;

interface PaletteProps {
  onDragStart: (e: React.DragEvent, component: PaletteComponent) => void;
  onExport: () => void;
  exporting: boolean;
  onDownload?: () => void;
  scaffoldReady?: boolean;
  downloading?: boolean;
}

type PaletteTab = 'components' | 'project';

type BpmnStatus = { state: 'idle' } | { state: 'loading' } | { state: 'ok'; name: string } | { state: 'error'; msg: string };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function Palette({ onDragStart, onExport, exporting, onDownload, scaffoldReady, downloading }: PaletteProps) {
  const [tab, setTab] = useState<PaletteTab>('project');
  const [components, setComponents] = useState<PaletteComponent[]>([]);
  const [bpmnStatus, setBpmnStatus] = useState<BpmnStatus>({ state: 'idle' });
  const [projectsRoot, setProjectsRoot] = useState('');
  const { project, setProject, clearCanvas, addNode, onConnect,
          nodes, selectedNodeId, generating, setGenerating, layoutCanvas, collapseAllSquads } = useStore();

  const inContainer = Boolean(projectsRoot);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.projects_root) {
          setProjectsRoot(cfg.projects_root);
        }
      })
      .catch(() => {});
  }, []);

  // When container root loads, fix project_folder if it's wrong or empty
  useEffect(() => {
    if (!projectsRoot) return;
    const root = projectsRoot.endsWith('/') ? projectsRoot : `${projectsRoot}/`;
    const currentFolder = project.project_folder;
    if (!currentFolder || !currentFolder.startsWith(root)) {
      setProject({ ...project, project_folder: containerOutputPath(project.project_name) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsRoot]);

  const containerOutputPath = (name: string) => {
    const root = projectsRoot.endsWith('/') ? projectsRoot : `${projectsRoot}/`;
    const slug = slugify(name);
    return slug ? `${root}k9_projects/${slug}/` : `${root}k9_projects/`;
  };

  const setField = (key: string, val: string) => {
    const updated = { ...project, [key]: val };
    if (inContainer) {
      // In container mode: auto-derive output path from project name
      if (key === 'project_name') {
        updated.project_folder = containerOutputPath(val);
      }
    } else {
      if (key === 'framework_path' && val.trim()) {
        const sep = val.trim().endsWith('/') ? '' : '/';
        updated.project_folder = `${val.trim()}${sep}k9_projects/`;
      }
    }
    setProject(updated);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedType = selectedNode ? (selectedNode.data as NodeData).componentType : null;
  const validNextTypes: ComponentType[] | null = selectedType ? VALID_TARGETS[selectedType] : null;

  useEffect(() => {
    fetch('/api/components')
      .then((r) => r.json())
      .then((d) => setComponents(d.components))
      .catch(() => setComponents([
        { type: 'router',          label: 'Router',          abbClass: 'K9EventRouter',        color: '#6366f1', description: 'Routes events to orchestrators', singleton: true },
        { type: 'orchestrator',    label: 'Orchestrator',    abbClass: 'BaseOrchestrator',      color: '#8b5cf6', description: 'Coordinates squad execution' },
        { type: 'squad',           label: 'Squad',           abbClass: 'BaseSquad',             color: '#0ea5e9', description: 'Executes agent flow in sequence' },
        { type: 'agent',           label: 'Agent',           abbClass: 'BaseAgent',             color: '#10b981', description: 'One-shot BaseAgent' },
        { type: 'validation_loop', label: 'Validation Loop', abbClass: 'K9ValidationLoopAgent', color: '#f59e0b', description: 'Iterative reasoning loop' },
        { type: 'critic_actor',    label: 'Critic-Actor',    abbClass: 'K9CriticActorAgent',    color: '#ef4444', description: 'Generate-critique-refine' },
        { type: 'guard',           label: 'Guard',           abbClass: 'BaseGovernance',        color: '#64748b', description: 'Governance / zero-trust' },
      ]));
  }, []);

  const buildCanvas = (suggestion: any) => {
    clearCanvas();
    const cx = 480;
    const routerId = uid2();
    addNode({ id: routerId, type: 'k9node', position: { x: cx - 90, y: 60 },
      data: { label: 'K9EventRouter', componentType: 'router' as ComponentType, color: COMPONENT_COLORS.router, abbClass: 'K9EventRouter', description: 'Routes events by event_type' } });

    const kafkaId = 'system-kafka';
    addNode({ id: kafkaId, type: 'k9node', position: { x: cx + 160, y: 60 },
      data: { label: 'Message Bus', componentType: 'system' as ComponentType, color: '#334155', abbClass: 'Apache Kafka', description: 'Event streaming backbone', system: true } });
    onConnect({ source: routerId, target: kafkaId, sourceHandle: 's-right', targetHandle: 't-left' });

    suggestion.orchestrators?.forEach((o: any, oi: number) => {
      const orchId = uid2();
      const orchX = cx - 90 + oi * 300;
      addNode({ id: orchId, type: 'k9node', position: { x: orchX, y: 220 },
        data: { label: o.name, componentType: 'orchestrator' as ComponentType, color: COMPONENT_COLORS.orchestrator, abbClass: 'BaseOrchestrator', description: `Orchestrator for ${o.name}` } });
      onConnect({ source: routerId, target: orchId, sourceHandle: 's-right', targetHandle: 't-left' });
      onConnect({ source: kafkaId, target: orchId, sourceHandle: 's-right', targetHandle: 't-left' });

      const orchSquads = suggestion.squads?.slice(oi, oi + 1) ?? [];
      orchSquads.forEach((sq: any) => {
        const squadId = uid2();
        addNode({ id: squadId, type: 'k9node', position: { x: orchX - 20, y: 400 },
          data: { label: sq.name, componentType: 'squad' as ComponentType, color: COMPONENT_COLORS.squad, abbClass: 'BaseSquad', description: `Squad: ${sq.name}` } });
        onConnect({ source: orchId, target: squadId, sourceHandle: 's-right', targetHandle: 't-left' });

        const count = (sq.agents ?? []).length;
        const spacing = Math.min(210, 800 / Math.max(count, 1));
        const startX = (orchX - 20) - ((count - 1) * spacing) / 2;
        sq.agents?.forEach((name: string, ai: number) => {
          const def = suggestion.agents?.find((a: any) => a.name === name);
          const atype = def?.type ?? 'BaseAgent';
          const ntype = AGENT_TYPE_MAP[atype] ?? 'agent';
          const agId = uid2();
          addNode({ id: agId, type: 'k9node', position: { x: startX + ai * spacing, y: 580 },
            data: { label: name, componentType: ntype as ComponentType, color: COMPONENT_COLORS[ntype], abbClass: ABB_MAP[atype] ?? 'BaseAgent',
              agentType: atype, model: def?.model ?? 'general', pattern: 'reasoning', description: def?.description ?? '' } });
          onConnect({ source: squadId, target: agId, sourceHandle: 's-right', targetHandle: 't-left' });
        });
      });
    });
    // Auto-layout, then collapse all squads so default view is clean
    setTimeout(() => {
      layoutCanvas();
      setTimeout(() => collapseAllSquads(), 60);
    }, 50);
  };

  const handleGenerate = async () => {
    if (generating || !project.description.trim()) return;
    setTab('components');
    setGenerating(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      const data = await res.json();
      if (data.suggestion) buildCanvas(data.suggestion);
    } catch { /* keep canvas */ }
    finally { setGenerating(false); }
  };

  return (
    <aside className="palette">

      {/* ── Tab bar ────────────────────────────────── */}
      <div className="palette-tabs">
        <button
          className={`palette-tab ${tab === 'project' ? 'active' : ''}`}
          onClick={() => setTab('project')}
        >
          Project Info
        </button>
        <button
          className={`palette-tab ${tab === 'components' ? 'active' : ''}`}
          onClick={() => setTab('components')}
        >
          Components
        </button>
      </div>

      {/* ── Components tab ─────────────────────────── */}
      {tab === 'components' && (
        <>
          {selectedType && (
            <div className="palette-context-hint">
              <span className="hint-arrow">→</span> Next valid: <strong>{VALID_NEXT_LABEL[selectedType]}</strong>
            </div>
          )}
          {!selectedType && <div className="palette-hint">Drag onto canvas</div>}

          <div className="palette-list">
            {components.map((c) => {
              const isValidNext = validNextTypes === null || validNextTypes.includes(c.type as ComponentType);
              return (
                <div
                  key={c.type}
                  className={`palette-item ${isValidNext ? '' : 'palette-item-dimmed'} ${validNextTypes && isValidNext ? 'palette-item-highlighted' : ''}`}
                  style={{ borderLeft: `3px solid ${isValidNext ? c.color : '#2a2a35'}` }}
                  draggable={isValidNext}
                  onDragStart={(e) => isValidNext && onDragStart(e, c)}
                  title={isValidNext ? c.description : `Cannot connect here — ${selectedType} only connects to: ${VALID_NEXT_LABEL[selectedType ?? 'router']}`}
                >
                  <span className="palette-icon" style={{ color: isValidNext ? c.color : '#3a3a4a' }}>
                    {ICONS[c.type] ?? '◉'}
                  </span>
                  <div className="palette-item-text">
                    <div className="palette-label" style={{ color: isValidNext ? '' : '#3a3a4a' }}>{c.label}</div>
                    <div className="palette-class">{c.abbClass}</div>
                  </div>
                  {validNextTypes && isValidNext && (
                    <span className="palette-valid-badge" style={{ color: c.color }}>✓</span>
                  )}
                  {validNextTypes && !isValidNext && (
                    <span className="palette-invalid-badge">✗</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="palette-section-title">
            K9-AIF Hierarchy
            <span className="palette-hint-icon" tabIndex={-1}>
              ⓘ
              <span className="palette-hint-tooltip">
                Squad nodes start collapsed.<br />
                Click <strong>▶ N agents</strong> on a squad to expand its agents.<br />
                Click <strong>▼</strong> to collapse again.
              </span>
            </span>
          </div>
          <div className="palette-hierarchy">
            <div className="hier-line" style={{ color: COMPONENT_COLORS.router }}>⇄ Router</div>
            <div className="hier-line hier-indent" style={{ color: COMPONENT_COLORS.orchestrator }}>└ ◈ Orchestrator</div>
            <div className="hier-line hier-indent-2" style={{ color: COMPONENT_COLORS.squad }}>└ ◫ Squad  ▶</div>
            <div className="hier-line hier-indent-3" style={{ color: COMPONENT_COLORS.agent }}>└ ◉ Agent</div>
          </div>
        </>
      )}

      {/* ── Project Info tab ───────────────────────── */}
      {tab === 'project' && (
        <>
          {/* BPMN import */}
          <div className="palette-bpmn-import">
            <div className="palette-project-label">Import BPMN</div>
            <label className="palette-bpmn-label">
              <span className={`palette-bpmn-btn ${bpmnStatus.state === 'loading' ? 'palette-bpmn-loading' : ''}`}>
                {bpmnStatus.state === 'loading' ? '⟳ Importing…' : '⬆ Browse for .bpmn / .xml / .zip'}
              </span>
              <input
                type="file"
                accept=".bpmn,.xml,.zip,application/xml,text/xml,application/zip"
                style={{ display: 'none' }}
                disabled={bpmnStatus.state === 'loading'}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;

                  const ext = file.name.split('.').pop()?.toLowerCase();
                  if (ext !== 'bpmn' && ext !== 'xml' && ext !== 'zip') {
                    setBpmnStatus({ state: 'error', msg: `"${file.name}" is not a .bpmn, .xml, or .zip file` });
                    return;
                  }

                  setBpmnStatus({ state: 'loading' });
                  const fd = new FormData();
                  fd.append('file', file);
                  try {
                    const res = await fetch('/api/bpmn/import', { method: 'POST', body: fd });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.detail ?? `Server error ${res.status}`);
                    }
                    if (data.process_name) {
                      setProject({ ...project, project_name: data.process_name });
                    }
                    buildCanvas(data.suggestion);
                    setTab('components');
                    setBpmnStatus({ state: 'ok', name: file.name });
                    setTimeout(() => setBpmnStatus({ state: 'idle' }), 4000);
                  } catch (err: any) {
                    setBpmnStatus({ state: 'error', msg: err.message ?? 'Import failed' });
                  }
                }}
              />
            </label>
            {bpmnStatus.state === 'error' && (
              <div className="palette-bpmn-error">✕ {bpmnStatus.msg}</div>
            )}
            {bpmnStatus.state === 'ok' && (
              <div className="palette-bpmn-ok">✓ Imported: {bpmnStatus.name}</div>
            )}
            {bpmnStatus.state === 'idle' && (
              <div className="palette-bpmn-hint">IBM BlueWorks Live (ZIP) · Camunda · Bizagi</div>
            )}
          </div>

          {/* Template picker */}
          <div className="palette-templates">
            <div className="palette-project-label">Start from template</div>
            <div className="palette-template-grid">
              {PROJECT_TEMPLATES.map((t: ProjectTemplate) => (
                <button
                  key={t.id}
                  className="palette-template-card"
                  title={t.description.slice(0, 120) + '…'}
                  onClick={async () => {
                    const updated = {
                      ...project,
                      project_name: t.name,
                      domain: t.domain,
                      description: t.description,
                    };
                    setProject(updated);
                    setTab('components');
                    setGenerating(true);
                    try {
                      const res = await fetch('/api/suggest', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updated),
                      });
                      const data = await res.json();
                      if (data.suggestion) buildCanvas(data.suggestion);
                    } catch { /* keep canvas */ }
                    finally { setGenerating(false); }
                  }}
                >
                  <span className="template-icon">{t.icon}</span>
                  <span className="template-name">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="palette-platforms">
            <div className="palette-project-label">Platforms &amp; Frameworks</div>
            <div className="platform-group-label">IBM watsonx</div>
            <div className="platform-pills">
              {([
                { id: 'watsonx-assistant',   label: 'Assistant',   color: '#4589ff' },
                { id: 'watsonx-orchestrate', label: 'Orchestrate', color: '#4589ff' },
                { id: 'watsonx-governance',  label: 'Governance',  color: '#4589ff' },
                { id: 'watsonx-data',        label: 'data',        color: '#4589ff' },
              ] as const).map((p) => {
                const active = project.platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    className={`platform-pill ${active ? 'platform-pill-active' : ''}`}
                    style={active ? { borderColor: p.color, color: p.color, background: `${p.color}18` } : {}}
                    onClick={() => setProject({
                      ...project,
                      platforms: active
                        ? project.platforms.filter((x) => x !== p.id)
                        : [...project.platforms, p.id],
                    })}
                    title={`IBM watsonx ${p.label}`}
                  >
                    {active ? '✓ ' : ''}{p.label}
                  </button>
                );
              })}
            </div>
            <div className="platform-group-label" style={{ marginTop: 8 }}>Agent Frameworks</div>
            <div className="platform-pills">
              {([
                { id: 'crewai',    label: 'CrewAI',    color: '#ff6b35' },
                { id: 'langchain', label: 'LangChain', color: '#1cc88a' },
              ] as const).map((p) => {
                const active = project.platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    className={`platform-pill ${active ? 'platform-pill-active' : ''}`}
                    style={active ? { borderColor: p.color, color: p.color, background: `${p.color}18` } : {}}
                    onClick={() => setProject({
                      ...project,
                      platforms: active
                        ? project.platforms.filter((x) => x !== p.id)
                        : [...project.platforms, p.id],
                    })}
                    title={p.label}
                  >
                    {active ? '✓ ' : ''}{p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="palette-project">
            <div className="palette-project-label">Project</div>
            <input
              className="palette-project-input"
              placeholder="Project name *"
              value={project.project_name}
              onChange={(e) => setField('project_name', e.target.value)}
            />
            <div className="palette-project-row">
              <input
                className="palette-project-input"
                placeholder="Author"
                value={project.author}
                onChange={(e) => setField('author', e.target.value)}
              />
              <input
                className="palette-project-input"
                placeholder="Domain"
                value={project.domain}
                onChange={(e) => setField('domain', e.target.value)}
              />
            </div>
            {inContainer ? (
              <>
                <div className="palette-container-path-info">
                  <div className="palette-container-path-label">Scaffold output</div>
                  <code className="palette-container-path">{project.project_folder || containerOutputPath(project.project_name)}</code>
                  <div className="palette-container-path-hint">
                    on your machine: <code>~/k9x-studio-working/k9_projects/{slugify(project.project_name) || '…'}/</code>
                  </div>
                </div>
                <div className="palette-project-sublabel">k9-aif-framework path on your machine</div>
                <input
                  className="palette-project-input palette-project-folder"
                  placeholder="~/k9-aif-framework"
                  value={project.framework_path}
                  onChange={(e) => setField('framework_path', e.target.value)}
                />
                <div className="palette-folder-hint">Written into the generated .env so your project can find it at runtime</div>
              </>
            ) : (
              <>
                <div className="palette-project-folder-row">
                  <input
                    className="palette-project-input palette-project-folder"
                    placeholder="/path/to/output/folder"
                    value={project.project_folder}
                    onChange={(e) => setField('project_folder', e.target.value)}
                  />
                  <button
                    className="palette-browse-btn"
                    title="Browse for folder"
                    onClick={async () => {
                      try {
                        const dir = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                        setField('project_folder', dir.name);
                      } catch { /* cancelled or unsupported */ }
                    }}
                  >⋯</button>
                </div>
                {project.project_folder && (
                  <div className="palette-folder-hint">→ <code>{project.project_folder}</code></div>
                )}
                <div className="palette-project-sublabel">K9-AIF Framework Location</div>
                <div className="palette-project-folder-row">
                  <input
                    className="palette-project-input palette-project-folder"
                    placeholder="~/path/to/k9-aif-framework"
                    value={project.framework_path}
                    onChange={(e) => setField('framework_path', e.target.value)}
                  />
                  <button
                    className="palette-browse-btn"
                    title="Browse for k9-aif-framework folder"
                    onClick={async () => {
                      try {
                        const dir = await (window as any).showDirectoryPicker({ mode: 'read' });
                        setField('framework_path', dir.name);
                      } catch { /* cancelled or unsupported */ }
                    }}
                  >⋯</button>
                </div>
                {project.framework_path && (
                  <div className="palette-folder-hint">→ <code>{project.framework_path}</code></div>
                )}
              </>
            )}
          </div>

          <div className="palette-describe">
            <div className="palette-describe-label">Description</div>
            <textarea
              className="palette-describe-textarea"
              value={project.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder={
                'Describe the multi-agent system in detail.\n\n' +
                'Example: A luxury Porsche dealership wants AI-driven inventory management across new, CPO, and trade-in vehicles — with aging prediction, showroom optimisation, and pricing recommendations.'
              }
              rows={10}
            />
            <div className="palette-no-llm-note">
              ⊙ No LLM required — canvas, scaffold, and all generated artifacts are produced locally without internet or AI access.
            </div>
          </div>
        </>
      )}

      {/* ── CTA buttons — always pinned at bottom ──────── */}
      <div className="palette-generate-footer">
        <button
          className="palette-generate-btn-green"
          onClick={handleGenerate}
          disabled={generating || !project.description.trim() || !project.project_name.trim()}
        >
          {generating ? '⟳  Generating…' : '✦  Generate Architecture'}
        </button>
        <button
          className="palette-scaffold-btn"
          onClick={onExport}
          disabled={exporting || nodes.length === 0 || !project.project_folder.trim()}
          title={!project.project_folder.trim() ? 'Set a project folder first' : 'Write scaffold to disk'}
        >
          {exporting ? '⟳  Writing…' : '⬆  Generate Scaffold'}
        </button>
        <button
          className="palette-download-btn"
          onClick={onDownload}
          disabled={!scaffoldReady || downloading}
          title={!scaffoldReady ? 'Generate scaffold first' : 'Download scaffold as ZIP'}
        >
          {downloading ? '⟳  Downloading…' : '⬇  Download Generated Code'}
        </button>
      </div>
    </aside>
  );
}
