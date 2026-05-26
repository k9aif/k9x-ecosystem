import { useStore } from '../store';
import type { AgentClassType } from '../types';

const MODEL_OPTIONS = ['general', 'reasoning', 'chat', 'extraction'];
const PATTERN_OPTIONS = ['reasoning', 'extraction', 'chat', 'guardrails'];
const AGENT_TYPE_OPTIONS: AgentClassType[] = ['BaseAgent', 'K9ValidationLoopAgent', 'K9CriticActorAgent'];
const LLM_PROVIDERS = ['ollama', 'openai', 'anthropic', 'azure_openai'];
const ROUTING_STRATEGIES = ['event_type', 'intent', 'round_robin', 'load_balanced'];
const RETRY_POLICIES = ['none', 'fixed_delay', 'exponential_backoff'];

export function Inspector() {
  const { nodes, selectedNodeId, updateNodeData } = useStore();
  const node = nodes.find((n) => n.id === selectedNodeId);

  const footer = (
    <div className="inspector-footer">
      <div className="inspector-footer-title">Continue in your IDE</div>
      <div className="inspector-footer-body">
        Once the scaffold is generated, take the project to
        <span className="inspector-footer-tool"> VS Code + Claude Code</span> to implement agent logic.
      </div>
      <div className="inspector-footer-links">
        <a href="https://k9x.ai" target="_blank" rel="noopener noreferrer">k9x.ai</a>
        <span className="inspector-footer-dot">·</span>
        <a href="https://k9x.ai/examples" target="_blank" rel="noopener noreferrer">Examples</a>
        <span className="inspector-footer-dot">·</span>
        <a href="https://k9x.ai/blog" target="_blank" rel="noopener noreferrer">Blog</a>
      </div>
    </div>
  );

  if (!node) {
    return (
      <aside className="inspector empty">
        <div className="inspector-header">
          <span className="inspector-icon">⊛</span> K9X Inspector
        </div>
        <div className="inspector-empty-msg">
          <div className="inspector-empty-icon">◎</div>
          <p>Select a node to configure it</p>
        </div>
        {footer}
      </aside>
    );
  }

  const { data } = node;
  const isAgent = ['agent', 'validation_loop', 'critic_actor'].includes(data.componentType);
  const isRouter = data.componentType === 'router';
  const isOrchestrator = data.componentType === 'orchestrator';

  const set = (key: string, val: string) => updateNodeData(node.id, { [key]: val });

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <span className="inspector-icon">⊛</span> K9X Inspector
      </div>

      <div className="inspector-body">
        {/* Component type badge */}
        <div
          className="inspector-type-badge"
          style={{ background: data.color + '22', color: data.color, borderColor: data.color + '44' }}
        >
          {data.componentType.replace(/_/g, ' ')} · {data.abbClass}
        </div>

        {/* Name */}
        <div className="inspector-field">
          <label className="inspector-label">Name</label>
          <input
            className="inspector-input"
            value={data.label}
            onChange={(e) => set('label', e.target.value)}
          />
        </div>

        {/* Agent-specific fields */}
        {isAgent && (
          <>
            <div className="inspector-field">
              <label className="inspector-label">Agent Type</label>
              <select
                className="inspector-input"
                value={data.agentType ?? 'BaseAgent'}
                onChange={(e) => set('agentType', e.target.value)}
              >
                {AGENT_TYPE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="inspector-section-label">LLM Configuration</div>

            <div className="inspector-field">
              <label className="inspector-label">Provider</label>
              <select
                className="inspector-input"
                value={data.llmProvider ?? 'ollama'}
                onChange={(e) => set('llmProvider', e.target.value)}
              >
                {LLM_PROVIDERS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="inspector-field">
              <label className="inspector-label">Model</label>
              <select
                className="inspector-input"
                value={data.model ?? 'general'}
                onChange={(e) => set('model', e.target.value)}
              >
                {MODEL_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="inspector-row">
              <div className="inspector-field">
                <label className="inspector-label">Temperature</label>
                <input
                  type="number"
                  className="inspector-input"
                  value={data.temperature ?? '0.3'}
                  min="0" max="1" step="0.1"
                  onChange={(e) => set('temperature', e.target.value)}
                />
              </div>
              <div className="inspector-field">
                <label className="inspector-label">Max Tokens</label>
                <input
                  type="number"
                  className="inspector-input"
                  value={data.maxTokens ?? '2048'}
                  min="256" max="8192" step="256"
                  onChange={(e) => set('maxTokens', e.target.value)}
                />
              </div>
            </div>

            <div className="inspector-section-label">Execution</div>

            <div className="inspector-field">
              <label className="inspector-label">Pattern</label>
              <select
                className="inspector-input"
                value={data.pattern ?? 'reasoning'}
                onChange={(e) => set('pattern', e.target.value)}
              >
                {PATTERN_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Router-specific fields */}
        {isRouter && (
          <>
            <div className="inspector-section-label">Router Configuration</div>
            <div className="inspector-field">
              <label className="inspector-label">Routing Strategy</label>
              <select
                className="inspector-input"
                value={data.routingStrategy ?? 'event_type'}
                onChange={(e) => set('routingStrategy', e.target.value)}
              >
                {ROUTING_STRATEGIES.map((o) => (
                  <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Orchestrator-specific fields */}
        {isOrchestrator && (
          <>
            <div className="inspector-section-label">Orchestrator Configuration</div>
            <div className="inspector-field">
              <label className="inspector-label">Retry Policy</label>
              <select
                className="inspector-input"
                value={data.retryPolicy ?? 'none'}
                onChange={(e) => set('retryPolicy', e.target.value)}
              >
                {RETRY_POLICIES.map((o) => (
                  <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Description */}
        <div className="inspector-field">
          <label className="inspector-label">Description</label>
          <textarea
            className="inspector-input inspector-textarea"
            rows={3}
            value={data.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* ABB reference */}
        <div className="inspector-abb">
          <div className="inspector-label">ABB Contract</div>
          <code className="inspector-abb-code">{data.abbClass}</code>
        </div>
      </div>
      {footer}
    </aside>
  );
}
