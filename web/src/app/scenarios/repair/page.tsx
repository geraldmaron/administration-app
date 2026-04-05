'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuditScore from '@/components/AuditScore';
import BundleBadge from '@/components/BundleBadge';
import ScreenHeader from '@/components/ScreenHeader';
import { formatRepairPath } from '@shared/scenario-repair';
import type { RepairAnalysis, ApprovedRepair } from '@/lib/types';

type Phase = 'loading' | 'review' | 'applying' | 'error';

type DiffSegment = { text: string; type: 'equal' | 'added' | 'removed' };

function computeWordDiff(before: string, after: string): { beforeSegments: DiffSegment[]; afterSegments: DiffSegment[] } {
  const tokenize = (s: string) => s.split(/(\s+)/);
  const beforeWords = tokenize(before);
  const afterWords = tokenize(after);

  const m = beforeWords.length;
  const n = afterWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = beforeWords[i - 1] === afterWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const beforeSegments: DiffSegment[] = [];
  const afterSegments: DiffSegment[] = [];
  let i = m, j = n;
  const bStack: DiffSegment[] = [];
  const aStack: DiffSegment[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeWords[i - 1] === afterWords[j - 1]) {
      bStack.push({ text: beforeWords[i - 1], type: 'equal' });
      aStack.push({ text: afterWords[j - 1], type: 'equal' });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      aStack.push({ text: afterWords[j - 1], type: 'added' });
      j--;
    } else {
      bStack.push({ text: beforeWords[i - 1], type: 'removed' });
      i--;
    }
  }
  bStack.reverse().forEach((s) => beforeSegments.push(s));
  aStack.reverse().forEach((s) => afterSegments.push(s));
  return { beforeSegments, afterSegments };
}

function DiffText({ segments }: { segments: DiffSegment[] }) {
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === 'equal') return <span key={i} className="text-[var(--foreground-muted)]">{seg.text}</span>;
        if (seg.type === 'removed') return <span key={i} className="bg-[var(--error)]/15 text-[var(--error)] rounded-[1px] px-0.5">{seg.text}</span>;
        return <span key={i} className="bg-[var(--success)]/15 text-[var(--success)] rounded-[1px] px-0.5">{seg.text}</span>;
      })}
    </pre>
  );
}

function RepairPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = useMemo(
    () => {
      const rawIds = searchParams.getAll('ids');
      return [...new Set(rawIds.flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean))];
    },
    [searchParams]
  );

  const [phase, setPhase] = useState<Phase>('loading');
  const [analyses, setAnalyses] = useState<RepairAnalysis[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // approvalState[id][path] = true (approved) | false (rejected)
  const [approvalState, setApprovalState] = useState<Record<string, Record<string, boolean>>>({});
  // editState[id][path] = edited string value
  const [editState, setEditState] = useState<Record<string, Record<string, string>>>({});
  // expanded edit mode per scenario
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  // skipped scenario IDs
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (ids.length === 0) { setPhase('error'); setErrorMessage('No scenario IDs provided.'); return; }

    fetch('/api/scenarios/repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'analyze', ids }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Analysis failed');
        }
        return data;
      })
      .then((data: { results?: RepairAnalysis[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        const results = data.results ?? [];
        setAnalyses(results);
        const initApproval: Record<string, Record<string, boolean>> = {};
        for (const a of results) {
          initApproval[a.id] = {};
          for (const c of a.changes) initApproval[a.id][c.path] = true;
        }
        setApprovalState(initApproval);
        setPhase('review');
      })
      .catch((err: Error) => {
        setErrorMessage(err.message ?? 'Analysis failed');
        setPhase('error');
      });
  }, [ids]);

  const toggleApproval = useCallback((scenarioId: string, path: string) => {
    setApprovalState((prev) => ({
      ...prev,
      [scenarioId]: { ...prev[scenarioId], [path]: !prev[scenarioId]?.[path] },
    }));
  }, []);

  const setEditValue = useCallback((scenarioId: string, path: string, value: string) => {
    setEditState((prev) => ({
      ...prev,
      [scenarioId]: { ...prev[scenarioId], [path]: value },
    }));
  }, []);

  const toggleEditMode = useCallback((scenarioId: string) => {
    setEditMode((prev) => ({ ...prev, [scenarioId]: !prev[scenarioId] }));
  }, []);

  const toggleSkip = useCallback((scenarioId: string) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(scenarioId)) next.delete(scenarioId); else next.add(scenarioId);
      return next;
    });
  }, []);

  const approvedRepairs = useMemo<ApprovedRepair[]>(() => {
    return analyses
      .filter((a) => !skipped.has(a.id) && a.hasChanges)
      .map((a) => ({
        id: a.id,
        patches: a.changes
          .filter((c) => approvalState[a.id]?.[c.path] !== false)
          .map((c) => ({
            path: c.path,
            value: editState[a.id]?.[c.path] ?? c.after,
          }))
          .filter((p) => {
            const orig = a.changes.find((c) => c.path === p.path)?.before;
            return p.value !== orig;
          }),
      }))
      .filter((r) => r.patches.length > 0);
  }, [analyses, approvalState, editState, skipped]);

  async function handleApply() {
    if (approvedRepairs.length === 0) return;
    setPhase('applying');
    try {
      const res = await fetch('/api/scenarios/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'apply', approved: approvedRepairs }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(body.error ?? 'Apply failed');
      }
      router.push('/scenarios');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Apply failed');
      setPhase('error');
    }
  }

  const isMissingScenarioAnalysis = (analysis: RepairAnalysis) => analysis.auditIssues.includes('Scenario not found');

  const withChanges = analyses.filter((a) => a.hasChanges);
  const invalidScenarios = analyses.filter((a) => !a.hasChanges && isMissingScenarioAnalysis(a));
  const alreadyClean = analyses.filter((a) => !a.hasChanges && !isMissingScenarioAnalysis(a));
  const totalPatches = approvedRepairs.reduce((n, r) => n + r.patches.length, 0);

  if (phase === 'loading') {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius)] bg-[var(--background-muted)]" />
        ))}
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="command-panel px-5 py-8 text-center">
        <p className="text-sm text-[var(--error)]">{errorMessage ?? 'Something went wrong.'}</p>
        <Link href="/scenarios" className="mt-4 inline-block text-[12px] font-medium text-[var(--accent-primary)] hover:underline">
          ← Back to scenarios
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Summary banner */}
      <div className="command-panel mb-3 flex flex-wrap items-center gap-4 px-4 py-3">
        <div className="text-[12px] font-mono text-[var(--foreground-muted)]">
          <span className="font-semibold text-foreground">{analyses.length}</span> scenario{analyses.length !== 1 ? 's' : ''} analyzed
        </div>
        <div className="text-[12px] font-mono text-[var(--foreground-muted)]">
          <span className="font-semibold text-[var(--warning)]">{withChanges.length}</span> need changes
        </div>
        <div className="text-[12px] font-mono text-[var(--foreground-muted)]">
          <span className="font-semibold text-[var(--success)]">{alreadyClean.length}</span> already clean
        </div>
        {invalidScenarios.length > 0 && (
          <div className="text-[12px] font-mono text-[var(--foreground-muted)]">
            <span className="font-semibold text-[var(--error)]">{invalidScenarios.length}</span> invalid
          </div>
        )}
        {approvedRepairs.length > 0 && (
          <div className="ml-auto text-[12px] font-mono text-[var(--foreground-muted)]">
            <span className="font-semibold text-foreground">{totalPatches}</span> patch{totalPatches !== 1 ? 'es' : ''} queued
          </div>
        )}
      </div>

      {/* Scenarios needing changes */}
      {withChanges.length > 0 && (
        <div className="space-y-3 mb-3">
          {withChanges.map((analysis) => {
            const isSkipped = skipped.has(analysis.id);
            const inEdit = editMode[analysis.id] ?? false;
            const approvedCount = analysis.changes.filter(
              (c) => !isSkipped && approvalState[analysis.id]?.[c.path] !== false
            ).length;

            return (
              <div key={analysis.id} className="command-panel overflow-hidden">
                {/* Card header */}
                <div className="flex flex-wrap items-start gap-3 border-b border-[var(--border)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground truncate">{analysis.title}</span>
                      {analysis.bundle && <BundleBadge bundle={analysis.bundle} />}
                      {analysis.auditScore != null && <AuditScore score={analysis.auditScore} />}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-[var(--foreground-subtle)]">{analysis.id}</div>
                    {analysis.auditIssues.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {analysis.auditIssues.map((issue, i) => (
                          <span key={i} className="rounded bg-[var(--background-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground-muted)]">
                            {issue}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-mono text-[var(--foreground-subtle)]">
                      {isSkipped ? '0' : approvedCount}/{analysis.changes.length} approved
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleEditMode(analysis.id)}
                      className={`btn btn-ghost text-[11px] ${inEdit ? 'text-[var(--accent-primary)]' : ''}`}
                    >
                      {inEdit ? 'Done editing' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSkip(analysis.id)}
                      className={`btn btn-ghost text-[11px] ${isSkipped ? 'text-[var(--warning)]' : ''}`}
                    >
                      {isSkipped ? 'Unskip' : 'Skip all'}
                    </button>
                  </div>
                </div>

                {/* Change rows */}
                {!isSkipped && (
                  <div className="divide-y divide-[var(--border)]">
                    {analysis.changes.map((change) => {
                      const approved = approvalState[analysis.id]?.[change.path] !== false;
                      const editedValue = editState[analysis.id]?.[change.path];
                      const displayAfter = editedValue ?? change.after;
                      const { beforeSegments, afterSegments } = computeWordDiff(change.before, displayAfter);

                      return (
                        <div key={change.path} className={`grid grid-cols-[160px_1fr_1fr_32px] gap-0 ${!approved ? 'opacity-40' : ''}`}>
                          <div className="flex items-start border-r border-[var(--border)] px-3 py-2.5">
                            <span className="text-[11px] font-mono text-[var(--foreground-muted)] leading-relaxed">
                              {formatRepairPath(change.path)}
                            </span>
                          </div>

                          <div className="border-r border-[var(--border)] px-3 py-2.5">
                            <div className="text-xs font-medium text-[var(--foreground-subtle)] mb-1">Before</div>
                            <DiffText segments={beforeSegments} />
                          </div>

                          <div className="px-3 py-2.5">
                            <div className="text-xs font-medium text-[var(--foreground-subtle)] mb-1">After</div>
                            {inEdit ? (
                              <textarea
                                className="input-shell w-full font-mono text-[11px] leading-relaxed resize-y"
                                rows={Math.max(2, displayAfter.split('\n').length)}
                                value={displayAfter}
                                onChange={(e) => setEditValue(analysis.id, change.path, e.target.value)}
                              />
                            ) : (
                              <DiffText segments={afterSegments} />
                            )}
                          </div>

                          <div className="flex items-start justify-center pt-3">
                            <input
                              type="checkbox"
                              checked={approved}
                              onChange={() => toggleApproval(analysis.id, change.path)}
                              className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-primary)]"
                              title={approved ? 'Reject this change' : 'Approve this change'}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isSkipped && (
                  <div className="px-4 py-3 text-[12px] text-[var(--foreground-subtle)]">
                    Skipped — {analysis.changes.length} change{analysis.changes.length !== 1 ? 's' : ''} will not be applied.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {invalidScenarios.length > 0 && (
        <div className="command-panel mb-3 px-4 py-3">
          <div className="section-kicker mb-2 text-[var(--error)]">Invalid scenarios</div>
          <div className="space-y-2">
            {invalidScenarios.map((analysis) => (
              <div key={analysis.id} className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="text-[var(--error)]">!</span>
                <span className="font-medium text-foreground">{analysis.title || analysis.id}</span>
                <span className="font-mono text-[10px] text-[var(--foreground-subtle)]">{analysis.id}</span>
                {analysis.bundle && <BundleBadge bundle={analysis.bundle} />}
                {analysis.auditIssues.map((issue, index) => (
                  <span key={`${analysis.id}-${index}`} className="rounded bg-[var(--background-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--error)]">
                    {issue}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Already clean scenarios */}
      {alreadyClean.length > 0 && (
        <div className="command-panel mb-3 px-4 py-3">
          <div className="section-kicker mb-2">No changes needed</div>
          <div className="space-y-1">
            {alreadyClean.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-[12px]">
                <span className="text-[var(--success)]">✓</span>
                <Link href={`/scenarios/${a.id}`} className="font-medium text-foreground hover:text-[var(--accent-primary)] transition-colors truncate">
                  {a.title || a.id}
                </Link>
                {a.bundle && <BundleBadge bundle={a.bundle} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky apply bar */}
      {approvedRepairs.length > 0 && (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-[var(--border-strong)] bg-[var(--background-elevated)]/95 px-4 py-3 backdrop-blur">
          <div className="text-xs text-[var(--foreground-muted)]">
            {approvedRepairs.length} scenario{approvedRepairs.length !== 1 ? 's' : ''} ready · {totalPatches} patch{totalPatches !== 1 ? 'es' : ''} queued
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={phase === 'applying'}
            className="btn btn-command disabled:opacity-50"
          >
            {phase === 'applying'
              ? 'Applying…'
              : 'Apply approved repairs'}
          </button>
          <Link href="/scenarios" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      )}
    </>
  );
}

export default function ScenariosRepairPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <ScreenHeader
        section="Library"
        title="Scenario Repair"
        subtitle="Review and apply deterministic text fixes to selected scenarios."
        actions={
          <Link href="/scenarios" className="btn btn-ghost">
            ← Back
          </Link>
        }
      />
      <Suspense fallback={
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius)] bg-[var(--background-muted)]" />
          ))}
        </div>
      }>
        <RepairPageInner />
      </Suspense>
    </div>
  );
}
