'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuditScore from '@/components/AuditScore';
import BundleBadge from '@/components/BundleBadge';
import DataStat from '@/components/DataStat';
import StatusBadge from '@/components/StatusBadge';
import { formatDuration, formatRelativeTime } from '@/lib/constants';
import type { JobDetail, JobError } from '@/lib/types';

function summarizeProvider(job: Pick<JobDetail, 'executionTarget' | 'modelConfig'>): string {
  const drafter = job.modelConfig?.drafterModel;
  if (drafter?.startsWith('ollama:')) return drafter.replace('ollama:', '');
  if (job.executionTarget === 'n8n') return 'n8n';
  return 'cloud';
}

function categorizeErrors(errors: JobError[]) {
  return {
    generationErrors: errors.filter(
      (e) => !/duplicate_id|similar_content|similar/i.test(e.error) && !(!!e.bundle && /cooldown/i.test(e.error))
    ),
    dedupSkips: errors.filter((e) => /duplicate_id|similar_content|similar/i.test(e.error)),
    cooldownSkips: errors.filter((e) => !!e.bundle && /cooldown/i.test(e.error)),
  };
}

function deriveDisplayStatus(job: Pick<JobDetail, 'status' | 'completedCount' | 'failedCount' | 'errors'>): string {
  if (job.status === 'running') return 'running';
  if (job.status === 'pending') return 'pending';
  if (job.status === 'failed') return 'failed';
  if (job.status === 'cancelled') return 'cancelled';
  const completed = job.completedCount ?? 0;
  const failed = job.failedCount ?? 0;
  if (failed === 0) return 'completed';
  const { generationErrors } = categorizeErrors(job.errors ?? []);
  if (generationErrors.length === 0 && completed > 0) return 'remediated';
  return completed > 0 ? 'partial' : 'failed';
}

interface JobSlideOverProps {
  jobId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onDeleted: () => void;
}

