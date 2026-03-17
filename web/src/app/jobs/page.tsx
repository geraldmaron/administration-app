'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import BundleBadge from '@/components/BundleBadge';
import AuditScore from '@/components/AuditScore';
import PageHeader from '@/components/PageHeader';
import { ALL_BUNDLES, formatRelativeTime } from '@/lib/constants';
import type { JobDetail, JobError } from '@/lib/types';

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  pending: { dot: 'bg-[var(--info)]', text: 'text-[var(--info)]', bg: 'bg-[var(--info)]/10' },
  running: {
    dot: 'bg-[var(--accent-primary)]',
    text: 'text-[var(--accent-primary)]',
    bg: 'bg-[var(--accent-primary)]/10',
  },
  completed: {
    dot: 'bg-[var(--success)]',
    text: 'text-[var(--success)]',
    bg: 'bg-[var(--success)]/10',
  },
  failed: { dot: 'bg-[var(--error)]', text: 'text-[var(--error)]', bg: 'bg-[var(--error)]/10' },
  cancelled: {
    dot: 'bg-[var(--foreground-muted)]',
    text: 'text-foreground-muted',
    bg: 'bg-[var(--background-muted)]',
  },
  partial_failure: { dot: 'bg-[#f97316]', text: 'text-[#f97316]', bg: 'bg-[#f97316]/10' },
  partial: { dot: 'bg-[#f59e0b]', text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
  remediated: {
    dot: 'bg-[var(--success)]',
    text: 'text-[var(--success)]',
    bg: 'bg-[var(--success)]/5',
  },
};

const STATUS_LABELS: Record<string, string> = {
  running: 'RUNNING',
  pending: 'PENDING',
  partial_failure: 'PARTIAL FAILURE',
  partial: 'PARTIAL',
  remediated: 'REMEDIATED',
  completed: 'COMPLETED',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
};

const FILTER_LABELS: Record<string, string> = {
  all: 'ALL',
  running: 'RUNNING',
  pending: 'PENDING',
  completed: 'COMPLETED',
  partial: 'PARTIAL',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
};

function categorizeErrors(errors: JobError[]) {
  const dedupSkips = errors.filter((e) =>
    /duplicate_id|similar_content|similar/i.test(e.error)
  );
  const cooldownSkips = errors.filter(
    (e) => !!e.bundle && /cooldown/i.test(e.error)
  );
  const generationErrors = errors.filter(
    (e) =>
      !/duplicate_id|similar_content|similar/i.test(e.error) &&
      !(!!e.bundle && /cooldown/i.test(e.error))
  );
  return { generationErrors, dedupSkips, cooldownSkips };
}

function formatDuration(startedAt?: string, completedAt?: string): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return null;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function humanizeError(error: string): string {
  if (/similar_content/i.test(error)) return 'Rejected — too similar to existing scenario (semantic duplicate)';
  if (/duplicate_id/i.test(error)) return 'Rejected — duplicate scenario ID';
  if (/cooldown/i.test(error)) return 'Skipped — bundle generated too recently (cooldown active)';
  if (/rate.?limit/i.test(error)) return 'Temporarily rate-limited by LLM API';
  if (/json.*parse|parse.*error/i.test(error)) return 'Parse error — LLM returned invalid JSON';
  if (/audit.*fail/i.test(error)) return 'Audit failed — score below threshold';
  return error;
}

function deriveDisplayStatus(job: JobDetail): string {
  if (job.status === 'running') return 'running';
  if (job.status === 'pending') return 'pending';
  if (job.status === 'failed') return 'failed';
  if (job.status === 'cancelled') return 'cancelled';

  const completed = job.completedCount ?? 0;
  const failed = job.failedCount ?? 0;

  if (failed === 0) return 'completed';

  const errors = job.errors ?? [];
  const { generationErrors } = categorizeErrors(errors);
  if (generationErrors.length === 0 && completed > 0) return 'remediated';

  const failureRate = failed / (completed + failed);
  if (completed > 0 && failureRate <= 0.5) return 'partial';
  return 'partial_failure';
}

