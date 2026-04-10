'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuditScore from '@/components/AuditScore';
import BundleBadge from '@/components/BundleBadge';
import PageHeader from '@/components/PageHeader';
import SeverityBadge from '@/components/SeverityBadge';
import SortHeader, { useSort } from '@/components/SortHeader';
import { ALL_BUNDLES, formatShortDate } from '@/lib/constants';
import type { ScenarioSummary } from '@/lib/types';

type ScenarioSortField = 'title' | 'bundle' | 'severity' | 'auditScore' | 'countryCount' | 'scopeTier' | 'isActive' | 'createdAt' | 'updatedAt';

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
  const [countryCountFilter, setCountryCountFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(25);
  const [cursors, setCursors] = useState<string[]>([]);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState<'activate' | 'deactivate' | null>(null);
  const [rebuildingBundles, setRebuildingBundles] = useState(false);
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [tagResolutionFilter, setTagResolutionFilter] = useState<string>('all');

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
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
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

  useEffect(() => { setSelectedIds(new Set()); setCountryCountFilter('all'); }, [bundle, active, page]);

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

  async function rebuildBundles() {
    setRebuildingBundles(true);
    try {
      const res = await fetch('/api/bundles/rebuild', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { total } = await res.json();
      alert(`Bundles rebuilt successfully. ${total} active scenarios exported.`);
    } catch (err) {
      alert(`Bundle rebuild failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRebuildingBundles(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function selectAll() { setSelectedIds(new Set(filteredScenarios.map((s) => s.id))); }
  function clearSelection() { setSelectedIds(new Set()); }

  const INITIAL_COL_WIDTHS = { checkbox: 36, title: 240, bundle: 100, severity: 80, audit: 56, tags: 80, scope: 90, state: 56, created: 100, updated: 100 };
  type ColKey = keyof typeof INITIAL_COL_WIDTHS;
  const [colWidths, setColWidths] = useState(INITIAL_COL_WIDTHS);
  const resizeDrag = useRef<{ col: ColKey; startX: number; startWidth: number } | null>(null);

  function startColResize(e: React.MouseEvent, col: ColKey) {
    e.preventDefault();
    e.stopPropagation();
    resizeDrag.current = { col, startX: e.clientX, startWidth: colWidths[col] };
    function onMove(me: MouseEvent) {
      if (!resizeDrag.current) return;
      setColWidths(prev => ({ ...prev, [resizeDrag.current!.col]: Math.max(40, resizeDrag.current!.startWidth + (me.clientX - resizeDrag.current!.startX)) }));
    }
    function onUp() { resizeDrag.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const { sortField, sortDir, handleSort, compare } = useSort<ScenarioSortField>('title');

  const SEVERITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

  const filteredScenarios = useMemo(() => {
    const base = data?.scenarios.filter((s) => {
      if (localSearch && !s.title.toLowerCase().includes(localSearch.toLowerCase())) return false;
      if (severityFilter !== 'all' && s.severity !== severityFilter) return false;
      if (countryCountFilter !== 'all') {
        const cc = s.countryCount ?? 0;
        if (countryCountFilter === '0' && cc !== 0) return false;
        if (countryCountFilter === '1-10' && (cc < 1 || cc > 10)) return false;
        if (countryCountFilter === '11-50' && (cc < 11 || cc > 50)) return false;
        if (countryCountFilter === '50+' && cc <= 50) return false;
      }
      if (tagFilter !== 'all' && !s.tags.includes(tagFilter)) return false;
      if (tagResolutionFilter !== 'all') {
        const status = s.tagResolutionStatus ?? 'unresolved';
        if (tagResolutionFilter !== status) return false;
      }
      return true;
    }) ?? [];
    return [...base].sort((a, b) => {
      if (sortField === 'severity') {
        return compare(SEVERITY_ORDER[a.severity ?? ''] ?? -1, SEVERITY_ORDER[b.severity ?? ''] ?? -1);
      }
      if (sortField === 'isActive') {
        return compare(a.isActive ? 1 : 0, b.isActive ? 1 : 0);
      }
      if (sortField === 'scopeTier') {
        return compare(a.scopeTier ?? '', b.scopeTier ?? '');
      }
      return compare(a[sortField], b[sortField]);
    });
  }, [data, localSearch, severityFilter, countryCountFilter, tagFilter, tagResolutionFilter, sortField, sortDir]);

  const activeVisibleCount = filteredScenarios.filter((s) => s.isActive).length;
  const selectedVisibleCount = filteredScenarios.filter((s) => selectedIds.has(s.id)).length;

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    data?.scenarios.forEach((s) => s.tags?.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [data]);

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
      <select
        value={countryCountFilter}
        onChange={(e) => setCountryCountFilter(e.target.value)}
        className="input-shell"
        style={{ width: 'auto', minWidth: 120 }}
      >
        <option value="all">All countries</option>
        <option value="0">Global (0)</option>
        <option value="1-10">1–10 countries</option>
        <option value="11-50">11–50 countries</option>
        <option value="50+">50+ countries</option>
      </select>
      <select
        value={tagFilter}
        onChange={(e) => setTagFilter(e.target.value)}
        className="input-shell"
        style={{ width: 'auto', minWidth: 110 }}
      >
        <option value="all">All tags</option>
        {uniqueTags.map((t) => (
          <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
        ))}
      </select>
      <select
        value={tagResolutionFilter}
        onChange={(e) => setTagResolutionFilter(e.target.value)}
        className="input-shell"
        style={{ width: 'auto', minWidth: 110 }}
      >
        <option value="all">All resolution</option>
        <option value="unresolved">Unresolved</option>
        <option value="resolved">Resolved</option>
        <option value="manual">Manual</option>
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
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={rebuildBundles}
              disabled={rebuildingBundles}
              className="btn btn-ghost disabled:opacity-50"
              title="Re-export all scenario bundles to Firebase Storage so the iOS app picks up new scenarios"
            >
              {rebuildingBundles ? 'Rebuilding…' : 'Rebuild Bundles'}
            </button>
            <Link href="/generate" className="btn btn-tactical">+ Generate</Link>
          </div>
        }
        filterBar={filterBar}
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-2 flex items-center gap-3 rounded-[var(--radius-tight)] border border-[var(--border-strong)] bg-[var(--background-elevated)] px-3 py-2">
          <span className="text-[11px] font-mono text-[var(--foreground-muted)]">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedActiveState(true)} disabled={bulkUpdating !== null} className="btn btn-ghost disabled:opacity-50">
            {bulkUpdating === 'activate' ? 'Activating…' : 'Activate'}
          </button>
          <button onClick={() => setSelectedActiveState(false)} disabled={bulkUpdating !== null} className="btn btn-ghost disabled:opacity-50">
            {bulkUpdating === 'deactivate' ? 'Deactivating…' : 'Deactivate'}
          </button>
          <button
            onClick={() => {
              const ids = Array.from(selectedIds);
              if (ids.length > 50) { alert('Repair is limited to 50 scenarios at a time.'); return; }
              const params = new URLSearchParams();
              ids.forEach((id) => params.append('ids', id));
              router.push(`/scenarios/repair?${params.toString()}`);
            }}
            disabled={bulkUpdating !== null || deletingBulk}
            className="btn btn-ghost disabled:opacity-50"
          >
            Repair
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
              <col style={{ width: colWidths.checkbox }} />
              <col style={{ width: colWidths.title }} />
              <col style={{ width: colWidths.bundle }} />
              <col style={{ width: colWidths.severity }} />
              <col style={{ width: colWidths.audit }} />
              <col style={{ width: colWidths.tags }} />
              <col style={{ width: colWidths.scope }} />
              <col style={{ width: colWidths.state }} />
              <col style={{ width: colWidths.created }} />
              <col style={{ width: colWidths.updated }} />
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
                <th style={{ position: 'relative' }}>
                  <SortHeader field="title" label="Title" current={sortField} dir={sortDir} onSort={handleSort} />
                  <div onMouseDown={(e) => startColResize(e, 'title')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }} className="hover:bg-[var(--accent-primary)]/40" />
                </th>
                <th style={{ position: 'relative' }}>
                  <SortHeader field="bundle" label="Bundle" current={sortField} dir={sortDir} onSort={handleSort} />
                  <div onMouseDown={(e) => startColResize(e, 'bundle')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }} className="hover:bg-[var(--accent-primary)]/40" />
                </th>
                <th style={{ position: 'relative' }}>
                  <SortHeader field="severity" label="Severity" current={sortField} dir={sortDir} onSort={handleSort} />
                  <div onMouseDown={(e) => startColResize(e, 'severity')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }} className="hover:bg-[var(--accent-primary)]/40" />
                </th>
                <th style={{ position: 'relative' }}>
                  <SortHeader field="auditScore" label="Audit" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
                  <div onMouseDown={(e) => startColResize(e, 'audit')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }} className="hover:bg-[var(--accent-primary)]/40" />
                </th>
                <th style={{ position: 'relative' }}>
                  <span className="text-xs font-medium text-[var(--foreground-muted)]">Tags</span>
                  <div onMouseDown={(e) => startColResize(e, 'tags')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }} className="hover:bg-[var(--accent-primary)]/40" />
                </th>
                <th style={{ position: 'relative' }}>
                  <SortHeader field="scopeTier" label="Scope" current={sortField} dir={sortDir} onSort={handleSort} />
                  <div onMouseDown={(e) => startColResize(e, 'scope')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }} className="hover:bg-[var(--accent-primary)]/40" />
                </th>
                <th style={{ position: 'relative' }}>
                  <SortHeader field="isActive" label="State" current={sortField} dir={sortDir} onSort={handleSort} />
                  <div onMouseDown={(e) => startColResize(e, 'state')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }} className="hover:bg-[var(--accent-primary)]/40" />
                </th>
                <th style={{ position: 'relative' }}>
                  <SortHeader field="createdAt" label="Created" current={sortField} dir={sortDir} onSort={handleSort} />
                  <div onMouseDown={(e) => startColResize(e, 'created')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }} className="hover:bg-[var(--accent-primary)]/40" />
                </th>
                <th style={{ position: 'relative' }}>
                  <SortHeader field="updatedAt" label="Updated" current={sortField} dir={sortDir} onSort={handleSort} />
                  <div onMouseDown={(e) => startColResize(e, 'updated')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }} className="hover:bg-[var(--accent-primary)]/40" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredScenarios.map((scenario) => (
                <tr
                  key={scenario.id}
                  className={`group cursor-pointer hover:bg-[var(--surface-fill)] transition-colors ${scenario.isActive ? 'status-bar-active' : 'status-bar-inactive'}`}
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

                  <td>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[11px] text-[var(--foreground-muted)]">{scenario.tagCount ?? scenario.tags?.length ?? 0}</span>
                      {scenario.tagResolutionStatus === 'resolved' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] flex-shrink-0" title="Tags resolved" />
                      )}
                      {scenario.tagResolutionStatus === 'manual' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#818cf8] flex-shrink-0" title="Tags set manually" />
                      )}
                      {(!scenario.tagResolutionStatus || scenario.tagResolutionStatus === 'unresolved') && scenario.tagCount > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b] flex-shrink-0" title="Tags unresolved" />
                      )}
                      {scenario.gaiaReviewedAt && (
                        <span
                          title={`Reviewed by Gaia on ${new Date(scenario.gaiaReviewedAt).toLocaleDateString()}`}
                          className="text-[8px] font-bold text-[var(--accent-secondary)] leading-none"
                        >
                          G
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {scenario.conditionCount ? (
                          <span title="Has metric conditions" className="h-1.5 w-1.5 rounded-full bg-[#f59e0b] flex-shrink-0" />
                        ) : null}
                        <span className="font-mono text-[11px] text-[var(--foreground-muted)]">
                          {scenario.scopeTier ?? '—'}
                        </span>
                        {scenario.countryCount != null && scenario.countryCount > 0 && (
                          <span className="font-mono text-[10px] text-[var(--foreground-subtle)]">({scenario.countryCount})</span>
                        )}
                        {(scenario.conditionCount ?? 0) > 0 && (
                          <span className="font-mono text-[10px] text-[var(--warning)]">
                            C{scenario.conditionCount}
                          </span>
                        )}
                        {(scenario.relationshipConditionCount ?? 0) > 0 && (
                          <span className="font-mono text-[10px] text-[var(--accent-primary)]">
                            R{scenario.relationshipConditionCount}
                          </span>
                        )}
                      </div>
                      {scenario.conditionSummary ? (
                        <div className="truncate font-mono text-[10px] text-[var(--foreground-subtle)]" title={scenario.conditionSummary}>
                          {scenario.conditionSummary}
                        </div>
                      ) : null}
                    </div>
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleActive(scenario.id, scenario.isActive)}
                      disabled={toggling.has(scenario.id)}
                      className="flex items-center gap-1.5 disabled:opacity-50"
                      title={scenario.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${scenario.isActive ? 'bg-[var(--success)]' : 'bg-[var(--foreground-subtle)]'}`} />
                      <span className="text-[11px] font-medium text-[var(--foreground-subtle)] group-hover:text-[var(--foreground-muted)] transition-colors">
                        {scenario.isActive ? 'On' : 'Off'}
                      </span>
                    </button>
                  </td>

                  <td>
                    <span
                      className="text-[10px] font-mono text-[var(--foreground-subtle)]"
                      title={scenario.createdAt ? new Date(scenario.createdAt).toLocaleString() : undefined}
                    >
                      {scenario.createdAt ? formatShortDate(scenario.createdAt) : '—'}
                    </span>
                  </td>

                  <td>
                    <span
                      className="text-[10px] font-mono text-[var(--foreground-subtle)]"
                      title={scenario.updatedAt ? new Date(scenario.updatedAt).toLocaleString() : undefined}
                    >
                      {scenario.updatedAt ? formatShortDate(scenario.updatedAt) : '—'}
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
            <span className="text-[11px] font-medium text-[var(--foreground-subtle)]">Per page</span>
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
    <Suspense fallback={<div className="p-4 text-[var(--foreground-subtle)] text-sm">Loading…</div>}>
      <ScenariosInner />
    </Suspense>
  );
}
