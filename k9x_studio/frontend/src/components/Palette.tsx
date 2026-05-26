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
}

type PaletteTab = 'components' | 'project';

export function Palette({ onDragStart, onExport, exporting }: PaletteProps) {
  const [tab, setTab] = useState<PaletteTab>('project');
  const [components, setComponents] = useState<PaletteComponent[]>([]);
  const { project, setProject, clearCanvas, addNode, onConnect,
          nodes, selectedNodeId, generating, setGenerating } = useStore();

  const setField = (key: string, val: string) => setProject({ ...project, [key]: val });

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
      onConnect({ source: routerId, target: orchId, sourceHandle: null, targetHandle: null });
      onConnect({ source: kafkaId, target: orchId, sourceHandle: 's-bottom', targetHandle: 't-right' });

      const orchSquads = suggestion.squads?.slice(oi, oi + 1) ?? [];
      orchSquads.forEach((sq: any) => {
        const squadId = uid2();
        addNode({ id: squadId, type: 'k9node', position: { x: orchX - 20, y: 400 },
          data: { label: sq.name, componentType: 'squad' as ComponentType, color: COMPONENT_COLORS.squad, abbClass: 'BaseSquad', description: `Squad: ${sq.name}` } });
        onConnect({ source: orchId, target: squadId, sourceHandle: null, targetHandle: null });

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
          onConnect({ source: squadId, target: agId, sourceHandle: null, targetHandle: null });
        });
      });
    });
  };

  const handleGenerate = async () => {
    if (generating || !project.description.trim()) return;
    setTab('components');  // switch to canvas view when generating
    setGenerating(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      const data = await res.json();
      buildCanvas(data.suggestion);
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

          <div className="palette-section-title">K9-AIF Hierarchy</div>
          <div className="palette-hierarchy">
            <div className="hier-line" style={{ color: COMPONENT_COLORS.router }}>⇄ Router</div>
            <div className="hier-line hier-indent" style={{ color: COMPONENT_COLORS.orchestrator }}>└ ◈ Orchestrator</div>
            <div className="hier-line hier-indent-2" style={{ color: COMPONENT_COLORS.squad }}>└ ◫ Squad</div>
            <div className="hier-line hier-indent-3" style={{ color: COMPONENT_COLORS.agent }}>└ ◉ Agent</div>
          </div>
        </>
      )}

      {/* ── Project Info tab ───────────────────────── */}
      {tab === 'project' && (
        <>
          {/* Template picker */}
          <div className="palette-templates">
            <div className="palette-project-label">Start from template</div>
            <div className="palette-template-grid">
              {PROJECT_TEMPLATES.map((t: ProjectTemplate) => (
                <button
                  key={t.id}
                  className="palette-template-card"
                  title={t.description.slice(0, 120) + '…'}
                  onClick={() => {
                    setProject({
                      ...project,
                      project_name: t.name,
                      domain: t.domain,
                      description: t.description,
                    });
                  }}
                >
                  <span className="template-icon">{t.icon}</span>
                  <span className="template-name">{t.name}</span>
                </button>
              ))}
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
      </div>
    </aside>
  );
}
