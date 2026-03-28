'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuditScore from '@/components/AuditScore';
import BundleBadge from '@/components/BundleBadge';
import PageHeader from '@/components/PageHeader';
import SeverityBadge from '@/components/SeverityBadge';
import SortHeader, { useSort } from '@/components/SortHeader';
import { ALL_BUNDLES, formatRelativeTime } from '@/lib/constants';
import type { ScenarioSummary } from '@/lib/types';

type ScenarioSortField = 'title' | 'bundle' | 'severity' | 'auditScore' | 'countryCount' | 'isActive' | 'updatedAt';

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
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(25);
  const [cursors, setCursors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState<'activate' | 'deactivate' | null>(null);

  const bundleOptions = useMemo(() => {
    const sortedBundles = [...ALL_BUNDLES].sort((a, b) => a.label.localeCompare(b.label));
    return [{ id: 'all', label: 'All bundles' }, ...sortedBundles];
  }, []);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
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
    const params = new URLSearchParams({ bundle, active, pageSize: String(pageSize) });
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
        if (!cancelled) { setError('Failed to load scenarios'); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [bundle, active, page, cursor, pageSize]);

  useEffect(() => { setSelectedIds(new Set()); }, [bundle, active, page]);

  async function toggleActive(id: string, current: boolean) {
    setToggling((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/scenarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
      });
      setData((prev) => prev ? {
        ...prev,
        scenarios: prev.scenarios.map((s) => s.id === id ? { ...s, isActive: !current } : s),
      } : prev);
    } finally {
      setToggling((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  async function setSelectedActiveState(nextIsActive: boolean) {
    if (selectedIds.size === 0) return;
    setBulkUpdating(nextIsActive ? 'activate' : 'deactivate');
    try {
      const res = await fetch('/api/scenarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), is_active: nextIsActive }),
      });
      if (!res.ok) throw new Error('Bulk update failed');
      setData((prev) => prev ? {
        ...prev,
        scenarios: prev.scenarios.map((s) => selectedIds.has(s.id) ? { ...s, isActive: nextIsActive } : s),
      } : prev);
    } finally {
      setBulkUpdating(null);
    }
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
        setData((prev) => prev ? { ...prev, scenarios: prev.scenarios.filter((s) => !deleted.has(s.id)) } : prev);
        setSelectedIds(new Set());
      }
    } finally {
      setDeletingBulk(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function selectAll() { setSelectedIds(new Set(filteredScenarios.map((s) => s.id))); }
  function clearSelection() { setSelectedIds(new Set()); }

  const { sortField, sortDir, handleSort, compare } = useSort<ScenarioSortField>('title');

  const SEVERITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

  const filteredScenarios = useMemo(() => {
    const base = data?.scenarios.filter((s) => {
      if (localSearch && !s.title.toLowerCase().includes(localSearch.toLowerCase())) return false;
      if (severityFilter !== 'all' && s.severity !== severityFilter) return false;
      return true;
    }) ?? [];
    return [...base].sort((a, b) => {
      if (sortField === 'severity') {
        return compare(SEVERITY_ORDER[a.severity ?? ''] ?? -1, SEVERITY_ORDER[b.severity ?? ''] ?? -1);
      }
      if (sortField === 'isActive') {
        return compare(a.isActive ? 1 : 0, b.isActive ? 1 : 0);
      }
      return compare(a[sortField], b[sortField]);
    });
  }, [data, localSearch, severityFilter, sortField, sortDir]);

  const activeVisibleCount = filteredScenarios.filter((s) => s.isActive).length;
  const selectedVisibleCount = filteredScenarios.filter((s) => selectedIds.has(s.id)).length;

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={bundle}
        onChange={(e) => { setCursors([]); setParam('bundle', e.target.value); }}
        className="input-shell"
        style={{ width: 'auto', minWidth: 130 }}
      >
        {bundleOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      <select
        value={severityFilter}
        onChange={(e) => setSeverityFilter(e.target.value)}
        className="input-shell"
        style={{ width: 'auto', minWidth: 100 }}
      >
        <option value="all">All severity</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
      <input
        type="text"
        placeholder="Search titles…"
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        className="input-shell flex-1"
        style={{ minWidth: 140, maxWidth: 240 }}
      />
      {(['all', 'true', 'false'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => { setCursors([]); setParam('active', v); }}
          className={`filter-pill${active === v ? ' active' : ''}`}
        >
          {v === 'all' ? 'All' : v === 'true' ? 'Active' : 'Inactive'}
        </button>
      ))}
      <span className="ml-auto text-[10px] font-mono text-[var(--foreground-subtle)]">
        {filteredScenarios.length} record{filteredScenarios.length !== 1 ? 's' : ''}
        {selectedVisibleCount > 0 ? ` · ${selectedVisibleCount} selected` : ''}
        {activeVisibleCount > 0 ? ` · ${activeVisibleCount} active` : ''}
      </span>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        section="Library"
        title="Scenario Management"
        actions={<Link href="/generate" className="btn btn-tactical">+ Generate</Link>}
        filterBar={filterBar}
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-2 flex items-center gap-3 rounded-[var(--radius-tight)] border border-[var(--border-strong)] bg-[rgba(255,255,255,0.04)] px-3 py-2">
          <span className="text-[11px] font-mono text-[var(--foreground-muted)]">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedActiveState(true)} disabled={bulkUpdating !== null} className="btn btn-ghost disabled:opacity-50">
            {bulkUpdating === 'activate' ? 'Activating…' : 'Activate'}
          </button>
          <button onClick={() => setSelectedActiveState(false)} disabled={bulkUpdating !== null} className="btn btn-ghost disabled:opacity-50">
            {bulkUpdating === 'deactivate' ? 'Deactivating…' : 'Deactivate'}
          </button>
          <button onClick={deleteSelected} disabled={deletingBulk} className="btn btn-destructive disabled:opacity-50">
            {deletingBulk ? 'Deleting…' : `Delete ${selectedIds.size}`}
          </button>
          <button onClick={clearSelection} className="btn btn-ghost ml-auto">Clear</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="command-panel overflow-hidden p-4 space-y-px">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-[var(--background-muted)]" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="command-panel p-4 text-[var(--error)] text-sm">{error}</div>
      )}

      {!loading && !error && data && filteredScenarios.length === 0 && (
        <div className="command-panel p-8 text-center text-sm text-[var(--foreground-subtle)]">
          No scenarios found{bundle !== 'all' ? ` for ${ALL_BUNDLES.find((b) => b.id === bundle)?.label ?? bundle}` : ''}.
        </div>
      )}

      {!loading && !error && filteredScenarios.length > 0 && (
        <div className="command-panel overflow-hidden">
          <table className="table-dense" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col />
              <col style={{ width: 120 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 64 }} />
              <col style={{ width: 56 }} />
              <col style={{ width: 56 }} />
              <col style={{ width: 80 }} />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredScenarios.length && filteredScenarios.length > 0}
                    onChange={() => selectedIds.size === filteredScenarios.length ? clearSelection() : selectAll()}
                    className="accent-[var(--accent-primary)]"
                  />
                </th>
                <th><SortHeader field="title" label="Title" current={sortField} dir={sortDir} onSort={handleSort} /></th>
                <th><SortHeader field="bundle" label="Bundle" current={sortField} dir={sortDir} onSort={handleSort} /></th>
                <th><SortHeader field="severity" label="Severity" current={sortField} dir={sortDir} onSort={handleSort} /></th>
                <th><SortHeader field="auditScore" label="Audit" current={sortField} dir={sortDir} onSort={handleSort} align="right" /></th>
                <th><SortHeader field="countryCount" label="Cntrs" current={sortField} dir={sortDir} onSort={handleSort} align="right" /></th>
                <th><SortHeader field="isActive" label="State" current={sortField} dir={sortDir} onSort={handleSort} /></th>
                <th><SortHeader field="updatedAt" label="Updated" current={sortField} dir={sortDir} onSort={handleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {filteredScenarios.map((scenario) => (
                <tr
                  key={scenario.id}
                  className="group cursor-pointer hover:bg-[rgba(255,255,255,0.035)]"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('input,button,a')) return;
                    router.push(`/scenarios/${scenario.id}`);
                  }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(scenario.id)}
                      onChange={() => toggleSelect(scenario.id)}
                      className="accent-[var(--accent-primary)]"
                    />
                  </td>

                  <td>
                    <span className="text-[13px] font-medium text-foreground truncate block">{scenario.title}</span>
                  </td>

                  <td>
                    <span className="truncate block">
                      {scenario.bundle ? <BundleBadge bundle={scenario.bundle} /> : <span className="text-[var(--foreground-subtle)]">—</span>}
                    </span>
                  </td>

                  <td>
                    <SeverityBadge severity={scenario.severity} />
                  </td>

                  <td className="text-right">
                    <AuditScore score={scenario.auditScore} />
                  </td>

                  <td className="text-right">
                    <span className="font-mono text-[11px] text-[var(--foreground-muted)]">
                      {scenario.countryCount ?? '—'}
                    </span>
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleActive(scenario.id, scenario.isActive)}
                      disabled={toggling.has(scenario.id)}
                      className="flex items-center gap-1.5 disabled:opacity-50"
                      title={scenario.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${scenario.isActive ? 'bg-[var(--success)]' : 'bg-[var(--foreground-subtle)]'}`} />
                      <span className="text-[10px] font-mono text-[var(--foreground-subtle)] group-hover:text-[var(--foreground-muted)] transition-colors">
                        {scenario.isActive ? 'On' : 'Off'}
                      </span>
                    </button>
                  </td>

                  <td>
                    <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">
                      {scenario.updatedAt ? formatRelativeTime(scenario.updatedAt) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && (
        <div className="mt-3 flex items-center gap-3">
          {page > 1 && (
            <button onClick={() => setParam('page', String(page - 1))} className="btn btn-ghost">← Prev</button>
          )}
          <span className="text-[11px] font-mono text-[var(--foreground-subtle)]">Page {page}</span>
          {data.hasMore && (
            <button onClick={() => setParam('page', String(page + 1))} className="btn btn-ghost">Next →</button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--foreground-subtle)]">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCursors([]); setParam('page', '1'); }}
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
    </div>
  );
}

export default function ScenariosPage() {
  return (
    <Suspense fallback={<div className="p-4 text-[var(--foreground-subtle)] text-sm font-mono">Loading…</div>}>
      <ScenariosInner />
    </Suspense>
  );
}
