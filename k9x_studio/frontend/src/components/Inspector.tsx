import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { LlmSessionConfig } from '../store';
import type { AgentClassType } from '../types';

const MODEL_OPTIONS = ['general', 'reasoning', 'chat', 'extraction'];
const PATTERN_OPTIONS = ['reasoning', 'extraction', 'chat', 'guardrails'];
const AGENT_TYPE_OPTIONS: AgentClassType[] = ['BaseAgent', 'K9ValidationLoopAgent', 'K9CriticActorAgent'];
const LLM_PROVIDERS = ['ollama', 'openai', 'anthropic', 'azure_openai'];
const ROUTING_STRATEGIES = ['event_type', 'intent', 'round_robin', 'load_balanced'];
const RETRY_POLICIES = ['none', 'fixed_delay', 'exponential_backoff'];

function FeedbackPanel() {
  const { project } = useStore();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async () => {
    if (!text.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), project: project.project_name }),
      });
      setText('');
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="inspector-feedback">
      <div className="inspector-feedback-label">Feedback</div>
      <textarea
        className="inspector-feedback-textarea"
        placeholder="Feedback, suggestions, expected features…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        disabled={status === 'sending'}
      />
      {status === 'done' && <div className="inspector-feedback-ok">Thank you</div>}
      {status === 'error' && <div className="inspector-feedback-err">Could not send</div>}
      {status !== 'done' && (
        <button
          className="inspector-feedback-btn"
          onClick={submit}
          disabled={!text.trim() || status === 'sending'}
        >
          {status === 'sending' ? 'Sending…' : 'Submit feedback'}
        </button>
      )}
    </div>
  );
}

const PROVIDER_LABEL: Record<string, string> = {
  ollama: 'Ollama', openai: 'OpenAI', anthropic: 'Anthropic', custom: 'Custom LLM',
};

