'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BundleBadge from '@/components/BundleBadge';
import SeverityBadge from '@/components/SeverityBadge';
import AuditScore from '@/components/AuditScore';
import PageHeader from '@/components/PageHeader';
import { ALL_BUNDLES, formatRelativeTime } from '@/lib/constants';
import type { ScenarioSummary } from '@/lib/types';

interface ScenariosResponse {
  scenarios: ScenarioSummary[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

function ScenariosInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bundle = searchParams.get('bundle')?.trim() || 'all';
  const active = searchParams.get('active') ?? 'all';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const [data, setData] = useState<ScenariosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [cursors, setCursors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);

  const bundleOptions = useMemo(() => {
    const sortedBundles = [...ALL_BUNDLES].sort((a, b) => a.label.localeCompare(b.label));
    return [{ id: 'all', label: 'All bundles' }, ...sortedBundles];
  }, []);

  const bundleLabel =
    bundle === 'all'
      ? 'all bundles'
      : ALL_BUNDLES.find((b) => b.id === bundle)?.label ?? bundle;

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== 'page') params.delete('page');
      router.push(`/scenarios?${params.toString()}`);
    },
    [router, searchParams]
  );

  const cursor = page > 1 ? cursors[page - 2] : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ bundle, active });
    if (cursor) params.set('startAfter', cursor);

    fetch(`/api/scenarios?${params.toString()}`)
      .then((r) => r.json())
      .then((d: ScenariosResponse) => {
        if (!cancelled) {
          setData(d);
          if (d.nextCursor && page > cursors.length) {
            setCursors((prev) => {
              const next = [...prev];
              next[page - 1] = d.nextCursor!;
              return next;
            });
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load scenarios');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bundle, active, page, cursor]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [bundle, active, page]);

  async function toggleActive(id: string, current: boolean) {
    setToggling((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/scenarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarios: prev.scenarios.map((s) =>
            s.id === id ? { ...s, isActive: !current } : s
          ),
        };
      });
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function deleteScenario(id: string) {
    if (!confirm('Delete this scenario? This cannot be undone.')) return;
    await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, scenarios: prev.scenarios.filter((s) => s.id !== id) };
    });
  }

  const filteredScenarios = data?.scenarios.filter((s) =>
    localSearch ? s.title.toLowerCase().includes(localSearch.toLowerCase()) : true
  ) ?? [];

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelectedIds(new Set(filteredScenarios.map((s) => s.id)));
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }
  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} scenario${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeletingBulk(true);
    try {
      const res = await fetch('/api/scenarios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        const deleted = new Set(selectedIds);
        setData((prev) => {
          if (!prev) return prev;
          return { ...prev, scenarios: prev.scenarios.filter((s) => !deleted.has(s.id)) };
        });
        setSelectedIds(new Set());
      }
    } finally {
      setDeletingBulk(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader section="Browse" title="Scenarios" />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 tech-border bg-background-elevated">
        {/* Bundle select */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
            Bundle
          </label>
          <select
            value={bundle}
            onChange={(e) => {
              setCursors([]);
              setParam('bundle', e.target.value);
            }}
            className="bg-background border border-[var(--border-strong)] text-foreground text-xs font-mono px-2 py-1 rounded-[2px] focus:outline-none focus:border-accent"
          >
            {bundleOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active filter */}
        <div className="flex items-center gap-1">
          {(['all', 'true', 'false'] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setCursors([]); setParam('active', v); }}
              className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded-[2px] transition-colors ${
                active === v
                  ? 'bg-accent/20 text-accent'
                  : 'text-foreground-subtle hover:text-foreground hover:bg-background-muted'
              }`}
            >
              {v === 'all' ? 'All' : v === 'true' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search titles..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="bg-background border border-[var(--border-strong)] text-foreground text-xs font-mono px-2 py-1 rounded-[2px] focus:outline-none focus:border-accent placeholder-[var(--foreground-subtle)] min-w-[180px]"
        />

        {data && (
          <span className="text-[10px] font-mono text-foreground-subtle ml-auto">
            {data.total} total
          </span>
        )}
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="tech-border bg-background-elevated p-4 animate-pulse">
              <div className="h-4 bg-background-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-background-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="tech-border bg-background-elevated p-4 text-[var(--error)] text-sm">{error}</div>
      )}

      {!loading && !error && data && filteredScenarios.length === 0 && (
        <div className="tech-border bg-background-elevated p-8 text-center">
          <div className="text-foreground-subtle text-sm">
            No scenarios found{bundle !== 'all' ? ' for ' : ''}
            {bundle !== 'all' ? (
              <span className="text-foreground font-mono">{bundleLabel}</span>
            ) : null}
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-background-elevated border border-[var(--border-strong)] rounded-[2px]">
          <span className="text-xs font-mono text-foreground-subtle">{selectedIds.size} selected</span>
          <button
            onClick={deleteSelected}
            disabled={deletingBulk}
            className="btn btn-destructive disabled:opacity-50"
          >
            {deletingBulk ? 'Deleting…' : `Delete ${selectedIds.size}`}
          </button>
          <button
            onClick={clearSelection}
            className="btn btn-ghost"
          >
            Clear
          </button>
        </div>
      )}

      {!loading && !error && filteredScenarios.length > 0 && (
        <div className="tech-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-strong)] bg-background-elevated">
                <th className="px-4 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredScenarios.length && filteredScenarios.length > 0}
                    onChange={() => selectedIds.size === filteredScenarios.length ? clearSelection() : selectAll()}
                    className="accent-[var(--accent-primary)]"
                    aria-label="Select all scenarios"
                  />
                </th>
                <th className="text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
                  Title
                </th>
                <th className="text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle hidden md:table-cell">
                  Bundle
                </th>
                <th className="text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle hidden lg:table-cell">
                  Severity
                </th>
                <th className="text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle hidden lg:table-cell">
                  Audit
                </th>
                <th className="text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
                  Active
                </th>
                <th className="text-left px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle hidden xl:table-cell">
                  Created
                </th>
                <th className="text-right px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredScenarios.map((scenario, i) => (
                <tr
                  key={scenario.id}
                  onClick={(e) => {
                    // Don't navigate if clicking on interactive elements
                    if ((e.target as HTMLElement).closest('input, button, a')) return;
                    router.push(`/scenarios/${scenario.id}`);
                  }}
                  className={`border-b border-[var(--border)] hover:bg-background-muted transition-colors cursor-pointer ${
                    i % 2 === 0 ? 'bg-background' : 'bg-background-elevated/50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(scenario.id)}
                      onChange={() => toggleSelect(scenario.id)}
                      className="accent-[var(--accent-primary)]"
                      aria-label={`Select ${scenario.title}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-foreground font-medium">{scenario.title}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {scenario.bundle && <BundleBadge bundle={scenario.bundle} />}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <SeverityBadge severity={scenario.severity} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <AuditScore score={scenario.auditScore} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(scenario.id, scenario.isActive)}
                      disabled={toggling.has(scenario.id)}
                      className="flex items-center gap-1.5 group"
                      title={scenario.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <span
                        className={`w-2 h-2 rounded-full transition-colors ${
                          scenario.isActive ? 'bg-[var(--success)]' : 'bg-[var(--foreground-subtle)]'
                        }`}
                      />
                      <span className="text-[10px] font-mono text-foreground-subtle group-hover:text-foreground transition-colors">
                        {scenario.isActive ? 'Active' : 'Off'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="text-xs text-foreground-subtle font-mono">
                      {formatRelativeTime(scenario.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/scenarios/${scenario.id}`}
                        className="btn btn-ghost"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => deleteScenario(scenario.id)}
                        className="btn btn-destructive"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && (data.hasMore || page > 1) && (
        <div className="flex items-center gap-2 mt-4">
          {page > 1 && (
            <button
              onClick={() => setParam('page', String(page - 1))}
              className="btn btn-ghost"
            >
              ← Prev
            </button>
          )}
          <span className="text-xs font-mono text-foreground-subtle">Page {page}</span>
          {data.hasMore && (
            <button
              onClick={() => setParam('page', String(page + 1))}
              className="btn btn-ghost"
            >
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScenariosPage() {
  return (
    <Suspense fallback={<div className="p-6 text-foreground-subtle text-sm font-mono">Loading…</div>}>
      <ScenariosInner />
    </Suspense>
  );
}
