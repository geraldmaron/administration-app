import Link from 'next/link';
import BundleBadge from '@/components/BundleBadge';
import CommandPanel from '@/components/CommandPanel';
import DataStat from '@/components/DataStat';
import PageHeader from '@/components/PageHeader';
import { BUNDLE_BADGE_CLASSES, BUNDLE_ACCENT_COLORS, formatRelativeTime } from '@/lib/constants';
import type { JobSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface BundleStat {
  id: string;
  label: string;
  total: number;
  active: number;
}

interface StatsData {
  bundles: BundleStat[];
  totalActive: number;
  totalInactive: number;
}

async function fetchStats(): Promise<StatsData | null> {
  try {
    const res = await fetch('http://localhost:3001/api/stats', { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<StatsData>;
  } catch {
    return null;
  }
}

async function fetchRecentJobs(): Promise<JobSummary[]> {
  try {
    const res = await fetch('http://localhost:3001/api/jobs?limit=5', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { jobs: JobSummary[] };
    return data.jobs;
  } catch {
    return [];
  }
}

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  pending: { dot: 'bg-[var(--info)]', text: 'text-[var(--info)]' },
  running: { dot: 'bg-[var(--accent-primary)]', text: 'text-[var(--accent-primary)]' },
  completed: { dot: 'bg-[var(--success)]', text: 'text-[var(--success)]' },
  failed: { dot: 'bg-[var(--error)]', text: 'text-[var(--error)]' },
  cancelled: { dot: 'bg-[var(--foreground-muted)]', text: 'text-[var(--foreground-muted)]' },
};

export default async function DashboardPage() {
  const [stats, recentJobs] = await Promise.all([fetchStats(), fetchRecentJobs()]);
  const totalBundles = stats?.bundles.length ?? 0;

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        section="Overview"
        title="Command Dashboard"
        subtitle={stats ? `${stats.totalActive} active · ${stats.totalInactive} inactive` : undefined}
        actions={<Link href="/generate" className="btn btn-tactical">+ Generate</Link>}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DataStat label="Tracked Bundles" value={totalBundles} detail="Editorial domains" accent="gold" />
        <DataStat label="Active" value={stats?.totalActive ?? '—'} detail="Live scenarios" accent="success" />
        <DataStat label="Inactive" value={stats?.totalInactive ?? '—'} detail="Held from runtime" accent={stats && stats.totalInactive > 0 ? 'warning' : undefined} />
        <DataStat label="Recent Jobs" value={recentJobs.length} detail="Latest requests" accent="blue" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_420px]">
        <CommandPanel className="p-5 md:p-6">
          <div className="panel-header flex items-start justify-between gap-4">
            <div>
              <div className="section-kicker mb-2">Scenario Inventory</div>
              <h2 className="panel-title">Bundle Coverage</h2>
              <p className="panel-subtitle">Review scenario volume and live share by bundle using the same command surface language as the iOS control stack.</p>
            </div>
            <Link href="/scenarios" className="btn btn-ghost">Open Library</Link>
          </div>
          {!stats ? (
            <div className="text-sm text-foreground-muted">Failed to load stats.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {stats.bundles.map((bundle) => {
                const badgeClasses = BUNDLE_BADGE_CLASSES[bundle.id] ?? { bg: 'bg-slate-400/15', text: 'text-slate-400' };
                const activeRate = bundle.total > 0 ? Math.round((bundle.active / bundle.total) * 100) : 0;
                return (
                  <Link
                    key={bundle.id}
                    href={`/scenarios?bundle=${bundle.id}`}
                    className="tech-card block p-4 transition-colors group"
                    style={{ borderLeftColor: BUNDLE_ACCENT_COLORS[bundle.id] ?? 'var(--border-strong)', borderLeftWidth: '2px' }}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className={`text-[10px] font-mono uppercase tracking-[0.18em] ${badgeClasses.text}`}>{bundle.label}</div>
                        <div className="mt-2 text-2xl font-semibold text-foreground data-value">{bundle.total}</div>
                      </div>
                      <span className="section-kicker">{activeRate}% live</span>
                    </div>
                    <div className="app-progress mb-3">
                      <span style={{ width: `${activeRate}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-foreground-muted">
                      <span>Active</span>
                      <span className="data-value text-[var(--success)]">{bundle.active}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CommandPanel>

        <CommandPanel className="p-5 md:p-6">
          <div className="panel-header flex items-start justify-between gap-4">
            <div>
              <div className="section-kicker mb-2">Queue Watch</div>
              <h2 className="panel-title">Recent Jobs</h2>
            </div>
            <Link href="/jobs" className="btn btn-ghost">All Jobs</Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="control-surface px-4 py-5 text-sm text-foreground-muted">
              No generation jobs yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentJobs.map((job) => {
                const statusStyle = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending;
                return (
                  <Link
                    key={job.id}
                    href={`/jobs#${job.id}`}
                    className="tech-card block p-4 transition-colors"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        <span className={`text-[10px] font-mono uppercase tracking-wider ${statusStyle.text}`}>
                          {job.status}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-foreground-subtle">
                        {formatRelativeTime(job.requestedAt)}
                      </span>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {job.bundles.slice(0, 3).map((b) => (
                        <BundleBadge key={b} bundle={b} />
                      ))}
                      {job.bundles.length > 3 && (
                        <span className="text-[10px] font-mono text-foreground-subtle">
                          +{job.bundles.length - 3}
                        </span>
                      )}
                    </div>

                    {job.status === 'running' && job.progress !== undefined && (
                      <div className="mt-2">
                        <div className="app-progress">
                          <span style={{ width: `${job.progress}%` }} />
                        </div>
                        <div className="text-[10px] font-mono text-foreground-subtle mt-1">
                          {job.completedCount ?? 0} / {job.total ?? job.count * job.bundles.length}
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </CommandPanel>
      </div>
    </div>
  );
}
