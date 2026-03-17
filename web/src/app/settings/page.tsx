'use client';

import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';

interface LMStudioStatus {
  connected: boolean;
  models: string[];
  baseUrl: string;
  error?: string;
}

interface GenerationConfig {
  content_quality_gate_enabled?: boolean;
  narrative_review_enabled?: boolean;
  llm_repair_enabled?: boolean;
  audit_pass_threshold?: number;
  max_bundle_concurrency?: number;
  max_scenarios_per_job?: number;
  concept_concurrency?: number;
  dedup_similarity_threshold?: number;
  max_llm_repair_attempts?: number;
}

export default function SettingsPage() {
  const [lmStatus, setLmStatus] = useState<LMStudioStatus | null>(null);
  const [lmLoading, setLmLoading] = useState(false);
  const [config, setConfig] = useState<GenerationConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchLMStudio = useCallback(async () => {
    setLmLoading(true);
    try {
      const res = await fetch('/api/settings/lmstudio');
      const data = await res.json();
      setLmStatus(data);
    } catch {
      setLmStatus({ connected: false, models: [], baseUrl: '', error: 'Fetch failed' });
    } finally {
      setLmLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      // ignore
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLMStudio();
    fetchConfig();
  }, [fetchLMStudio, fetchConfig]);

  async function handleToggle(field: keyof GenerationConfig, value: boolean) {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setConfig(prev => prev ? { ...prev, [field]: value } : prev);
        setSaveMessage(`${field} updated`);
      } else {
        setSaveMessage('Failed to save');
      }
    } catch {
      setSaveMessage('Network error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }

  async function handleNumberChange(field: keyof GenerationConfig, value: number) {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setConfig(prev => prev ? { ...prev, [field]: value } : prev);
        setSaveMessage(`${field} updated`);
      } else {
        setSaveMessage('Failed to save');
      }
    } catch {
      setSaveMessage('Network error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader section="Configuration" title="Settings" />

      {/* LM Studio Connection */}
      <div className="tech-border bg-background-elevated p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
            Local Models — LM Studio
          </div>
          <button
            type="button"
            onClick={fetchLMStudio}
            disabled={lmLoading}
            className="btn btn-tactical disabled:opacity-50"
          >
            {lmLoading ? 'Testing…' : 'Test Connection'}
          </button>
        </div>

        {!lmStatus && (
          <div className="text-xs font-mono text-foreground-subtle animate-pulse">
            Checking connection…
          </div>
        )}

        {lmStatus && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  lmStatus.connected ? 'bg-[var(--success)]' : 'bg-[var(--error)]'
                }`}
              />
              <span
                className={`text-xs font-mono ${
                  lmStatus.connected ? 'text-[var(--success)]' : 'text-[var(--error)]'
                }`}
              >
                {lmStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
              <span className="text-[10px] font-mono text-foreground-subtle ml-auto">
                {lmStatus.baseUrl}
              </span>
            </div>

            {lmStatus.error && (
              <div className="text-[10px] font-mono text-[var(--error)]">
                {lmStatus.error}
              </div>
            )}

            {lmStatus.connected && lmStatus.models.length > 0 && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">
                  Available Models ({lmStatus.models.length})
                </div>
                <div className="space-y-1">
                  {lmStatus.models.map((model) => (
                    <div key={model} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-foreground">{model}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lmStatus.connected && lmStatus.models.length === 0 && (
              <div className="text-[10px] font-mono text-foreground-subtle">
                No models loaded. Load a model in LM Studio to use it for generation.
              </div>
            )}

            <div className="text-[10px] font-mono text-foreground-subtle border-t border-[var(--border)] pt-2 mt-2">
              To use LM Studio models, set <span className="text-foreground">LMSTUDIO_BASE_URL</span> and{' '}
              <span className="text-foreground">LMSTUDIO_MODEL</span> environment variables, or prefix model names
              with <span className="text-foreground">lmstudio:</span> (e.g. lmstudio:llama-3.1-8b-instruct).
            </div>
          </div>
        )}
      </div>

      {/* Generation Pipeline Config */}
      <div className="tech-border bg-background-elevated p-4 mb-6">
        <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-3">
          Generation Pipeline
        </div>

        {configLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-background-muted rounded w-1/2" />
            <div className="h-4 bg-background-muted rounded w-1/3" />
          </div>
        ) : config ? (
          <div className="space-y-4">
            {/* Toggle switches */}
            {([
              { field: 'llm_repair_enabled' as const, label: 'LLM Repair', desc: 'Surgical LLM repair for text-only issues after deterministic fixes' },
              { field: 'content_quality_gate_enabled' as const, label: 'Content Quality Gate', desc: 'LLM-scored grammar, tone, coherence, and readability evaluation' },
              { field: 'narrative_review_enabled' as const, label: 'Narrative Review', desc: 'Editorial review for engagement, strategic depth, option differentiation, and replay value' },
            ]).map(({ field, label, desc }) => (
              <label key={field} className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={!!config[field]}
                    onChange={(e) => handleToggle(field, e.target.checked)}
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-background-muted border border-[var(--border-strong)] rounded-full peer-checked:bg-accent/20 peer-checked:border-accent/50 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-foreground-subtle rounded-full peer-checked:translate-x-4 peer-checked:bg-accent transition-all" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground group-hover:text-accent transition-colors">
                    {label}
                  </div>
                  <div className="text-[10px] text-foreground-subtle mt-0.5">{desc}</div>
                </div>
              </label>
            ))}

            {/* Numeric settings */}
            <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-3">
              {([
                { field: 'audit_pass_threshold' as const, label: 'Audit Pass Threshold', min: 0, max: 100, step: 5 },
                { field: 'max_bundle_concurrency' as const, label: 'Max Bundle Concurrency', min: 1, max: 10, step: 1 },
                { field: 'concept_concurrency' as const, label: 'Concept Concurrency', min: 1, max: 20, step: 1 },
                { field: 'max_scenarios_per_job' as const, label: 'Max Scenarios per Job', min: 1, max: 100, step: 5 },
                { field: 'max_llm_repair_attempts' as const, label: 'Max LLM Repair Attempts', min: 0, max: 5, step: 1 },
                { field: 'dedup_similarity_threshold' as const, label: 'Dedup Similarity Threshold', min: 0.5, max: 1.0, step: 0.05 },
              ]).map(({ field, label, min, max, step }) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-xs text-foreground-muted w-48 shrink-0">{label}</span>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={config[field] ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= min && val <= max) {
                        handleNumberChange(field, val);
                      }
                    }}
                    className="w-20 bg-background border border-[var(--border-strong)] text-foreground text-xs font-mono px-2 py-1 rounded-[2px] focus:outline-none focus:border-accent text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-[var(--error)] font-mono">Failed to load config</div>
        )}

        {saveMessage && (
          <div className="text-[10px] font-mono text-foreground-subtle mt-3 border-t border-[var(--border)] pt-2">
            {saveMessage}
          </div>
        )}
      </div>

      {/* Pipeline Info */}
      <div className="tech-border bg-background-elevated p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-3">
          Pipeline Stages
        </div>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-foreground-subtle">1</span>
            <span className="text-foreground">Concept Seeding</span>
            <span className="text-foreground-subtle ml-auto">Architect model</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-foreground-subtle">2</span>
            <span className="text-foreground">Blueprint Generation</span>
            <span className="text-foreground-subtle ml-auto">Architect model</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-foreground-subtle">3</span>
            <span className="text-foreground">Scenario Drafting</span>
            <span className="text-foreground-subtle ml-auto">Drafter model</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-foreground-subtle">4</span>
            <span className="text-foreground">Audit + Deterministic Fix</span>
            <span className="text-foreground-subtle ml-auto">Rules engine</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-foreground-subtle">5</span>
            <span className="text-foreground">LLM Repair</span>
            <span className={`ml-auto ${config?.llm_repair_enabled ? 'text-[var(--success)]' : 'text-foreground-subtle'}`}>
              {config?.llm_repair_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-foreground-subtle">6</span>
            <span className="text-foreground">Content Quality Gate</span>
            <span className={`ml-auto ${config?.content_quality_gate_enabled ? 'text-[var(--success)]' : 'text-foreground-subtle'}`}>
              {config?.content_quality_gate_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-foreground-subtle">7</span>
            <span className="text-foreground">Narrative Review</span>
            <span className={`ml-auto ${config?.narrative_review_enabled ? 'text-[var(--success)]' : 'text-foreground-subtle'}`}>
              {config?.narrative_review_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-foreground-subtle">8</span>
            <span className="text-foreground">Semantic Dedup</span>
            <span className="text-foreground-subtle ml-auto">Embedding model</span>
          </div>
        </div>
      </div>
    </div>
  );
}
