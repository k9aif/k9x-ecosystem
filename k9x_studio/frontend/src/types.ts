export type ComponentType =
  | 'router'
  | 'orchestrator'
  | 'squad'
  | 'agent'
  | 'validation_loop'
  | 'critic_actor'
  | 'guard'
  | 'system';

export type AgentClassType = 'BaseAgent' | 'K9ValidationLoopAgent' | 'K9CriticActorAgent';

export interface PaletteComponent {
  type: ComponentType;
  label: string;
  abbClass: string;
  color: string;
  description: string;
  singleton?: boolean;
}

export interface NodeData extends Record<string, unknown> {
  label: string;
  componentType: ComponentType;
  color: string;
  abbClass: string;
  agentType?: AgentClassType;
  model?: string;
  pattern?: string;
  description?: string;
  squadName?: string;
  orchestratorName?: string;
  temperature?: string;
  maxTokens?: string;
  llmProvider?: string;
  routingStrategy?: string;
  retryPolicy?: string;
  system?: boolean;
}

export interface ProjectMeta {
  project_name: string;
  author: string;
  domain: string;
  description: string;
  project_folder: string;
}

export type AppScreen = 'setup' | 'studio';
