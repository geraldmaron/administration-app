'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuditScore from '@/components/AuditScore';
import BundleBadge from '@/components/BundleBadge';
import CommandPanel from '@/components/CommandPanel';
import DataStat from '@/components/DataStat';
import OperationsNav from '@/components/OperationsNav';
import ScreenHeader from '@/components/ScreenHeader';
import StatusBadge from '@/components/StatusBadge';
import { formatRelativeTime } from '@/lib/constants';
import type { JobDetail, JobError, JobSummary } from '@/lib/types';

type FilterValue = 'all' | 'running' | 'pending' | 'completed' | 'failed' | 'cancelled';

function categorizeErrors(errors: JobError[]) {
  const generationErrors = errors.filter(
    (error) =>
      !/duplicate_id|similar_content|similar/i.test(error.error) &&
      !(!!error.bundle && /cooldown/i.test(error.error))
  );

  return {
    generationErrors,
    dedupSkips: errors.filter((error) => /duplicate_id|similar_content|similar/i.test(error.error)),
    cooldownSkips: errors.filter((error) => !!error.bundle && /cooldown/i.test(error.error)),
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

function formatDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt || !completedAt) return '—';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return '—';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function QueueSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-[var(--background-muted)]" />
          <div className="mb-2 h-5 w-2/3 animate-pulse rounded bg-[var(--background-muted)]" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--background-muted)]" />
        </div>
      ))}
    </div>
  );
}

