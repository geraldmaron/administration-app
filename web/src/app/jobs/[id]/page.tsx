'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BundleBadge from '@/components/BundleBadge';
import AuditScore from '@/components/AuditScore';
import { ALL_BUNDLES } from '@/lib/constants';
import type { JobDetail, JobResult, JobError } from '@/lib/types';

type SortField = 'title' | 'bundle' | 'auditScore' | 'autoFixed';
type SortDir = 'asc' | 'desc';

const STATUS_STYLES: Record<string, { dot: string; text: string; ring: string }> = {
  pending:   { dot: 'bg-[var(--info)]',             text: 'text-[var(--info)]',             ring: 'border-[var(--info)]/30' },
  running:   { dot: 'bg-[var(--accent-primary)]',   text: 'text-[var(--accent-primary)]',   ring: 'border-[var(--accent-primary)]/30' },
  completed: { dot: 'bg-[var(--success)]',           text: 'text-[var(--success)]',           ring: 'border-[var(--success)]/30' },
  failed:    { dot: 'bg-[var(--error)]',             text: 'text-[var(--error)]',             ring: 'border-[var(--error)]/30' },
  cancelled: { dot: 'bg-[var(--foreground-muted)]', text: 'text-foreground-muted',           ring: 'border-[var(--border-strong)]' },
};

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function duration(startIso: string | undefined, endIso: string | undefined): string {
  if (!startIso || !endIso) return '—';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function categorizeErrors(errors: JobError[]) {
  const dedupSkips = errors.filter((e) =>
    /duplicate_id|similar_content|similar/i.test(e.error)
  );
  const cooldownSkips = errors.filter(
    (e) => !!e.bundle && /cooldown/i.test(e.error)
  );
  const auditAttempts = errors.filter(
    (e) => /^attempt \d+\/\d+ failed:/i.test(e.error)
  );
  const generationErrors = errors.filter(
    (e) =>
      !/duplicate_id|similar_content|similar/i.test(e.error) &&
      !(!!e.bundle && /cooldown/i.test(e.error)) &&
      !/^attempt \d+\/\d+ failed:/i.test(e.error)
  );
  return { generationErrors, auditAttempts, dedupSkips, cooldownSkips };
}

interface LogEntry {
  icon: string;
  color: string;
  text: string;
  time: string | undefined;
}

function buildLog(job: JobDetail): LogEntry[] {
  const entries: LogEntry[] = [];

  entries.push({
    icon: '○',
    color: 'text-foreground-muted',
    text: `Job submitted — ${job.bundles.length} bundle${job.bundles.length !== 1 ? 's' : ''} × ${job.count} scenarios (${job.total ?? job.count * job.bundles.length} expected)`,
    time: job.requestedAt,
  });

  if (job.description) {
    entries.push({
      icon: '·',
      color: 'text-foreground-subtle',
      text: `Description: ${job.description}`,
      time: undefined,
    });
  }

  if (job.startedAt) {
    entries.push({
      icon: '▶',
      color: 'text-[var(--accent-primary)]',
      text: `Processing started — priority: ${job.priority}, mode: ${job.distributionConfig?.mode ?? job.mode}`,
      time: job.startedAt,
    });
  }

  if (job.regions && job.regions.length > 0) {
    entries.push({
      icon: '·',
      color: 'text-foreground-subtle',
      text: `Targeting regions: ${job.regions.join(', ')}`,
      time: undefined,
    });
  }

  if (job.region) {
    entries.push({
      icon: '·',
      color: 'text-foreground-subtle',
      text: `Targeting country: ${job.region}`,
      time: undefined,
    });
  }

  if (job.status === 'running' || job.status === 'pending') {
    const done = job.completedCount ?? 0;
    const total = job.total ?? job.count * job.bundles.length;
    entries.push({
      icon: '◐',
      color: 'text-[var(--accent-primary)]',
      text: `In progress — ${done} of ${total} scenarios processed (${job.failedCount ?? 0} failed)`,
      time: undefined,
    });
  }

  if (job.results && job.results.length > 0) {
    const byBundle: Record<string, { saved: number; scores: number[] }> = {};
    for (const r of job.results) {
      if (!byBundle[r.bundle]) byBundle[r.bundle] = { saved: 0, scores: [] };
      byBundle[r.bundle].saved++;
      if (r.auditScore !== undefined) byBundle[r.bundle].scores.push(r.auditScore);
    }
    for (const [bundle, stats] of Object.entries(byBundle)) {
      const avgScore = stats.scores.length > 0
        ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
        : null;
      entries.push({
        icon: '✓',
        color: 'text-[var(--success)]',
        text: `${bundle}: ${stats.saved} scenario${stats.saved !== 1 ? 's' : ''} saved${avgScore !== null ? ` — avg audit score ${avgScore}` : ''}`,
        time: undefined,
      });
    }
  }

  if (job.rateLimitRetries !== undefined && job.rateLimitRetries > 0) {
    entries.push({
      icon: '↻',
      color: 'text-[var(--warning)]',
      text: `Rate limit encountered — ${job.rateLimitRetries} adaptive retries across the job`,
      time: undefined,
    });
  }

  if (job.errors && job.errors.length > 0) {
    const { generationErrors, dedupSkips, cooldownSkips } = categorizeErrors(job.errors);
    if (generationErrors.length > 0) {
      entries.push({
        icon: '⚠',
        color: 'text-[var(--error)]',
        text: `Generation errors (${generationErrors.length})`,
        time: undefined,
      });
      for (const e of generationErrors) {
        entries.push({
          icon: '✗',
          color: 'text-[var(--error)]',
          text: `${e.bundle ? `[${e.bundle}] ` : ''}${e.error}`,
          time: undefined,
        });
      }
    }
    if (dedupSkips.length > 0) {
      entries.push({
        icon: '·',
        color: 'text-foreground-subtle',
        text: `Dedup skips (${dedupSkips.length}) — semantic or ID match, expected`,
        time: undefined,
      });
    }
    if (cooldownSkips.length > 0) {
      entries.push({
        icon: '·',
        color: 'text-[var(--info)]',
        text: `Cooldown skips (${cooldownSkips.length}) — bundle generated too recently`,
        time: undefined,
      });
    }
  }

  if (job.error) {
    entries.push({
      icon: '✗',
      color: 'text-[var(--error)]',
      text: `Fatal: ${job.error}`,
      time: undefined,
    });
  }

  if (job.completedAt) {
    const saved = job.completedCount ?? job.results?.length ?? 0;
    const failed = job.failedCount ?? job.errors?.length ?? 0;
    const dur = duration(job.startedAt, job.completedAt);
    let completionText: string;
    if (job.status === 'failed') {
      completionText = `Job failed — ${dur !== '—' ? `after ${dur}` : ''}`;
    } else if (failed === 0) {
      completionText = `Job completed — ${saved} saved${dur !== '—' ? ` — ${dur}` : ''}`;
    } else {
      const failureRate = failed / (saved + failed);
      if (failureRate <= 0.5) {
        completionText = `Job completed with partial failures — ${saved} saved, ${failed} failed${dur !== '—' ? ` — ${dur}` : ''}`;
      } else {
        completionText = `Job completed with major partial failures — ${saved} saved, ${failed} failed${dur !== '—' ? ` — ${dur}` : ''}`;
      }
    }
    entries.push({
      icon: job.status === 'failed' ? '✗' : '●',
      color: job.status === 'failed' ? 'text-[var(--error)]' : 'text-[var(--success)]',
      text: completionText,
      time: job.completedAt,
    });
  }

  if (job.status === 'cancelled') {
    entries.push({
      icon: '■',
      color: 'text-foreground-muted',
      text: 'Job cancelled',
      time: undefined,
    });
  }

  return entries;
}

function SortHeader({ field, label, current, dir, onSort }: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
        active ? 'text-foreground' : 'text-foreground-subtle hover:text-foreground-muted'
      }`}
    >
      {label}
      <span className="opacity-60">{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [sortField, setSortField] = useState<SortField>('bundle');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    if (!job?.startedAt || (job.status !== 'running' && job.status !== 'pending')) {
      setElapsedMs(null);
      return;
    }
    function tick() {
      setElapsedMs(Date.now() - new Date(job!.startedAt!).getTime());
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [job?.startedAt, job?.status]);

  const perBundleCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of job?.bundles ?? []) map[b] = 0;
    for (const r of job?.results ?? []) {
      map[r.bundle] = (map[r.bundle] ?? 0) + 1;
    }
    return map;
  }, [job?.results, job?.bundles]);

  const fetchJob = useCallback(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json() as Promise<JobDetail>;
      })
      .then((data) => {
        if (!data) return;
        setJob(data);
        const active = data.status === 'running' || data.status === 'pending';
        if (!active && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      })
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    fetchJob();
    intervalRef.current = setInterval(fetchJob, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchJob]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  async function handleCancel() {
    if (!job || !confirm('Cancel this job?')) return;
    setCancelling(true);
    try {
      await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      setJob((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    } finally {
      setCancelling(false);
    }
  }

  async function handleStop() {
    if (!job || !confirm('Stop this job? It will be marked cancelled and the generation process will wind down.')) return;
    setStopping(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) {
        setJob((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
      }
    } finally {
      setStopping(false);
    }
  }

  if (notFound) {
    return (
      <div className="p-6">
        <Link href="/jobs" className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle hover:text-foreground transition-colors mb-6 block">
          ← Back to Jobs
        </Link>
        <div className="tech-border bg-background-elevated p-8 text-center text-foreground-muted text-sm">
          Job not found.
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <div className="h-4 bg-background-muted rounded w-32 mb-6 animate-pulse" />
        <div className="tech-border bg-background-elevated p-6 animate-pulse space-y-3">
          <div className="h-4 bg-background-muted rounded w-1/4" />
          <div className="h-3 bg-background-muted rounded w-1/2" />
          <div className="h-3 bg-background-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending;
  const logEntries = buildLog(job);
  const total = job.total ?? job.count * job.bundles.length;
  const progress = job.progress ?? (
    job.status === 'completed' ? 100 : job.status === 'failed' ? 100 : 0
  );

  const sortedResults: JobResult[] = [...(job.results ?? [])].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortField === 'bundle') cmp = a.bundle.localeCompare(b.bundle);
    else if (sortField === 'auditScore') cmp = (a.auditScore ?? -1) - (b.auditScore ?? -1);
    else if (sortField === 'autoFixed') cmp = (a.autoFixed ? 1 : 0) - (b.autoFixed ? 1 : 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const remediatedCount = (job.results ?? []).filter((r) => r.autoFixed).length;

  return (
    <div className="p-6 max-w-[1100px]">
      {/* Nav */}
      <Link
        href="/jobs"
        className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle hover:text-foreground transition-colors mb-6 block"
      >
        ← Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">
            Job Detail
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground font-mono">
              {job.id.slice(0, 12)}…
            </h1>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-[2px] ${statusStyle.ring}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${job.status === 'running' ? 'animate-pulse' : ''}`} />
              <span className={`text-[10px] font-mono uppercase tracking-wider ${statusStyle.text}`}>
                {job.status}
              </span>
            </div>
          </div>
          {job.description && (
            <p className="text-sm text-foreground-muted mt-1">{job.description}</p>
          )}
        </div>
        {job.status === 'pending' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="text-xs font-mono text-foreground-muted hover:text-[var(--error)] border border-[var(--border-strong)] px-3 py-1.5 rounded-[2px] transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelling…' : 'Cancel Job'}
          </button>
        )}
        {job.status === 'running' && (
          <button
            onClick={handleStop}
            disabled={stopping}
            className="text-xs font-mono text-foreground-muted hover:text-[#f59e0b] border border-[var(--border-strong)] px-3 py-1.5 rounded-[2px] transition-colors disabled:opacity-50"
          >
            {stopping ? 'Stopping…' : 'Stop Job'}
          </button>
        )}
      </div>

      {/* Progress bar (running/pending) */}
      {(job.status === 'running' || job.status === 'pending') && (
        <div className="mb-6 tech-border bg-background-elevated p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-foreground-subtle">
              <span className="text-foreground font-medium">{job.completedCount ?? 0}</span>
              <span> / {total} scenarios</span>
              {(job.failedCount ?? 0) > 0 && (
                <span className="text-[var(--error)] ml-2">· {job.failedCount} failed</span>
              )}
              {(job.rateLimitRetries ?? 0) > 0 && (
                <span className="text-[#f59e0b] ml-2">· {job.rateLimitRetries} rate retries</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-foreground-subtle">
              {elapsedMs !== null && job.startedAt && (
                <span>{formatElapsed(elapsedMs)}</span>
              )}
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          <div className="h-1.5 bg-background-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-tertiary)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {job.bundles.length > 1 && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(job.bundles.length, 4)}, minmax(0, 1fr))` }}>
              {job.bundles.map((bundleId) => {
                const saved = perBundleCount[bundleId] ?? 0;
                const bundleLabel = ALL_BUNDLES.find((b) => b.id === bundleId)?.label ?? bundleId;
                const complete = saved >= job.count;
                return (
                  <div key={bundleId} className="border border-[var(--border)] bg-background p-2">
                    <div className="text-[9px] font-mono uppercase tracking-wide text-foreground-subtle truncate mb-0.5">
                      {bundleLabel}
                    </div>
                    <div className={`text-xs font-mono ${complete ? 'text-[var(--success)]' : 'text-foreground-muted'}`}>
                      {saved}<span className="text-foreground-subtle">/{job.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(job.errors ?? []).length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">Recent Activity</div>
              <div className="space-y-0.5 max-h-[96px] overflow-y-auto">
                {[...(job.errors ?? [])].slice(-8).map((e, i) => {
                  const isDedup = /duplicate_id|similar_content|similar/i.test(e.error);
                  const isCooldown = /cooldown/i.test(e.error);
                  const isAuditAttempt = /^attempt \d+\/\d+ failed:/i.test(e.error);
                  const color = isDedup || isCooldown
                    ? 'text-foreground-subtle'
                    : isAuditAttempt
                    ? 'text-[#f59e0b]'
                    : 'text-[var(--error)]';
                  return (
                    <div key={i} className={`text-[10px] font-mono ${color} flex gap-1.5`}>
                      {e.bundle && <span className="text-foreground-subtle shrink-0">[{e.bundle}]</span>}
                      <span className="truncate">{e.error}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Meta + Log */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          {/* Meta */}
          <div className="tech-border bg-background-elevated divide-y divide-[var(--border-strong)]">
            <div className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
              Details
            </div>
            {[
              { label: 'Priority', value: job.priority },
              { label: 'Mode', value: job.mode },
              { label: 'Distribution', value: job.distributionConfig?.mode ?? '—' },
              { label: 'Requested by', value: job.requestedBy ?? '—' },
              { label: 'Submitted', value: formatTimestamp(job.requestedAt) },
              { label: 'Started', value: formatTimestamp(job.startedAt) },
              { label: 'Completed', value: formatTimestamp(job.completedAt) },
              { label: 'Duration', value: duration(job.startedAt, job.completedAt) },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">{label}</span>
                <span className="text-xs font-mono text-foreground-muted text-right">{value}</span>
              </div>
            ))}
            <div className="px-4 py-2 flex items-start gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle shrink-0">Bundles</span>
              <div className="flex flex-wrap gap-1 justify-end ml-auto">
                {job.bundles.map((b) => (
                  <BundleBadge key={b} bundle={b} />
                ))}
              </div>
            </div>
            <div className="px-4 py-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Saved</span>
              <span className="text-xs font-mono text-[var(--success)]">{job.completedCount ?? job.results?.length ?? '—'}</span>
            </div>
            {(job.failedCount ?? 0) > 0 && (
              <div className="px-4 py-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Failed</span>
                <span className="text-xs font-mono text-[var(--error)]">{job.failedCount}</span>
              </div>
            )}
          </div>

          {/* Activity log */}
          <div className="tech-border bg-background-elevated">
            <div className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-foreground-subtle border-b border-[var(--border-strong)]">
              Activity Log
            </div>
            <div className="px-4 py-3 space-y-3">
              {logEntries.map((entry, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`text-xs font-mono w-3 shrink-0 mt-0.5 ${entry.color}`}>{entry.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-mono leading-snug ${entry.color}`}>{entry.text}</p>
                    {entry.time && (
                      <p className="text-[10px] font-mono text-foreground-subtle mt-0.5">
                        {formatTimestamp(entry.time)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Results + Errors */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Audit quality summary */}
          {job.auditSummary && (
            <div className="tech-border bg-background-elevated divide-y divide-[var(--border-strong)]">
              <div className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
                Audit Quality
              </div>
              <div className="px-4 py-3 grid grid-cols-6 gap-2 text-center">
                {(
                  [
                    { label: 'Avg', value: job.auditSummary.avgScore },
                    { label: 'Min', value: job.auditSummary.minScore },
                    { label: 'Max', value: job.auditSummary.maxScore },
                    { label: 'Below 70', value: job.auditSummary.below70Count },
                    { label: 'Above 90', value: job.auditSummary.above90Count },
                    { label: 'Remediated', value: remediatedCount },
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
          {sortedResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
                  Results — {sortedResults.length} saved
                </div>
              </div>
              <div className="tech-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-strong)] bg-background-elevated">
                      <th className="text-left px-4 py-2.5">
                        <SortHeader field="title" label="Title" current={sortField} dir={sortDir} onSort={handleSort} />
                      </th>
                      <th className="text-left px-4 py-2.5">
                        <SortHeader field="bundle" label="Bundle" current={sortField} dir={sortDir} onSort={handleSort} />
                      </th>
                      <th className="text-left px-4 py-2.5">
                        <SortHeader field="auditScore" label="Audit" current={sortField} dir={sortDir} onSort={handleSort} />
                      </th>
                      <th className="text-left px-4 py-2.5">
                        <SortHeader field="autoFixed" label="Fixed" current={sortField} dir={sortDir} onSort={handleSort} />
                      </th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
                        ID
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`border-b border-[var(--border)] hover:bg-background-muted transition-colors ${
                          i % 2 === 0 ? 'bg-background' : 'bg-background-elevated/50'
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/scenarios/${r.id}`}
                            className="text-foreground hover:text-[var(--accent-primary)] transition-colors font-medium"
                          >
                            {r.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <BundleBadge bundle={r.bundle} />
                        </td>
                        <td className="px-4 py-2.5">
                          {r.auditScore !== undefined ? (
                            <AuditScore score={r.auditScore} />
                          ) : (
                            <span className="text-foreground-subtle">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {r.autoFixed ? (
                            <span className="text-[var(--success)]">✓</span>
                          ) : (
                            <span className="text-foreground-subtle">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-foreground-subtle">
                          {r.id.slice(0, 8)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors — categorized */}
          {job.errors && job.errors.length > 0 && (
            <div>
              {(() => {
                const { generationErrors, auditAttempts, dedupSkips, cooldownSkips } = categorizeErrors(job.errors!);
                return (
                  <div className="space-y-4">
                    {generationErrors.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--error)] mb-2">
                          Generation Errors — {generationErrors.length}
                        </div>
                        <div className="tech-border bg-background-elevated divide-y divide-[var(--border)]">
                          {generationErrors.map((e, i) => (
                            <div key={i} className="px-4 py-3 flex items-start gap-3">
                              <span className="text-[var(--error)] font-mono text-xs mt-0.5 shrink-0">✗</span>
                              <div>
                                {e.bundle && (
                                  <div className="text-[10px] font-mono text-foreground-subtle mb-0.5">[{e.bundle}]</div>
                                )}
                                <div className="text-xs font-mono text-[var(--error)]">{e.error}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {auditAttempts.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-[#f59e0b] mb-2">
                          Audit Failures — {auditAttempts.length}{' '}
                          <span className="normal-case font-normal text-foreground-subtle">
                            (scenarios rejected by quality audit)
                          </span>
                        </div>
                        <div className="tech-border bg-background-elevated divide-y divide-[var(--border)]">
                          {auditAttempts.map((e, i) => (
                            <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                              <span className="text-[#f59e0b] font-mono text-xs mt-0.5 shrink-0">↻</span>
                              <div className="min-w-0">
                                {e.bundle && (
                                  <span className="text-[10px] font-mono text-foreground-subtle mr-1.5">[{e.bundle}]</span>
                                )}
                                <span className="text-xs font-mono text-foreground-muted break-words">{e.error}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {dedupSkips.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted mb-2">
                          Dedup Skips — {dedupSkips.length}{' '}
                          <span className="normal-case font-normal text-foreground-subtle">
                            (semantic or ID match — expected)
                          </span>
                        </div>
                        <div className="tech-border bg-background-elevated divide-y divide-[var(--border)]">
                          {dedupSkips.map((e, i) => (
                            <div key={i} className="px-4 py-2 flex items-start gap-3">
                              <span className="text-foreground-subtle font-mono text-xs mt-0.5 shrink-0">·</span>
                              <div className="text-xs font-mono text-foreground-subtle">
                                {e.bundle && <span className="mr-1">[{e.bundle}]</span>}
                                {e.error}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {cooldownSkips.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--info)] mb-2">
                          Cooldown Skips — {cooldownSkips.length}{' '}
                          <span className="normal-case font-normal text-foreground-subtle">
                            (bundle generated too recently)
                          </span>
                        </div>
                        <div className="tech-border bg-background-elevated divide-y divide-[var(--border)]">
                          {cooldownSkips.map((e, i) => (
                            <div key={i} className="px-4 py-2 flex items-start gap-3">
                              <span className="text-[var(--info)] font-mono text-xs mt-0.5 shrink-0">·</span>
                              <div className="text-xs font-mono text-[var(--info)]">
                                {e.bundle && <span className="text-foreground-subtle mr-1">[{e.bundle}]</span>}
                                {e.error}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {job.error && (
            <div className="tech-border bg-background-elevated p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--error)] mb-2">Fatal Error</div>
              <div className="text-xs font-mono text-[var(--error)]">{job.error}</div>
            </div>
          )}

          {sortedResults.length === 0 && !job.errors?.length && !job.error && (
            <div className="tech-border bg-background-elevated p-6 text-center text-foreground-subtle text-sm">
              {job.status === 'pending' || job.status === 'running'
                ? 'Results will appear as scenarios are generated…'
                : 'No results recorded for this job.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
