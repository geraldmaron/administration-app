'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CommandPanel from '@/components/CommandPanel';
import DataStat from '@/components/DataStat';
import BundleBadge from '@/components/BundleBadge';
import StatusBadge from '@/components/StatusBadge';
import ScreenHeader from '@/components/ScreenHeader';
import OperationsNav from '@/components/OperationsNav';
import { formatDuration, formatRelativeTime } from '@/lib/constants';
import type { GenerationRunDetail } from '@/lib/types';

function summarizeProvider(target?: string): string {
  if (target === 'n8n') return 'n8n';
  if (target === 'local') return 'local';
  return 'cloud';
}

export default function GenerationRunPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<GenerationRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineJobId, setTimelineJobId] = useState('');
  const [timelineLevel, setTimelineLevel] = useState('');

  useEffect(() => {
    fetch(`/api/runs/${id}`)
      .then((r) => r.json())
      .then((data: GenerationRunDetail) => setRun(data))
      .finally(() => setLoading(false));
  }, [id]);

  const stats = useMemo(() => {
    if (!run) return { completed: 0, failed: 0, running: 0, pending: 0 };
    return run.jobs.reduce((acc, job) => {
      if (job.status === 'completed') acc.completed += 1;
      else if (job.status === 'failed') acc.failed += 1;
      else if (job.status === 'running') acc.running += 1;
      else acc.pending += 1;
      return acc;
    }, { completed: 0, failed: 0, running: 0, pending: 0 });
  }, [run]);

  const filteredEvents = useMemo(() => {
    const events = run?.mergedEvents ?? [];
    const query = timelineSearch.trim().toLowerCase();
    return events.filter((event) => {
      const matchesJob = timelineJobId ? event.jobId === timelineJobId : true;
      const matchesLevel = timelineLevel ? event.level === timelineLevel : true;
      const haystack = `${event.code} ${event.message} ${event.jobLabel ?? ''}`.toLowerCase();
      const matchesSearch = query.length === 0 ? true : haystack.includes(query);
      return matchesJob && matchesLevel && matchesSearch;
    });
  }, [run?.mergedEvents, timelineSearch, timelineJobId, timelineLevel]);

  if (loading || !run) {
    return <div className="mx-auto max-w-[1200px] px-4 py-10 text-sm text-[var(--foreground-muted)]">Loading run…</div>;
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <ScreenHeader
        section="Generation Operations"
        eyebrow="Run"
        title={`Run ${run.id.slice(0, 8)}`}
        subtitle={`${run.jobs.length} child job${run.jobs.length === 1 ? '' : 's'} · ${summarizeProvider(run.executionTarget)}`}
        nav={<OperationsNav />}
        actions={<Link href="/jobs" className="btn btn-ghost">Back to Jobs</Link>}
      />

      <CommandPanel className="mb-4 px-5 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={run.status} />
              <span className="text-xs font-mono text-foreground-subtle">{run.kind}</span>
              <span className="text-xs font-mono text-foreground-subtle">{summarizeProvider(run.executionTarget)}</span>
            </div>
            {run.description ? <p className="mt-2 text-xs text-foreground-muted">{run.description}</p> : null}
          </div>
          <div className="text-xs font-mono text-foreground-subtle">
            Requested {run.requestedAt ? formatRelativeTime(run.requestedAt) : '—'}
          </div>
        </div>
      </CommandPanel>

      <div className="mb-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <DataStat label="Completed" value={stats.completed} accent="success" size="compact" />
        <DataStat label="Failed" value={stats.failed} accent={stats.failed > 0 ? 'warning' : undefined} size="compact" />
        <DataStat label="Running" value={stats.running} accent="blue" size="compact" />
        <DataStat label="Pending" value={stats.pending} size="compact" />
      </div>

      {(run.issueSummaries?.length ?? 0) > 0 && (
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          {run.issueSummaries?.map((issue) => (
            <CommandPanel key={`${issue.category}-${issue.title}`} className="p-4">
              <div className={`text-xs font-medium ${issue.severity === 'error' ? 'text-[var(--error)]' : issue.severity === 'warning' ? 'text-[#f59e0b]' : 'text-[var(--info)]'}`}>
                {issue.title} · {issue.count}
              </div>
              <p className="mt-1 text-xs leading-6 text-foreground-muted">{issue.summary}</p>
              {issue.examples.length > 0 && (
                <div className="mt-2 space-y-1">
                  {issue.examples.map((example, idx) => (
                    <div key={idx} className="text-[10px] font-mono text-foreground-subtle break-words">• {example}</div>
                  ))}
                </div>
              )}
            </CommandPanel>
          ))}
        </div>
      )}

      {(run.mergedEvents?.length ?? 0) > 0 && (
        <CommandPanel className="mb-4 overflow-hidden p-0">
          <div className="border-b border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-foreground-subtle">
            Cross-Child Timeline
          </div>
          <div className="border-b border-[var(--border)]/40 px-4 py-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={timelineSearch}
              onChange={(e) => setTimelineSearch(e.target.value)}
              placeholder="Search timeline…"
              className="input-shell max-w-[220px] text-xs"
              style={{ width: 'auto' }}
            />
            <select value={timelineJobId} onChange={(e) => setTimelineJobId(e.target.value)} className="input-shell text-xs" style={{ width: 'auto' }}>
              <option value="">All jobs</option>
              {run.jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.runJobIndex ?? '?'} · {job.runLabel ?? job.id}</option>
              ))}
            </select>
            <select value={timelineLevel} onChange={(e) => setTimelineLevel(e.target.value)} className="input-shell text-xs" style={{ width: 'auto' }}>
              <option value="">All levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
            <span className="ml-auto text-[10px] font-mono text-foreground-subtle">{filteredEvents.length} events</span>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-[var(--border)]/30">
            {filteredEvents.map((event) => (
              <div key={`${event.jobId}-${event.id}`} className="px-4 py-2 flex items-start gap-3 text-[10px] font-mono">
                <span className="text-foreground-subtle w-[140px] shrink-0">{event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}</span>
                <span className="text-[var(--accent-primary)] w-[120px] shrink-0 truncate">{event.jobLabel ?? event.jobId}</span>
                <span className="text-foreground-subtle w-[110px] shrink-0 truncate">{event.code}</span>
                <span className="text-foreground flex-1 break-words">{event.message}</span>
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <div className="px-4 py-8 text-sm text-foreground-subtle">No merged events match the current filters.</div>
            )}
          </div>
        </CommandPanel>
      )}

      <CommandPanel className="overflow-hidden p-0">
        <div className="border-b border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-foreground-subtle">
          Child Jobs
        </div>
        <div className="divide-y divide-[var(--border)]/40">
          {run.jobs.map((job) => (
            <div key={job.id} className="px-4 py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-foreground-subtle">{job.runJobIndex ?? '?'} / {job.runTotalJobs ?? run.jobs.length}</span>
                  <StatusBadge status={job.status} />
                  {job.bundles.map((bundle) => <BundleBadge key={`${job.id}-${bundle}`} bundle={bundle} />)}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">{job.description ?? job.runLabel ?? job.id}</div>
                <div className="mt-1 text-[11px] text-foreground-subtle">
                  {job.completedCount ?? 0} saved · {job.failedCount ?? 0} failed · {formatDuration(job.startedAt, job.completedAt)}
                </div>
              </div>
              <Link href={`/jobs/${job.id}`} className="btn btn-ghost">Open Job</Link>
            </div>
          ))}
        </div>
      </CommandPanel>
    </div>
  );
}
