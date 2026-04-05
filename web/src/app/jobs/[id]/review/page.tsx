'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CommandPanel from '@/components/CommandPanel';
import BundleBadge from '@/components/BundleBadge';
import MetricEffect from '@/components/MetricEffect';
import ScreenHeader from '@/components/ScreenHeader';
import type { PendingScenario } from '@/lib/types';

const OPTION_LABELS = ['A', 'B', 'C'];

function ScenarioCard({
  scenario,
  selected,
  onToggle,
}: {
  scenario: PendingScenario;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <CommandPanel
      className={`p-5 transition-colors ${selected ? 'border-[var(--accent-secondary)] bg-[rgba(212,170,44,0.05)]' : ''}`}
    >
      <div className="mb-3 flex items-start gap-4">
        <button
          type="button"
          onClick={onToggle}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 transition-colors ${
            selected
              ? 'border-[var(--accent-secondary)] bg-[var(--accent-secondary)]'
              : 'border-[var(--border-strong)] bg-transparent'
          }`}
          aria-label={selected ? 'Deselect' : 'Select'}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {scenario.bundle ? <BundleBadge bundle={scenario.bundle} /> : null}
            {scenario.difficulty != null ? (
              <span className="text-xs font-medium text-[var(--foreground-subtle)]">
                Diff {scenario.difficulty}
              </span>
            ) : null}
            {scenario.auditScore != null ? (
              <span className={`text-xs font-medium ${scenario.auditScore >= 80 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                Audit {scenario.auditScore}
              </span>
            ) : null}
          </div>
          <h3 className="text-base font-semibold text-foreground">{scenario.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-[var(--foreground-muted)]">{scenario.description}</p>

      {scenario.metadata?.requires && Object.keys(scenario.metadata.requires).length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {Object.entries(scenario.metadata.requires).map(([key, val]) => (
            <span key={key} className="rounded border border-[var(--accent-primary)]/30 px-2 py-0.5 text-[10px] font-mono text-[var(--accent-primary)]">
              {key.replace(/_/g, ' ')}{typeof val === 'string' ? `: ${val}` : ''}
            </span>
          ))}
        </div>
      ) : null}

      {scenario.conditions && scenario.conditions.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {scenario.conditions.map((c, i) => (
            <span key={i} className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-[var(--foreground-subtle)]">
              {c.metricId}{c.min != null ? ` ≥ ${c.min}` : ''}{c.max != null ? ` ≤ ${c.max}` : ''}
            </span>
          ))}
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
          {scenario.options.map((option, i) => (
            <div key={option.id ?? i}>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--accent-muted)] text-[10px] font-mono font-bold text-[var(--accent-primary)]">
                  {OPTION_LABELS[i] ?? i + 1}
                </span>
                {option.label ? (
                  <span className="text-xs font-medium text-[var(--foreground-subtle)]">{option.label}</span>
                ) : null}
              </div>
              <p className="mb-2 text-sm leading-relaxed text-[var(--foreground-muted)]">{option.text}</p>
              {option.effects.length > 0 ? (
                <div className="space-y-1">
                  {option.effects.map((effect, ei) => (
                    <MetricEffect key={ei} effect={effect} />
                  ))}
                </div>
              ) : null}
              {option.relationshipEffects && option.relationshipEffects.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {option.relationshipEffects.map((re, ri) => (
                    <span
                      key={ri}
                      className={`rounded border px-2 py-0.5 text-[10px] font-mono ${
                        re.delta < 0 ? 'border-[var(--error)]/40 text-[var(--error)]' : 'border-[var(--success)]/40 text-[var(--success)]'
                      }`}
                    >
                      {re.relationshipId} {re.delta > 0 ? `+${re.delta}` : re.delta}
                    </span>
                  ))}
                </div>
              ) : null}
              {option.outcomeHeadline ? (
                <p className="mt-2 text-xs font-semibold text-foreground">{option.outcomeHeadline}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </CommandPanel>
  );
}

export default function ReviewPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const router = useRouter();

  const [scenarios, setScenarios] = useState<PendingScenario[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/jobs/${jobId}/review`)
      .then((r) => r.json())
      .then((data: { scenarios: PendingScenario[]; jobStatus: string }) => {
        setScenarios(data.scenarios ?? []);
        setJobStatus(data.jobStatus ?? '');
        // Default: select all
        setSelected(new Set((data.scenarios ?? []).map((s) => s.id)));
      })
      .catch(() => setError('Failed to load pending scenarios.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleAll() {
    if (selected.size === scenarios.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(scenarios.map((s) => s.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(mode: 'accept' | 'reject_all') {
    setSubmitting(true);
    setError(null);
    try {
      const body =
        mode === 'reject_all'
          ? { action: 'reject_all' }
          : { action: 'accept', scenarioIds: Array.from(selected) };

      const res = await fetch(`/api/jobs/${jobId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { accepted: number; rejected: number; remaining: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Review action failed.');
        return;
      }
      if (data.remaining === 0) {
        router.push(`/jobs/${jobId}`);
      } else {
        load();
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10">
        <div className="text-sm text-[var(--foreground-muted)]">Loading pending scenarios…</div>
      </div>
    );
  }

  const allSelected = selected.size === scenarios.length && scenarios.length > 0;
  const noneSelected = selected.size === 0;

  return (
    <div className="mx-auto max-w-[1200px]">
      <ScreenHeader
        section="Content Operations"
        eyebrow="Review"
        title={`Job ${jobId.slice(0, 8)}`}
        subtitle={`${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'} pending review · ${selected.size} selected for acceptance`}
        actions={
          <Link href={`/jobs/${jobId}`} className="btn btn-ghost">
            Back to Job
          </Link>
        }
      />

      {error ? (
        <CommandPanel tone="danger" className="mb-6 p-4 text-sm text-[var(--error)]">
          {error}
        </CommandPanel>
      ) : null}

      {jobStatus === 'running' || jobStatus === 'pending' ? (
        <CommandPanel className="mb-6 p-4">
          <div className="text-sm text-[var(--foreground-muted)]">Job is still generating — refresh once it reaches pending_review.</div>
        </CommandPanel>
      ) : null}

      {scenarios.length === 0 ? (
        <CommandPanel className="p-8 text-center">
          <div className="text-sm text-[var(--foreground-muted)]">No pending scenarios. The review is complete.</div>
          <Link href={`/jobs/${jobId}`} className="btn btn-tactical mt-4 inline-flex">View Job</Link>
        </CommandPanel>
      ) : (
        <>
          <div className="sticky top-4 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background-elevated)]/95 p-3 backdrop-blur">
            <button type="button" onClick={toggleAll} className="btn btn-ghost">
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <button
              type="button"
              onClick={() => submit('accept')}
              disabled={submitting || noneSelected}
              className="btn btn-command disabled:opacity-50"
            >
              {submitting ? 'Processing…' : `Accept ${selected.size} Selected`}
            </button>
            <button
              type="button"
              onClick={() => submit('reject_all')}
              disabled={submitting}
              className="btn btn-ghost text-[var(--error)] disabled:opacity-50"
            >
              Reject All
            </button>
          </div>

          <div className="space-y-4">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                selected={selected.has(scenario.id)}
                onToggle={() => toggleOne(scenario.id)}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => submit('accept')}
              disabled={submitting || noneSelected}
              className="btn btn-command disabled:opacity-50"
            >
              {submitting ? 'Processing…' : `Accept ${selected.size} Selected`}
            </button>
            <button
              type="button"
              onClick={() => submit('reject_all')}
              disabled={submitting}
              className="btn btn-ghost text-[var(--error)] disabled:opacity-50"
            >
              Reject All
            </button>
          </div>
        </>
      )}
    </div>
  );
}
