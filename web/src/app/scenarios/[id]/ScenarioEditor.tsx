'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CommandPanel from '@/components/CommandPanel';
import type { Option, ScenarioDetail } from '@/lib/types';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const SEVERITY_OPTIONS = ['', 'low', 'moderate', 'high', 'critical'];

interface ScenarioEditorProps {
  scenario: ScenarioDetail;
}

interface OptionDraft {
  id: string;
  text: string;
  label: string;
  outcomeHeadline: string;
  outcomeSummary: string;
  outcomeContext: string;
}

function optionToDraft(opt: Option): OptionDraft {
  return {
    id: opt.id,
    text: opt.text,
    label: opt.label ?? '',
    outcomeHeadline: opt.outcomeHeadline ?? '',
    outcomeSummary: opt.outcomeSummary ?? '',
    outcomeContext: opt.outcomeContext ?? '',
  };
}

export default function ScenarioEditor({ scenario }: ScenarioEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(scenario.title);
  const [description, setDescription] = useState(scenario.description);
  const [bundle, setBundle] = useState(scenario.metadata?.bundle ?? '');
  const [severity, setSeverity] = useState(scenario.metadata?.severity ?? '');
  const [difficulty, setDifficulty] = useState(scenario.metadata?.difficulty ?? 0);
  const [options, setOptions] = useState<OptionDraft[]>(scenario.options.map(optionToDraft));

  function updateOption(index: number, field: keyof OptionDraft, value: string) {
    setOptions((prev) => prev.map((opt, i) => i === index ? { ...opt, [field]: value } : opt));
  }

  function reset() {
    setTitle(scenario.title);
    setDescription(scenario.description);
    setBundle(scenario.metadata?.bundle ?? '');
    setSeverity(scenario.metadata?.severity ?? '');
    setDifficulty(scenario.metadata?.difficulty ?? 0);
    setOptions(scenario.options.map(optionToDraft));
    setError(null);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};

      if (title !== scenario.title) body.title = title;
      if (description !== scenario.description) body.description = description;

      const metadataPatches: Record<string, unknown> = {};
      if (bundle !== (scenario.metadata?.bundle ?? '')) metadataPatches.bundle = bundle;
      if (severity !== (scenario.metadata?.severity ?? '')) metadataPatches.severity = severity;
      if (difficulty !== (scenario.metadata?.difficulty ?? 0)) metadataPatches.difficulty = difficulty;
      if (Object.keys(metadataPatches).length > 0) body.metadata = metadataPatches;

      const changedOptions = options.filter((draft, i) => {
        const orig = scenario.options[i];
        if (!orig) return false;
        return (
          draft.text !== orig.text ||
          draft.label !== (orig.label ?? '') ||
          draft.outcomeHeadline !== (orig.outcomeHeadline ?? '') ||
          draft.outcomeSummary !== (orig.outcomeSummary ?? '') ||
          draft.outcomeContext !== (orig.outcomeContext ?? '')
        );
      });
      if (changedOptions.length > 0) body.options = changedOptions;

      if (Object.keys(body).length === 0) {
        setEditing(false);
        return;
      }

      const res = await fetch(`/api/scenarios/${scenario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(data.error ?? 'Save failed');
      }

      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <CommandPanel tone="muted" className="mb-4 p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="status-dot" />
              <span className="section-kicker">Maintenance</span>
            </div>
            <div className="text-sm font-semibold text-foreground">Scenario editor</div>
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-foreground-muted">
              Update copy, metadata, and option outcomes without changing the core scenario layout above.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-mono text-foreground-subtle">
              <span className="rounded-[2px] border border-[var(--border)] px-2 py-0.5">content</span>
              <span className="rounded-[2px] border border-[var(--border)] px-2 py-0.5">metadata</span>
              <span className="rounded-[2px] border border-[var(--border)] px-2 py-0.5">options</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <button onClick={() => setEditing(true)} className="btn btn-ghost text-[11px]">
              Edit Scenario
            </button>
          </div>
        </div>
      </CommandPanel>
    );
  }

  return (
    <div className="mb-4 space-y-4">
      <CommandPanel tone="muted" className="p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="status-dot" />
              <span className="section-kicker">Maintenance</span>
            </div>
            <h2 className="text-sm font-semibold text-foreground">Editing scenario record</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-foreground-muted">
              Adjust the scenario&apos;s authored content and supporting metadata. Changes here affect the stored record only.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start">
            <button onClick={reset} className="btn btn-ghost text-[11px]" disabled={saving}>
              Cancel
            </button>
            <button onClick={save} className="btn btn-command text-[11px]" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-[10px] border border-[var(--error)]/25 bg-[var(--error)]/6 px-3 py-2 text-xs text-[var(--error)]">
            {error}
          </div>
        )}
      </CommandPanel>

      <CommandPanel className="p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="section-kicker-sm mb-1">Scenario Content</div>
            <p className="text-[11px] leading-5 text-foreground-subtle">
              Primary reader-facing copy and lightweight metadata.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="section-kicker-sm mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-shell w-full"
            />
          </div>

          <div>
            <label className="section-kicker-sm mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-shell w-full resize-y"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="section-kicker-sm mb-1 block">Bundle</label>
              <input
                type="text"
                value={bundle}
                onChange={(e) => setBundle(e.target.value)}
                className="input-shell w-full"
              />
            </div>
            <div>
              <label className="section-kicker-sm mb-1 block">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="input-shell w-full"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s || '(none)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-kicker-sm mb-1 block">Difficulty</label>
              <input
                type="number"
                min={0}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="input-shell w-full"
              />
            </div>
          </div>
        </div>
      </CommandPanel>

      <div>
        <div className="mb-3 px-1">
          <div className="section-kicker-sm mb-1">Option Outcomes</div>
          <p className="text-[11px] leading-5 text-foreground-subtle">
            Secondary maintenance fields for choice copy, labels, and authored outcome text.
          </p>
        </div>

        <div className="space-y-3">
          {options.map((opt, i) => (
            <CommandPanel key={opt.id} className="p-4 md:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--accent-muted)] text-[10px] font-mono font-bold text-[var(--accent-primary)]">
                    {OPTION_LABELS[i] ?? i + 1}
                  </span>
                  <div>
                    <div className="section-kicker-sm">Option {OPTION_LABELS[i] ?? i + 1}</div>
                    <div className="text-[11px] text-foreground-subtle">Choice presentation and outcome copy</div>
                  </div>
                </div>

                <div className="w-full sm:w-auto sm:min-w-[180px]">
                  <label className="section-kicker-sm mb-1 block">Label</label>
                  <input
                    type="text"
                    placeholder="Optional short label"
                    value={opt.label}
                    onChange={(e) => updateOption(i, 'label', e.target.value)}
                    className="input-shell w-full text-xs"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="section-kicker-sm mb-1 block">Option Text</label>
                  <textarea
                    value={opt.text}
                    onChange={(e) => updateOption(i, 'text', e.target.value)}
                    className="input-shell w-full resize-y text-sm"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="section-kicker-sm mb-1 block">Outcome Headline</label>
                    <input
                      type="text"
                      value={opt.outcomeHeadline}
                      onChange={(e) => updateOption(i, 'outcomeHeadline', e.target.value)}
                      className="input-shell w-full text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="section-kicker-sm mb-1 block">Outcome Summary</label>
                    <textarea
                      value={opt.outcomeSummary}
                      onChange={(e) => updateOption(i, 'outcomeSummary', e.target.value)}
                      className="input-shell w-full resize-y text-xs"
                      rows={2}
                    />
                  </div>
                </div>

                <div>
                  <label className="section-kicker-sm mb-1 block">Outcome Context</label>
                  <textarea
                    value={opt.outcomeContext}
                    onChange={(e) => updateOption(i, 'outcomeContext', e.target.value)}
                    className="input-shell w-full resize-y text-xs"
                    rows={2}
                  />
                </div>
              </div>
            </CommandPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
