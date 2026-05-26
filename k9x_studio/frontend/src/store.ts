import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';
import type { AppScreen, ProjectMeta, NodeData } from './types';
import { applyHierarchyLayout } from './layout';

interface Snapshot {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

interface StudioStore {
  screen: AppScreen;
  project: ProjectMeta;
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  generating: boolean;
  theme: 'dark' | 'light';
  history: Snapshot[];
  future: Snapshot[];

  setScreen: (s: AppScreen) => void;
  setProject: (p: ProjectMeta) => void;
  addNode: (node: Node<NodeData>) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;
  setSelectedNode: (id: string | null) => void;
  clearCanvas: () => void;
  setGenerating: (v: boolean) => void;
  toggleTheme: () => void;
  undo: () => void;
  redo: () => void;
  layoutCanvas: () => void;
  toggleSquadCollapse: (squadId: string) => void;
  collapseAllSquads: () => void;
}

const MAX_HISTORY = 50;

export const useStore = create<StudioStore>((set) => ({
  screen: 'setup',
  project: { project_name: '', author: '', domain: '', description: '', project_folder: '', framework_path: '', platforms: [] },
  nodes: [],
  edges: [],
  selectedNodeId: null,
  generating: false,
  theme: 'dark',
  history: [],
  future: [],

  setScreen: (screen) => set({ screen }),
  setProject: (project) => set({ project }),

  addNode: (node) =>
    set((s) => ({
      history: [...s.history, { nodes: s.nodes, edges: s.edges }].slice(-MAX_HISTORY),
      future: [],
      nodes: [...s.nodes, node],
    })),

  updateNodeData: (id, data) =>
    set((s) => ({
      history: [...s.history, { nodes: s.nodes, edges: s.edges }].slice(-MAX_HISTORY),
      future: [],
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })),

  onNodesChange: (changes) =>
    set((s) => {
      const removedIds = new Set(
        changes.filter((c) => c.type === 'remove').map((c) => (c as any).id)
      );
      const shouldSnapshot = removedIds.size > 0;
      return {
        history: shouldSnapshot
          ? [...s.history, { nodes: s.nodes, edges: s.edges }].slice(-MAX_HISTORY)
          : s.history,
        future: shouldSnapshot ? [] : s.future,
        nodes: applyNodeChanges(changes, s.nodes as Node[]) as Node<NodeData>[],
        edges: removedIds.size > 0
          ? s.edges.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target))
          : s.edges,
      };
    }),

  onEdgesChange: (changes) =>
    set((s) => {
      const hasRemove = changes.some((c) => c.type === 'remove');
      return {
        history: hasRemove
          ? [...s.history, { nodes: s.nodes, edges: s.edges }].slice(-MAX_HISTORY)
          : s.history,
        future: hasRemove ? [] : s.future,
        edges: applyEdgeChanges(changes, s.edges),
      };
    }),

  onConnect: (conn) =>
    set((s) => {
      const duplicate = s.edges.some(
        (e) => e.source === conn.source && e.target === conn.target
      );
      if (duplicate) return s;
      const isSystem = conn.source === 'system-kafka' || conn.target === 'system-kafka';
      return {
        history: [...s.history, { nodes: s.nodes, edges: s.edges }].slice(-MAX_HISTORY),
        future: [],
        edges: addEdge(
          {
            ...conn,
            animated: false,
            style: isSystem
              ? { stroke: '#475569', strokeWidth: 1.5, strokeDasharray: '6 4' }
              : { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' as any, color: isSystem ? '#475569' : '#6366f1' },
          },
          s.edges
        ),
      };
    }),

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  clearCanvas: () =>
    set((s) => ({
      history: [...s.history, { nodes: s.nodes, edges: s.edges }].slice(-MAX_HISTORY),
      future: [],
      nodes: [],
      edges: [],
      selectedNodeId: null,
    })),

  setGenerating: (v) => set({ generating: v }),

  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return {
        history: s.history.slice(0, -1),
        future: [...s.future, { nodes: s.nodes, edges: s.edges }].slice(-MAX_HISTORY),
        nodes: prev.nodes,
        edges: prev.edges,
        selectedNodeId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[s.future.length - 1];
      return {
        future: s.future.slice(0, -1),
        history: [...s.history, { nodes: s.nodes, edges: s.edges }].slice(-MAX_HISTORY),
        nodes: next.nodes,
        edges: next.edges,
        selectedNodeId: null,
      };
    }),

  layoutCanvas: () =>
    set((s) => ({
      history: [...s.history, { nodes: s.nodes, edges: s.edges }].slice(-MAX_HISTORY),
      future: [],
      nodes: applyHierarchyLayout(s.nodes as Node<NodeData>[], s.edges),
    })),

  toggleSquadCollapse: (squadId: string) =>
    set((s) => {
      const squad = s.nodes.find((n) => n.id === squadId);
      if (!squad) return s;
      const nowCollapsed = !(squad.data as NodeData).collapsed;
      const agentIds = new Set(
        s.edges.filter((e) => e.source === squadId).map((e) => e.target)
      );
      return {
        nodes: s.nodes.map((n) => {
          if (n.id === squadId) return { ...n, data: { ...n.data, collapsed: nowCollapsed } };
          if (agentIds.has(n.id)) return { ...n, hidden: nowCollapsed };
          return n;
        }),
        edges: s.edges.map((e) => {
          if (e.source === squadId && agentIds.has(e.target)) return { ...e, hidden: nowCollapsed };
          return e;
        }),
      };
    }),

  collapseAllSquads: () =>
    set((s) => {
      const squadIds = s.nodes
        .filter((n) => (n.data as NodeData).componentType === 'squad')
        .map((n) => n.id);
      if (squadIds.length === 0) return s;
      let nodes = s.nodes;
      let edges = s.edges;
      squadIds.forEach((squadId) => {
        const agentIds = new Set(edges.filter((e) => e.source === squadId).map((e) => e.target));
        nodes = nodes.map((n) => {
          if (n.id === squadId) return { ...n, data: { ...n.data, collapsed: true } };
          if (agentIds.has(n.id)) return { ...n, hidden: true };
          return n;
        });
        edges = edges.map((e) => {
          if (e.source === squadId && agentIds.has(e.target)) return { ...e, hidden: true };
          return e;
        });
      });
      return { nodes, edges };
    }),
}));
