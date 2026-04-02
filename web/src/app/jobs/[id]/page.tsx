'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CommandPanel from '@/components/CommandPanel';
import DataStat from '@/components/DataStat';
import BundleBadge from '@/components/BundleBadge';
import AuditScore from '@/components/AuditScore';
import StatusBadge from '@/components/StatusBadge';
import { ALL_BUNDLES } from '@/lib/constants';
import type { JobDetail, JobResult, JobError, JobEvent } from '@/lib/types';

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

type JobHealth = 'healthy' | 'warning' | 'critical' | 'idle';

const HEARTBEAT_WARNING_MS = 2 * 60 * 1000;
const HEARTBEAT_CRITICAL_MS = 5 * 60 * 1000;

function computeJobHealth(job: JobDetail): { health: JobHealth; staleMs: number } {
  if (job.status !== 'running' && job.status !== 'pending') {
    return { health: 'idle', staleMs: 0 };
  }
  const referenceIso = job.lastHeartbeatAt ?? job.startedAt ?? job.requestedAt;
  if (!referenceIso) return { health: 'idle', staleMs: 0 };
  const staleMs = Date.now() - new Date(referenceIso).getTime();
  if (staleMs >= HEARTBEAT_CRITICAL_MS) return { health: 'critical', staleMs };
  if (staleMs >= HEARTBEAT_WARNING_MS) return { health: 'warning', staleMs };
  return { health: 'healthy', staleMs };
}

