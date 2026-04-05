'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CommandPanel from '@/components/CommandPanel';
import OperationsNav from '@/components/OperationsNav';
import ScreenHeader from '@/components/ScreenHeader';
import SortHeader, { useSort } from '@/components/SortHeader';
import DataStat from '@/components/DataStat';
import type {
  PatchTokenRegistryRequest,
  RejectionStatus,
  ResolveRejectedTokenAction,
  TokenCategory,
  TokenDefinition,
  TokenRegistryDocument,
  TokenRegistryOperation,
  TokenRegistrySummary,
  TokenRejectionDocument,
} from '@shared/token-registry-contract';

const TOKEN_CATEGORIES: TokenCategory[] = [
  'executive',
  'legislative',
  'judicial',
  'ministers',
  'security',
  'military',
  'economic',
  'local',
  'media',
  'relationships',
  'geography',
  'amounts',
  'context',
];



interface RegistryResponse {
  summary: TokenRegistrySummary;
  registry: TokenRegistryDocument;
}

interface RejectionsResponse {
  rejections: TokenRejectionDocument[];
  total: number;
}

export default function TokenRegistryPage() {
  const [tab, setTab] = useState<'operations' | 'rejections'>('operations');

  const [registryData, setRegistryData] = useState<RegistryResponse | null>(null);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [registryMessage, setRegistryMessage] = useState<string | null>(null);
  const [pendingOps, setPendingOps] = useState<TokenRegistryOperation[]>([]);
  const [applyingOps, setApplyingOps] = useState(false);

  // Tokens
  const [tokenName, setTokenName] = useState('');
  const [tokenCategory, setTokenCategory] = useState<TokenCategory>('context');
  const [tokenDescription, setTokenDescription] = useState('');
  const [tokenEnabled, setTokenEnabled] = useState(true);
  const [tokenArticleEnabled, setTokenArticleEnabled] = useState(false);
  const [deleteTokenName, setDeleteTokenName] = useState('');

  // Aliases
  const [aliasName, setAliasName] = useState('');
  const [aliasTarget, setAliasTarget] = useState('');
  const [aliasNote, setAliasNote] = useState('');
  const [deleteAliasName, setDeleteAliasName] = useState('');

  // Concepts
  const [conceptId, setConceptId] = useState('');
  const [conceptText, setConceptText] = useState('');
  const [conceptTokenName, setConceptTokenName] = useState('');
  const [conceptOrder, setConceptOrder] = useState(0);
  const [conceptEnabled, setConceptEnabled] = useState(true);
  const [deleteConceptId, setDeleteConceptId] = useState('');

  // Rejections
  const [rejections, setRejections] = useState<TokenRejectionDocument[]>([]);
  const [rejectionsLoading, setRejectionsLoading] = useState(true);
  const [rejectionsMessage, setRejectionsMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | RejectionStatus>('all');
  const rejSort = useSort<'count' | 'lastSeen'>('count', 'desc');
  const [limit, setLimit] = useState(100);
  
  const [resolvingTokenName, setResolvingTokenName] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<'alias' | 'addToken' | null>(null);
  const [resolveState, setResolveState] = useState<{targetToken: string, category: TokenCategory, desc: string, note: string}>({ targetToken: '', category: 'context', desc: '', note: '' });

  const tokenNames = useMemo(
    () => Object.keys(registryData?.registry.tokensByName ?? {}).sort((a, b) => a.localeCompare(b)),
    [registryData]
  );

  const fetchRegistry = useCallback(async () => {
    setRegistryLoading(true);
    try {
      const res = await fetch('/api/token-registry', { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setRegistryMessage(err.error ?? 'Failed to load token registry');
        setRegistryData(null);
        return;
      }
      const data = (await res.json()) as RegistryResponse;
      setRegistryData(data);
      setRegistryMessage(null);
    } catch {
      setRegistryMessage('Network error while loading token registry');
      setRegistryData(null);
    } finally {
      setRegistryLoading(false);
    }
  }, []);

  const fetchRejections = useCallback(async () => {
    setRejectionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('sort', rejSort.sortField === 'lastSeen' ? 'lastSeenAt' : 'count');
      params.set('limit', String(limit));
      const res = await fetch(`/api/token-registry/rejections?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setRejectionsMessage(err.error ?? 'Failed to load token rejections');
        setRejections([]);
        return;
      }
      const data = (await res.json()) as RejectionsResponse;
      
      // Post-sort to ensure direction
      const sorted = [...data.rejections].sort((a, b) => {
        if (rejSort.sortField === 'lastSeen') return rejSort.compare(a.lastSeenAt, b.lastSeenAt);
        return rejSort.compare(a.count, b.count);
      });
      
      setRejections(sorted);
      setRejectionsMessage(null);
    } catch {
      setRejectionsMessage('Network error while loading token rejections');
      setRejections([]);
    } finally {
      setRejectionsLoading(false);
    }
  }, [limit, rejSort, statusFilter]);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  useEffect(() => {
    fetchRejections();
  }, [fetchRejections]);

  function queueOperation(op: TokenRegistryOperation) {
    setPendingOps(prev => [...prev, op]);
  }

  async function applyOperations() {
    if (!registryData || pendingOps.length === 0) return;
    setApplyingOps(true);
    setRegistryMessage(null);
    try {
      const payload: PatchTokenRegistryRequest = {
        expectedVersion: registryData.summary.version,
        operations: pendingOps,
      };
      const res = await fetch('/api/token-registry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          setRegistryMessage(
            `Version conflict (expected ${String(data.expectedVersion)}, current ${String(data.currentVersion)}). Refresh and retry.`
          );
        } else {
          setRegistryMessage(data.error ?? 'Failed to apply operations');
        }
        return;
      }
      setRegistryMessage(`Applied ${pendingOps.length} ops. Version now ${String(data.version)}.`);
      setPendingOps([]);
      await fetchRegistry();
    } catch {
      setRegistryMessage('Network error while applying operations');
    } finally {
      setApplyingOps(false);
    }
  }

  async function resolveRejection(tokenNameParam: string) {
    if (!resolveAction) return;
    
    let body: ResolveRejectedTokenAction;
    
    if (resolveAction === 'alias') {
      const target = resolveState.targetToken.trim();
      if (!target) {
        setRejectionsMessage('Alias action requires a target token.');
        return;
      }
      body = { action: 'alias', targetToken: target, note: resolveState.note.trim() || undefined };
    } else if (resolveAction === 'addToken') {
      const token: TokenDefinition = {
        name: tokenNameParam,
        category: resolveState.category,
        enabled: true,
        description: resolveState.desc.trim() || undefined,
        articleForm: { enabled: false },
      };
      body = { action: 'addToken', token, note: resolveState.note.trim() || undefined };
    } else {
      return;
    }

    setResolvingTokenName(tokenNameParam);
    setRejectionsMessage(null);
    try {
      const res = await fetch(`/api/token-registry/rejections/${encodeURIComponent(tokenNameParam)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRejectionsMessage(data.error ?? `Failed to resolve ${tokenNameParam}`);
        return;
      }

      setRejectionsMessage(`${tokenNameParam} resolved as ${body.action}.`);
      setResolvingTokenName(null);
      setResolveAction(null);
      setResolveState({ targetToken: '', category: 'context', desc: '', note: '' });
      await Promise.all([fetchRejections(), fetchRegistry()]);
    } catch {
      setRejectionsMessage(`Network error while resolving ${tokenNameParam}`);
    } finally {
      setResolvingTokenName(null);
    }
  }
  
  async function resolveRejectionDismiss(tokenNameParam: string) {
    setResolvingTokenName(tokenNameParam);
    setRejectionsMessage(null);
    try {
      const body: ResolveRejectedTokenAction = { action: 'dismiss' };
      const res = await fetch(`/api/token-registry/rejections/${encodeURIComponent(tokenNameParam)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRejectionsMessage(data.error ?? `Failed to resolve ${tokenNameParam}`);
        return;
      }

      setRejectionsMessage(`${tokenNameParam} dismissed.`);
      await Promise.all([fetchRejections(), fetchRegistry()]);
    } catch {
      setRejectionsMessage(`Network error while resolving ${tokenNameParam}`);
    } finally {
      setResolvingTokenName(null);
    }
  }

  function getOpDescription(op: TokenRegistryOperation) {
    switch (op.op) {
      case 'upsertToken': return `Upsert token: ${op.token.name}`;
      case 'deleteToken': return `Delete token: ${op.tokenName}`;
      case 'upsertAlias': return `Upsert alias: ${op.alias.alias} → ${op.alias.targetToken}`;
      case 'deleteAlias': return `Delete alias: ${op.aliasName}`;
      case 'upsertConcept': return `Upsert concept: ${op.concept.id}`;
      case 'deleteConcept': return `Delete concept: ${op.conceptId}`;
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] flex flex-col gap-6 pb-20">
      <ScreenHeader
        section="Content Operations"
        title="Token Registry"
        subtitle="Manage canonical tokens, aliases, concept mappings, and rejected token resolution."
        eyebrow="Lexicon"
        nav={<OperationsNav />}
      />

      <div className="flex gap-4 mt-6 flex-col lg:flex-row items-start">
        {/* Main content: tabs + content */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setTab('operations')}
              className={`inline-flex min-h-[32px] items-center rounded-[8px] border px-3 py-1 text-xs font-medium transition-colors ${
                tab === 'operations'
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-foreground'
                  : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
              }`}
            >
              Operations
            </button>
            <button
              onClick={() => setTab('rejections')}
              className={`inline-flex min-h-[32px] items-center rounded-[8px] border px-3 py-1 text-xs font-medium transition-colors ${
                tab === 'rejections'
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-foreground'
                  : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
              }`}
            >
              Rejections
            </button>
          </div>

          {tab === 'operations' && (
            <div className="flex flex-col gap-4">
              <details open className="group border border-[var(--border-strong)] rounded-[8px] overflow-hidden bg-[rgba(255,255,255,0.01)]">
                <summary className="section-kicker cursor-pointer select-none p-4 hover:bg-[rgba(255,255,255,0.02)] list-none flex justify-between items-center">
                  <span>Tokens</span>
                  <span className="text-[10px] text-foreground-subtle group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="p-4 border-t border-[var(--border-strong)] flex flex-col xl:flex-row gap-6 bg-background">
                  {/* Upsert Token */}
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="text-xs font-medium text-foreground-muted mb-1">Upsert Token</div>
                    <div className="grid gap-2 grid-cols-1 md:grid-cols-2 xl:grid-cols-1">
                      <input className="input-shell text-xs py-1.5" value={tokenName} onChange={e => setTokenName(e.target.value)} placeholder="Token name" />
                      <select className="input-shell text-xs py-1.5" value={tokenCategory} onChange={e => setTokenCategory(e.target.value as TokenCategory)}>
                        {TOKEN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input className="input-shell text-xs py-1.5 md:col-span-2 xl:col-span-1" value={tokenDescription} onChange={e => setTokenDescription(e.target.value)} placeholder="Description (optional)" />
                      <div className="flex items-center gap-4 py-1">
                        <label className="flex items-center gap-2 text-xs text-foreground-muted cursor-pointer hover:text-foreground">
                          <input type="checkbox" checked={tokenEnabled} onChange={e => setTokenEnabled(e.target.checked)} className="accent-[var(--accent-primary)]" /> Enabled
                        </label>
                        <label className="flex items-center gap-2 text-xs text-foreground-muted cursor-pointer hover:text-foreground">
                          <input type="checkbox" checked={tokenArticleEnabled} onChange={e => setTokenArticleEnabled(e.target.checked)} className="accent-[var(--accent-primary)]" /> Article Form
                        </label>
                      </div>
                      <button
                        className="btn btn-ghost text-xs w-fit mt-1"
                        disabled={!tokenName.trim()}
                        onClick={() => {
                          queueOperation({ op: 'upsertToken', token: { name: tokenName.trim(), category: tokenCategory, enabled: tokenEnabled, description: tokenDescription.trim() || undefined, articleForm: { enabled: tokenArticleEnabled } } });
                          setTokenName(''); setTokenDescription('');
                        }}
                      >
                        Queue Upsert
                      </button>
                    </div>
                  </div>
                  
                  <div className="hidden xl:block w-px bg-[var(--border-strong)]" />
                  <div className="block xl:hidden h-px w-full bg-[var(--border-strong)]" />
                  
                  {/* Delete Token */}
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="text-xs font-medium text-[var(--error)] mb-1 opacity-80">Delete Token</div>
                    <div className="grid gap-2">
                      <input className="input-shell text-xs py-1.5" list="token-targets" value={deleteTokenName} onChange={e => setDeleteTokenName(e.target.value)} placeholder="Token name to delete" />
                      <button
                        className="btn btn-destructive text-xs w-fit mt-1"
                        disabled={!deleteTokenName.trim()}
                        onClick={() => { queueOperation({ op: 'deleteToken', tokenName: deleteTokenName.trim() }); setDeleteTokenName(''); }}
                      >
                        Queue Delete
                      </button>
                    </div>
                  </div>
                </div>
              </details>

              <details open className="group border border-[var(--border-strong)] rounded-[8px] overflow-hidden bg-[rgba(255,255,255,0.01)]">
                <summary className="section-kicker cursor-pointer select-none p-4 hover:bg-[rgba(255,255,255,0.02)] list-none flex justify-between items-center">
                  <span>Aliases</span>
                  <span className="text-[10px] text-foreground-subtle group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="p-4 border-t border-[var(--border-strong)] flex flex-col xl:flex-row gap-6 bg-background">
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="text-xs font-medium text-foreground-muted mb-1">Upsert Alias</div>
                    <div className="grid gap-2 grid-cols-1 md:grid-cols-2 xl:grid-cols-1">
                      <input className="input-shell text-xs py-1.5" value={aliasName} onChange={e => setAliasName(e.target.value)} placeholder="Alias name" />
                      <input className="input-shell text-xs py-1.5" list="token-targets" value={aliasTarget} onChange={e => setAliasTarget(e.target.value)} placeholder="Target token" />
                      <input className="input-shell text-xs py-1.5 md:col-span-2 xl:col-span-1" value={aliasNote} onChange={e => setAliasNote(e.target.value)} placeholder="Note (optional)" />
                      <button
                        className="btn btn-ghost text-xs w-fit mt-1"
                        disabled={!aliasName.trim() || !aliasTarget.trim()}
                        onClick={() => {
                          queueOperation({ op: 'upsertAlias', alias: { alias: aliasName.trim(), targetToken: aliasTarget.trim(), source: 'manual', note: aliasNote.trim() || undefined } });
                          setAliasName(''); setAliasTarget(''); setAliasNote('');
                        }}
                      >
                        Queue Upsert
                      </button>
                    </div>
                  </div>
                  
                  <div className="hidden xl:block w-px bg-[var(--border-strong)]" />
                  <div className="block xl:hidden h-px w-full bg-[var(--border-strong)]" />
                  
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="text-xs font-medium text-[var(--error)] mb-1 opacity-80">Delete Alias</div>
                    <div className="grid gap-2">
                      <input className="input-shell text-xs py-1.5" value={deleteAliasName} onChange={e => setDeleteAliasName(e.target.value)} placeholder="Alias name to delete" />
                      <button
                        className="btn btn-destructive text-xs w-fit mt-1"
                        disabled={!deleteAliasName.trim()}
                        onClick={() => { queueOperation({ op: 'deleteAlias', aliasName: deleteAliasName.trim() }); setDeleteAliasName(''); }}
                      >
                        Queue Delete
                      </button>
                    </div>
                  </div>
                </div>
              </details>

              <details open className="group border border-[var(--border-strong)] rounded-[8px] overflow-hidden bg-[rgba(255,255,255,0.01)]">
                <summary className="section-kicker cursor-pointer select-none p-4 hover:bg-[rgba(255,255,255,0.02)] list-none flex justify-between items-center">
                  <span>Concepts</span>
                  <span className="text-[10px] text-foreground-subtle group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="p-4 border-t border-[var(--border-strong)] flex flex-col xl:flex-row gap-6 bg-background">
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="text-xs font-medium text-foreground-muted mb-1">Upsert Concept</div>
                    <div className="grid gap-2 grid-cols-1 md:grid-cols-2 xl:grid-cols-1">
                      <input className="input-shell text-xs py-1.5" value={conceptId} onChange={e => setConceptId(e.target.value)} placeholder="Concept ID" />
                      <input className="input-shell text-xs py-1.5" value={conceptText} onChange={e => setConceptText(e.target.value)} placeholder="Concept text" />
                      <input className="input-shell text-xs py-1.5" list="token-targets" value={conceptTokenName} onChange={e => setConceptTokenName(e.target.value)} placeholder="Mapped token name" />
                      <div className="flex items-center gap-3 py-1">
                        <input type="number" className="input-shell text-xs py-1.5 w-24" value={conceptOrder} onChange={e => setConceptOrder(parseInt(e.target.value)||0)} placeholder="Order" />
                        <label className="flex items-center gap-2 text-xs text-foreground-muted cursor-pointer hover:text-foreground">
                          <input type="checkbox" checked={conceptEnabled} onChange={e => setConceptEnabled(e.target.checked)} className="accent-[var(--accent-primary)]" /> Enabled
                        </label>
                      </div>
                      <button
                        className="btn btn-ghost text-xs w-fit mt-1"
                        disabled={!conceptId.trim() || !conceptText.trim() || !conceptTokenName.trim()}
                        onClick={() => {
                          queueOperation({ op: 'upsertConcept', concept: { id: conceptId.trim(), concept: conceptText.trim(), tokenName: conceptTokenName.trim(), order: conceptOrder, enabled: conceptEnabled } });
                          setConceptId(''); setConceptText(''); setConceptTokenName(''); setConceptOrder(0);
                        }}
                      >
                        Queue Upsert
                      </button>
                    </div>
                  </div>
                  
                  <div className="hidden xl:block w-px bg-[var(--border-strong)]" />
                  <div className="block xl:hidden h-px w-full bg-[var(--border-strong)]" />
                  
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="text-xs font-medium text-[var(--error)] mb-1 opacity-80">Delete Concept</div>
                    <div className="grid gap-2">
                      <input className="input-shell text-xs py-1.5" value={deleteConceptId} onChange={e => setDeleteConceptId(e.target.value)} placeholder="Concept ID to delete" />
                      <button
                        className="btn btn-destructive text-xs w-fit mt-1"
                        disabled={!deleteConceptId.trim()}
                        onClick={() => { queueOperation({ op: 'deleteConcept', conceptId: deleteConceptId.trim() }); setDeleteConceptId(''); }}
                      >
                        Queue Delete
                      </button>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}

          {tab === 'rejections' && (
            <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="section-kicker">Rejections</div>
                  {rejections.filter(r => r.status === 'unresolved').length > 0 && (
                    <span className="text-[11px] font-bold bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/50 px-2 py-0.5 rounded-[4px]">
                      {rejections.filter(r => r.status === 'unresolved').length} Unresolved
                    </span>
                  )}
                </div>
                <button className="btn btn-ghost text-xs" onClick={fetchRejections} disabled={rejectionsLoading || !!resolvingTokenName}>Refresh</button>
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar shrink-0">
                  <button onClick={() => setStatusFilter('all')} className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}>All</button>
                  <button onClick={() => setStatusFilter('unresolved')} className={`filter-pill ${statusFilter === 'unresolved' ? 'active' : ''}`}>Unresolved</button>
                  <button onClick={() => setStatusFilter('aliased')} className={`filter-pill ${statusFilter === 'aliased' ? 'active' : ''}`}>Aliased</button>
                  <button onClick={() => setStatusFilter('added')} className={`filter-pill ${statusFilter === 'added' ? 'active' : ''}`}>Added</button>
                  <button onClick={() => setStatusFilter('dismissed')} className={`filter-pill ${statusFilter === 'dismissed' ? 'active' : ''}`}>Dismissed</button>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    className="input-shell text-xs py-1.5 w-24"
                    type="number"
                    min={1}
                    max={500}
                    value={limit}
                    onChange={e => {
                      const next = Number.parseInt(e.target.value || '100', 10);
                      setLimit(Math.min(Math.max(next, 1), 500));
                    }}
                    title="Limit"
                  />
                </div>
              </div>

              {rejectionsMessage ? (
                <div className="text-[11px] font-mono text-foreground-subtle">{rejectionsMessage}</div>
              ) : null}

              <div className="border border-[var(--border-strong)] rounded-[8px] overflow-hidden max-h-[600px] overflow-y-auto">
                <table className="table-dense w-full relative">
                  <thead className="sticky top-0 bg-background-muted z-10 shadow-[0_1px_0_var(--border-strong)]">
                    <tr>
                      <th className="w-1/4">Token Name</th>
                      <th className="w-24">Status</th>
                      <th className="w-24"><SortHeader field="count" label="Count" current={rejSort.sortField} dir={rejSort.sortDir} onSort={rejSort.handleSort} /></th>
                      <th className="w-32"><SortHeader field="lastSeen" label="Last Seen" current={rejSort.sortField} dir={rejSort.sortDir} onSort={rejSort.handleSort} /></th>
                      <th className="w-40 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejections.map(rej => (
                      <tr key={rej.tokenName}>
                        <td colSpan={5} className="p-0 border-0">
                          <div className={`flex items-center p-2 border-b border-[var(--border)] ${resolvingTokenName === rej.tokenName ? 'bg-background-muted' : 'hover:bg-background-muted/50'}`}>
                            <div className="w-1/4 font-mono font-bold text-xs truncate" title={rej.tokenName}>{rej.tokenName}</div>
                            <div className="w-24">
                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-[2px] ${rej.status === 'unresolved' ? 'bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/30' : 'bg-background-muted text-foreground-muted border border-[var(--border)]'}`}>
                                {rej.status}
                              </span>
                            </div>
                            <div className="w-24 font-mono text-foreground-subtle text-[10px]">{rej.count}</div>
                            <div className="w-32 text-foreground-subtle font-mono text-[10px]">{new Date(rej.lastSeenAt).toLocaleDateString()}</div>
                            <div className="flex-1 flex justify-end gap-1">
                              {rej.status === 'unresolved' && resolvingTokenName !== rej.tokenName && (
                                <>
                                  <button onClick={() => { setResolvingTokenName(rej.tokenName); setResolveAction('alias'); setResolveState({ targetToken: '', category: 'context', desc: '', note: '' }); }} className="btn btn-ghost text-[10px] py-1 px-2 border border-[var(--border-strong)]">Alias &rarr;</button>
                                  <button onClick={() => { setResolvingTokenName(rej.tokenName); setResolveAction('addToken'); setResolveState({ targetToken: '', category: 'context', desc: '', note: '' }); }} className="btn btn-command text-[10px] py-1 px-2">+ Add</button>
                                  <button onClick={() => resolveRejectionDismiss(rej.tokenName)} className="text-[10px] text-foreground-subtle hover:text-[var(--error)] p-1 ml-1 transition-colors">Dismiss</button>
                                </>
                              )}
                            </div>
                          </div>
                          {resolvingTokenName === rej.tokenName && (
                            <div className="p-4 bg-background-muted border-b border-[var(--border-strong)] flex flex-col gap-3 shadow-inner">
                              <div className="text-[11px] font-bold text-[var(--accent-primary)]">
                                {resolveAction === 'alias' ? 'Create Alias for Rejected Token' : 'Add Token from Rejected'}
                              </div>
                              {resolveAction === 'alias' ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-foreground-muted">Target Token</label>
                                    <input className="input-shell text-xs py-1.5" list="token-targets" value={resolveState.targetToken} onChange={e => setResolveState({...resolveState, targetToken: e.target.value})} placeholder="Select target..." />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-foreground-muted">Note (optional)</label>
                                    <input type="text" className="input-shell text-xs py-1.5" value={resolveState.note} onChange={e => setResolveState({...resolveState, note: e.target.value})} placeholder="Why alias?" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => { setResolvingTokenName(null); setResolveAction(null); }} className="btn btn-ghost text-xs">Cancel</button>
                                    <button disabled={!resolveState.targetToken || rejectionsLoading} onClick={() => resolveRejection(rej.tokenName)} className="btn btn-command text-xs">Save Alias</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-foreground-muted">Category</label>
                                    <select className="input-shell text-xs py-1.5 bg-background" value={resolveState.category} onChange={e => setResolveState({...resolveState, category: e.target.value as TokenCategory})}>
                                      {TOKEN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-[10px] text-foreground-muted">Description (optional)</label>
                                    <input type="text" className="input-shell text-xs py-1.5" value={resolveState.desc} onChange={e => setResolveState({...resolveState, desc: e.target.value})} placeholder="What is this?" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => { setResolvingTokenName(null); setResolveAction(null); }} className="btn btn-ghost text-xs">Cancel</button>
                                    <button disabled={rejectionsLoading} onClick={() => resolveRejection(rej.tokenName)} className="btn btn-command text-xs">Add Token</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {rejections.length === 0 && <tr><td colSpan={5} className="p-4 text-center italic text-foreground-muted text-xs">No rejections found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CommandPanel>
          )}
        </div>

        {/* Right sidebar: queue + stats (sticky) */}
        <div className="lg:w-80 w-full flex-shrink-0">
          <div className="sticky top-6 space-y-4">
            <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="section-kicker">Registry Snapshot</div>
                <button className="text-[10px] text-foreground-subtle hover:text-foreground underline" onClick={fetchRegistry} disabled={registryLoading || applyingOps}>Refresh</button>
              </div>
              
              {registryLoading ? (
                <div className="text-xs text-foreground-subtle py-2">Loading registry…</div>
              ) : registryData ? (
                <div className="grid grid-cols-2 gap-3">
                  <DataStat label="Version" value={String(registryData.summary.version)} size="compact" />
                  <DataStat label="Tokens" value={String(registryData.summary.tokenCount)} size="compact" />
                  <DataStat label="Aliases" value={String(registryData.summary.aliasCount)} size="compact" />
                  <DataStat label="Concepts" value={String(registryData.summary.conceptCount)} size="compact" />
                </div>
              ) : (
                <div className="text-xs text-[var(--error)]">{registryMessage ?? 'Registry unavailable'}</div>
              )}
            </CommandPanel>

            <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
              <div className="section-kicker">Queued Operations</div>
              
              {pendingOps.length === 0 ? (
                <div className="text-xs text-foreground-subtle italic py-2">No queued operations.</div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto no-scrollbar">
                  {pendingOps.map((op, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-[6px] bg-background-muted border border-[var(--border)] group">
                      <div className="text-[11px] font-mono text-foreground break-words pr-2">
                        <span className="text-[var(--accent-secondary)] mr-1">{i+1}.</span> 
                        {getOpDescription(op)}
                      </div>
                      <button 
                        className="text-[var(--error)] opacity-50 hover:opacity-100 p-0.5 mt-0.5 leading-none transition-opacity" 
                        onClick={() => setPendingOps(prev => prev.filter((_, index) => index !== i))}
                        title="Remove operation"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-strong)]">
                <button
                  className="btn btn-command w-full text-xs"
                  onClick={applyOperations}
                  disabled={applyingOps || pendingOps.length === 0 || !registryData}
                >
                  {applyingOps ? 'Applying…' : `Apply ${pendingOps.length} operation(s)`}
                </button>
                <button
                  className="btn btn-destructive w-full text-xs"
                  onClick={() => setPendingOps([])}
                  disabled={pendingOps.length === 0 || applyingOps}
                >
                  Clear queue
                </button>
              </div>
              
              {registryMessage && (
                <div className={`text-[11px] font-mono mt-1 ${registryMessage.includes('Version conflict') || registryMessage.includes('error') || registryMessage.includes('Failed') ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                  {registryMessage}
                </div>
              )}
            </CommandPanel>
          </div>
        </div>
      </div>

      <datalist id="token-targets">
        {tokenNames.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