function JobInspector({
  job,
  onRefresh,
}: {
  job: JobDetail;
  onRefresh: () => void;
}) {
  const displayStatus = deriveDisplayStatus(job);
  const total = job.total ?? job.count * job.bundles.length;
  const completed = job.completedCount ?? 0;
  const failed = job.failedCount ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round(((completed + failed) / total) * 100)) : 0;
  const autoFixed = (job.results ?? []).filter((result) => result.autoFixed).length;
  const [actionLoading, setActionLoading] = useState<'cancel' | 'stop' | null>(null);

  async function handleCancel() {
    if (!confirm('Cancel this pending job?')) return;
    setActionLoading('cancel');
    try {
      await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop() {
    if (!confirm('Stop this running job? It will be marked cancelled and the process will wind down.')) return;
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

  const { generationErrors, dedupSkips, cooldownSkips } = categorizeErrors(job.errors ?? []);

  return (
    <div className="space-y-6">
      <CommandPanel className="p-5 md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="section-kicker mb-2">Run Dossier</div>
            <h2 className="text-2xl font-semibold text-foreground">{job.id}</h2>
            <p className="mt-2 text-sm text-[var(--foreground-muted)]">{job.description || 'No mission note attached to this run.'}</p>
          </div>
          <StatusBadge status={displayStatus} pulse={job.status === 'running' || job.status === 'pending'} />
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <DataStat label="Saved" value={completed} accent="success" />
          <DataStat label="Failed" value={failed} accent={failed > 0 ? 'warning' : undefined} />
          <DataStat label="Duration" value={formatDuration(job.startedAt, job.completedAt)} />
          <DataStat label="Auto Fixed" value={autoFixed} accent={autoFixed > 0 ? 'gold' : undefined} />
        </div>

        <div className="mb-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
          <div
            className="h-full bg-[linear-gradient(90deg,var(--accent-primary),var(--accent-secondary))] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {job.bundles.map((bundle) => (
            <BundleBadge key={bundle} bundle={bundle} />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
            <div className="section-kicker mb-2">Requested</div>
            <div>{new Date(job.requestedAt).toLocaleString()}</div>
          </div>
          <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
            <div className="section-kicker mb-2">Mode</div>
            <div>
              {job.distributionConfig?.mode ?? job.mode}
              {job.distributionConfig?.loopLength ? ` · loop ${job.distributionConfig.loopLength}` : ''}
              {job.priority ? ` · ${job.priority}` : ''}
            </div>
          </div>
        </div>

        {(job.status === 'pending' || job.status === 'running') ? (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--border)] pt-5">
            {job.status === 'pending' ? (
              <button onClick={handleCancel} className="btn btn-destructive" disabled={actionLoading !== null}>
                {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel Job'}
              </button>
            ) : null}
            {job.status === 'running' ? (
              <button onClick={handleStop} className="btn btn-destructive" disabled={actionLoading !== null}>
                {actionLoading === 'stop' ? 'Stopping…' : 'Stop Job'}
              </button>
            ) : null}
            <Link href={`/jobs/${job.id}`} className="btn btn-tactical">
              Open Full Route
            </Link>
          </div>
        ) : (
          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <Link href={`/jobs/${job.id}`} className="btn btn-tactical">
              Open Full Route
            </Link>
          </div>
        )}
      </CommandPanel>

      {job.auditSummary ? (
        <CommandPanel className="p-5 md:p-6">
          <div className="mb-4">
            <div className="section-kicker mb-2">Quality Review</div>
            <h3 className="text-xl font-semibold text-foreground">Audit Snapshot</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <DataStat label="Average" value={job.auditSummary.avgScore} accent="blue" />
            <DataStat label="Minimum" value={job.auditSummary.minScore} />
            <DataStat label="Maximum" value={job.auditSummary.maxScore} accent="success" />
            <DataStat label="Below 70" value={job.auditSummary.below70Count} accent={job.auditSummary.below70Count > 0 ? 'warning' : undefined} />
            <DataStat label="Above 90" value={job.auditSummary.above90Count} accent="gold" />
          </div>
        </CommandPanel>
      ) : null}

      {(generationErrors.length > 0 || dedupSkips.length > 0 || cooldownSkips.length > 0) ? (
        <CommandPanel className="p-5 md:p-6">
          <div className="mb-4">
            <div className="section-kicker mb-2">Exceptions</div>
            <h3 className="text-xl font-semibold text-foreground">Skips And Failures</h3>
          </div>

          <div className="space-y-4 text-sm text-[var(--foreground-muted)]">
            {generationErrors.length > 0 ? (
              <div>
                <div className="mb-2 text-[var(--error)]">Generation errors ({generationErrors.length})</div>
                <div className="space-y-2">
                  {generationErrors.slice(0, 8).map((error, index) => (
                    <div key={`${error.error}-${index}`} className="rounded-[var(--radius-tight)] border border-[rgba(254,71,60,0.25)] px-4 py-3 text-[var(--foreground-muted)]">
                      {error.bundle ? <span className="mr-2 text-[var(--foreground-subtle)]">[{error.bundle}]</span> : null}
                      {error.error}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {dedupSkips.length > 0 ? <div>{dedupSkips.length} dedup skips recorded.</div> : null}
            {cooldownSkips.length > 0 ? <div>{cooldownSkips.length} cooldown skips recorded.</div> : null}
          </div>
        </CommandPanel>
      ) : null}

      {job.results && job.results.length > 0 ? (
        <CommandPanel className="p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="section-kicker mb-2">Output</div>
              <h3 className="text-xl font-semibold text-foreground">Generated Scenarios</h3>
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">{job.results.length} saved</div>
          </div>

          <div className="space-y-3">
            {job.results.slice(0, 12).map((result) => (
              <div key={result.id} className="rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{result.title}</div>
                    <div className="text-xs font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">{result.id}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BundleBadge bundle={result.bundle} />
                    {result.auditScore !== undefined ? <AuditScore score={result.auditScore} /> : null}
                  </div>
                </div>
                {result.autoFixed ? <div className="text-xs text-[var(--success)]">Auto-repaired before save.</div> : null}
              </div>
            ))}
          </div>
        </CommandPanel>
      ) : null}
    </div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [search, setSearch] = useState('');

  function refreshJobs() {
    fetch('/api/jobs?limit=100')
      .then((response) => response.json())
      .then((data: { jobs: JobSummary[] }) => {
        setJobs(data.jobs);
        setLoading(false);
        setSelectedJobId((current) => current ?? data.jobs[0]?.id ?? null);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    refreshJobs();
    const interval = setInterval(refreshJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJob(null);
      return;
    }

    fetch(`/api/jobs/${selectedJobId}`)
      .then((response) => response.json())
      .then((data: JobDetail) => setSelectedJob(data))
      .catch(() => undefined);
  }, [selectedJobId, jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const displayStatus = deriveDisplayStatus(job as JobDetail);
      const matchesFilter = filter === 'all' ? true : job.status === filter || displayStatus === filter;
      const matchesSearch = search.trim()
        ? job.id.toLowerCase().includes(search.toLowerCase()) ||
          (job.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
          job.bundles.some((bundle) => bundle.toLowerCase().includes(search.toLowerCase()))
        : true;
      return matchesFilter && matchesSearch;
    });
  }, [filter, jobs, search]);

  const runningCount = jobs.filter((job) => job.status === 'running').length;
  const pendingCount = jobs.filter((job) => job.status === 'pending').length;
  const completedCount = jobs.filter((job) => deriveDisplayStatus(job as JobDetail) === 'completed').length;
  const failureCount = jobs.filter((job) => {
    const status = deriveDisplayStatus(job as JobDetail);
    return status === 'failed' || status === 'partial';
  }).length;

  return (
    <div className="mx-auto max-w-[1700px]">
      <ScreenHeader
        section="Content Operations"
        title="Generation Queue"
        subtitle="Review all scenario generation runs as one operational queue. The left rail surfaces current workload and run status; the right dossier expands the selected job into quality, timing, errors, and output."
        eyebrow="Jobs"
        nav={<OperationsNav />}
        actions={<Link href="/generate" className="btn btn-command">New Generation Run</Link>}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <DataStat label="Running" value={runningCount} accent={runningCount > 0 ? 'blue' : undefined} />
        <DataStat label="Pending" value={pendingCount} accent={pendingCount > 0 ? 'gold' : undefined} />
        <DataStat label="Completed" value={completedCount} accent={completedCount > 0 ? 'success' : undefined} />
        <DataStat label="Failures" value={failureCount} accent={failureCount > 0 ? 'warning' : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <CommandPanel className="p-5 md:p-6">
            <div className="mb-4">
              <div className="section-kicker mb-2">Queue Filters</div>
              <h2 className="text-xl font-semibold text-foreground">Run Selection</h2>
            </div>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by job id, note, or bundle…"
              className="input-shell mb-4"
            />

            <div className="flex flex-wrap gap-2">
              {(['all', 'running', 'pending', 'completed', 'failed', 'cancelled'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`min-h-[40px] rounded-[10px] border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] transition-colors ${
                    filter === value
                      ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.16)] text-foreground'
                      : 'border-[var(--border)] text-[var(--foreground-muted)] hover:bg-background-muted hover:text-foreground'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </CommandPanel>

          <CommandPanel className="p-3 md:p-4">
            <div className="mb-3 px-2 pt-2">
              <div className="section-kicker mb-2">Queue</div>
              <h2 className="text-xl font-semibold text-foreground">Active And Historical Runs</h2>
            </div>

            {loading ? <QueueSkeleton /> : null}

            {!loading ? (
              <div className="space-y-3">
                {filteredJobs.length === 0 ? (
                  <div className="rounded-[var(--radius-tight)] border border-[var(--border)] px-4 py-6 text-sm text-[var(--foreground-muted)]">
                    No jobs match the current filter set.
                  </div>
                ) : (
                  filteredJobs.map((job) => {
                    const displayStatus = deriveDisplayStatus(job as JobDetail);
                    const selected = job.id === selectedJobId;
                    const total = job.total ?? job.count * job.bundles.length;
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className={`w-full rounded-[var(--radius-tight)] border p-4 text-left transition-colors ${
                          selected
                            ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.12)]'
                            : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.03)]'
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{job.id}</div>
                            <div className="mt-1 text-xs text-[var(--foreground-muted)]">{job.description || 'No mission note'}</div>
                          </div>
                          <StatusBadge status={displayStatus} pulse={job.status === 'running' || job.status === 'pending'} />
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                          {job.bundles.slice(0, 4).map((bundle) => (
                            <BundleBadge key={bundle} bundle={bundle} />
                          ))}
                          {job.bundles.length > 4 ? <span className="text-xs text-[var(--foreground-subtle)]">+{job.bundles.length - 4}</span> : null}
                        </div>

                        <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                          <span>{job.completedCount ?? 0}/{total} processed</span>
                          <span>{formatRelativeTime(job.requestedAt)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </CommandPanel>
        </div>

        <div>
          {selectedJob ? (
            <JobInspector job={selectedJob} onRefresh={refreshJobs} />
          ) : (
            <CommandPanel className="p-8">
              <div className="section-kicker mb-3">No Selection</div>
              <h2 className="text-2xl font-semibold text-foreground">Select a job from the queue</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--foreground-muted)]">
                Choose a run on the left to inspect its timing, results, audit summary, and failure profile.
              </p>
            </CommandPanel>
          )}
        </div>
      </div>
    </div>
  );
}