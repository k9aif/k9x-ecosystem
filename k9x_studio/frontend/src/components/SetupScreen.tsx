import { useState } from 'react';
import { useStore } from '../store';
import type { ProjectMeta } from '../types';

export function SetupScreen() {
  const { setProject, setScreen } = useStore();
  const [form, setForm] = useState<ProjectMeta>({
    project_name: '',
    author: '',
    domain: '',
    description: '',
    project_folder: '',
  });

  const handleChange = (k: keyof ProjectMeta, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.project_name.trim()) return;
    setProject(form);
    setScreen('studio');
  };

  return (
    <div className="setup-overlay">
      <div className="setup-card">
        <div className="setup-logo">
          <span className="logo-k9">K9X</span>
          <span className="logo-studio">Studio</span>
        </div>
        <p className="setup-tagline">
          Visual Architecture Builder for K9-AIF Systems
        </p>

        <div className="setup-form">
          <label className="form-label">
            Project Name <span className="required">*</span>
            <input
              className="form-input"
              placeholder="e.g. PorscheInventoryOps"
              value={form.project_name}
              onChange={(e) => handleChange('project_name', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </label>

          <label className="form-label">
            Author
            <input
              className="form-input"
              placeholder="e.g. Ravi Natarajan"
              value={form.author}
              onChange={(e) => handleChange('author', e.target.value)}
            />
          </label>

          <label className="form-label">
            Domain
            <input
              className="form-input"
              placeholder="e.g. Automotive, Insurance, Healthcare"
              value={form.domain}
              onChange={(e) => handleChange('domain', e.target.value)}
            />
          </label>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!form.project_name.trim()}
          >
            Open Studio →
          </button>
        </div>

        <div className="setup-footer">
          Powered by <strong>K9-AIF Framework</strong> · k9x.ai
        </div>
      </div>
    </div>
  );
}
