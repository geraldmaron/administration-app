'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BundleBadge from '@/components/BundleBadge';
import DataStat from '@/components/DataStat';
import JobSlideOver from '@/components/JobSlideOver';
import OperationsNav from '@/components/OperationsNav';
import ScreenHeader from '@/components/ScreenHeader';
import StatusBadge from '@/components/StatusBadge';
import SortHeader, { useSort } from '@/components/SortHeader';
import { formatDuration, formatRelativeTime } from '@/lib/constants';
import type { JobDetail, JobSummary } from '@/lib/types';

function summarizeProvider(job: Pick<JobSummary, 'executionTarget' | 'modelConfig'>): string {
  const drafter = job.modelConfig?.drafterModel;
  if (drafter?.startsWith('ollama:')) return drafter.replace('ollama:', '');
  if (job.executionTarget === 'n8n') return 'n8n';
  return 'cloud';
}

type JobSortField = 'id' | 'status' | 'completedCount' | 'requestedAt';

type FilterValue = 'all' | 'running' | 'pending' | 'completed' | 'failed' | 'cancelled';

function categorizeErrors(errors: { error: string; bundle?: string }[]) {
  return {
    generationErrors: errors.filter(
      (e) => !/duplicate_id|similar_content|similar/i.test(e.error) && !(!!e.bundle && /cooldown/i.test(e.error))
    ),
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


export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [search, setSearch] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [slideOverJobId, setSlideOverJobId] = useState<string | null>(null);
  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(25);

  function refreshJobs() {
    fetch('/api/jobs?limit=200')
      .then((r) => r.json())
      .then((data: { jobs: JobSummary[] }) => {
        setJobs(data.jobs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    refreshJobs();
    const interval = setInterval(refreshJobs, 2000);
    return () => clearInterval(interval);
  }, []);

  async function handleBulkDelete() {
    const deletable = [...checkedIds].filter((id) => {
      const job = jobs.find((j) => j.id === id);
      return job && job.status !== 'running';
    });
    if (deletable.length === 0) return;
    if (!confirm(`Permanently delete ${deletable.length} job record${deletable.length === 1 ? '' : 's'}?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(deletable.map((id) => fetch(`/api/jobs/${id}`, { method: 'DELETE' })));
      setCheckedIds(new Set());
      if (slideOverJobId && deletable.includes(slideOverJobId)) setSlideOverJobId(null);
      refreshJobs();
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleRowStop(job: JobSummary, action: 'stop' | 'cancel', e: React.MouseEvent) {
    e.stopPropagation();
    const verb = action === 'stop' ? 'Stop this running job?' : 'Cancel this pending job?';
    if (!confirm(verb)) return;
    setRowActionId(job.id);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, action === 'stop'
        ? {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' }),
          }
        : { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? `Failed to ${action} job`);
        return;
      }
      refreshJobs();
    } finally {
      setRowActionId(null);
    }
  }

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const { sortField, sortDir, handleSort, compare } = useSort<JobSortField>('requestedAt', 'desc');

  const STATUS_ORDER: Record<string, number> = { running: 0, pending: 1, completed: 2, remediated: 2, partial: 3, failed: 4, cancelled: 5 };

  const filteredJobs = useMemo(() => {
    const base = jobs.filter((job) => {
      const displayStatus = deriveDisplayStatus(job as JobDetail);
      const matchesFilter = filter === 'all' ? true : job.status === filter || displayStatus === filter;
      const matchesSearch = search.trim()
        ? job.id.toLowerCase().includes(search.toLowerCase()) ||
          (job.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
          job.bundles.some((b) => b.toLowerCase().includes(search.toLowerCase()))
        : true;
      return matchesFilter && matchesSearch;
    });
    return [...base].sort((a, b) => {
      if (sortField === 'status') {
        const sa = STATUS_ORDER[deriveDisplayStatus(a as JobDetail)] ?? 99;
        const sb = STATUS_ORDER[deriveDisplayStatus(b as JobDetail)] ?? 99;
        return compare(sa, sb);
      }
      return compare(a[sortField], b[sortField]);
    });
  }, [filter, jobs, search, sortField, sortDir]);

  useEffect(() => { setJobPage(1); }, [filter, search]);

  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / jobPageSize));
  const paginatedJobs = filteredJobs.slice((jobPage - 1) * jobPageSize, jobPage * jobPageSize);

  const runningCount = jobs.filter((j) => j.status === 'running').length;
  const pendingCount = jobs.filter((j) => j.status === 'pending').length;
  const runningJobs = jobs.filter((j) => j.status === 'running').slice(0, 5);
  const pendingJobs = jobs.filter((j) => j.status === 'pending').slice(0, 5);
  const completedCount = jobs.filter((j) => deriveDisplayStatus(j as JobDetail) === 'completed').length;
  const failureCount = jobs.filter((j) => {
    const s = deriveDisplayStatus(j as JobDetail);
    return s === 'failed' || s === 'partial';
  }).length;

  return (
    <div className="mx-auto max-w-[1700px]">
      <ScreenHeader
        section="Content Operations"
        title="Generation Queue"
        subtitle="Monitor and manage scenario generation runs."
        eyebrow="Jobs"
        nav={<OperationsNav />}
        actions={<Link href="/generate" className="btn btn-command">+ New Run</Link>}
      />

      {/* KPI strip */}
      <div className="mb-3 flex items-center gap-3">
        <DataStat size="compact" label="Running" value={runningCount} accent={runningCount > 0 ? 'blue' : undefined} />
        <DataStat size="compact" label="Pending" value={pendingCount} accent={pendingCount > 0 ? 'gold' : undefined} />
        <DataStat size="compact" label="Completed" value={completedCount} accent={completedCount > 0 ? 'success' : undefined} />
        <DataStat size="compact" label="Failures" value={failureCount} accent={failureCount > 0 ? 'warning' : undefined} />
      </div>

      {(runningJobs.length > 0 || pendingJobs.length > 0) && (
        <div className="mb-3 grid gap-3 lg:grid-cols-2">
          <div className="command-panel p-4">
            <div className="mb-3 text-xs font-medium text-[var(--foreground-subtle)]">Active Now</div>
            <div className="space-y-2">
              {runningJobs.length === 0 ? (
                <div className="text-xs text-[var(--foreground-muted)]">No running jobs.</div>
              ) : runningJobs.map((job) => (
                <button key={job.id} type="button" onClick={() => setSlideOverJobId(job.id)} className="w-full rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2 text-left hover:bg-[rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[11px] text-foreground">{job.id.slice(0, 12)}…</div>
                      <div className="text-[11px] text-[var(--foreground-muted)]">{job.currentBundle ?? 'bundle pending'}{job.currentPhase ? ` → ${job.currentPhase}` : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-[var(--accent-primary)]">{summarizeProvider(job)}</div>
                      <div className="text-[10px] text-[var(--foreground-subtle)]">{job.lastHeartbeatAt ? formatRelativeTime(job.lastHeartbeatAt) : 'no heartbeat'}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="command-panel p-4">
            <div className="mb-3 text-xs font-medium text-[var(--foreground-subtle)]">Pending Queue</div>
            <div className="space-y-2">
              {pendingJobs.length === 0 ? (
                <div className="text-xs text-[var(--foreground-muted)]">No pending jobs.</div>
              ) : pendingJobs.map((job) => (
                <button key={job.id} type="button" onClick={() => setSlideOverJobId(job.id)} className="w-full rounded-[var(--radius-tight)] border border-[var(--border)] px-3 py-2 text-left hover:bg-[rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[11px] text-foreground">{job.id.slice(0, 12)}…</div>
                      <div className="text-[11px] text-[var(--foreground-muted)]">{job.description || job.bundles.join(', ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-[var(--accent-secondary)]">{summarizeProvider(job)}</div>
                      <div className="text-[10px] text-[var(--foreground-subtle)]">{formatRelativeTime(job.requestedAt)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search id, note, bundle…"
          className="input-shell max-w-[220px]"
          style={{ width: 'auto' }}
        />
        {(['all', 'running', 'pending', 'completed', 'failed', 'cancelled'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={`filter-pill${filter === v ? ' active' : ''}`}
          >
            {v}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono text-[var(--foreground-subtle)]">
          {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Bulk action bar */}
      {checkedIds.size > 0 && (
        <div className="mb-2 flex items-center gap-3 rounded-[var(--radius-tight)] border border-[var(--border-strong)] bg-[rgba(255,255,255,0.04)] px-3 py-2">
          <span className="text-[11px] font-mono text-[var(--foreground-muted)]">{checkedIds.size} selected</span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="btn btn-destructive"
          >
            {bulkDeleting ? 'Deleting…' : `Delete ${checkedIds.size}`}
          </button>
          <button
            type="button"
            onClick={() => setCheckedIds(new Set())}
            className="btn btn-ghost ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="command-panel overflow-hidden">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-[var(--background-muted)]" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="px-4 py-8 text-sm text-[var(--foreground-muted)]">
            No jobs match the current filter.
          </div>
        ) : (
          <table className="table-dense">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  {(() => {
                    const deletable = filteredJobs.filter((j) => j.status !== 'running');
                    const allChecked = deletable.length > 0 && deletable.every((j) => checkedIds.has(j.id));
                    const someChecked = deletable.some((j) => checkedIds.has(j.id));
                    return (
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => {
                          if (allChecked) setCheckedIds(new Set());
                          else setCheckedIds(new Set(deletable.map((j) => j.id)));
                        }}
                        className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-primary)]"
                        title="Select all deletable jobs"
                      />
                    );
                  })()}
                </th>
                <th><SortHeader field="id" label="Job" current={sortField} dir={sortDir} onSort={handleSort} /></th>
                <th style={{ width: 110 }}><SortHeader field="status" label="Status" current={sortField} dir={sortDir} onSort={handleSort} /></th>
                <th style={{ width: 180 }}>Bundles</th>
                <th style={{ width: 150 }}><SortHeader field="completedCount" label="Progress" current={sortField} dir={sortDir} onSort={handleSort} /></th>
                <th style={{ width: 110 }}>Activity</th>
                <th style={{ width: 110 }}>Provider</th>
                <th style={{ width: 80 }}>Duration</th>
                <th style={{ width: 90 }}><SortHeader field="requestedAt" label="Requested" current={sortField} dir={sortDir} onSort={handleSort} /></th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.map((job) => {
                const displayStatus = deriveDisplayStatus(job as JobDetail);
                const total = job.total ?? job.count * job.bundles.length;
                const done = (job.completedCount ?? 0) + (job.failedCount ?? 0);
                const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                const isRunning = job.status === 'running';
                const checked = checkedIds.has(job.id);

                return (
                  <tr
                    key={job.id}
                    className={`group cursor-pointer ${isRunning ? 'bg-[var(--accent-muted)]' : ''} hover:bg-[rgba(255,255,255,0.03)]`}
                    onClick={() => setSlideOverJobId(job.id)}
                  >
                    {/* Checkbox */}
                    <td onClick={(e) => e.stopPropagation()}>
                      {!isRunning ? (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          onClick={(e) => toggleCheck(job.id, e)}
                          className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-primary)]"
                        />
                      ) : null}
                    </td>

                    {/* Job ID + description */}
                    <td>
                      <div className="font-mono text-[12px] font-medium text-foreground truncate max-w-[220px]">{job.id}</div>
                      {job.description && (
                        <div className="text-[11px] text-[var(--foreground-subtle)] truncate max-w-[220px]">{job.description}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge status={displayStatus} pulse={job.status === 'running' || job.status === 'pending'} />
                    </td>

                    {/* Bundles */}
                    <td>
                      <div className="flex flex-wrap items-center gap-1">
                        {job.bundles.slice(0, 3).map((b) => (
                          <BundleBadge key={b} bundle={b} />
                        ))}
                        {job.bundles.length > 3 && (
                          <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">+{job.bundles.length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Progress */}
                    <td>
                      {isRunning ? (
                        <div className="flex items-center gap-2">
                          <div className="app-progress flex-1" style={{ height: 4 }}>
                            <span style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-[var(--foreground-subtle)] flex-shrink-0">{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-[12px] font-mono text-[var(--foreground-muted)]">
                          {job.completedCount ?? 0} saved
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="text-[11px] text-[var(--foreground-muted)] max-w-[120px] truncate">
                        {[job.currentBundle, job.currentPhase].filter(Boolean).join(' → ') || '—'}
                      </div>
                    </td>

                    <td>
                      <span className="text-[11px] font-mono text-[var(--foreground-muted)]">
                        {summarizeProvider(job)}
                      </span>
                    </td>

                    <td>
                      <span className="text-[12px] font-mono text-[var(--foreground-muted)]">
                        {formatDuration(job.startedAt, job.completedAt)}
                      </span>
                    </td>

                    {/* Requested */}
                    <td>
                      <span className="text-[11px] font-mono text-[var(--foreground-subtle)]">
                        {formatRelativeTime(job.requestedAt)}
                      </span>
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      <div className={`flex items-center gap-2 transition-opacity ${job.status === 'running' || job.status === 'pending' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {job.status === 'running' && (
                          <button
                            type="button"
                            onClick={(e) => void handleRowStop(job, 'stop', e)}
                            className="text-xs font-medium text-[var(--danger)] hover:underline"
                          >
                            {rowActionId === job.id ? 'Stopping…' : 'Stop'}
                          </button>
                        )}
                        {job.status === 'pending' && (
                          <button
                            type="button"
                            onClick={(e) => void handleRowStop(job, 'cancel', e)}
                            className="text-xs font-medium text-[var(--danger)] hover:underline"
                          >
                            {rowActionId === job.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
                        >
                          Inspect
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredJobs.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          {jobPage > 1 && (
            <button onClick={() => setJobPage((p) => p - 1)} className="btn btn-ghost">← Prev</button>
          )}
          <span className="text-[11px] font-mono text-[var(--foreground-subtle)]">
            Page {jobPage} of {totalJobPages}
          </span>
          {jobPage < totalJobPages && (
            <button onClick={() => setJobPage((p) => p + 1)} className="btn btn-ghost">Next →</button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">Per page</span>
            <select
              value={jobPageSize}
              onChange={(e) => { setJobPageSize(Number(e.target.value)); setJobPage(1); }}
              className="input-shell text-xs"
              style={{ width: 'auto', minWidth: 56 }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Slide-over */}
      {slideOverJobId && (
        <JobSlideOver
          jobId={slideOverJobId}
          onClose={() => setSlideOverJobId(null)}
          onRefresh={refreshJobs}
          onDeleted={() => { setSlideOverJobId(null); refreshJobs(); }}
        />
      )}
    </div>
  );
}
