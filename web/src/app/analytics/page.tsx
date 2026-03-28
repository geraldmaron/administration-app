'use client';

import { useEffect, useMemo, useState } from 'react';
import DataStat from '@/components/DataStat';
import PageHeader from '@/components/PageHeader';
import SortHeader from '@/components/SortHeader';
import type { AnalyticsResponse } from '@/lib/types';

type RuleSort = 'rule' | 'count';
type BundleSort = 'bundle' | 'rate' | 'avgScore' | 'attempts';
type TrendSort = 'date' | 'totalAttempts' | 'successRate' | 'avgScore';
type FailSort = 'bundle' | 'category' | 'score' | 'timestamp';

const DAYS_OPTIONS = [7, 14, 30, 90] as const;
const RETENTION_OPTIONS = [7, 14, 30, 60, 90, 180, 365] as const;

function pct(n: number) { return `${Math.round(n * 100)}%`; }
function fmt(n: number) { return n.toLocaleString(); }
function scoreColor(score: number) {
  if (score >= 90) return 'var(--success)';
  if (score >= 75) return 'var(--warning)';
  return 'var(--error)';
}
function rateColor(rate: number) {
  if (rate >= 0.8) return 'var(--success)';
  if (rate >= 0.5) return 'var(--warning)';
  return 'var(--error)';
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<7 | 14 | 30 | 90>(30);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionSaved, setRetentionSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [ruleSort, setRuleSort] = useState<RuleSort>('count');
  const [ruleSortDir, setRuleSortDir] = useState<'asc' | 'desc'>('desc');
  const [bundleSort, setBundleSort] = useState<BundleSort>('rate');
  const [bundleSortDir, setBundleSortDir] = useState<'asc' | 'desc'>('desc');
  const [trendSort, setTrendSort] = useState<TrendSort>('date');
  const [trendSortDir, setTrendSortDir] = useState<'asc' | 'desc'>('desc');
  const [failSort, setFailSort] = useState<FailSort>('timestamp');
  const [failSortDir, setFailSortDir] = useState<'asc' | 'desc'>('desc');

  function makeSortHandler<F extends string>(
    current: F, dir: 'asc' | 'desc',
    setField: (f: F) => void, setDir: (d: 'asc' | 'desc') => void,
  ) {
    return (field: F) => {
      if (current === field) setDir(dir === 'asc' ? 'desc' : 'asc');
      else { setField(field); setDir('asc'); }
    };
  }

  function cmp(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
    const m = dir === 'asc' ? 1 : -1;
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b) * m;
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * m;
    return 0;
  }

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: Record<string, unknown>) => {
        if (typeof d.analytics_retention_days === 'number') {
          setRetentionDays(d.analytics_retention_days);
        }
      })
      .catch(() => {});
  }, []);

  function loadAnalytics() {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d: AnalyticsResponse) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadAnalytics(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveRetention(value: number) {
    setRetentionSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics_retention_days: value }),
      });
      setRetentionDays(value);
      setRetentionSaved(true);
      setTimeout(() => setRetentionSaved(false), 2000);
    } finally {
      setRetentionSaving(false);
    }
  }

  async function handleReset(target: 'all' | 'summary' | 'failures') {
    const labels: Record<string, string> = {
      all: 'all analytics data (daily summaries + failure records)',
      summary: 'all daily summary records',
      failures: 'all failure analysis records',
    };
    if (!confirm(`Permanently delete ${labels[target]}? This cannot be undone.`)) return;
    setResetting(true);
    try {
      await fetch(`/api/analytics/reset?target=${target}`, { method: 'DELETE' });
      loadAnalytics();
    } finally {
      setResetting(false);
    }
  }

  const dayActions = (
    <div className="flex items-center gap-1">
      {DAYS_OPTIONS.map((d) => (
        <button
          key={d}
          onClick={() => setDays(d)}
          className={`filter-pill${days === d ? ' active' : ''}`}
        >
          {d}d
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        section="Generation Quality"
        title="Analytics"
        actions={dayActions}
      />

      {loading && (
        <div className="py-12 text-center text-sm text-[var(--foreground-muted)]">Loading…</div>
      )}

      {!loading && data && (
        <div className="space-y-4">
          {/* KPI strip */}
          <div className="flex flex-wrap gap-3">
            <DataStat
              size="compact"
              label="Success Rate"
              value={pct(data.summary.successRate)}
              accent={data.summary.successRate >= 0.8 ? 'success' : data.summary.successRate >= 0.5 ? 'warning' : 'error'}
            />
            <DataStat
              size="compact"
              label="Avg Audit Score"
              value={data.summary.avgAuditScore || '—'}
              accent={data.summary.avgAuditScore >= 85 ? 'success' : data.summary.avgAuditScore >= 70 ? 'warning' : 'error'}
            />
            <DataStat
              size="compact"
              label="Total Attempts"
              value={fmt(data.summary.totalAttempts)}
              accent="blue"
            />
            <DataStat
              size="compact"
              label="Top Failure"
              value={data.summary.topFailureCategory?.replace(/-/g, ' ') ?? '—'}
              accent="warning"
            />
          </div>

          {/* Two-column grid */}
          <div className="grid gap-4 xl:grid-cols-2">
            {/* Top failure rules */}
            <div className="command-panel overflow-hidden">
              <div className="border-b border-[var(--border)] px-4 py-2.5">
                <div className="panel-title">Top Failure Rules</div>
              </div>
              {data.topRules.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[var(--foreground-muted)]">No failure data in this period.</div>
              ) : (
                <table className="table-dense">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>#</th>
                      <th><SortHeader field="rule" label="Rule" current={ruleSort} dir={ruleSortDir} onSort={makeSortHandler(ruleSort, ruleSortDir, setRuleSort, setRuleSortDir)} /></th>
                      <th style={{ width: 60 }}><SortHeader field="count" label="Count" current={ruleSort} dir={ruleSortDir} onSort={makeSortHandler(ruleSort, ruleSortDir, setRuleSort, setRuleSortDir)} align="right" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.topRules].sort((a, b) => cmp(a[ruleSort], b[ruleSort], ruleSortDir)).map((row, i) => (
                      <tr key={row.rule} className="hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="text-[var(--foreground-subtle)] text-[10px] font-mono">{i + 1}</td>
                        <td className="font-mono text-[12px] text-foreground">{row.rule}</td>
                        <td className="text-right font-mono text-[12px] text-[var(--foreground-muted)]">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* By bundle */}
            <div className="command-panel overflow-hidden">
              <div className="border-b border-[var(--border)] px-4 py-2.5">
                <div className="panel-title">By Bundle</div>
              </div>
              {data.byBundle.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[var(--foreground-muted)]">No data in this period.</div>
              ) : (
                <table className="table-dense">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}><SortHeader field="bundle" label="Bundle" current={bundleSort} dir={bundleSortDir} onSort={makeSortHandler(bundleSort, bundleSortDir, setBundleSort, setBundleSortDir)} /></th>
                      <th>Rate</th>
                      <th style={{ width: 52 }}><SortHeader field="rate" label="%" current={bundleSort} dir={bundleSortDir} onSort={makeSortHandler(bundleSort, bundleSortDir, setBundleSort, setBundleSortDir)} align="right" /></th>
                      <th style={{ width: 48 }}><SortHeader field="avgScore" label="Score" current={bundleSort} dir={bundleSortDir} onSort={makeSortHandler(bundleSort, bundleSortDir, setBundleSort, setBundleSortDir)} align="right" /></th>
                      <th style={{ width: 70 }}><SortHeader field="attempts" label="Attempts" current={bundleSort} dir={bundleSortDir} onSort={makeSortHandler(bundleSort, bundleSortDir, setBundleSort, setBundleSortDir)} align="right" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.byBundle].sort((a, b) => {
                      if (bundleSort === 'rate') {
                        const ra = a.attempts > 0 ? a.successes / a.attempts : 0;
                        const rb = b.attempts > 0 ? b.successes / b.attempts : 0;
                        return cmp(ra, rb, bundleSortDir);
                      }
                      return cmp(a[bundleSort], b[bundleSort], bundleSortDir);
                    }).map((row) => {
                      const rate = row.attempts > 0 ? row.successes / row.attempts : 0;
                      return (
                        <tr key={row.bundle} className="hover:bg-[rgba(255,255,255,0.02)]">
                          <td className="font-mono text-[12px] capitalize text-foreground">{row.bundle.replace('_', ' ')}</td>
                          <td>
                            <div className="relative h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{ width: `${Math.round(rate * 100)}%`, background: rateColor(rate) }}
                              />
                            </div>
                          </td>
                          <td className="text-right font-mono text-[12px]" style={{ color: rateColor(rate) }}>{pct(rate)}</td>
                          <td className="text-right font-mono text-[11px]" style={{ color: scoreColor(row.avgScore) }}>{row.avgScore || '—'}</td>
                          <td className="text-right text-[11px] text-[var(--foreground-subtle)]">{fmt(row.attempts)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Daily trend */}
          {data.dailyTrend.length > 0 && (
            <div className="command-panel overflow-hidden">
              <div className="border-b border-[var(--border)] px-4 py-2.5">
                <div className="panel-title">Daily Trend</div>
              </div>
              <div className="overflow-x-auto">
                <table className="table-dense" style={{ minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th><SortHeader field="date" label="Date" current={trendSort} dir={trendSortDir} onSort={makeSortHandler(trendSort, trendSortDir, setTrendSort, setTrendSortDir)} /></th>
                      <th style={{ width: 90 }}><SortHeader field="totalAttempts" label="Attempts" current={trendSort} dir={trendSortDir} onSort={makeSortHandler(trendSort, trendSortDir, setTrendSort, setTrendSortDir)} align="right" /></th>
                      <th style={{ width: 80 }}><SortHeader field="successRate" label="Success" current={trendSort} dir={trendSortDir} onSort={makeSortHandler(trendSort, trendSortDir, setTrendSort, setTrendSortDir)} align="right" /></th>
                      <th style={{ width: 90 }}><SortHeader field="avgScore" label="Avg Score" current={trendSort} dir={trendSortDir} onSort={makeSortHandler(trendSort, trendSortDir, setTrendSort, setTrendSortDir)} align="right" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.dailyTrend].sort((a, b) => cmp(a[trendSort], b[trendSort], trendSortDir)).map((row) => (
                      <tr key={row.date} className="hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="font-mono text-[12px] text-foreground">{row.date}</td>
                        <td className="text-right font-mono text-[12px] text-[var(--foreground-muted)]">{fmt(row.totalAttempts)}</td>
                        <td className="text-right font-mono text-[12px]" style={{ color: rateColor(row.successRate) }}>{pct(row.successRate)}</td>
                        <td className="text-right font-mono text-[12px]" style={{ color: scoreColor(row.avgScore) }}>
                          {row.avgScore ? Math.round(row.avgScore) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent failures */}
          {data.recentFailures.length > 0 && (
            <div className="command-panel overflow-hidden">
              <div className="border-b border-[var(--border)] px-4 py-2.5">
                <div className="panel-title">Recent Failures</div>
              </div>
              <table className="table-dense">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}><SortHeader field="bundle" label="Bundle" current={failSort} dir={failSortDir} onSort={makeSortHandler(failSort, failSortDir, setFailSort, setFailSortDir)} /></th>
                    <th style={{ width: 130 }}><SortHeader field="category" label="Category" current={failSort} dir={failSortDir} onSort={makeSortHandler(failSort, failSortDir, setFailSort, setFailSortDir)} /></th>
                    <th>Top Issue</th>
                    <th style={{ width: 56 }}><SortHeader field="score" label="Score" current={failSort} dir={failSortDir} onSort={makeSortHandler(failSort, failSortDir, setFailSort, setFailSortDir)} align="right" /></th>
                    <th style={{ width: 90 }}><SortHeader field="timestamp" label="Date" current={failSort} dir={failSortDir} onSort={makeSortHandler(failSort, failSortDir, setFailSort, setFailSortDir)} align="right" /></th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.recentFailures].sort((a, b) => cmp(a[failSort], b[failSort], failSortDir)).map((row) => (
                    <tr key={row.id} className="hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="font-mono text-[12px] capitalize text-foreground">{row.bundle}</td>
                      <td>
                        <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground-subtle)]">
                          {row.category.replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td className="text-[12px] text-[var(--foreground-muted)] truncate max-w-[240px]">{row.topIssue ?? '—'}</td>
                      <td className="text-right font-mono text-[12px]" style={{ color: scoreColor(row.score) }}>{row.score}</td>
                      <td className="text-right text-[10px] font-mono text-[var(--foreground-subtle)]">
                        {new Date(row.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.summary.totalAttempts === 0 && (
            <div className="command-panel px-5 py-12 text-center">
              <div className="text-sm text-[var(--foreground-muted)]">No generation attempts recorded in the last {days} days.</div>
              <div className="mt-1 text-xs text-[var(--foreground-subtle)]">Run a generation job to start collecting analytics.</div>
            </div>
          )}

          {/* Data management */}
          <div className="command-panel overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-2.5">
              <div className="panel-title">Data Management</div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {/* Retention */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-[12px] font-medium text-foreground">Retention Period</div>
                  <div className="text-[11px] text-[var(--foreground-subtle)]">Daily summary records older than this are considered stale. Does not auto-delete — applies to query window cap.</div>
                </div>
                <div className="flex items-center gap-2 ml-6 shrink-0">
                  <div className="flex items-center gap-1">
                    {RETENTION_OPTIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => saveRetention(d)}
                        disabled={retentionSaving}
                        className={`filter-pill${retentionDays === d ? ' active' : ''}`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                  {retentionSaved && (
                    <span className="text-[10px] font-mono text-[var(--success)]">saved</span>
                  )}
                </div>
              </div>

              {/* Reset summary */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-[12px] font-medium text-foreground">Reset Daily Summaries</div>
                  <div className="text-[11px] text-[var(--foreground-subtle)]">Permanently deletes all records in <span className="font-mono">performance_summary</span>.</div>
                </div>
                <button
                  onClick={() => handleReset('summary')}
                  disabled={resetting}
                  className="btn btn-ghost ml-6 shrink-0 text-[var(--warning)]"
                >
                  {resetting ? 'Resetting…' : 'Reset Summaries'}
                </button>
              </div>

              {/* Reset failures */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-[12px] font-medium text-foreground">Reset Failure Records</div>
                  <div className="text-[11px] text-[var(--foreground-subtle)]">Permanently deletes all records in <span className="font-mono">failure_analysis</span>.</div>
                </div>
                <button
                  onClick={() => handleReset('failures')}
                  disabled={resetting}
                  className="btn btn-ghost ml-6 shrink-0 text-[var(--warning)]"
                >
                  {resetting ? 'Resetting…' : 'Reset Failures'}
                </button>
              </div>

              {/* Reset all */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-[12px] font-medium text-foreground">Reset All Analytics</div>
                  <div className="text-[11px] text-[var(--foreground-subtle)]">Permanently deletes both collections. Cannot be undone.</div>
                </div>
                <button
                  onClick={() => handleReset('all')}
                  disabled={resetting}
                  className="btn btn-destructive ml-6 shrink-0"
                >
                  {resetting ? 'Resetting…' : 'Reset All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
