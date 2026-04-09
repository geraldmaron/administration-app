'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ScreenHeader from '@/components/ScreenHeader';
import OperationsNav from '@/components/OperationsNav';
import CommandPanel from '@/components/CommandPanel';
import DataStat from '@/components/DataStat';
import StatusBadge from '@/components/StatusBadge';
import type { GenerationRunSummary } from '@/lib/types';
import { formatRelativeTime } from '@/lib/constants';

export default function RunsPage() {
  const [runs, setRuns] = useState<GenerationRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'queued' | 'submitted' | 'running' | 'completed' | 'failed' | 'partial_failure' | 'cancelled'>('all');

  useEffect(() => {
    fetch('/api/runs?limit=100')
      .then((r) => r.json())
      .then((data: { runs: GenerationRunSummary[] }) => setRuns(data.runs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total: runs.length,
    running: runs.filter((run) => run.status === 'running' || run.status === 'submitted' || run.status === 'queued').length,
    failed: runs.filter((run) => run.status === 'failed').length,
    blitz: runs.filter((run) => run.kind === 'blitz').length,
  }), [runs]);

  const filteredRuns = useMemo(() => runs.filter((run) => {
    const matchesStatus = statusFilter === 'all' ? true : run.status === statusFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch = query.length === 0
      ? true
      : run.id.toLowerCase().includes(query)
        || (run.description ?? '').toLowerCase().includes(query)
        || (run.requestedBy ?? '').toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  }), [runs, search, statusFilter]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <ScreenHeader
        section="Content Operations"
        eyebrow="Runs"
        title="Generation Runs"
        subtitle="Grouped parent runs across blitz submissions and other orchestrated generation flows."
        nav={<OperationsNav />}
        actions={<Link href="/generate" className="btn btn-command">+ New Run</Link>}
      />

      <div className="mb-4 flex items-center gap-3">
        <DataStat size="compact" label="Runs" value={stats.total} />
        <DataStat size="compact" label="Active" value={stats.running} accent={stats.running > 0 ? 'blue' : undefined} />
        <DataStat size="compact" label="Failed" value={stats.failed} accent={stats.failed > 0 ? 'warning' : undefined} />
        <DataStat size="compact" label="Blitz" value={stats.blitz} accent={stats.blitz > 0 ? 'gold' : undefined} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search runs…"
          className="input-shell max-w-[220px]"
          style={{ width: 'auto' }}
        />
        {(['all', 'queued', 'submitted', 'running', 'completed', 'failed', 'partial_failure', 'cancelled'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === value ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-foreground' : 'border-[var(--border)] text-[var(--foreground-muted)] hover:text-foreground'}`}
          >
            {value.replace('_', ' ')}
          </button>
        ))}
      </div>

      <CommandPanel className="overflow-hidden p-0">
        <div className="border-b border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-foreground-subtle">
          Recent Runs
        </div>
        {loading ? (
          <div className="px-4 py-8 text-sm text-foreground-subtle">Loading runs…</div>
        ) : filteredRuns.length === 0 ? (
          <div className="px-4 py-8 text-sm text-foreground-subtle">No runs recorded yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]/40">
            {filteredRuns.map((run) => (
              <div key={run.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={run.status} />
                    <span className="text-[10px] font-mono text-foreground-subtle">{run.kind}</span>
                    <span className="text-[10px] font-mono text-foreground-subtle">{run.totalJobs} jobs</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">{run.description ?? `Run ${run.id}`}</div>
                  <div className="mt-1 text-[11px] text-foreground-subtle">
                    Requested {run.requestedAt ? formatRelativeTime(run.requestedAt) : '—'}
                  </div>
                </div>
                <Link href={`/runs/${run.id}`} className="btn btn-ghost">Open Run</Link>
              </div>
            ))}
          </div>
        )}
      </CommandPanel>
    </div>
  );
}
