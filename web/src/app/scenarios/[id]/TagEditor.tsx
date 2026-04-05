'use client';

import { useState } from 'react';

const CANONICAL_TAGS = [
  'economy', 'politics', 'military', 'tech', 'environment', 'social',
  'health', 'diplomacy', 'justice', 'corruption', 'culture',
  'infrastructure', 'resources', 'dick_mode',
  'governance', 'elections', 'reform', 'constitutional_crisis', 'coup',
  'judicial_independence', 'civil_rights', 'censorship',
  'taxation', 'austerity', 'debt', 'trade', 'sanctions', 'privatization',
  'terrorism', 'cybersecurity', 'arms', 'peacekeeping', 'espionage',
  'protest', 'immigration', 'inequality', 'housing',
  'foreign_policy', 'alliance', 'geopolitics',
  'political_instability', 'instability', 'unrest',
  'economic_crisis', 'economic_recovery', 'recession',
  'crime_wave', 'lawlessness',
  'corruption_scandal', 'corruption_crisis',
  'military_crisis', 'diplomatic_crisis', 'approval_crisis',
  'inflation_crisis', 'budget_crisis',
];

const STATE_TAG_CONDITIONS: Record<string, { metricId: string; op: 'min' | 'max'; threshold: number }> = {
  political_instability: { metricId: 'metric_public_order', op: 'max', threshold: 35 },
  instability:           { metricId: 'metric_public_order', op: 'max', threshold: 40 },
  unrest:                { metricId: 'metric_public_order', op: 'max', threshold: 35 },
  economic_crisis:       { metricId: 'metric_economy',      op: 'max', threshold: 38 },
  economic_recovery:     { metricId: 'metric_economy',      op: 'max', threshold: 45 },
  recession:             { metricId: 'metric_economy',      op: 'max', threshold: 38 },
  crime_wave:            { metricId: 'metric_crime',        op: 'min', threshold: 65 },
  lawlessness:           { metricId: 'metric_crime',        op: 'min', threshold: 65 },
  corruption_scandal:    { metricId: 'metric_corruption',   op: 'min', threshold: 60 },
  corruption_crisis:     { metricId: 'metric_corruption',   op: 'min', threshold: 60 },
  military_crisis:       { metricId: 'metric_military',     op: 'max', threshold: 30 },
  diplomatic_crisis:     { metricId: 'metric_foreign_relations', op: 'max', threshold: 30 },
  approval_crisis:       { metricId: 'metric_approval',     op: 'max', threshold: 25 },
  inflation_crisis:      { metricId: 'metric_inflation',    op: 'min', threshold: 65 },
  budget_crisis:         { metricId: 'metric_budget',       op: 'max', threshold: -40 },
};

interface TagResolution {
  status: string;
  method?: string;
  resolverVersion?: number;
  resolvedAt?: string;
  resolvedTags?: string[];
  confidence?: number;
}

interface TagEditorProps {
  scenarioId: string;
  initialTags: string[];
  tagResolution?: TagResolution;
}

export default function TagEditor({ scenarioId, initialTags, tagResolution }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [addValue, setAddValue] = useState('');

  const availableTags = CANONICAL_TAGS.filter((t) => !tags.includes(t));

  function addTag(tag: string) {
    if (tags.length >= 6 || tags.includes(tag)) return;
    const next = [...tags, tag];
    setTags(next);
    setDirty(true);
    setAddValue('');
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
      if (res.ok) setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setTags(initialTags);
    setDirty(false);
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-2">
        <div className="section-kicker-sm">
          Tags
          <span className="ml-2 text-[10px] font-mono text-[var(--foreground-subtle)]">
            {tags.length}/6
          </span>
        </div>
        <div className="flex items-center gap-2">
          {tagResolution && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] ${
              tagResolution.status === 'manual'
                ? 'bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/30'
                : tagResolution.status === 'resolved'
                  ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30'
                  : 'bg-[var(--foreground-subtle)]/10 text-[var(--foreground-subtle)] border border-[var(--foreground-subtle)]/30'
            }`}>
              {tagResolution.status}
              {tagResolution.method ? ` · ${tagResolution.method}` : ''}
              {tagResolution.confidence != null ? ` · ${Math.round(tagResolution.confidence * 100)}%` : ''}
            </span>
          )}
          {dirty && (
            <>
              <button onClick={reset} className="btn btn-ghost text-[10px]" disabled={saving}>Reset</button>
              <button onClick={save} className="btn btn-tactical text-[10px]" disabled={saving}>
                {saving ? 'Saving…' : 'Save tags'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((tag) => {
          const implied = STATE_TAG_CONDITIONS[tag];
          return (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-[2px] border ${
                implied
                  ? 'border-[#f59e0b]/40 bg-[#f59e0b]/5 text-[#f59e0b]'
                  : 'border-[var(--border)] text-[var(--foreground-muted)]'
              }`}
            >
              {tag.replace(/_/g, ' ')}
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 text-[10px] opacity-50 hover:opacity-100 transition-opacity"
                title="Remove tag"
              >
                ✕
              </button>
            </span>
          );
        })}
        {tags.length === 0 && (
          <span className="text-xs text-[var(--foreground-subtle)]">No tags</span>
        )}
      </div>

      {tags.length < 6 && (
        <div className="flex items-center gap-2">
          <select
            value={addValue}
            onChange={(e) => {
              if (e.target.value) addTag(e.target.value);
            }}
            className="input-shell text-xs"
            style={{ width: 'auto', minWidth: 160 }}
          >
            <option value="">Add tag…</option>
            {availableTags.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      {tagResolution?.resolvedAt && (
        <div className="mt-2 text-[10px] font-mono text-[var(--foreground-subtle)]">
          Last resolved: {new Date(tagResolution.resolvedAt).toLocaleString()}
          {tagResolution.resolverVersion != null && ` · v${tagResolution.resolverVersion}`}
        </div>
      )}
    </div>
  );
}