export default function JobSlideOver({ jobId, onClose, onRefresh, onDeleted }: JobSlideOverProps) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'cancel' | 'stop' | 'delete' | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    setLoading(true);
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((data: JobDetail) => { setJob(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [jobId]);

  async function handleCancel() {
    if (!job || !confirm('Cancel this pending job?')) return;
    setActionLoading('cancel');
    try {
      await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop() {
    if (!job || !confirm('Stop this running job?')) return;
    setActionLoading('stop');
    try {
      await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!job || !confirm('Permanently delete this job record?')) return;
    setActionLoading('delete');
    try {
      await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      onDeleted();
    } finally {
      setActionLoading(null);
    }
  }

  if (!jobId) return null;

  const displayStatus = job ? deriveDisplayStatus(job) : null;
  const total = job ? (job.total ?? job.count * job.bundles.length) : 0;
  const completed = job?.completedCount ?? 0;
  const failed = job?.failedCount ?? 0;
  const isTerminal = job?.status === 'completed' || job?.status === 'pending_review';
  const progress = isTerminal ? 100 : (total > 0 ? Math.min(100, Math.round(((completed + failed) / total) * 100)) : 0);
  const autoFixed = (job?.results ?? []).filter((r) => r.autoFixed).length;
  const { generationErrors, dedupSkips, cooldownSkips } = categorizeErrors(job?.errors ?? []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-[520px] flex-col border-l border-[var(--border)] bg-[var(--background-elevated)] shadow-[var(--shadow-lg)]">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <span className="section-kicker">Run Details</span>
          <button onClick={onClose} className="btn btn-ghost px-2 py-1 text-base leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading || !job ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-[var(--radius-tight)] bg-[var(--background-muted)]" />
              ))}
            </div>
          ) : (
            <>
              {/* Job ID + status */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-sm font-semibold text-foreground">{job.id}</div>
                  <div className="mt-1 text-[12px] text-[var(--foreground-muted)]">{job.description || 'No mission note'}</div>
                </div>
                {displayStatus && (
                  <StatusBadge status={displayStatus} pulse={job.status === 'running' || job.status === 'pending'} />
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                <DataStat size="compact" label="Saved" value={completed} accent="success" />
                <DataStat size="compact" label="Failed" value={failed} accent={failed > 0 ? 'warning' : undefined} />
                <DataStat size="compact" label="Duration" value={formatDuration(job.startedAt, job.completedAt)} />
                <DataStat size="compact" label="Auto Fixed" value={autoFixed} accent={autoFixed > 0 ? 'gold' : undefined} />
              </div>

              {/* Progress */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[var(--foreground-subtle)]">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="app-progress">
                  <span style={{ width: `${progress}%`, background: 'linear-gradient(90deg,var(--accent-primary),var(--accent-secondary))' }} />
                </div>
              </div>

              {/* Bundles */}
              <div className="flex flex-wrap gap-1.5">
                {job.bundles.map((bundle) => (
                  <BundleBadge key={bundle} bundle={bundle} />
                ))}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-[12px] text-[var(--foreground-muted)]">
                <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2">
                  <div className="section-kicker mb-1">Requested</div>
                  <div>{new Date(job.requestedAt).toLocaleString()}</div>
                </div>
                <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2">
                  <div className="section-kicker mb-1">Mode</div>
                  <div>
                    {job.distributionConfig?.mode ?? job.mode}
                    {job.distributionConfig?.loopLength ? ` · loop ${job.distributionConfig.loopLength}` : ''}
                    {job.priority ? ` · ${job.priority}` : ''}
                  </div>
                </div>
                <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2">
                  <div className="section-kicker mb-1">Execution</div>
                  <div>{job.executionTarget ?? 'cloud_function'}</div>
                </div>
                <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2">
                  <div className="section-kicker mb-1">Provider</div>
                  <div>{summarizeProvider(job)}</div>
                </div>
                <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2">
                  <div className="section-kicker mb-1">Heartbeat</div>
                  <div>{job.lastHeartbeatAt ? formatRelativeTime(job.lastHeartbeatAt) : 'no heartbeat'}</div>
                </div>
              </div>

              {/* Current activity */}
              {(job.currentBundle || job.currentPhase || job.currentMessage) && (
                <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--foreground-muted)]">
                  <div className="section-kicker mb-1">Current Activity</div>
                  <div>{[job.currentBundle, job.currentPhase, job.currentMessage].filter(Boolean).join(' · ')}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                {job.status === 'pending' && (
                  <button onClick={handleCancel} className="btn btn-destructive" disabled={actionLoading !== null}>
                    {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
                {job.status === 'running' && (
                  <button onClick={handleStop} className="btn btn-destructive" disabled={actionLoading !== null}>
                    {actionLoading === 'stop' ? 'Stopping…' : 'Stop'}
                  </button>
                )}
                <Link href={`/jobs/${job.id}`} className="btn btn-tactical">
                  Open Full Details
                </Link>
                {job.status !== 'running' && job.status !== 'pending' && (
                  <button onClick={handleDelete} className="btn btn-destructive ml-auto" disabled={actionLoading !== null}>
                    {actionLoading === 'delete' ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>

              {/* Audit snapshot */}
              {job.auditSummary && (
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  <div className="section-kicker">Audit Snapshot</div>
                  <div className="grid grid-cols-5 gap-2">
                    <DataStat size="compact" label="Avg" value={job.auditSummary.avgScore} accent="blue" />
                    <DataStat size="compact" label="Min" value={job.auditSummary.minScore} />
                    <DataStat size="compact" label="Max" value={job.auditSummary.maxScore} accent="success" />
                    <DataStat size="compact" label="<70" value={job.auditSummary.below70Count} accent={job.auditSummary.below70Count > 0 ? 'warning' : undefined} />
                    <DataStat size="compact" label=">90" value={job.auditSummary.above90Count} accent="gold" />
                  </div>
                </div>
              )}

              {/* Errors summary */}
              {(generationErrors.length > 0 || dedupSkips.length > 0 || cooldownSkips.length > 0) && (
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  <div className="section-kicker">Exceptions</div>
                  <div className="text-[12px] text-[var(--foreground-muted)] space-y-1">
                    {generationErrors.length > 0 && (
                      <div className="text-[var(--error)]">{generationErrors.length} generation error{generationErrors.length !== 1 ? 's' : ''}</div>
                    )}
                    {dedupSkips.length > 0 && <div>{dedupSkips.length} dedup skip{dedupSkips.length !== 1 ? 's' : ''}</div>}
                    {cooldownSkips.length > 0 && <div>{cooldownSkips.length} cooldown skip{cooldownSkips.length !== 1 ? 's' : ''}</div>}
                    <Link href={`/jobs/${job.id}`} className="text-[var(--accent-primary)] hover:underline">
                      View full breakdown →
                    </Link>
                  </div>
                </div>
              )}

              {/* Results preview */}
              {job.results && job.results.length > 0 && (
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="section-kicker">Output</div>
                    <Link href={`/jobs/${job.id}`} className="text-xs font-medium text-[var(--accent-primary)] hover:underline">
                      View all {job.results.length} →
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {job.results.slice(0, 5).map((result) => (
                      <Link
                        key={result.id}
                        href={`/scenarios/${result.id}`}
                        className="flex items-center justify-between gap-2 rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2 hover:border-[var(--accent-primary)]/40 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium text-foreground truncate">{result.title}</div>
                          <div className="text-[10px] font-mono text-[var(--foreground-subtle)] truncate">{result.id}</div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <BundleBadge bundle={result.bundle} />
                          {result.auditScore !== undefined ? <AuditScore score={result.auditScore} /> : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
