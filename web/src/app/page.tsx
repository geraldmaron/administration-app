import Link from 'next/link';
import BundleBadge from '@/components/BundleBadge';
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

  return (
    <div className="p-6">
      <PageHeader
        section="Overview"
        title="Command Dashboard"
        subtitle={stats ? `${stats.totalActive} active · ${stats.totalInactive} inactive` : undefined}
        actions={<Link href="/generate" className="btn btn-tactical">+ Generate</Link>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bundle stats — 2/3 wide */}
        <div className="xl:col-span-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-3">
            Scenarios by Bundle
          </div>
          {!stats ? (
            <div className="text-foreground-muted text-sm">Failed to load stats.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {stats.bundles.map((bundle) => {
                const badgeClasses = BUNDLE_BADGE_CLASSES[bundle.id] ?? { bg: 'bg-slate-400/15', text: 'text-slate-400' };
                return (
                  <Link
                    key={bundle.id}
                    href={`/scenarios?bundle=${bundle.id}`}
                    className="tech-border bg-background-elevated p-4 block hover:bg-background-muted transition-colors group"
                    style={{ borderLeftColor: BUNDLE_ACCENT_COLORS[bundle.id] ?? 'var(--border-strong)', borderLeftWidth: '3px' }}
                  >
                    <div className={`text-[10px] font-mono uppercase tracking-wider mb-2 ${badgeClasses.text}`}>
                      {bundle.label}
                    </div>
                    <div className="text-2xl font-mono font-bold text-foreground">
                      {bundle.total}
                    </div>
                    <div className="text-xs text-foreground-muted mt-1">
                      Active: <span className="text-[var(--success)] font-mono">{bundle.active}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent jobs — 1/3 wide */}
        <div className="xl:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
              Recent Jobs
            </div>
            <Link
              href="/generate"
              className="text-[10px] font-mono uppercase tracking-wider text-accent hover:text-foreground transition-colors"
            >
              + Generate New
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="tech-border bg-background-elevated p-4 text-sm text-foreground-muted">
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
                    className="tech-border bg-background-elevated p-3 block hover:bg-background-muted transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
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

                    <div className="flex flex-wrap gap-1 mb-2">
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
                        <div className="h-0.5 bg-background-muted rounded-none overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
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

          <Link
            href="/jobs"
            className="block mt-3 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle hover:text-foreground transition-colors"
          >
            View all jobs →
          </Link>
        </div>
      </div>
    </div>
  );
}
