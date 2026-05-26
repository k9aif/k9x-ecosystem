import { useEffect, useState } from 'react';

interface Step {
  delay: number;
  text: string;
  phase: 'gen' | 'inspect';
}

const STEPS: Step[] = [
  // Phase 1: Generation
  { delay: 0,    text: 'Reading project description…',                          phase: 'gen' },
  { delay: 700,  text: 'Loading K9-AIF Framework ABBs…',                       phase: 'gen' },
  { delay: 1400, text: 'Applying Architecture-First principles…',               phase: 'gen' },
  { delay: 2200, text: 'Identifying agent patterns…',                           phase: 'gen' },
  { delay: 3000, text: 'Composing Router → Orchestrator → Squad hierarchy…',   phase: 'gen' },
  { delay: 3800, text: 'Selecting agent types (Base, ValidationLoop, Critic)…', phase: 'gen' },
  { delay: 4600, text: 'Wiring governance and observability hooks…',            phase: 'gen' },
  { delay: 5300, text: 'Generating architecture…',                              phase: 'gen' },
  // Phase 2: K9X Inspector validation
  { delay: 6200, text: 'K9X Inspector: Analysing component hierarchy…',        phase: 'inspect' },
  { delay: 7200, text: 'Verifying Router → Orchestrator → Squad connections…', phase: 'inspect' },
  { delay: 8100, text: 'Checking governance and zero-trust constraints…',       phase: 'inspect' },
  { delay: 9000, text: 'Validating agent pattern assignments…',                 phase: 'inspect' },
  { delay: 9800, text: 'Architecture validated ✓',                              phase: 'inspect' },
];

interface Props {
  visible: boolean;
}

export function GeneratingOverlay({ visible }: Props) {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);

  useEffect(() => {
    if (!visible) { setVisibleSteps([]); return; }
    setVisibleSteps([]);
    const timers = STEPS.map((s, i) =>
      setTimeout(() => setVisibleSteps((prev) => [...prev, i]), s.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  if (!visible) return null;

  const lastVisible = visibleSteps[visibleSteps.length - 1] ?? -1;
  const inInspectPhase = lastVisible >= STEPS.findIndex((s) => s.phase === 'inspect');

  return (
    <div className="gen-overlay">
      <div className="gen-card">
        <div className="gen-logo">
          <span className="logo-k9">K9X</span>
          <span className="logo-studio">Studio</span>
        </div>

        <div className="gen-spinner">
          <div className="gen-spinner-ring" />
        </div>

        <div className="gen-steps">
          {/* Generation phase header */}
          <div className="gen-phase-label">◈ Architecture Generation</div>

          {STEPS.filter((s) => s.phase === 'gen').map((s, i) => (
            <div
              key={i}
              className={`gen-step ${visibleSteps.includes(i) ? 'gen-step-visible' : ''}`}
            >
              <span className="gen-step-dot">
                {visibleSteps.includes(i) ? (i === lastVisible ? '›' : '✓') : '·'}
              </span>
              <span className="gen-step-text">{s.text}</span>
            </div>
          ))}

          {/* Inspector phase header — only shown when inspector steps start */}
          {inInspectPhase && (
            <div className="gen-phase-label gen-phase-inspector">
              <span className="gen-inspector-icon">⊛</span> K9X Inspector Validation
            </div>
          )}

          {STEPS.filter((s) => s.phase === 'inspect').map((s, gi) => {
            const i = STEPS.findIndex((st) => st.phase === 'inspect') + gi;
            return (
              <div
                key={i}
                className={`gen-step gen-step-inspect ${visibleSteps.includes(i) ? 'gen-step-visible' : ''}`}
              >
                <span className="gen-step-dot" style={{ color: '#f59e0b' }}>
                  {visibleSteps.includes(i) ? (i === lastVisible ? '›' : '✓') : '·'}
                </span>
                <span className="gen-step-text">{s.text}</span>
              </div>
            );
          })}
        </div>

        <div className="gen-footer">
          Powered by K9-AIF Architecture-First Framework · k9x.ai
        </div>
      </div>
    </div>
  );
}
