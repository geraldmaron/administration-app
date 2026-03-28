import Link from 'next/link';
import BundleBadge from '@/components/BundleBadge';
import PageHeader from '@/components/PageHeader';
import { BUNDLE_ACCENT_COLORS, BUNDLE_BADGE_CLASSES, formatRelativeTime } from '@/lib/constants';
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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

async function fetchStats(): Promise<StatsData | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/stats`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<StatsData>;
  } catch {
    return null;
  }
}

async function fetchRecentJobs(): Promise<JobSummary[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/jobs?limit=8`, { cache: 'no-store' });
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
  cancelled: { dot: 'bg-[var(--foreground-subtle)]', text: 'text-[var(--foreground-subtle)]' },
};

export default async function DashboardPage() {
  const [stats, recentJobs] = await Promise.all([fetchStats(), fetchRecentJobs()]);

  const subtitle = stats
    ? `${stats.bundles.length} bundles · ${stats.totalActive} active · ${stats.totalInactive} inactive`
    : undefined;

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        section="Overview"
        title="Command Dashboard"
        subtitle={subtitle}
        showSubtitle
        actions={<Link href="/generate" className="btn btn-tactical">+ Generate</Link>}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        {/* Bundle Coverage table */}
        <div className="command-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <div className="section-kicker">Bundle Coverage</div>
            <Link href="/scenarios" className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent-primary)] hover:underline">
              Open Library →
            </Link>
          </div>
          {!stats ? (
            <div className="px-4 py-6 text-sm text-[var(--foreground-muted)]">Failed to load stats.</div>
          ) : (
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Bundle</th>
                  <th>Coverage</th>
                  <th style={{ width: 56, textAlign: 'right' }}>Live %</th>
                  <th style={{ width: 60, textAlign: 'right' }}>Active</th>
                  <th style={{ width: 56, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.bundles.map((bundle) => {
                  const badgeClasses = BUNDLE_BADGE_CLASSES[bundle.id] ?? { bg: 'bg-slate-400/15', text: 'text-slate-400' };
                  const accentColor = BUNDLE_ACCENT_COLORS[bundle.id] ?? 'var(--border-strong)';
                  const activeRate = bundle.total > 0 ? Math.round((bundle.active / bundle.total) * 100) : 0;
                  return (
                    <tr
                      key={bundle.id}
                      className="group hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
                    >
                      <td style={{ borderLeft: `2px solid ${accentColor}` }}>
                        <Link
                          href={`/scenarios?bundle=${bundle.id}`}
                          className={`text-[12px] font-mono ${badgeClasses.text} hover:underline`}
                        >
                          {bundle.label}
                        </Link>
                      </td>
                      <td>
                        <div className="relative h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{ width: `${activeRate}%`, backgroundColor: accentColor }}
                          />
                        </div>
                      </td>
                      <td className="text-right font-mono text-[12px] text-[var(--success)]">{activeRate}%</td>
                      <td className="text-right data-value text-[12px] text-[var(--success)]">{bundle.active}</td>
                      <td className="text-right font-mono text-[12px] text-[var(--foreground-subtle)]">{bundle.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Jobs mini-table */}
        <div className="command-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <div className="section-kicker">Recent Jobs</div>
            <Link href="/jobs" className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent-primary)] hover:underline">
              All Jobs →
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--foreground-muted)]">No generation jobs yet.</div>
          ) : (
            <table className="table-dense">
              <thead>
                <tr>
                  <th style={{ width: 16 }}></th>
                  <th>Bundles</th>
                  <th style={{ width: 70, textAlign: 'right' }}>Progress</th>
                  <th style={{ width: 70, textAlign: 'right' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => {
                  const style = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending;
                  const total = job.total ?? job.count * job.bundles.length;
                  return (
                    <tr key={job.id} className="group hover:bg-[rgba(255,255,255,0.03)] cursor-pointer">
                      <td>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      </td>
                      <td>
                        <Link href={`/jobs`} className="flex flex-wrap items-center gap-1">
                          {job.bundles.slice(0, 2).map((b) => (
                            <BundleBadge key={b} bundle={b} />
                          ))}
                          {job.bundles.length > 2 && (
                            <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">+{job.bundles.length - 2}</span>
                          )}
                        </Link>
                      </td>
                      <td className={`text-right font-mono text-[11px] ${style.text}`}>
                        {job.status === 'running'
                          ? `${job.completedCount ?? 0}/${total}`
                          : job.completedCount !== undefined
                          ? `${job.completedCount} saved`
                          : job.status}
                      </td>
                      <td className="text-right text-[10px] font-mono text-[var(--foreground-subtle)]">
                        {formatRelativeTime(job.requestedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
