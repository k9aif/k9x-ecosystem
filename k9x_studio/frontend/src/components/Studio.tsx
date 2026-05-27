import { useState, useCallback, useRef, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { useStore } from '../store';
import { Palette } from './Palette';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { BottomPanel } from './BottomPanel';
import { GeneratingOverlay } from './GeneratingOverlay';
import type { NodeData, ProjectMeta } from '../types';

function buildProjectPayload(
  project: ProjectMeta,
  nodes: Node<NodeData>[],
  edges: Edge[]
) {
  const agentNodes = nodes.filter((n) =>
    ['agent', 'validation_loop', 'critic_actor'].includes(n.data.componentType)
  );
  const squadNodes = nodes.filter((n) => n.data.componentType === 'squad');
  const orchNodes  = nodes.filter((n) => n.data.componentType === 'orchestrator');

  const agents = agentNodes.map((n) => ({
    name: n.data.label, type: n.data.agentType ?? 'BaseAgent',
    model: n.data.model ?? 'general', pattern: n.data.pattern ?? 'reasoning',
    description: n.data.description ?? '',
    temperature: n.data.temperature ?? '0.3',
    max_tokens: n.data.maxTokens ?? '2048',
    llm_provider: n.data.llmProvider ?? 'ollama',
  }));

  const squads = squadNodes.map((sq) => ({
    name: sq.data.label,
    agents: agentNodes
      .filter((a) => edges.some((e) => e.source === sq.id && e.target === a.id))
      .map((a) => a.data.label),
  }));

  const orchestrators = orchNodes.map((o) => {
    const connectedSquad = squadNodes.find((sq) =>
      edges.some((e) => e.source === o.id && e.target === sq.id)
    );
    return {
      name: o.data.label,
      squad: connectedSquad?.data.label ?? (squads[0]?.name ?? 'DefaultSquad'),
      retry_policy: o.data.retryPolicy ?? 'none',
    };
  });

  return { ...project, agents, squads, orchestrators };
}

export function Studio() {
  const {
    project, nodes, edges, clearCanvas, generating,
    history, future, undo, redo, layoutCanvas,
  } = useStore();

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (!e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      else if ((e.shiftKey && e.key === 'z') || e.key === 'y') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // ── Resizable panes ──────────────────────────────────────────
  const [leftWidth,  setLeftWidth]  = useState(290);
  const [rightWidth, setRightWidth] = useState(270);
  const isDraggingLeft  = useRef(false);
  const isDraggingRight = useRef(false);

  const startResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingLeft.current = true;
    const startX = e.clientX;
    const startW = leftWidth;
    const onMove = (ev: MouseEvent) =>
      setLeftWidth(Math.max(220, Math.min(500, startW + ev.clientX - startX)));
    const onUp = () => {
      isDraggingLeft.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidth]);

  const startResizeRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRight.current = true;
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (ev: MouseEvent) =>
      setRightWidth(Math.max(200, Math.min(440, startW - (ev.clientX - startX))));
    const onUp = () => {
      isDraggingRight.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightWidth]);

  // ── Runtime config (projects_root) ──────────────────────────
  const [projectsRoot, setProjectsRoot] = useState('');
  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((cfg) => {
      if (cfg.projects_root) setProjectsRoot(cfg.projects_root);
    }).catch(() => {});
  }, []);

  // ── Visit counter ────────────────────────────────────────────
  const [visits, setVisits] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then((d) => setVisits(d.visits)).catch(() => {});
  }, []);

  const toHostPath = (containerPath: string) => {
    if (!projectsRoot || !containerPath.startsWith(projectsRoot)) return containerPath;
    const rel = containerPath.slice(projectsRoot.length).replace(/^\//, '');
    return `~/k9x-studio-working/${rel}`;
  };

  // ── Export scaffold ──────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleExport = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setExportMsg(null);
    try {
      const payload = buildProjectPayload(project, nodes as Node<NodeData>[], edges);
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `${project.project_name.toLowerCase().replace(/\s+/g, '_')}_scaffold.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg({ ok: true, text: '✦ Scaffold downloaded' });
      setTimeout(() => setExportMsg(null), 4000);
    } catch (err) {
      setExportMsg({ ok: false, text: 'Export failed: ' + err });
      setTimeout(() => setExportMsg(null), 6000);
    } finally {
      setExporting(false);
      exportingRef.current = false;
    }
  };

  const [showBottom, setShowBottom] = useState(true);
  const [draggedComponent, setDraggedComponent] = useState<any>(null);

  const onDragStart = useCallback((e: React.DragEvent, comp: any) => {
    e.dataTransfer.setData('application/k9node', JSON.stringify(comp));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedComponent(comp);
  }, []);

  return (
    <div className="studio">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="studio-header">
        <div className="header-left">
          <a className="logo-k9" href="https://k9x.ai" target="_blank" rel="noopener noreferrer">K9X</a>
          <span className="logo-studio">Studio</span>
          {project.project_name && (
            <>
              <span className="header-divider">|</span>
              <span className="header-project">{project.project_name}</span>
            </>
          )}
          {project.domain && <span className="header-domain">{project.domain}</span>}
        </div>

        <div className="header-center">
          <span className="header-framework">k9-AIF Framework</span>
          {project.project_folder && project.project_name && (
            <span className="header-workdir" title={project.project_folder}>
              Working folder: <code>{toHostPath(project.project_folder)}</code>
            </span>
          )}
        </div>

        <div className="header-right">
          {/* Undo / Redo */}
          <button
            className="btn-icon"
            onClick={undo}
            disabled={history.length === 0}
            title="Undo (⌘Z)"
          >↩</button>
          <button
            className="btn-icon"
            onClick={redo}
            disabled={future.length === 0}
            title="Redo (⌘⇧Z)"
          >↪</button>

          <div className="header-sep" />

          <button
            className="btn-icon"
            onClick={layoutCanvas}
            disabled={nodes.length === 0}
            title="Auto-arrange layout (⊞)"
          >⊞</button>

          <div className="header-sep" />

          <button className="btn-secondary" onClick={() => setShowBottom((v) => !v)}>
            {showBottom ? 'Hide Files' : 'Show Files'}
          </button>
          <button className="btn-secondary" onClick={clearCanvas}>Clear</button>

          {visits !== null && (
            <div className="header-visit-counter" title="Studio visits">
              <span className="visit-count">{visits.toLocaleString()}</span>
              <span className="visit-label">visits</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="studio-body">

        {/* Left pane */}
        <div className="studio-left" style={{ width: leftWidth, minWidth: leftWidth, maxWidth: leftWidth }}>
          <Palette onDragStart={onDragStart} onExport={handleExport} exporting={exporting} />
        </div>

        {/* Left resize handle */}
        <div className="pane-resizer" onMouseDown={startResizeLeft} title="Drag to resize" />

        {/* Export toast */}
        {exportMsg && (
          <div className={`export-toast ${exportMsg.ok ? 'export-toast-ok' : 'export-toast-err'}`}>
            {exportMsg.ok ? '✓' : '✕'} {exportMsg.text}
          </div>
        )}

        {/* Center */}
        <ReactFlowProvider>
          <div className="studio-center">
            <div className="canvas-area">
              <Canvas draggedComponent={draggedComponent} generating={generating} />
              <GeneratingOverlay visible={generating} />
            </div>
            {showBottom && <BottomPanel />}
          </div>
        </ReactFlowProvider>

        {/* Right resize handle */}
        <div className="pane-resizer" onMouseDown={startResizeRight} title="Drag to resize" />

        {/* Right pane */}
        <div className="studio-right" style={{ width: rightWidth, minWidth: rightWidth, maxWidth: rightWidth }}>
          <Inspector />
        </div>
      </div>

    </div>
  );
}
