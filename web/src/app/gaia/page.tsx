'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ScreenHeader from '@/components/ScreenHeader';
import type {
  GaiaRun,
  GaiaProgress,
  RecommendationItem,
  ScenarioResult,
  StageMetricsMap,
  PipelineStage,
} from '@/lib/gaia-types';

type Tab = 'runs' | 'health';

const STAGE_LABELS: Record<PipelineStage, string> = {
  architect: 'Architect',
  drafter: 'Drafter',
  tokenResolve: 'Token Resolve',
  audit: 'Audit',
  repair: 'Repair',
};

const PIPELINE_STEPS = [
  { phase: 'sampling',     label: 'Sample',   step: 1 },
  { phase: 'generating',   label: 'Generate', step: 2 },
  { phase: 'auditing',     label: 'Audit',    step: 3 },
  { phase: 'token_resolve',label: 'Tokens',   step: 4 },
  { phase: 'verbiage',     label: 'Verbiage', step: 5 },
  { phase: 'metrics',      label: 'Metrics',  step: 6 },
  { phase: 'recommending', label: 'Recs',     step: 7 },
];

function pct(n: number) { return `${Math.round(n * 100)}%`; }

function auditScoreColor(score: number) {
  if (score >= 90) return 'var(--success)';
  if (score >= 70) return 'var(--warning)';
  return 'var(--error)';
}