function LlmPanel() {
  const { llmConfig, setLlmConfig, addLog, setLlmActive } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<LlmSessionConfig>(
    llmConfig ?? { provider: 'ollama', endpoint: '', model: '', api_key: '' }
  );
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [verifyMsg, setVerifyMsg] = useState('');

  const field = (key: keyof LlmSessionConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setVerifyState('idle');
    setVerifyMsg('');
  };

  const apply = async () => {
    if (!form.endpoint.trim()) { setLlmConfig(null); return; }
    setVerifyState('checking');
    const ep = form.endpoint.trim();
    addLog(`Verifying LLM connection to ${ep} (${form.provider}, model: ${form.model || 'default'})…`);
    setLlmActive(true);
    try {
      const res = await fetch('/api/llm/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      let data: any = {};
      try { data = await res.json(); } catch { /* non-JSON body */ }
      if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
      const name = PROVIDER_LABEL[form.provider] ?? form.provider;
      const detail = data.detail && data.detail !== 'Connected' ? ` · ${data.detail}` : '';
      setVerifyState('ok');
      setVerifyMsg(`Connected to ${name}${detail}`);
      addLog(`✓ LLM connected — ${name}${detail}`);
      setLlmConfig(form);
      setExpanded(false);
    } catch (err: any) {
      const msg = err.message ?? 'Could not connect';
      setVerifyState('error');
      setVerifyMsg(msg);
      addLog(`✕ LLM verify failed: ${msg}`, 'error');
      setLlmConfig(null);
    } finally {
      setLlmActive(false);
    }
  };

  const clear = () => {
    const empty = { provider: 'ollama', endpoint: '', model: '', api_key: '' };
    setForm(empty);
    setLlmConfig(null);
    setVerifyState('idle');
    setVerifyMsg('');
    setExpanded(false);
  };

  return (
    <div className="inspector-llm">

      {/* ── Header — always visible ── */}
      <div className="inspector-llm-header" onClick={() => setExpanded((v) => !v)}>
        <span className={`llm-status-dot ${verifyState === 'ok' ? 'llm-dot-on' : 'llm-dot-off'}`} />
        <span className="inspector-llm-title">⬡ LLM Config</span>
        {verifyState === 'ok'
          ? <span className="llm-connected-tag">✓ {verifyMsg}</span>
          : verifyState === 'error'
            ? <span className="llm-error-tag">✕ {verifyMsg}</span>
            : <span className="llm-optional-tag">optional</span>
        }
        <span className="llm-expand-arrow">{expanded ? '▴' : '▾'}</span>
      </div>

      {/* ── Expandable fields ── */}
      {expanded && (
        <div className="llm-config-fields">
          <div className="llm-config-row">
            <label className="llm-config-label">Provider</label>
            <select className="llm-config-input" value={form.provider} onChange={field('provider')}>
              <option value="ollama">Ollama</option>
              <option value="openai">OpenAI-compatible</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div className="llm-config-row">
            <label className="llm-config-label">Endpoint</label>
            <input className="llm-config-input" placeholder="http://192.168.x.x:11434"
              value={form.endpoint} onChange={field('endpoint')} />
          </div>
          <div className="llm-config-row">
            <label className="llm-config-label">Model</label>
            <input className="llm-config-input" placeholder="granite3-dense:2b"
              value={form.model} onChange={field('model')} />
          </div>
          <div className="llm-config-row">
            <label className="llm-config-label">API Key</label>
            <input className="llm-config-input" type="password" placeholder="leave blank for local LLM"
              value={form.api_key} onChange={field('api_key')} />
          </div>
          <div className="llm-config-actions">
            <button className="llm-save-btn" onClick={apply} disabled={verifyState === 'checking'}>
              {verifyState === 'checking' ? '⟳ Verifying…' : 'Apply'}
            </button>
            <button className="llm-clear-btn" onClick={clear}>Clear</button>
          </div>
          {verifyState === 'error' && (
            <div className="llm-verify-err">✕ {verifyMsg}</div>
          )}
          <div className="llm-session-note">⚠ LLM config entered here is NOT stored · clears on page refresh</div>
        </div>
      )}
    </div>
  );
}

function ActivityLog() {
  const { logs, llmActive } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="activity-log">
      <div className="activity-log-header">
        <span className="activity-log-label">Activity Log</span>
        <span className={`llm-access-dot ${llmActive ? 'llm-access-on' : 'llm-access-off'}`}
              title={llmActive ? 'LLM active' : 'LLM idle'} />
      </div>
      <div className="activity-log-body">
        {logs.length === 0 && (
          <div className="activity-log-empty">No activity yet</div>
        )}
        {logs.map((entry) => (
          <div key={entry.id} className={`activity-log-entry log-${entry.level}`}>
            <span className="log-ts">{entry.ts}</span>
            <span className="log-msg">{entry.msg}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

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
        <span className="inspector-cop-lights">
          <span className="cop-light cop-red" />
          <span className="cop-light cop-amber" />
          <span className="cop-light cop-green" />
        </span>
</div>
        <div className="inspector-empty-msg">
          <div className="inspector-empty-icon">◎</div>
          <p>Select a node to configure it</p>
        </div>
        {footer}
        <FeedbackPanel />
        <LlmPanel />
        <ActivityLog />
      </aside>
    );
  }

  const { data } = node;
  const isAgent = ['agent', 'validation_loop', 'critic_actor'].includes(data.componentType);
  const isRouter = data.componentType === 'router';
  const isOrchestrator = data.componentType === 'orchestrator';
  const isIntentSquad = data.componentType === 'intent_squad';

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

        {/* Intent Squad fields */}
        {isIntentSquad && (
          <>
            <div className="inspector-section-label">Intent Classification</div>
            <div className="inspector-field">
              <label className="inspector-label">Routing Strategy</label>
              <select
                className="inspector-input"
                value={data.routingStrategy ?? 'intent'}
                onChange={(e) => set('routingStrategy', e.target.value)}
              >
                <option value="intent">intent (non-deterministic)</option>
                <option value="confidence">confidence threshold</option>
              </select>
            </div>
            <div style={{ fontSize: 10, color: '#4a4a6a', padding: '4px 0 8px 0', lineHeight: 1.5 }}>
              IntentSquad classifies incoming events before the Router. The IntentAgent
              enriches the context with a classified intent that the Router uses to route deterministically.
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
      <FeedbackPanel />
      <LlmPanel />
      <ActivityLog />
    </aside>
  );
}