function formatRelativeTime(isoOrUndef: string | undefined): string {
  if (!isoOrUndef) return '';
  const ms = Date.now() - new Date(isoOrUndef).getTime();
  if (ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
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
  preview?: string;
}

function mapEventToLogEntry(event: JobEvent): LogEntry {
  const color = event.level === 'error'
    ? 'text-[var(--error)]'
    : event.level === 'warning'
      ? 'text-[#f59e0b]'
      : event.level === 'success'
        ? 'text-[var(--success)]'
        : event.code?.startsWith('llm_')
          ? 'text-[var(--accent-primary)]'
          : 'text-foreground-muted';

  const icon = event.level === 'error' ? '✗'
    : event.level === 'warning'        ? '⚠'
    : event.level === 'success'        ? '✓'
    : event.code === 'llm_request'     ? '→'
    : event.code === 'llm_response'    ? '←'
    : event.code?.startsWith('phase_') ? '▸'
    : event.code === 'concept_expand'  ? '◆'
    : '•';

  // Build enriched text from data fields
  const d = event.data as Record<string, unknown> | undefined;
  let detail = '';

  if (event.code === 'llm_request' && d) {
    const model = String(d.model ?? '');
    const chars = d.promptLength ? `${d.promptLength} chars` : '';
    const attempt = d.attempt && Number(d.attempt) > 1 ? ` attempt ${d.attempt}` : '';
    detail = [model, chars, attempt].filter(Boolean).join(' · ');
  } else if (event.code === 'llm_response' && d) {
    const model = String(d.model ?? '');
    const ms = d.elapsed ? `${d.elapsed}ms` : '';
    const tok = (d.inputTokens || d.outputTokens) ? `${d.inputTokens}↑ ${d.outputTokens}↓ tokens` : '';
    detail = [model, ms, tok].filter(Boolean).join(' · ');
  } else if (event.code === 'audit_fail' && d) {
    const issues = Array.isArray(d.issues) ? (d.issues as any[]).slice(0, 3).map(i => i.rule).join(', ') : '';
    detail = issues ? `Issues: ${issues}` : '';
  } else if ((event.code === 'repair_improved' || event.code === 'repair_no_improvement') && d) {
    detail = d.before !== undefined ? `${d.before} → ${d.after}` : '';
  } else if (event.code === 'quality_gate' && d) {
    detail = d.overall !== undefined ? `overall=${Number(d.overall).toFixed(2)} pass=${d.pass}` : '';
  } else if (event.code === 'narrative_review' && d) {
    detail = d.overall !== undefined ? `overall=${Number(d.overall).toFixed(2)} pass=${d.pass}` : '';
  }

  const baseText = event.message ?? '';
  const text = detail ? `${baseText}  —  ${detail}` : baseText;

  // Preview line (prompt or response snippet)
  let preview: string | undefined;
  if (event.code === 'llm_request' && d?.promptPreview) {
    preview = String(d.promptPreview);
  } else if (event.code === 'llm_response' && d?.responsePreview) {
    preview = String(d.responsePreview);
  } else if (event.code === 'audit_fail' && d?.issues && Array.isArray(d.issues)) {
    preview = (d.issues as any[]).map((i: any) => `[${i.severity}] ${i.message}`).join(' | ');
  }

  return { icon, color, text, time: event.timestamp, preview };
}

function buildLog(job: JobDetail): LogEntry[] {
  if (job.events && job.events.length > 0) {
    return job.events.map(mapEventToLogEntry);
  }

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

  if (job.liveActivity && job.liveActivity.totalAttempts > 0) {
    entries.push({
      icon: '↻',
      color: 'text-[var(--info)]',
      text: `Live pipeline activity — ${job.liveActivity.totalAttempts} generation attempts${job.liveActivity.lastMetricAt ? ` (last ${formatTimestamp(job.liveActivity.lastMetricAt)})` : ''}`,
      time: undefined,
    });

    for (const [bundle, activity] of Object.entries(job.liveActivity.byBundle)) {
      const parts = [
        `attempts ${activity.attempts}`,
        `concept ${activity.concept}`,
        `blueprint ${activity.blueprint}`,
        `details ${activity.details}`,
      ];
      if (activity.successes > 0) {
        parts.push(`success ${activity.successes}`);
      }
      if (activity.avgAuditScore !== undefined) {
        parts.push(`avg score ${activity.avgAuditScore}`);
      }

      entries.push({
        icon: '·',
        color: 'text-foreground-subtle',
        text: `${bundle}: ${parts.join(' | ')}`,
        time: undefined,
      });
    }
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
  const [resultSearch, setResultSearch] = useState('');
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
    if (Object.values(map).every(v => v === 0) && job?.savedScenarioIds?.length) {
      const bundleSet = new Set(job.bundles ?? []);
      for (const sid of job.savedScenarioIds) {
        const match = sid.match(/^gen_([a-z_]+)_/);
        if (match && bundleSet.has(match[1])) {
          map[match[1]] = (map[match[1]] ?? 0) + 1;
        }
      }
    }
    return map;
  }, [job?.results, job?.bundles, job?.savedScenarioIds]);

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
    intervalRef.current = setInterval(fetchJob, 1500);
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
      <div className="mx-auto max-w-[1300px]">
        <Link href="/jobs" className="mb-6 block text-[10px] font-mono uppercase tracking-wider text-foreground-subtle transition-colors hover:text-foreground">
          ← Back to Jobs
        </Link>
        <CommandPanel className="p-8 text-center text-sm text-foreground-muted">
          Job not found.
        </CommandPanel>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-[1300px]">
        <div className="h-4 bg-background-muted rounded w-32 mb-6 animate-pulse" />
        <CommandPanel className="space-y-3 p-6 animate-pulse">
          <div className="h-4 bg-background-muted rounded w-1/4" />
          <div className="h-3 bg-background-muted rounded w-1/2" />
          <div className="h-3 bg-background-muted rounded w-2/3" />
        </CommandPanel>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending;
  const logEntries = buildLog(job);
  const total = job.total ?? job.totalCount ?? job.count * job.bundles.length;
  const progress = job.progress ?? (
    job.status === 'completed' ? 100 : job.status === 'failed' ? 100 : 0
  );

  const sortedResults: JobResult[] = [...(job.results ?? [])]
    .filter((r) => {
      if (!resultSearch.trim()) return true;
      const q = resultSearch.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.bundle.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'bundle') cmp = a.bundle.localeCompare(b.bundle);
      else if (sortField === 'auditScore') cmp = (a.auditScore ?? -1) - (b.auditScore ?? -1);
      else if (sortField === 'autoFixed') cmp = (a.autoFixed ? 1 : 0) - (b.autoFixed ? 1 : 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  const remediatedCount = (job.results ?? []).filter((r) => r.autoFixed).length;
  const savedCount = job.completedCount ?? job.results?.length ?? 0;
  const failedCount = job.failedCount ?? 0;
  const generatedDraftCount = Math.max(
    savedCount,
    job.liveActivity?.totalGeneratedDrafts ?? 0,
  );
  const liveProgress = total > 0 ? Math.min(100, Math.round(((savedCount + failedCount) / total) * 100)) : progress;
  const generationProgress = total > 0 ? Math.min(100, Math.round(((generatedDraftCount + failedCount) / total) * 100)) : progress;
  const { health: jobHealth, staleMs } = computeJobHealth(job);
  const isActive = job.status === 'running' || job.status === 'pending';

  return (
    <div className="mx-auto max-w-[1300px]">
      {/* Nav */}
      <Link
        href="/jobs"
        className="mb-6 block text-[10px] font-mono uppercase tracking-wider text-foreground-subtle transition-colors hover:text-foreground"
      >
        ← Back to Jobs
      </Link>

      {/* Header */}
      <CommandPanel className="mb-6 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="section-kicker mb-2">Run Details</div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-foreground data-value">
                {job.id.slice(0, 12)}…
              </h1>
              <StatusBadge status={job.status} pulse={job.status === 'running' || job.status === 'pending'} />
            </div>
            {job.description && (
              <p className="mt-2 text-sm text-foreground-muted">{job.description}</p>
            )}
            {job.mode === 'blitz' && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {job.scopeTier && (
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-1 font-mono uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                    {job.scopeTier}
                  </span>
                )}
                {job.scopeKey && job.scopeKey !== job.scopeTier && job.scopeKey !== 'universal' && (
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground-muted)]">
                    {job.scopeKey.replace(/^(region|country|cluster):/, '')}
                  </span>
                )}
                {job.applicable_countries && job.applicable_countries.length > 0 && (
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[var(--foreground-muted)]">
                    {job.applicable_countries.length} countr{job.applicable_countries.length === 1 ? 'y' : 'ies'}: {job.applicable_countries.slice(0, 3).join(', ')}{job.applicable_countries.length > 3 ? `…` : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {job.status === 'pending' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn btn-destructive disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Cancel Job'}
              </button>
            )}
            {job.status === 'running' && (
              <button
                onClick={handleStop}
                disabled={stopping}
                className="btn btn-destructive disabled:opacity-50"
              >
                {stopping ? 'Stopping…' : 'Stop Job'}
              </button>
            )}
          </div>
        </div>
      </CommandPanel>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <DataStat label="Generated" value={generatedDraftCount} accent="blue" />
        <DataStat label="Saved" value={savedCount} accent="success" />
        <DataStat label="Failed" value={failedCount} accent={failedCount > 0 ? 'warning' : undefined} />
        <DataStat label="Expected" value={total} accent="blue" />
        <DataStat label="Remediated" value={remediatedCount} accent={remediatedCount > 0 ? 'gold' : undefined} />
        {(() => {
          const scored = (job.results ?? []).filter(r => r.auditScore !== undefined);
          if (scored.length === 0) return <DataStat label="Avg Score" value="—" />;
          const avg = Math.round(scored.reduce((s, r) => s + (r.auditScore ?? 0), 0) / scored.length);
          return <DataStat label="Avg Score" value={avg} accent={avg >= 90 ? 'success' : avg >= 75 ? undefined : 'warning'} />;
        })()}
      </div>

      {job.tokenSummary && job.tokenSummary.callCount > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <DataStat label="Input Tokens" value={job.tokenSummary.inputTokens.toLocaleString()} />
          <DataStat label="Output Tokens" value={job.tokenSummary.outputTokens.toLocaleString()} />
          <DataStat label="LLM Calls" value={job.tokenSummary.callCount} />
          <DataStat label="Est. Cost" value={`$${job.tokenSummary.costUsd.toFixed(4)}`} />
        </div>
      )}

      {/* Progress bar (running/pending) */}
      {(job.status === 'running' || job.status === 'pending') && (
        <CommandPanel className="mb-6 p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-foreground-subtle">
              <span className="text-foreground font-medium">{generatedDraftCount}</span>
              <span> generated / {total} expected</span>
              <span className="ml-2 text-[var(--success)]">· {savedCount} saved</span>
              {failedCount > 0 && (
                <span className="text-[var(--error)] ml-2">· {failedCount} failed</span>
              )}
              {(job.rateLimitRetries ?? 0) > 0 && (
                <span className="text-[#f59e0b] ml-2">· {job.rateLimitRetries} rate retries</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-foreground-subtle">
              {elapsedMs !== null && job.startedAt && (
                <span>{formatElapsed(elapsedMs)}</span>
              )}
              {(() => {
                const done = generatedDraftCount + failedCount;
                if (elapsedMs && done > 0 && done < total) {
                  const ratePerMs = done / elapsedMs;
                  const remainingMs = Math.round((total - done) / ratePerMs);
                  return <span className="text-[var(--foreground-muted)]">~{formatElapsed(remainingMs)} remaining</span>;
                }
                return null;
              })()}
              <span>{Math.round(generationProgress)}%</span>
            </div>
          </div>

          <div className="app-progress">
            <span style={{ width: `${generationProgress}%` }} />
          </div>

          {jobHealth === 'critical' && (
            <div className="rounded-[var(--radius-tight)] border border-[var(--error)]/40 bg-[var(--error)]/8 px-4 py-3 text-xs font-mono text-[var(--error)]">
              No heartbeat for {formatElapsed(staleMs)} — job appears stuck. Zombie recovery will auto-resolve within ~15 minutes, or stop the job manually.
            </div>
          )}
          {jobHealth === 'warning' && (
            <div className="rounded-[var(--radius-tight)] border border-[#f59e0b]/40 bg-[#f59e0b]/8 px-4 py-3 text-xs font-mono text-[#f59e0b]">
              No heartbeat for {formatElapsed(staleMs)} — job may be stalling.
            </div>
          )}

          <div className="flex items-center gap-3 text-[10px] font-mono text-foreground-subtle">
            <span>Last heartbeat: {job.lastHeartbeatAt ? `${formatRelativeTime(job.lastHeartbeatAt)}` : 'none'}</span>
            <span className="text-foreground-subtle">·</span>
            {job.currentBundle ? (
              <span>Processing <span className="text-foreground-muted">{job.currentBundle}</span>{job.currentPhase ? ` (${job.currentPhase})` : ''}</span>
            ) : (
              <span>Waiting for first bundle to begin processing...</span>
            )}
          </div>

          {job.bundles.length > 0 && (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(job.bundles.length, 4)}, minmax(0, 1fr))` }}>
              {job.bundles.map((bundleId) => {
                const saved = perBundleCount[bundleId] ?? 0;
                const liveBundle = job.liveActivity?.byBundle?.[bundleId];
                const generated = Math.max(saved, liveBundle?.generatedDrafts ?? 0);
                const bundleLabel = ALL_BUNDLES.find((b) => b.id === bundleId)?.label ?? bundleId;
                const complete = saved >= job.count;
                const isActive = job.currentBundle === bundleId;
                const bundleProgress = job.count > 0 ? Math.round((generated / job.count) * 100) : 0;
                return (
                  <div key={bundleId} className={`control-surface p-3 transition-colors ${isActive ? 'ring-1 ring-[var(--accent-primary)]' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />}
                      <div className={`text-[9px] font-mono uppercase tracking-wide truncate ${isActive ? 'text-[var(--accent-primary)]' : 'text-foreground-subtle'}`}>
                        {bundleLabel}
                      </div>
                    </div>
                    <div className={`text-xs font-mono ${complete ? 'text-[var(--success)]' : isActive ? 'text-foreground' : 'text-foreground-muted'}`}>
                      {generated}<span className="text-foreground-subtle">/{job.count}</span>
                      {complete && <span className="ml-1 text-[var(--success)]">✓</span>}
                    </div>
                    <div className="mt-1 text-[9px] font-mono text-foreground-subtle">
                      {saved} saved{generated > saved ? ` · ${generated - saved} drafted` : ''}
                    </div>
                    {job.count > 1 && (
                      <div className="mt-1.5 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-[var(--success)]' : isActive ? 'bg-[var(--accent-primary)]' : 'bg-[var(--foreground-subtle)]'}`} style={{ width: `${bundleProgress}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(job.events ?? []).length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">Recent Activity</div>
              <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                {(job.events ?? []).slice(-10).map((e, i) => {
                  const color = e.level === 'error' ? 'text-[var(--error)]'
                    : e.level === 'warning' ? 'text-[#f59e0b]'
                    : e.level === 'success' ? 'text-[var(--success)]'
                    : e.code?.startsWith('llm_') ? 'text-[var(--accent-primary)]'
                    : 'text-foreground-subtle';
                  const icon = e.code === 'llm_request' ? '→' : e.code === 'llm_response' ? '←' : e.level === 'success' ? '✓' : e.level === 'error' ? '✗' : e.level === 'warning' ? '⚠' : '·';
                  const d = e.data as Record<string, unknown> | undefined;
                  const extra = e.code === 'llm_response' && d ? ` ${d.elapsed}ms ${d.inputTokens}↑${d.outputTokens}↓` : e.code === 'audit_pass' && d ? ` score=${d.score}` : '';
                  return (
                    <div key={i} className={`text-[10px] font-mono ${color} flex gap-1.5`}>
                      <span className="shrink-0 w-3">{icon}</span>
                      {e.scenarioId ? (
                        <Link href={`/scenarios/${e.scenarioId}`} className="truncate hover:underline">{e.message}{extra}</Link>
                      ) : (
                        <span className="truncate">{e.message}{extra}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CommandPanel>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Meta + Log */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          {/* Meta */}
          <CommandPanel className="divide-y divide-[var(--border-strong)] overflow-hidden p-0">
            <div className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
              Details
            </div>
            {[
              { label: 'Priority', value: job.priority },
              { label: 'Mode', value: job.mode },
              { label: 'Distribution', value: job.distributionConfig?.mode ?? '—' },
              { label: 'Requested by', value: job.requestedBy ?? '—' },
              { label: 'Execution', value: job.executionTarget ?? '—' },
              ...(job.modelConfig?.drafterModel ? [{ label: 'Drafter model', value: job.modelConfig.drafterModel.replace('ollama:', '') }] : []),
              ...(job.modelConfig?.repairModel && job.modelConfig.repairModel !== job.modelConfig.drafterModel ? [{ label: 'Repair model', value: job.modelConfig.repairModel.replace('ollama:', '') }] : []),
              { label: 'Current bundle', value: job.currentBundle ?? '—' },
              { label: 'Current phase', value: job.currentPhase ?? '—' },
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
            <div className="px-4 py-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">Heartbeat</span>
              <span className={`text-xs font-mono text-right ${
                !isActive ? 'text-foreground-muted'
                  : jobHealth === 'critical' ? 'text-[var(--error)]'
                  : jobHealth === 'warning' ? 'text-[#f59e0b]'
                  : 'text-[var(--success)]'
              }`}>
                {formatTimestamp(job.lastHeartbeatAt)}
                {isActive && job.lastHeartbeatAt && ` (${formatRelativeTime(job.lastHeartbeatAt)})`}
                {isActive && !job.lastHeartbeatAt && ' (none)'}
              </span>
            </div>
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
          </CommandPanel>

          {/* Activity log */}
          <CommandPanel className="overflow-hidden p-0">
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-[var(--border-strong)]">
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">Activity Log</span>
              <span className="text-[10px] font-mono text-foreground-subtle">{logEntries.length} events</span>
            </div>
            <div className="px-0 py-0 max-h-[600px] overflow-y-auto divide-y divide-[var(--border)]/40">
              {logEntries.map((entry, i) => (
                <div key={i} className="px-3 py-1.5 flex items-start gap-2">
                  <span className={`text-[11px] font-mono w-3 shrink-0 mt-[1px] ${entry.color}`}>{entry.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-mono leading-snug break-words ${entry.color}`}>{entry.text}</p>
                    {entry.preview && (
                      <p className="text-[10px] font-mono text-foreground-subtle mt-0.5 break-words opacity-70 leading-snug line-clamp-2">
                        {entry.preview}
                      </p>
                    )}
                    {entry.time && (
                      <p className="text-[9px] font-mono text-foreground-subtle mt-0.5 opacity-50">
                        {formatTimestamp(entry.time)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CommandPanel>

          {/* Generation attempts — shows when available (Ollama / failed jobs) */}
          {job.attemptSummary && job.attemptSummary.length > 0 && (
            <CommandPanel className="overflow-hidden p-0">
              <div className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-foreground-subtle border-b border-[var(--border-strong)]">
                Generation Attempts ({job.attemptSummary.length})
              </div>
              <div className="divide-y divide-[var(--border-strong)]">
                {job.attemptSummary.map((attempt, i) => (
                  <div key={i} className="px-4 py-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono ${attempt.success ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                          {attempt.success ? '✓' : '✗'}
                        </span>
                        <span className="text-xs font-mono text-foreground">{attempt.bundle}</span>
                        <span className="text-[10px] font-mono text-foreground-subtle">{attempt.phase}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {attempt.retryCount > 0 && (
                          <span className="text-[10px] font-mono text-[var(--warning)]">{attempt.retryCount} retries</span>
                        )}
                        {typeof attempt.auditScore === 'number' && (
                          <span className={`text-[10px] font-mono ${attempt.auditScore >= 70 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                            score {attempt.auditScore}
                          </span>
                        )}
                        {attempt.tokenUsage && (
                          <span className="text-[10px] font-mono text-foreground-subtle">
                            {attempt.tokenUsage.input}↑ {attempt.tokenUsage.output}↓
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-foreground-subtle truncate">
                      {attempt.modelUsed}
                    </div>
                    {attempt.failureReasons && attempt.failureReasons.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {attempt.failureReasons.map((reason, ri) => (
                          <div key={ri} className="text-[10px] font-mono text-[var(--error)] leading-snug">
                            · {reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CommandPanel>
          )}
        </div>

        {/* Right: Results + Errors */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Audit quality summary */}
          {job.auditSummary && (
            <CommandPanel className="divide-y divide-[var(--border-strong)] overflow-hidden p-0">
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
            </CommandPanel>
          )}

          {/* Results */}
          {sortedResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
                  Results — {sortedResults.length} saved
                </div>
                <input
                  type="text"
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  placeholder="Filter results…"
                  className="input-shell max-w-[200px] text-xs"
                  style={{ width: 'auto' }}
                />
              </div>
              <div className="tech-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-strong)] bg-[rgba(255,255,255,0.04)]">
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
                          i % 2 === 0 ? 'bg-background' : 'bg-[rgba(255,255,255,0.02)]'
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
          {job.failureAnalysis && (
            <CommandPanel className="p-0 overflow-hidden">
              <div className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[var(--warning)] border-b border-[var(--border)]">
                Failure Analysis
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="text-sm text-foreground leading-6">{job.failureAnalysis.summary}</div>
                <div className="space-y-2">
                  {job.failureAnalysis.evidence.map((entry, index) => (
                    <div key={index} className="rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs font-mono text-foreground-muted break-words">
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            </CommandPanel>
          )}

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
                        <CommandPanel className="divide-y divide-[var(--border)] overflow-hidden p-0">
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
                        </CommandPanel>
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
                        <CommandPanel className="divide-y divide-[var(--border)] overflow-hidden p-0">
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
                        </CommandPanel>
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
                        <CommandPanel className="divide-y divide-[var(--border)] overflow-hidden p-0">
                          {dedupSkips.map((e, i) => (
                            <div key={i} className="px-4 py-2 flex items-start gap-3">
                              <span className="text-foreground-subtle font-mono text-xs mt-0.5 shrink-0">·</span>
                              <div className="text-xs font-mono text-foreground-subtle">
                                {e.bundle && <span className="mr-1">[{e.bundle}]</span>}
                                {e.error}
                              </div>
                            </div>
                          ))}
                        </CommandPanel>
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
                        <CommandPanel className="divide-y divide-[var(--border)] overflow-hidden p-0">
                          {cooldownSkips.map((e, i) => (
                            <div key={i} className="px-4 py-2 flex items-start gap-3">
                              <span className="text-[var(--info)] font-mono text-xs mt-0.5 shrink-0">·</span>
                              <div className="text-xs font-mono text-[var(--info)]">
                                {e.bundle && <span className="text-foreground-subtle mr-1">[{e.bundle}]</span>}
                                {e.error}
                              </div>
                            </div>
                          ))}
                        </CommandPanel>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {job.error && (
            <CommandPanel className="p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--error)] mb-2">Fatal Error</div>
              <div className="text-xs font-mono text-[var(--error)]">{job.error}</div>
            </CommandPanel>
          )}

          {sortedResults.length === 0 && (job.savedScenarioIds?.length ?? 0) > 0 && (
            <CommandPanel className="p-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">
                Live Results — {job.savedScenarioIds!.length} saved
              </div>
              <div className="space-y-1.5">
                {job.savedScenarioIds!.map((sid) => (
                  <Link key={sid} href={`/scenarios/${sid}`} className="flex items-center gap-2 text-xs font-mono text-foreground hover:text-[var(--accent-primary)] transition-colors">
                    <span className="text-[var(--success)]">✓</span>
                    <span>{sid}</span>
                  </Link>
                ))}
              </div>
            </CommandPanel>
          )}

          {sortedResults.length === 0 && !(job.savedScenarioIds?.length) && !job.errors?.length && !job.error && (
            <CommandPanel className="p-6 text-center text-sm text-foreground-subtle space-y-2">
              {job.status === 'pending' ? (
                <div>Waiting to start…</div>
              ) : job.status === 'running' ? (
                <>
                  <div>Generating scenarios — {generatedDraftCount} drafted, {savedCount} saved, {failedCount} failed out of {total}</div>
                  {elapsedMs !== null && (
                    <div className="text-xs text-foreground-subtle">Elapsed: {formatElapsed(elapsedMs)}</div>
                  )}
                  {generatedDraftCount === 0 && savedCount === 0 && failedCount === 0 && (
                    <div className={`text-xs ${jobHealth === 'critical' ? 'text-[var(--error)]' : jobHealth === 'warning' ? 'text-[#f59e0b]' : 'text-foreground-subtle'}`}>
                      {jobHealth === 'critical'
                        ? `No activity for ${formatElapsed(staleMs)} — job appears stuck`
                        : jobHealth === 'warning'
                          ? `No activity for ${formatElapsed(staleMs)} — may be stalling`
                          : 'No generation activity yet'}
                    </div>
                  )}
                </>
              ) : (
                <div>No results recorded for this job.</div>
              )}
            </CommandPanel>
          )}
        </div>
      </div>
    </div>
  );
}