function CategorizedErrors({ errors }: { errors: JobError[] }) {
  const { generationErrors, dedupSkips, cooldownSkips } = categorizeErrors(errors);
  return (
    <div className="mb-4 space-y-3">
      {generationErrors.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--error)] mb-1">
            Generation Errors ({generationErrors.length})
          </div>
          <div className="space-y-1">
            {generationErrors.map((e, i) => (
              <div key={i} className="text-[10px] font-mono text-[var(--error)]">
                {e.bundle && <span className="text-foreground-subtle mr-1">[{e.bundle}]</span>}
                {humanizeError(e.error)}
              </div>
            ))}
          </div>
        </div>
      )}
      {dedupSkips.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted mb-1">
            Dedup Skips ({dedupSkips.length}){' '}
            <span className="normal-case text-foreground-subtle font-normal">
              (semantic or ID match — expected)
            </span>
          </div>
          <div className="space-y-1">
            {dedupSkips.map((e, i) => (
              <div key={i} className="text-[10px] font-mono text-foreground-subtle">
                {e.bundle && <span className="mr-1">[{e.bundle}]</span>}
                {humanizeError(e.error)}
              </div>
            ))}
          </div>
        </div>
      )}
      {cooldownSkips.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--info)] mb-1">
            Cooldown Skips ({cooldownSkips.length}){' '}
            <span className="normal-case text-foreground-subtle font-normal">
              (bundle generated too recently)
            </span>
          </div>
          <div className="space-y-1">
            {cooldownSkips.map((e, i) => (
              <div key={i} className="text-[10px] font-mono text-[var(--info)]">
                {e.bundle && <span className="text-foreground-subtle mr-1">[{e.bundle}]</span>}
                {humanizeError(e.error)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobDetailModal({ job: initialJob, onClose }: { job: JobDetail; onClose: () => void }) {
  const [job, setJob] = useState(initialJob);
  const [copiedId, setCopiedId] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    if (!job.startedAt || (job.status !== 'running' && job.status !== 'pending')) {
      setElapsedMs(null);
      return;
    }
    function tick() {
      setElapsedMs(Date.now() - new Date(job.startedAt!).getTime());
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [job.startedAt, job.status]);

  const perBundleCount: Record<string, number> = {};
  for (const b of job.bundles) perBundleCount[b] = 0;
  for (const r of job.results ?? []) {
    perBundleCount[r.bundle] = (perBundleCount[r.bundle] ?? 0) + 1;
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const active = job.status === 'running' || job.status === 'pending';
    if (!active) return;

    function poll() {
      fetch(`/api/jobs/${job.id}`)
        .then((r) => r.json())
        .then((data: JobDetail) => {
          setJob(data);
          const stillActive = data.status === 'running' || data.status === 'pending';
          if (!stillActive && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        })
        .catch(() => undefined);
    }

    intervalRef.current = setInterval(poll, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [job.id, job.status]);

  async function handleCancel() {
    if (!confirm('Cancel this job?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      if (res.ok) {
        setJob((prev) => ({ ...prev, status: 'cancelled' }));
      }
    } finally {
      setCancelling(false);
    }
  }

  async function handleStop() {
    if (!confirm('Stop this job? It will be marked cancelled and the generation process will wind down.')) return;
    setStopping(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) {
        setJob((prev) => ({ ...prev, status: 'cancelled' }));
      }
    } finally {
      setStopping(false);
    }
  }

  const displayStatus = deriveDisplayStatus(job);
  const statusStyle = STATUS_STYLES[displayStatus] ?? STATUS_STYLES.completed;
  const statusLabel = STATUS_LABELS[displayStatus] ?? displayStatus.toUpperCase();
  const total = job.total ?? job.count * job.bundles.length;
  const autoFixedCount = (job.results ?? []).filter((r) => r.autoFixed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-10 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-3xl bg-[var(--background-elevated)] border border-[var(--border-strong)] rounded-[2px]">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--background-elevated)] border-b border-[var(--border)] px-6 py-4 flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusStyle.dot}`} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${statusStyle.text}`}>{statusLabel}</span>
          <span className="text-xs font-mono text-foreground-subtle">{job.id}</span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-foreground-muted hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Running progress — only shown when active */}
          {(job.status === 'running' || job.status === 'pending') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-foreground-subtle">
                <span>
                  <span className="text-foreground font-medium">{job.completedCount ?? 0}</span>
                  {' / '}{total} scenarios
                  {(job.failedCount ?? 0) > 0 && (
                    <span className="text-[var(--error)] ml-2">· {job.failedCount} failed</span>
                  )}
                  {(job.rateLimitRetries ?? 0) > 0 && (
                    <span className="text-[#f59e0b] ml-2">· {job.rateLimitRetries} rate retries</span>
                  )}
                </span>
                <span className="flex gap-3">
                  {elapsedMs !== null && job.startedAt && (
                    <span>{Math.floor(elapsedMs / 60000)}m {Math.floor((elapsedMs % 60000) / 1000)}s</span>
                  )}
                  <span>{Math.round(((job.completedCount ?? 0) / total) * 100)}%</span>
                </span>
              </div>
              <div className="h-1 bg-background-muted overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-primary)] transition-all duration-500"
                  style={{ width: `${Math.round(((job.completedCount ?? 0) / total) * 100)}%` }}
                />
              </div>
              {job.bundles.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {job.bundles.map((bundleId) => {
                    const saved = perBundleCount[bundleId] ?? 0;
                    const label = ALL_BUNDLES.find((b) => b.id === bundleId)?.label ?? bundleId;
                    const complete = saved >= job.count;
                    return (
                      <div key={bundleId} className="border border-[var(--border)] px-2 py-1 text-[10px] font-mono">
                        <span className="text-foreground-subtle">{label} </span>
                        <span className={complete ? 'text-[var(--success)]' : 'text-foreground-muted'}>
                          {saved}/{job.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 1 — Overview */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">Overview</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(
                [
                  { label: 'Status', value: statusLabel },
                  { label: 'Priority', value: <span className="capitalize">{job.priority}</span> },
                  { label: 'Mode', value: job.mode },
                  {
                    label: 'Distribution',
                    value: `${job.distributionConfig?.mode ?? '—'}${job.distributionConfig?.loopLength ? ` · loop ${job.distributionConfig.loopLength}` : ''}`,
                  },
                  { label: 'Requested By', value: job.requestedBy ?? '—' },
                  { label: 'Rate Retries', value: String(job.rateLimitRetries ?? 0) },
                ] as { label: string; value: React.ReactNode }[]
              ).map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-0.5">{label}</div>
                  <div className="text-sm font-mono text-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 — Timeline */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">Timeline</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-0.5">Requested</div>
                <div className="text-sm font-mono text-foreground">{formatRelativeTime(job.requestedAt)}</div>
                <div className="text-[10px] text-foreground-subtle">{new Date(job.requestedAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-0.5">Started</div>
                {job.startedAt ? (
                  <>
                    <div className="text-sm font-mono text-foreground">{formatRelativeTime(job.startedAt)}</div>
                    <div className="text-[10px] text-foreground-subtle">{new Date(job.startedAt).toLocaleString()}</div>
                  </>
                ) : (
                  <div className="text-sm font-mono text-foreground">—</div>
                )}
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-0.5">Completed</div>
                {job.completedAt ? (
                  <>
                    <div className="text-sm font-mono text-foreground">{formatRelativeTime(job.completedAt)}</div>
                    <div className="text-[10px] text-foreground-subtle">{new Date(job.completedAt).toLocaleString()}</div>
                  </>
                ) : (
                  <div className="text-sm font-mono text-foreground">—</div>
                )}
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-0.5">Duration</div>
                <div className="text-sm font-mono text-foreground">{formatDuration(job.startedAt, job.completedAt) ?? '—'}</div>
              </div>
            </div>
          </div>

          {/* Section 3 — Scope */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">Scope</div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle shrink-0">Bundles</span>
                {job.bundles.map((b) => (
                  <BundleBadge key={b} bundle={b} />
                ))}
              </div>
              <div className="text-xs font-mono text-foreground-muted">
                {job.count} scenarios/bundle · {total} total requested
              </div>
              {job.regions && job.regions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle shrink-0">Region Tags</span>
                  <span className="text-xs font-mono text-foreground-muted">{job.regions.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4 — Results Summary */}
          {(job.completedCount !== undefined || job.failedCount !== undefined) && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">Results</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-0.5">Saved</div>
                  <div className={`text-sm font-mono ${(job.completedCount ?? 0) === total ? 'text-[var(--success)]' : 'text-foreground'}`}>
                    {job.completedCount ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-0.5">Failed / Skipped</div>
                  <div className={`text-sm font-mono ${(job.failedCount ?? 0) > 0 ? 'text-[#f97316]' : 'text-foreground'}`}>
                    {job.failedCount ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-0.5">Total Requested</div>
                  <div className="text-sm font-mono text-foreground">{total}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-0.5">Auto-Fixed</div>
                  <div className="text-sm font-mono text-foreground">{autoFixedCount}</div>
                </div>
              </div>
              {job.auditSummary && (
                <div className="tech-border bg-background-muted/40 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-2">
                    Audit Quality
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {(
                      [
                        { label: 'Avg', value: job.auditSummary.avgScore },
                        { label: 'Min', value: job.auditSummary.minScore },
                        { label: 'Max', value: job.auditSummary.maxScore },
                        { label: 'Below 70', value: job.auditSummary.below70Count },
                        { label: 'Above 90', value: job.auditSummary.above90Count },
                      ] as const
                    ).map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-[10px] font-mono text-foreground-subtle">{label}</div>
                        <div className="text-sm font-mono text-foreground">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 5 — Scenarios Generated */}
          {job.results && job.results.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">
                Scenarios Generated ({job.results.length})
              </div>
              {job.description && (
                <p className="text-xs font-mono text-foreground-muted mb-3">{job.description}</p>
              )}
              <div className="tech-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-background">
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">ID</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Title</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Bundle</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Score</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Fixed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.results.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border)] hover:bg-background-muted">
                        <td className="px-3 py-1.5 font-mono text-foreground-subtle">{r.id}</td>
                        <td className="px-3 py-1.5 text-foreground truncate max-w-xs">{r.title}</td>
                        <td className="px-3 py-1.5"><BundleBadge bundle={r.bundle} /></td>
                        <td className="px-3 py-1.5">
                          {r.auditScore !== undefined ? (
                            <AuditScore score={r.auditScore} />
                          ) : (
                            <span className="text-foreground-subtle">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.autoFixed ? (
                            <span className="text-[var(--success)] text-[10px] font-mono">✓ repaired</span>
                          ) : (
                            <span className="text-foreground-subtle">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 6 — Errors & Skips */}
          {((job.errors && job.errors.length > 0) || job.error) && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">Errors &amp; Skips</div>
              {job.error && (
                <div className="text-xs font-mono text-[var(--error)] mb-3">{job.error}</div>
              )}
              <CategorizedErrors errors={job.errors ?? []} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(job.id);
              setCopiedId(true);
              setTimeout(() => setCopiedId(false), 1500);
            }}
            className="text-xs font-mono text-foreground-subtle hover:text-foreground border border-[var(--border)] px-3 py-1 rounded-[2px] transition-colors"
          >
            {copiedId ? 'copied!' : 'Copy ID'}
          </button>
          {job.status === 'pending' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs font-mono text-foreground-muted hover:text-[var(--error)] border border-[var(--border-strong)] px-3 py-1 rounded-[2px] transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling…' : 'Cancel Job'}
            </button>
          )}
          {job.status === 'running' && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="text-xs font-mono text-foreground-muted hover:text-[#f59e0b] border border-[var(--border-strong)] px-3 py-1 rounded-[2px] transition-colors disabled:opacity-50"
            >
              {stopping ? 'Stopping…' : 'Stop Job'}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-xs font-mono text-foreground-muted hover:text-foreground border border-[var(--border)] px-3 py-1 rounded-[2px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job: initialJob, onDelete }: { job: JobDetail; onDelete?: () => void }) {
  const [job, setJob] = useState(initialJob);
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const active = job.status === 'running' || job.status === 'pending';
    if (!active) return;

    function poll() {
      fetch(`/api/jobs/${job.id}`)
        .then((r) => r.json())
        .then((data: JobDetail) => {
          setJob(data);
          const stillActive = data.status === 'running' || data.status === 'pending';
          if (!stillActive && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        })
        .catch(() => undefined);
    }

    const ms = job.status === 'running' ? 2000 : 3000;
    intervalRef.current = setInterval(poll, ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [job.id, job.status]);

  async function handleCancel() {
    if (!confirm('Cancel this job?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDelete) {
          onDelete();
        } else {
          setJob((prev) => ({ ...prev, status: 'cancelled' }));
        }
      }
    } finally {
      setCancelling(false);
    }
  }

  const displayStatus = deriveDisplayStatus(job);
  const statusStyle = STATUS_STYLES[displayStatus] ?? STATUS_STYLES.completed;
  const statusLabel = STATUS_LABELS[displayStatus] ?? displayStatus.toUpperCase();
  const total = job.total ?? job.count * job.bundles.length;
  const isDone = job.status !== 'running' && job.status !== 'pending';
  const autoFixedCount = (job.results ?? []).filter((r) => r.autoFixed).length;

  return (
    <div id={job.id} className="tech-border bg-background-elevated">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 text-left hover:bg-background-muted transition-colors"
      >
        {/* Row 1: identity + timing */}
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusStyle.dot}`} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${statusStyle.text} w-28 shrink-0`}>
            {statusLabel}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(job.id);
              setCopiedId(true);
              setTimeout(() => setCopiedId(false), 1500);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                navigator.clipboard.writeText(job.id);
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 1500);
              }
            }}
            className="text-[10px] font-mono text-foreground-subtle hover:text-foreground-muted transition-colors cursor-pointer shrink-0"
          >
            {copiedId ? 'copied!' : `${job.id.slice(0, 12)}…`}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setShowModal(true); } }}
            className="text-[10px] font-mono text-foreground-subtle hover:text-foreground border border-[var(--border)] px-2 py-0.5 rounded-[2px] transition-colors shrink-0 cursor-pointer"
          >
            Details
          </span>
          {job.description && (
            <span className="flex-1 min-w-0 text-xs text-foreground-muted font-mono truncate">
              {job.description}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-foreground-subtle">
              {formatRelativeTime(job.requestedAt)}
            </span>
            {formatDuration(job.startedAt, job.completedAt) && (
              <span className="text-[10px] font-mono text-foreground-subtle">
                · {formatDuration(job.startedAt, job.completedAt)}
              </span>
            )}
            <span className="text-[10px] font-mono text-foreground-subtle">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        {/* Row 2: summary stats */}
        <div className="pl-5 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          {job.bundles.slice(0, 4).map((b) => (
            <BundleBadge key={b} bundle={b} />
          ))}
          {job.bundles.length > 4 && (
            <span className="text-[10px] font-mono text-foreground-subtle">
              +{job.bundles.length - 4}
            </span>
          )}
          <span className="text-[10px] font-mono text-foreground-subtle">·</span>
          <span className="text-xs font-mono text-foreground-subtle">{job.count}/bundle</span>
          {isDone && job.completedCount !== undefined && (
            <>
              <span className="text-[10px] font-mono text-foreground-subtle">·</span>
              <span className={`text-[10px] font-mono ${job.completedCount === total ? 'text-[var(--success)]' : 'text-foreground-muted'}`}>
                {job.completedCount} of {total} saved
              </span>
            </>
          )}
          {isDone && job.auditSummary && (
            <>
              <span className="text-[10px] font-mono text-foreground-subtle">·</span>
              <span className="text-[10px] font-mono text-foreground-muted">
                avg score: {job.auditSummary.avgScore}
              </span>
            </>
          )}
          {(job.failedCount ?? 0) > 0 && (
            <>
              <span className="text-[10px] font-mono text-foreground-subtle">·</span>
              <span className="text-[10px] font-mono text-[#f97316]">
                {job.failedCount} failed
              </span>
            </>
          )}
          {autoFixedCount > 0 && (
            <>
              <span className="text-[10px] font-mono text-foreground-subtle">·</span>
              <span className="text-[10px] font-mono text-[var(--success)]">
                {autoFixedCount} auto-fixed
              </span>
            </>
          )}
        </div>

        {(job.status === 'running' || job.status === 'pending') && (
          <div className="mt-2">
            <div className="h-0.5 bg-background-muted overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${job.progress ?? 0}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-foreground-subtle mt-0.5">
              {job.completedCount ?? 0} / {total}
              {(job.failedCount ?? 0) > 0 && (
                <span className="text-[#f97316] ml-2">· {job.failedCount} failed</span>
              )}
            </div>
          </div>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--border)] p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4 text-xs">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Priority</div>
              <span className="font-mono text-foreground-muted capitalize">{job.priority}</span>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Mode</div>
              <span className="font-mono text-foreground-muted">{job.mode}</span>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Distribution</div>
              <span className="font-mono text-foreground-muted">
                {job.distributionConfig?.mode}{job.distributionConfig?.loopLength ? ` · loop ${job.distributionConfig.loopLength}` : ''}
              </span>
            </div>
            {job.startedAt && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Started</div>
                <span className="font-mono text-foreground-muted">{formatRelativeTime(job.startedAt)}</span>
                <div className="text-[10px] font-mono text-foreground-subtle">{new Date(job.startedAt).toLocaleString()}</div>
              </div>
            )}
            {job.completedAt && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Completed</div>
                <span className="font-mono text-foreground-muted">{formatRelativeTime(job.completedAt)}</span>
                <div className="text-[10px] font-mono text-foreground-subtle">{new Date(job.completedAt).toLocaleString()}</div>
              </div>
            )}
            {formatDuration(job.startedAt, job.completedAt) && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Duration</div>
                <span className="font-mono text-foreground-muted">{formatDuration(job.startedAt, job.completedAt)}</span>
              </div>
            )}
            {job.requestedBy && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Requested By</div>
                <span className="font-mono text-foreground-muted">{job.requestedBy}</span>
              </div>
            )}
            {(job.rateLimitRetries ?? 0) > 0 && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-1">Rate Retries</div>
                <span className="font-mono text-foreground-muted">{job.rateLimitRetries}</span>
              </div>
            )}
          </div>

          {job.description && (
            <div className="mb-4 text-xs text-foreground-muted font-mono">{job.description}</div>
          )}

          {/* Audit summary */}
          {job.auditSummary && (
            <div className="mb-4 tech-border bg-background-muted/40 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-2">
                Audit Quality
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {(
                  [
                    { label: 'Avg', value: job.auditSummary.avgScore },
                    { label: 'Min', value: job.auditSummary.minScore },
                    { label: 'Max', value: job.auditSummary.maxScore },
                    { label: 'Below 70', value: job.auditSummary.below70Count },
                    { label: 'Above 90', value: job.auditSummary.above90Count },
                  ] as const
                ).map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] font-mono text-foreground-subtle">{label}</div>
                    <div className="text-sm font-mono text-foreground">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {job.results && job.results.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle mb-2">
                Results ({job.results.length})
                {autoFixedCount > 0 && (
                  <span className="ml-2 text-[var(--success)] normal-case font-normal">
                    · {autoFixedCount} remediated by LLM repair
                  </span>
                )}
              </div>
              <div className="tech-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-background">
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">ID</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Title</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Bundle</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Score</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Fixed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.results.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border)] hover:bg-background-muted">
                        <td className="px-3 py-1.5 font-mono text-foreground-subtle">{r.id.slice(0, 8)}…</td>
                        <td className="px-3 py-1.5 text-foreground truncate max-w-xs">{r.title}</td>
                        <td className="px-3 py-1.5"><BundleBadge bundle={r.bundle} /></td>
                        <td className="px-3 py-1.5">
                          {r.auditScore !== undefined ? (
                            <AuditScore score={r.auditScore} />
                          ) : (
                            <span className="text-foreground-subtle">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.autoFixed ? (
                            <span className="text-[var(--success)] text-[10px] font-mono">✓ repaired</span>
                          ) : (
                            <span className="text-foreground-subtle">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors — categorized */}
          {job.errors && job.errors.length > 0 && <CategorizedErrors errors={job.errors} />}

          {job.error && (
            <div className="text-xs font-mono text-[var(--error)] mb-4">{job.error}</div>
          )}

          {job.status === 'running' && (
            <button
              onClick={async () => {
                if (!confirm('Stop this job? Generation will wind down gracefully.')) return;
                setCancelling(true);
                try {
                  const res = await fetch(`/api/jobs/${job.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'stop' }),
                  });
                  if (res.ok) {
                    setJob((prev) => ({ ...prev, status: 'cancelled' }));
                  }
                } finally {
                  setCancelling(false);
                }
              }}
              disabled={cancelling}
              className="text-xs font-mono text-foreground-muted hover:text-[#f59e0b] border border-[var(--border-strong)] px-3 py-1 rounded-[2px] transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Stopping…' : 'Stop Job'}
            </button>
          )}
          {job.status === 'pending' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs font-mono text-foreground-muted hover:text-[var(--error)] border border-[var(--border-strong)] px-3 py-1 rounded-[2px] transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling…' : 'Cancel Job'}
            </button>
          )}
          {job.status !== 'running' && onDelete && (
            <button
              onClick={async () => {
                if (!confirm('Delete this job record?')) return;
                const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
                if (res.ok) onDelete?.();
              }}
              className="text-xs font-mono text-foreground-subtle hover:text-[var(--error)] border border-[var(--border-strong)] px-3 py-1 rounded-[2px] transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
      {showModal && (
        <JobDetailModal job={job} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

const STATUS_FILTER_OPTIONS = [
  'all',
  'running',
  'pending',
  'completed',
  'partial',
  'failed',
  'cancelled',
] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [bundleFilter, setBundleFilter] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const globalIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadJobs = useCallback(() => {
    fetch('/api/jobs?limit=50')
      .then((r) => r.json())
      .then((data: { jobs: JobDetail[] }) => {
        setJobs(data.jobs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadJobs();
    globalIntervalRef.current = setInterval(() => {
      const hasActive = jobs.some((j) => j.status === 'running' || j.status === 'pending');
      if (hasActive) loadJobs();
    }, 5000);
    return () => {
      if (globalIntervalRef.current) clearInterval(globalIntervalRef.current);
    };
  }, [loadJobs, jobs]);

  function toggleBundleFilter(id: string) {
    setBundleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredJobs = jobs.filter((job) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = job.id.toLowerCase().includes(q);
      const matchDesc = job.description?.toLowerCase().includes(q) ?? false;
      const matchBundle = job.bundles.some((b) => b.toLowerCase().includes(q));
      if (!matchId && !matchDesc && !matchBundle) return false;
    }

    if (statusFilter !== 'all') {
      const ds = deriveDisplayStatus(job);
      if (statusFilter === 'partial') {
        if (!['partial', 'partial_failure', 'remediated'].includes(ds)) return false;
      } else if (ds !== statusFilter) {
        return false;
      }
    }

    if (bundleFilter.size > 0) {
      if (!job.bundles.some((b) => bundleFilter.has(b))) return false;
    }

    return true;
  });

  function getPillStyle(s: StatusFilter): { text: string; bg: string } {
    if (s === 'all') return { text: 'text-foreground-muted', bg: '' };
    if (s === 'partial') return { text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' };
    const style = STATUS_STYLES[s];
    return style ? { text: style.text, bg: style.bg } : { text: 'text-foreground-muted', bg: '' };
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelectedIds(new Set(filteredJobs.map((j) => j.id)));
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }
  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} job${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        const { skipped } = await res.json();
        setJobs((prev) => prev.filter((j) => !selectedIds.has(j.id) || (skipped ?? []).includes(j.id)));
        setSelectedIds(new Set());
      }
    } finally {
      setDeleting(false);
    }
  }

  async function stopSelected() {
    const runningIds = Array.from(selectedIds).filter(
      (id) => jobs.find((j) => j.id === id)?.status === 'running'
    );
    if (runningIds.length === 0) return;
    if (!confirm(`Stop ${runningIds.length} running job${runningIds.length > 1 ? 's' : ''}?`)) return;
    setStopping(true);
    try {
      await Promise.all(
        runningIds.map((id) =>
          fetch(`/api/jobs/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' }),
          })
        )
      );
      setJobs((prev) =>
        prev.map((j) => (runningIds.includes(j.id) ? { ...j, status: 'cancelled' } : j))
      );
      setSelectedIds(new Set());
    } finally {
      setStopping(false);
    }
  }

  async function deleteAll() {
    const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
    const label = statusParam ? `all ${statusParam} jobs` : 'all jobs (running jobs will be skipped)';
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeletingAll(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteAll: true,
          ...(statusParam ? { status: statusParam } : {}),
        }),
      });
      if (res.ok) {
        const { deleted } = await res.json();
        loadJobs();
        setSelectedIds(new Set());
        console.log(`Deleted ${deleted} jobs`);
      }
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        section="Queue"
        title="Generation Jobs"
        actions={
          <button
            onClick={deleteAll}
            disabled={deletingAll}
            className="btn btn-ghost disabled:opacity-50"
          >
            {deletingAll ? 'Deleting…' : 'Delete All'}
          </button>
        }
      />

      {/* Toolbar */}
      <div className="space-y-3 mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by ID, description, or bundle…"
          className="w-full bg-background border border-[var(--border-strong)] text-foreground text-sm font-mono px-3 py-1.5 rounded-[2px] focus:outline-none focus:border-accent placeholder-[var(--foreground-subtle)]"
        />

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTER_OPTIONS.map((s) => {
            const active = statusFilter === s;
            const pillStyle = getPillStyle(s);
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border rounded-[2px] transition-colors ${
                  active
                    ? `border-current ${pillStyle.text} ${pillStyle.bg}`
                    : 'border-[var(--border)] text-foreground-subtle hover:text-foreground-muted hover:border-[var(--border-strong)]'
                }`}
              >
                {FILTER_LABELS[s] ?? s.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Bundle filter pills */}
        <div className="flex flex-wrap gap-1">
          {ALL_BUNDLES.map((b) => {
            const active = bundleFilter.has(b.id);
            return (
              <button
                key={b.id}
                onClick={() => toggleBundleFilter(b.id)}
                className={`text-[10px] font-mono px-2 py-0.5 border rounded-[2px] transition-colors ${
                  active
                    ? 'border-accent/40 bg-accent/5 text-foreground'
                    : 'border-[var(--border)] text-foreground-subtle hover:text-foreground-muted hover:border-[var(--border-strong)]'
                }`}
              >
                {b.label}
              </button>
            );
          })}
          {bundleFilter.size > 0 && (
            <button
              onClick={() => setBundleFilter(new Set())}
              className="text-[10px] font-mono px-2 py-0.5 text-foreground-subtle hover:text-foreground transition-colors"
            >
              clear
            </button>
          )}
        </div>
        {filteredJobs.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredJobs.length && filteredJobs.length > 0}
              onChange={() => selectedIds.size === filteredJobs.length ? clearSelection() : selectAll()}
              className="accent-[var(--accent-primary)]"
              aria-label="Select all jobs"
            />
            <span className="text-[10px] font-mono text-foreground-subtle">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-background-elevated border border-[var(--border-strong)] rounded-[2px]">
          <span className="text-xs font-mono text-foreground-subtle">{selectedIds.size} selected</span>
          {Array.from(selectedIds).some((id) => jobs.find((j) => j.id === id)?.status === 'running') && (
            <button
              onClick={stopSelected}
              disabled={stopping}
              className="text-xs font-mono text-[#f59e0b] border border-[#f59e0b]/40 px-3 py-1 rounded-[2px] transition-colors disabled:opacity-50"
            >
              {stopping ? 'Stopping…' : `Stop ${Array.from(selectedIds).filter((id) => jobs.find((j) => j.id === id)?.status === 'running').length} Running`}
            </button>
          )}
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="text-xs font-mono text-[var(--error)] hover:text-[var(--error)] border border-[var(--error)]/40 px-3 py-1 rounded-[2px] transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
          </button>
          <button
            onClick={clearSelection}
            className="text-xs font-mono text-foreground-subtle hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="tech-border bg-background-elevated p-4 animate-pulse">
              <div className="h-4 bg-background-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && filteredJobs.length === 0 && (
        <div className="tech-border bg-background-elevated p-8 text-center">
          <div className="text-foreground-subtle text-sm">
            {jobs.length === 0 ? 'No generation jobs yet.' : 'No jobs match your filters.'}
          </div>
        </div>
      )}

      {!loading && filteredJobs.length > 0 && (
        <div className="space-y-2">
          {filteredJobs.map((job) => (
            <div key={job.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selectedIds.has(job.id)}
                onChange={() => toggleSelect(job.id)}
                className="mt-4 accent-[var(--accent-primary)] shrink-0"
                aria-label={`Select job ${job.id}`}
              />
              <div className="flex-1 min-w-0">
                <JobCard job={job} onDelete={() => setJobs((prev) => prev.filter((j) => j.id !== job.id))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