function StatusBadge({ status }: { status: GaiaRun['status'] }) {
  const cfg = {
    queued:    'bg-[var(--foreground-subtle)]/15 text-[var(--foreground-muted)]',
    running:   'bg-[var(--warning)]/15 text-[var(--warning)]',
    complete:  'bg-[var(--success)]/15 text-[var(--success)]',
    failed:    'bg-[var(--error)]/15 text-[var(--error)]',
    cancelled: 'bg-[var(--foreground-subtle)]/15 text-[var(--foreground-muted)] line-through',
  }[status] ?? 'bg-[var(--foreground-subtle)]/15 text-[var(--foreground-muted)]';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-medium ${cfg}`}>
      {status}
    </span>
  );
}

function RecStatusBadge({ status }: { status: RecommendationItem['status'] }) {
  if (status === 'approved') return <span className="text-[10px] font-mono text-[var(--success)]">✓ Approved</span>;
  if (status === 'rejected') return <span className="text-[10px] font-mono text-[var(--error)] line-through">Rejected</span>;
  return <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">Pending</span>;
}

function TrendBars({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 0.01);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-2 rounded-t-sm"
          style={{
            height: `${Math.max(2, (v / max) * 100)}%`,
            background: v >= 0.9 ? 'var(--success)' : v >= 0.7 ? 'var(--warning)' : 'var(--error)',
            opacity: 0.7 + (i / values.length) * 0.3,
          }}
        />
      ))}
    </div>
  );
}

function ScenarioChip({ result }: { result: ScenarioResult }) {
  const color = result.issueCount === 0
    ? 'var(--success)'
    : result.repaired
    ? 'var(--warning)'
    : 'var(--error)';

  return (
    <div
      className="rounded px-2 py-1.5 border text-[10px] font-mono leading-tight"
      style={{ borderColor: `${color}40`, background: `${color}0d` }}
      title={`${result.title}\nScore: ${result.auditScore}/100 · Issues: ${result.issueCount}${result.unresolvedTokens > 0 ? ` · ${result.unresolvedTokens} unresolved tokens` : ''}${result.verbiageFlagged ? ' · verbiage flagged' : ''}`}
    >
      <div className="truncate max-w-[120px]" style={{ color }}>{result.title || result.id.slice(0, 8)}</div>
      <div className="flex items-center gap-1.5 mt-0.5 text-[var(--foreground-subtle)]">
        <span style={{ color }}>{result.auditScore}</span>
        {result.issueCount > 0 && <span>{result.issueCount}i</span>}
        {result.unresolvedTokens > 0 && <span className="text-[var(--warning)]">{result.unresolvedTokens}t</span>}
        {result.verbiageFlagged && <span className="text-[var(--warning)]">v</span>}
        {result.repaired && <span className="text-[var(--warning)]">~R</span>}
      </div>
    </div>
  );
}

function PipelineRail({ phase, step }: { phase: string; step: number }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {PIPELINE_STEPS.map((s, i) => {
        const done = step > s.step;
        const active = phase === s.phase || step === s.step;
        return (
          <div key={s.phase} className="flex items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-mono font-bold transition-all ${
                  done
                    ? 'bg-[var(--success)]/20 border border-[var(--success)]'
                    : active
                    ? 'border border-[var(--warning)] bg-[var(--warning)]/15'
                    : 'border border-[var(--border)] bg-transparent'
                }`}
                style={active ? { animation: 'pulse 1.5s ease-in-out infinite' } : undefined}
              >
                {done ? (
                  <span style={{ color: 'var(--success)' }}>✓</span>
                ) : (
                  <span style={{ color: active ? 'var(--warning)' : 'var(--foreground-subtle)' }}>{s.step}</span>
                )}
              </div>
              <span className={`text-[8px] font-mono whitespace-nowrap ${
                done ? 'text-[var(--success)]' : active ? 'text-[var(--warning)]' : 'text-[var(--foreground-subtle)]'
              }`}>
                {s.label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className="w-5 h-px mx-0.5 mb-2.5"
                style={{ background: step > s.step ? 'var(--success)' : 'var(--border)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function GaiaProgressPanel({
  progress,
  status,
  runId,
  onCancel,
}: {
  progress: GaiaProgress | null | undefined;
  status: GaiaRun['status'];
  runId: string;
  onCancel: () => void;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  const [cancelling, setCancelling] = useState(false);
  const isActive = status === 'queued' || status === 'running';
  if (!isActive) return null;

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [progress?.log?.length]);

  async function handleStop() {
    setCancelling(true);
    try {
      await fetch(`/api/gaia/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      onCancel();
    } finally {
      setCancelling(false);
    }
  }

  if (!progress) {
    return (
      <div className="command-panel px-4 py-4 flex items-center gap-3">
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--warning)] animate-pulse" />
        <span className="text-[11px] font-mono text-[var(--warning)]">Queued — waiting for Cloud Function…</span>
        <button type="button" onClick={handleStop} disabled={cancelling} className="ml-auto btn btn-ghost text-[10px] disabled:opacity-50">
          {cancelling ? 'Stopping…' : 'Stop'}
        </button>
      </div>
    );
  }

  const sampledResults = progress.scenarioResults?.filter((r) => r.type === 'sampled') ?? [];
  const generatedResults = progress.scenarioResults?.filter((r) => r.type === 'generated') ?? [];

  return (
    <div className="command-panel overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-3 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <PipelineRail phase={progress.phase} step={progress.step} />
        </div>
        <button
          type="button"
          onClick={handleStop}
          disabled={cancelling}
          className="btn btn-ghost text-[10px] disabled:opacity-50 shrink-0"
        >
          {cancelling ? 'Stopping…' : 'Stop'}
        </button>
      </div>

      <div className="px-4 pt-3 pb-1">
        <p className="text-[12px] font-mono text-[var(--warning)] leading-5 truncate">{progress.detail}</p>
      </div>

      <div className="px-4 py-2 grid grid-cols-4 gap-3 border-b border-[var(--border)]">
        {[
          { label: 'Processed', value: `${progress.scenariosAudited}/${progress.scenariosTotal}`, warn: false },
          { label: 'Issues', value: progress.issuesFound, warn: progress.issuesFound > 0 },
          { label: 'Unresolved tokens', value: progress.unresolvedTokensSoFar, warn: progress.unresolvedTokensSoFar > 0 },
          { label: 'Verbiage findings', value: progress.verbiageFindingsSoFar.length, warn: false },
        ].map(({ label, value, warn }) => (
          <div key={label}>
            <div className="text-[9px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)] mb-0.5">{label}</div>
            <div className={`text-[15px] font-mono font-semibold ${warn ? 'text-[var(--error)]' : 'text-foreground'}`}>{value}</div>
          </div>
        ))}
      </div>

      {(sampledResults.length > 0 || generatedResults.length > 0) && (
        <div className="px-4 py-3 border-b border-[var(--border)] space-y-2">
          {sampledResults.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)] mb-1.5">Sampled</div>
              <div className="flex flex-wrap gap-1.5">
                {sampledResults.map((r) => <ScenarioChip key={r.id} result={r} />)}
              </div>
            </div>
          )}
          {generatedResults.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)] mb-1.5">Generated</div>
              <div className="flex flex-wrap gap-1.5">
                {generatedResults.map((r) => <ScenarioChip key={r.id} result={r} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {progress.log && progress.log.length > 0 && (
        <div
          ref={logRef}
          className="px-4 py-2 max-h-32 overflow-y-auto font-mono text-[10px] leading-5 space-y-0.5"
        >
          {progress.log.map((entry, i) => {
            const color = entry.level === 'error' ? 'var(--error)' : entry.level === 'warn' ? 'var(--warning)' : 'var(--foreground-muted)';
            const time = new Date(entry.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={i} className="flex gap-2">
                <span className="text-[var(--foreground-subtle)] shrink-0">{time}</span>
                <span style={{ color }}>{entry.msg}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IssueBreakdown({ byType }: { byType: Record<string, number> }) {
  const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (sorted.length === 0) return null;
  const max = sorted[0][1];
  return (
    <div className="command-panel px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)] mb-3">Issue breakdown</div>
      <div className="space-y-2">
        {sorted.map(([type, count]) => (
          <div key={type} className="flex items-center gap-3">
            <div className="w-36 shrink-0 text-[10px] font-mono text-[var(--foreground-muted)] truncate">{type}</div>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full bg-[var(--error)] transition-all"
                style={{ width: `${(count / max) * 100}%`, opacity: 0.6 + (count / max) * 0.4 }}
              />
            </div>
            <div className="w-5 text-right text-[10px] font-mono text-foreground shrink-0">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScenarioResultsGrid({ results, sampledIds, generatedIds }: { results: ScenarioResult[]; sampledIds: string[]; generatedIds: string[] }) {
  if (results.length === 0) {
    const totalExpected = sampledIds.length + generatedIds.length;
    if (totalExpected === 0) return null;
    const sampled = sampledIds.map((id) => ({ id, type: 'sampled' as const }));
    const generated = generatedIds.map((id) => ({ id, type: 'generated' as const }));
    return (
      <div className="command-panel px-4 py-3">
        <div className="text-[10px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)] mb-3">Scenarios ({totalExpected})</div>
        <div className="grid grid-cols-2 gap-4">
          {[{ label: 'Sampled', items: sampled }, { label: 'Generated', items: generated }].map(({ label, items }) => (
            <div key={label}>
              <div className="text-[9px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)] mb-1.5">{label}</div>
              <div className="space-y-1">
                {items.map((s) => (
                  <div key={s.id} className="text-[10px] font-mono text-[var(--foreground-subtle)] truncate">{s.id.slice(0, 16)}…</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sampled = results.filter((r) => r.type === 'sampled');
  const generated = results.filter((r) => r.type === 'generated');

  return (
    <div className="command-panel px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)] mb-3">
        Scenarios ({results.length}) · avg score {Math.round(results.reduce((s, r) => s + r.auditScore, 0) / results.length)}/100
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[{ label: 'Sampled', items: sampled }, { label: 'Generated', items: generated }].map(({ label, items }) => (
          items.length > 0 && (
            <div key={label}>
              <div className="text-[9px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)] mb-2">{label}</div>
              <div className="space-y-1.5">
                {items.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 bg-[var(--background-muted)]/40"
                  >
                    <div
                      className="w-8 text-center rounded text-[9px] font-mono font-bold py-0.5 shrink-0"
                      style={{ color: auditScoreColor(r.auditScore), background: `${auditScoreColor(r.auditScore)}18` }}
                    >
                      {r.auditScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-foreground truncate">{r.title || r.id.slice(0, 20)}</div>
                      {r.descriptionSnippet && (
                        <div className="text-[10px] text-[var(--foreground-subtle)] leading-4 mt-0.5 line-clamp-2">{r.descriptionSnippet}</div>
                      )}
                      {r.issueTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {r.issueTypes.slice(0, 3).map((t) => (
                            <span key={t} className="text-[8px] font-mono text-[var(--error)] bg-[var(--error)]/8 rounded px-1">{t}</span>
                          ))}
                          {r.issueTypes.length > 3 && (
                            <span className="text-[8px] font-mono text-[var(--foreground-subtle)]">+{r.issueTypes.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.unresolvedTokens > 0 && (
                        <span className="text-[8px] font-mono text-[var(--warning)] bg-[var(--warning)]/10 rounded px-1">{r.unresolvedTokens}T</span>
                      )}
                      {r.verbiageFlagged && (
                        <span className="text-[8px] font-mono text-[var(--warning)] bg-[var(--warning)]/10 rounded px-1">V</span>
                      )}
                      {r.repaired && (
                        <span className="text-[8px] font-mono text-[var(--success)] bg-[var(--success)]/10 rounded px-1">~R</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({
  rec,
  runId,
  onUpdate,
}: {
  rec: RecommendationItem;
  runId: string;
  onUpdate: (updated: RecommendationItem) => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const priority = rec.evidenceMetrics.stageAccuracy < 0.7 ? 'High' : rec.evidenceMetrics.stageAccuracy < 0.85 ? 'Med' : 'Low';
  const priorityColor = priority === 'High' ? 'var(--error)' : priority === 'Med' ? 'var(--warning)' : 'var(--foreground-subtle)';

  async function act(status: 'approved' | 'rejected') {
    setBusy(true);
    try {
      const res = await fetch(`/api/gaia/${runId}/recommendations/${rec.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNote: note || undefined }),
      });
      const json = res.ok ? await res.json() as { ok: boolean; promptPatchApplied?: boolean } : null;
      onUpdate({ ...rec, status, reviewNote: note || undefined, ...(json?.promptPatchApplied != null ? { promptPatchApplied: json.promptPatchApplied } : {}) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`command-panel overflow-hidden ${rec.status === 'rejected' ? 'opacity-50' : ''}`}>
      <div className="border-b border-[var(--border)] px-4 py-2.5 flex flex-wrap items-center gap-3">
        <span
          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ color: priorityColor, background: `${priorityColor}18` }}
        >
          {priority}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wide text-[var(--accent-secondary)]">
          {rec.pipelineStage} · {rec.targetSection}
        </span>
        <RecStatusBadge status={rec.status} />
        {rec.promptPatchApplied && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--success)', background: 'color-mix(in srgb, var(--success) 15%, transparent)' }}>
            ✓ Patched
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-16 rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: pct(rec.evidenceMetrics.stageAccuracy),
                  background: rec.evidenceMetrics.stageAccuracy >= 0.85
                    ? 'var(--success)'
                    : rec.evidenceMetrics.stageAccuracy >= 0.7
                    ? 'var(--warning)'
                    : 'var(--error)',
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">
              {pct(rec.evidenceMetrics.stageAccuracy)} · n={rec.evidenceMetrics.sampleSize}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-[12px] leading-5 text-foreground">{rec.reason}</p>

        {rec.evidenceMetrics.topIssues.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {rec.evidenceMetrics.topIssues.map((issue) => (
              <span key={issue} className="rounded bg-[var(--background-muted)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--foreground-muted)]">
                {issue}
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-[9px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)]">Current</div>
            <pre className="rounded bg-[var(--background-muted)] px-3 py-2 text-[10px] font-mono leading-relaxed text-[var(--foreground-muted)] whitespace-pre-wrap break-words">
              {rec.currentExcerpt || '—'}
            </pre>
          </div>
          <div>
            <div className="mb-1 text-[9px] font-mono uppercase tracking-wide text-[var(--success)]">Suggested</div>
            <pre className="rounded border border-[var(--success)]/20 bg-[var(--success)]/5 px-3 py-2 text-[10px] font-mono leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {rec.suggestedChange}
            </pre>
          </div>
        </div>

        {rec.status === 'pending' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Optional note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-shell flex-1 text-xs"
            />
            <button type="button" onClick={() => act('approved')} disabled={busy} className="btn btn-command text-[11px] disabled:opacity-50">
              Approve
            </button>
            <button type="button" onClick={() => act('rejected')} disabled={busy} className="btn btn-ghost text-[11px] disabled:opacity-50">
              Reject
            </button>
          </div>
        )}
        {rec.reviewNote && (
          <p className="text-[10px] text-[var(--foreground-subtle)] italic">Note: {rec.reviewNote}</p>
        )}
      </div>
    </div>
  );
}

function RecommendationsSection({
  run,
  onRunChange,
}: {
  run: GaiaRun;
  onRunChange: (r: GaiaRun) => void;
}) {
  const [openStage, setOpenStage] = useState<'architect' | 'drafter' | 'repair' | null>(null);

  const stages: Array<{ key: 'architect' | 'drafter' | 'repair'; label: string }> = [
    { key: 'architect', label: 'Architect' },
    { key: 'drafter', label: 'Drafter' },
    { key: 'repair', label: 'Repair' },
  ];

  function handleRecUpdate(updated: RecommendationItem) {
    const updateList = (list: RecommendationItem[]) => list.map((r) => (r.id === updated.id ? updated : r));
    onRunChange({
      ...run,
      promptRecommendations: {
        ...run.promptRecommendations,
        architect: updateList(run.promptRecommendations.architect),
        drafter: updateList(run.promptRecommendations.drafter),
        repair: updateList(run.promptRecommendations.repair),
      },
    });
  }

  const totalRecs = stages.reduce((s, st) => s + run.promptRecommendations[st.key].length, 0);
  if (totalRecs === 0) return <p className="text-[12px] text-[var(--foreground-subtle)]">No recommendations generated.</p>;

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)]">
        Prompt recommendations ({totalRecs})
      </div>
      {stages.map(({ key, label }) => {
        const recs = run.promptRecommendations[key];
        if (recs.length === 0) return null;
        const isOpen = openStage === key;
        const pendingCount = recs.filter((r) => r.status === 'pending').length;
        return (
          <div key={key} className="command-panel overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--background-muted)]/30 transition-colors"
              onClick={() => setOpenStage(isOpen ? null : key)}
            >
              <span className="text-[11px] font-mono font-medium text-foreground">{label}</span>
              <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">{recs.length} rec{recs.length !== 1 ? 's' : ''}</span>
              {pendingCount > 0 && (
                <span className="text-[9px] font-mono text-[var(--warning)] bg-[var(--warning)]/10 rounded px-1.5 py-0.5">
                  {pendingCount} pending
                </span>
              )}
              <span className="ml-auto text-[10px] text-[var(--foreground-subtle)]">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="border-t border-[var(--border)] p-4 space-y-3">
                {recs.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} runId={run.runId} onUpdate={handleRecUpdate} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RunDetail({ run, onRunChange }: { run: GaiaRun; onRunChange: (r: GaiaRun) => void }) {
  const totalRecs =
    (run.promptRecommendations?.architect?.length ?? 0) +
    (run.promptRecommendations?.drafter?.length ?? 0) +
    (run.promptRecommendations?.repair?.length ?? 0);

  return (
    <div className="mt-4 space-y-4">
      <GaiaProgressPanel
        progress={run.progress}
        status={run.status}
        runId={run.runId}
        onCancel={() => onRunChange({ ...run, status: 'cancelled', progress: null })}
      />

      {run.status === 'failed' && run.error && (
        <div className="rounded-[var(--radius)] border border-[var(--error)]/30 bg-[var(--error)]/8 px-4 py-3 text-[11px] font-mono text-[var(--error)]">
          {run.error}
        </div>
      )}

      {(run.status === 'complete' || run.status === 'failed') && (
        <>
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 command-panel">
            {run.promptRecommendations.summary && (
              <p className="flex-1 text-[12px] leading-5 text-foreground">{run.promptRecommendations.summary}</p>
            )}
            <div className="flex flex-wrap gap-4 shrink-0 text-[11px] font-mono">
              <span><span className="text-[var(--foreground-subtle)]">issues </span><span className="font-semibold">{run.auditSummary.totalIssues}</span></span>
              <span><span className="text-[var(--foreground-subtle)]">unresolved </span><span className="font-semibold">{run.tokenResolutionSummary.unresolvedCount}</span></span>
              <span><span className="text-[var(--foreground-subtle)]">verbiage </span><span className="font-semibold">{run.verbiageFindings.length}</span></span>
              <span><span className="text-[var(--foreground-subtle)]">recs </span><span className="font-semibold">{totalRecs}</span></span>
              {(run.promotedExemplarCount ?? 0) > 0 && (
                <span><span className="text-[var(--foreground-subtle)]">exemplars </span><span className="font-semibold text-[var(--accent)]">{run.promotedExemplarCount}</span></span>
              )}
            </div>
            <button
              type="button"
              className="text-[10px] font-mono text-[var(--foreground-subtle)] opacity-50 hover:opacity-80 transition-opacity cursor-copy select-all"
              title="Click to copy run ID"
              onClick={() => navigator.clipboard.writeText(run.runId)}
            >
              {run.runId}
            </button>
          </div>

          <ScenarioResultsGrid
            results={run.scenarioResults ?? []}
            sampledIds={run.sampledScenarioIds}
            generatedIds={run.generatedScenarioIds}
          />

          {run.auditSummary.totalIssues > 0 && (
            <IssueBreakdown byType={run.auditSummary.byType} />
          )}

          {run.verbiageFindings.length > 0 && (
            <div className="command-panel px-4 py-3">
              <div className="mb-2 text-[10px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)]">
                Verbiage findings ({run.verbiageFindings.length})
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {run.verbiageFindings.map((f, i) => (
                  <li key={i} className="text-[11px] text-[var(--foreground-muted)] leading-5">· {f}</li>
                ))}
              </ul>
            </div>
          )}

          {(run.tokenFindings?.length ?? 0) > 0 && (
            <div className="command-panel px-4 py-3">
              <div className="mb-2 text-[10px] font-mono uppercase tracking-wide text-[var(--error)]/70">
                Token hallucinations ({run.tokenFindings!.length})
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {run.tokenFindings!.map((f, i) => (
                  <li key={i} className="text-[11px] font-mono text-[var(--error)]/80 leading-5">· {f}</li>
                ))}
              </ul>
            </div>
          )}

          <RecommendationsSection run={run} onRunChange={onRunChange} />
        </>
      )}
    </div>
  );
}

function StageHealthTab({ metrics }: { metrics: StageMetricsMap }) {
  const stages = Object.keys(metrics) as PipelineStage[];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stages.map((stage) => {
        const m = metrics[stage];
        const passColor = m.passRate >= 0.9
          ? 'var(--success)'
          : m.passRate >= 0.7
          ? 'var(--warning)'
          : 'var(--error)';
        return (
          <div key={stage} className="command-panel px-4 py-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)]">
                  {STAGE_LABELS[stage]}
                </div>
                <div className="text-3xl font-mono font-bold mt-0.5" style={{ color: passColor }}>
                  {pct(m.passRate)}
                </div>
                <div className="text-[9px] font-mono text-[var(--foreground-subtle)] mt-0.5">n={m.sampleSize}</div>
              </div>
              {m.weeklyPassRates.length > 1 && (
                <TrendBars values={m.weeklyPassRates} />
              )}
            </div>

            {m.weeklyPassRates.length > 1 && (
              <div>
                <div className="text-[8px] font-mono text-[var(--foreground-subtle)] mb-1">8-week trend</div>
                <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: pct(m.passRate), background: passColor }}
                  />
                </div>
              </div>
            )}

            {m.topIssues.length > 0 && (
              <div>
                <div className="text-[8px] font-mono uppercase tracking-wide text-[var(--foreground-subtle)] mb-1.5">Top issues</div>
                <div className="flex flex-wrap gap-1">
                  {m.topIssues.map((issue) => (
                    <span key={issue} className="rounded bg-[var(--background-muted)] border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--foreground-muted)]">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const POLL_INTERVAL_MS = 5000;

export default function GaiaPage() {
  const [tab, setTab] = useState<Tab>('runs');
  const [runs, setRuns] = useState<GaiaRun[]>([]);
  const [metrics, setMetrics] = useState<StageMetricsMap | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRuns = useCallback(async (): Promise<GaiaRun[]> => {
    const res = await fetch('/api/gaia');
    const data = await res.json() as { runs: GaiaRun[] };
    const fetched = data.runs ?? [];
    setRuns(fetched);
    return fetched;
  }, []);

  const loadMetrics = useCallback(async () => {
    const res = await fetch('/api/gaia/metrics');
    const data = await res.json() as { metrics: StageMetricsMap };
    setMetrics(data.metrics ?? null);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const fetched = await loadRuns();
      const hasActive = fetched.some((r) => r.status === 'queued' || r.status === 'running');
      if (!hasActive) stopPolling();
    }, POLL_INTERVAL_MS);
  }, [loadRuns, stopPolling]);

  useEffect(() => {
    void loadRuns().then((fetched) => {
      if (fetched.some((r) => r.status === 'queued' || r.status === 'running')) startPolling();
    });
    return stopPolling;
  }, [loadRuns, startPolling, stopPolling]);

  useEffect(() => { if (tab === 'health') void loadMetrics(); }, [tab, loadMetrics]);

  const deletableRuns = runs.filter((r) => r.status !== 'queued' && r.status !== 'running');
  const allDeletableSelected = deletableRuns.length > 0 && deletableRuns.every((r) => selectedIds.has(r.runId));
  const someSelected = selectedIds.size > 0;

  function toggleSelect(runId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId); else next.add(runId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allDeletableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletableRuns.map((r) => r.runId)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} run${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => fetch(`/api/gaia/${id}`, { method: 'DELETE' })),
      );
      setRuns((prev) => prev.filter((r) => !selectedIds.has(r.runId)));
      if (expandedRunId && selectedIds.has(expandedRunId)) setExpandedRunId(null);
      setSelectedIds(new Set());
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleTrigger() {
    setTriggering(true);
    setTriggerError(null);
    try {
      const res = await fetch('/api/gaia', { method: 'POST' });
      const data = await res.json() as { runId?: string; error?: string };
      if (data.error) throw new Error(data.error);
      await loadRuns();
      if (data.runId) setExpandedRunId(data.runId);
      startPolling();
    } catch (err: unknown) {
      setTriggerError(err instanceof Error ? err.message : 'Trigger failed');
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <ScreenHeader
        section="Intelligence"
        title="Gaia"
        subtitle="Self-improving quality agent — weekly prompt optimization via scenario sampling."
        actions={
          <button
            type="button"
            onClick={handleTrigger}
            disabled={triggering}
            className="btn btn-command disabled:opacity-50"
          >
            {triggering ? 'Queuing…' : 'Run Gaia Now'}
          </button>
        }
      />

      {triggerError && (
        <div className="mb-3 rounded-[var(--radius)] border border-[var(--error)]/30 bg-[var(--error)]/8 px-4 py-2 text-[12px] text-[var(--error)]">
          {triggerError}
        </div>
      )}

      <div className="mb-4 flex gap-1">
        {(['runs', 'health'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`btn ${tab === t ? 'btn-command' : 'btn-ghost'} text-[11px]`}
          >
            {t === 'runs' ? 'Runs' : 'Stage Health'}
          </button>
        ))}
      </div>

      {tab === 'runs' && (
        <div className="space-y-3">
          {deletableRuns.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--foreground-muted)]">
                <input
                  type="checkbox"
                  checked={allDeletableSelected}
                  onChange={toggleSelectAll}
                  className="accent-[var(--accent)]"
                />
                {allDeletableSelected ? 'Deselect all' : `Select all (${deletableRuns.length})`}
              </label>
              {someSelected && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="ml-auto btn btn-ghost text-[11px] text-[var(--error)] hover:bg-[var(--error)]/10 disabled:opacity-50"
                >
                  {bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size} selected`}
                </button>
              )}
            </div>
          )}
          {runs.length === 0 && (
            <div className="command-panel px-4 py-8 text-center text-[12px] text-[var(--foreground-subtle)]">
              No Gaia runs yet. Click "Run Gaia Now" to start.
            </div>
          )}
          {runs.map((run) => {
            const isExpanded = expandedRunId === run.runId;
            const isActive = run.status === 'queued' || run.status === 'running';
            const totalRecs =
              (run.promptRecommendations?.architect?.length ?? 0) +
              (run.promptRecommendations?.drafter?.length ?? 0) +
              (run.promptRecommendations?.repair?.length ?? 0);

            const handleDelete = async (e: React.MouseEvent) => {
              e.stopPropagation();
              if (!confirm('Delete this run? This cannot be undone.')) return;
              const res = await fetch(`/api/gaia/${run.runId}`, { method: 'DELETE' });
              if (res.ok) {
                setRuns((prev) => prev.filter((r) => r.runId !== run.runId));
                if (expandedRunId === run.runId) setExpandedRunId(null);
              }
            };

            return (
              <div key={run.runId} className="command-panel overflow-hidden">
                <div className="flex items-stretch">
                  {!isActive && (
                    <label
                      className="flex items-center px-3 cursor-pointer hover:bg-[var(--background-muted)]/40 transition-colors border-r border-[var(--border)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(run.runId)}
                        onChange={() => toggleSelect(run.runId)}
                        className="accent-[var(--accent)]"
                      />
                    </label>
                  )}
                <button
                  type="button"
                  className="flex-1 flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-[var(--background-muted)]/40 transition-colors"
                  onClick={() => setExpandedRunId(isExpanded ? null : run.runId)}
                >
                  <StatusBadge status={run.status} />
                  <span className="text-[12px] font-medium text-foreground">
                    {run.triggeredAt ? new Date(run.triggeredAt).toLocaleString() : 'Unknown time'}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">
                    {run.triggeredBy === 'manual' ? 'Manual' : 'Scheduled'}
                  </span>
                  <span
                    className="text-[10px] font-mono text-[var(--foreground-subtle)] opacity-40 cursor-pointer hover:opacity-70 transition-opacity"
                    title={run.runId}
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(run.runId); }}
                  >
                    {run.runId.slice(0, 8)}
                  </span>
                  {run.progress && isActive && (
                    <span className="text-[10px] font-mono text-[var(--warning)]">
                      {run.progress.phaseLabel} · step {run.progress.step}/{run.progress.totalSteps}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-3 text-[10px] font-mono text-[var(--foreground-subtle)]">
                    {run.scenarioResults?.length > 0 && (
                      <span>
                        avg {Math.round(run.scenarioResults.reduce((s, r) => s + r.auditScore, 0) / run.scenarioResults.length)}/100
                      </span>
                    )}
                    {totalRecs > 0 && <span>{totalRecs} rec{totalRecs !== 1 ? 's' : ''}</span>}
                    {run.auditSummary?.totalIssues != null && run.auditSummary.totalIssues > 0 && (
                      <span className="text-[var(--error)]">{run.auditSummary.totalIssues} issues</span>
                    )}
                    {!isActive && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-1.5 py-0.5 rounded text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
                        title="Delete run"
                      >
                        ✕
                      </button>
                    )}
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-[var(--border)] px-4 pb-4">
                    <RunDetail
                      run={run}
                      onRunChange={(updated) =>
                        setRuns((prev) => prev.map((r) => (r.runId === updated.runId ? updated : r)))
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'health' && (
        metrics
          ? <StageHealthTab metrics={metrics} />
          : <div className="command-panel px-4 py-8 text-center text-[12px] text-[var(--foreground-subtle)]">Loading metrics…</div>
      )}
    </div>
  );
}
