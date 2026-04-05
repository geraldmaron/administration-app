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
      <CommandPanel className="mb-4 px-5 py-3 flex items-center justify-between">
        <div className="text-[11px] text-[var(--foreground-subtle)]">Make changes to this scenario&apos;s content and metadata.</div>
        <button onClick={() => setEditing(true)} className="btn btn-ghost text-[11px]">
          Edit Scenario
        </button>
      </CommandPanel>
    );
  }

  return (
    <div className="mb-4 space-y-4">
      <CommandPanel className="px-5 py-3 flex items-center justify-between">
        <div className="section-kicker">Editing Scenario</div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="btn btn-ghost text-[11px]" disabled={saving}>
            Cancel
          </button>
          <button onClick={save} className="btn btn-command text-[11px]" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </CommandPanel>

      {error && (
        <div className="text-xs text-[var(--error)]">{error}</div>
      )}

      <CommandPanel className="p-4 space-y-3">
        <div>
          <label className="section-kicker-sm block mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-shell w-full"
          />
        </div>

        <div>
          <label className="section-kicker-sm block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-shell w-full resize-y"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="section-kicker-sm block mb-1">Bundle</label>
            <input
              type="text"
              value={bundle}
              onChange={(e) => setBundle(e.target.value)}
              className="input-shell w-full"
            />
          </div>
          <div>
            <label className="section-kicker-sm block mb-1">Severity</label>
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
            <label className="section-kicker-sm block mb-1">Difficulty</label>
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
      </CommandPanel>

      {options.map((opt, i) => (
        <CommandPanel key={opt.id} className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--accent-muted)] text-[9px] font-mono font-bold text-[var(--accent-primary)]">
              {OPTION_LABELS[i] ?? i + 1}
            </span>
            <input
              type="text"
              placeholder="Label (optional)"
              value={opt.label}
              onChange={(e) => updateOption(i, 'label', e.target.value)}
              className="input-shell text-xs"
              style={{ width: 'auto', minWidth: 120 }}
            />
          </div>

          <div>
            <label className="section-kicker-sm block mb-1">Option Text</label>
            <textarea
              value={opt.text}
              onChange={(e) => updateOption(i, 'text', e.target.value)}
              className="input-shell w-full resize-y text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="section-kicker-sm block mb-1">Outcome Headline</label>
              <input
                type="text"
                value={opt.outcomeHeadline}
                onChange={(e) => updateOption(i, 'outcomeHeadline', e.target.value)}
                className="input-shell w-full text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="section-kicker-sm block mb-1">Outcome Summary</label>
              <textarea
                value={opt.outcomeSummary}
                onChange={(e) => updateOption(i, 'outcomeSummary', e.target.value)}
                className="input-shell w-full resize-y text-xs"
                rows={2}
              />
            </div>
          </div>

          <div>
            <label className="section-kicker-sm block mb-1">Outcome Context</label>
            <textarea
              value={opt.outcomeContext}
              onChange={(e) => updateOption(i, 'outcomeContext', e.target.value)}
              className="input-shell w-full resize-y text-xs"
              rows={2}
            />
          </div>
        </CommandPanel>
      ))}
    </div>
  );
}
