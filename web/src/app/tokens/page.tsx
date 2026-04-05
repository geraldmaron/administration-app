'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import CommandPanel from '@/components/CommandPanel';
import ScreenHeader from '@/components/ScreenHeader';
import DataStat from '@/components/DataStat';
import SortHeader, { useSort } from '@/components/SortHeader';
import type {
  TokenRegistryDocument,
  TokenRegistrySummary,
  TokenDefinition,
  TokenCategory,
  TokenRejectionDocument,
  TokenRegistryOperation,
  TokenAliasDefinition,
  ConceptMappingDefinition,
} from '@shared/token-registry-contract';

type ResolveRejectedTokenAction =
  | { action: 'alias'; targetToken: string; note?: string }
  | { action: 'addToken'; token: TokenDefinition; note?: string }
  | { action: 'dismiss'; note?: string };

const CATEGORIES: TokenCategory[] = [
  'executive', 'legislative', 'judicial', 'ministers', 'security', 'military',
  'economic', 'local', 'media', 'relationships', 'geography', 'amounts', 'context'
];

const REGIONS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Middle East', 'Caribbean', 'Central America']; // Best effort regions, will be extracted dynamically

interface CountryBasic {
  id: string;
  name: string;
  region: string;
}

interface CountryData extends CountryBasic {
  amounts?: Record<string, number | null> | null;
  tokens: Record<string, string | null>;
}

const AMOUNT_TOKEN_KEYS = new Set([
  'aid_amount',
  'disaster_cost',
  'graft_amount',
  'infrastructure_cost',
  'military_budget_amount',
  'sanctions_amount',
  'trade_value',
]);

function formatUsdAmount(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

type TokenPageMode = 'registry' | 'country' | 'query';

const TOKEN_PAGE_MODES: ReadonlyArray<{ id: TokenPageMode; label: string }> = [
  { id: 'registry', label: 'Registry' },
  { id: 'country', label: 'Country Tokens' },
  { id: 'query', label: 'Admin Query' },
];

function getCategoryColor(cat: string) {
  if (['executive', 'legislative', 'judicial'].includes(cat)) return 'text-[var(--accent-primary)] bg-[var(--accent-muted)] border-[var(--accent-primary)]';
  if (['ministers', 'security', 'military'].includes(cat)) return 'text-[var(--warning)] bg-[rgba(255,165,0,0.1)] border-[var(--warning)]';
  if (['economic', 'local', 'civil', 'media'].includes(cat)) return 'text-[var(--success)] bg-[rgba(0,128,0,0.1)] border-[var(--success)]';
  return 'text-[#a855f7] bg-[rgba(168,85,247,0.1)] border-[#a855f7]';
}

export default function TokenRegistryPage() {
  const [mode, setMode] = useState<TokenPageMode>('registry');
  
  // Data State
  const [registry, setRegistry] = useState<TokenRegistryDocument | null>(null);
  const [summary, setSummary] = useState<TokenRegistrySummary | null>(null);
  const [rejections, setRejections] = useState<TokenRejectionDocument[]>([]);
  const [countries, setCountries] = useState<CountryBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchRegistry = useCallback(async () => {
    setLoading(true);
    try {
      const [regRes, rejRes, countRes] = await Promise.all([
        fetch('/api/token-registry'),
        fetch('/api/token-registry/rejections?status=unresolved&sort=count&limit=100'),
        fetch('/api/countries')
      ]);
      
      if (regRes.ok) {
        const data = await regRes.json();
        setRegistry(data.registry);
        setSummary(data.summary);
      }
      
      if (rejRes.ok) {
        const data = await rejRes.json();
        setRejections(data.rejections || []);
      }
      
      if (countRes.ok) {
        const data = await countRes.json();
        setCountries(data.countries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  const executeRegistryOp = async (op: TokenRegistryOperation) => {
    if (!registry) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/token-registry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: registry.version, operations: [op] })
      });
      if (res.status === 409) {
        setSaveMessage('Registry updated by another user — refreshed');
        await fetchRegistry();
      } else if (res.ok) {
        setSaveMessage('Saved');
        await fetchRegistry();
      } else {
        setSaveMessage('Failed to save');
      }
    } catch {
      setSaveMessage('Network error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleResolveRejection = async (tokenName: string, actionBody: ResolveRejectedTokenAction) => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/token-registry/rejections/${encodeURIComponent(tokenName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionBody)
      });
      if (res.ok) {
        setRejections(prev => prev.filter(r => r.tokenName !== tokenName));
        setSaveMessage(`Resolved ${tokenName}`);
        await fetchRegistry();
      } else {
        setSaveMessage('Failed to resolve');
      }
    } catch {
      setSaveMessage('Network error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // ============================================================================
  // REGISTRY TAB: TOKENS
  // ============================================================================
  const [tokenSearch, setTokenSearch] = useState('');
  const [tokenCatFilter, setTokenCatFilter] = useState<TokenCategory | 'all'>('all');
  const [tokenEnabledFilter, setTokenEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const tokenSort = useSort<'name' | 'aliases'>('name', 'asc');
  const [addingToken, setAddingToken] = useState(false);
  const [newToken, setNewToken] = useState<Partial<TokenDefinition>>({ category: 'executive', enabled: true });
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editTokenData, setEditTokenData] = useState<Partial<TokenDefinition>>({});

  const tokensWithAliasCount = useMemo(() => {
    if (!registry) return [];
    const aliasCounts: Record<string, number> = {};
    Object.values(registry.aliasesByName).forEach(a => {
      aliasCounts[a.targetToken] = (aliasCounts[a.targetToken] || 0) + 1;
    });
    return Object.values(registry.tokensByName).map(t => ({
      ...t,
      aliasCount: aliasCounts[t.name] || 0
    }));
  }, [registry]);

  const filteredTokens = useMemo(() => {
    return tokensWithAliasCount.filter(t => {
      if (tokenCatFilter !== 'all' && t.category !== tokenCatFilter) return false;
      if (tokenEnabledFilter === 'enabled' && !t.enabled) return false;
      if (tokenEnabledFilter === 'disabled' && t.enabled) return false;
      if (tokenSearch) {
        const s = tokenSearch.toLowerCase();
        if (!t.name.toLowerCase().includes(s) && !(t.description || '').toLowerCase().includes(s)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (tokenSort.sortField === 'aliases') {
        const diff = a.aliasCount - b.aliasCount;
        return tokenSort.sortDir === 'asc' ? diff : -diff;
      }
      return tokenSort.compare(a.name, b.name);
    });
  }, [tokensWithAliasCount, tokenSearch, tokenCatFilter, tokenEnabledFilter, tokenSort]);

  // ============================================================================
  // REGISTRY TAB: ALIASES
  // ============================================================================
  const [aliasSearch, setAliasSearch] = useState('');
  const aliasSort = useSort<'alias' | 'target' | 'source'>('alias', 'asc');
  const [addingAlias, setAddingAlias] = useState(false);
  const [newAlias, setNewAlias] = useState<{alias: string, targetToken: string}>({ alias: '', targetToken: '' });

  const filteredAliases = useMemo(() => {
    if (!registry) return [];
    return Object.values(registry.aliasesByName).filter(a => {
      if (aliasSearch) {
        const s = aliasSearch.toLowerCase();
        return a.alias.toLowerCase().includes(s) || a.targetToken.toLowerCase().includes(s);
      }
      return true;
    }).sort((a, b) => {
      if (aliasSort.sortField === 'target') return aliasSort.compare(a.targetToken, b.targetToken);
      if (aliasSort.sortField === 'source') return aliasSort.compare(a.source, b.source);
      return aliasSort.compare(a.alias, b.alias);
    });
  }, [registry, aliasSearch, aliasSort]);

  // ============================================================================
  // REGISTRY TAB: CONCEPTS
  // ============================================================================
  const [conceptSearch, setConceptSearch] = useState('');
  const [conceptEnabledFilter, setConceptEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const conceptSort = useSort<'concept' | 'target' | 'order'>('concept', 'asc');
  const [addingConcept, setAddingConcept] = useState(false);
  const [newConcept, setNewConcept] = useState<{concept: string, tokenName: string, order: number, enabled: boolean}>({ concept: '', tokenName: '', order: 0, enabled: true });

  const filteredConcepts = useMemo(() => {
    if (!registry) return [];
    return Object.values(registry.conceptsById).filter(c => {
      if (conceptEnabledFilter === 'enabled' && !c.enabled) return false;
      if (conceptEnabledFilter === 'disabled' && c.enabled) return false;
      if (conceptSearch) {
        const s = conceptSearch.toLowerCase();
        return c.concept.toLowerCase().includes(s) || c.tokenName.toLowerCase().includes(s);
      }
      return true;
    }).sort((a, b) => {
      if (conceptSort.sortField === 'target') return conceptSort.compare(a.tokenName, b.tokenName);
      if (conceptSort.sortField === 'order') return conceptSort.compare(a.order, b.order);
      return conceptSort.compare(a.concept, b.concept);
    });
  }, [registry, conceptSearch, conceptEnabledFilter, conceptSort]);

  // ============================================================================
  // REGISTRY TAB: REJECTIONS
  // ============================================================================
  const [rejFilter, setRejFilter] = useState<'all' | 'unresolved' | 'aliased' | 'added' | 'dismissed'>('unresolved');
  const rejSort = useSort<'count' | 'lastSeen'>('count', 'desc');
  const [resolvingRejection, setResolvingRejection] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<'alias' | 'addToken' | null>(null);
  const [resolveState, setResolveState] = useState<{targetToken: string, category: TokenCategory, desc: string, note: string}>({ targetToken: '', category: 'executive', desc: '', note: '' });

  const filteredRejections = useMemo(() => {
    return rejections.filter(r => {
      if (rejFilter !== 'all' && r.status !== rejFilter) return false;
      return true;
    }).sort((a, b) => {
      if (rejSort.sortField === 'lastSeen') return rejSort.compare(a.lastSeenAt, b.lastSeenAt);
      return rejSort.compare(a.count, b.count);
    });
  }, [rejections, rejFilter, rejSort]);

  // ============================================================================
  // COUNTRY TOKENS TAB
  // ============================================================================
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryRegionFilter, setCountryRegionFilter] = useState<string>('all');
  const [countryMissingOnly, setCountryMissingOnly] = useState(false);
  const [editingCountryToken, setEditingCountryToken] = useState<string | null>(null);
  const [editCountryTokenValue, setEditCountryTokenValue] = useState('');
  const [addingCustomToken, setAddingCustomToken] = useState(false);
  const [newCustomTokenKey, setNewCustomTokenKey] = useState('');
  const [newCustomTokenVal, setNewCustomTokenVal] = useState('');
  
  // Combobox state
  const [countryComboOpen, setCountryComboOpen] = useState(false);
  const [countryComboSearch, setCountryComboSearch] = useState('');

  const activeRegions = useMemo(() => {
    const r = new Set<string>();
    countries.forEach(c => { if (c.region) r.add(c.region); });
    return Array.from(r).sort();
  }, [countries]);

  useEffect(() => {
    if (mode === 'country' && selectedCountryId) {
      setCountryLoading(true);
      fetch(`/api/countries/${selectedCountryId}`)
        .then(r => r.json())
        .then(d => {
          if (d.country) setCountryData(d.country);
        })
        .finally(() => setCountryLoading(false));
    } else {
      setCountryData(null);
      setCountrySearch('');
      setCountryMissingOnly(false);
    }
  }, [mode, selectedCountryId]);

  const handleSaveCountryToken = async (key: string, newValue: string | null) => {
    if (!countryData) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updatedTokens = { ...countryData.tokens, [key]: newValue };
      const res = await fetch(`/api/countries/${selectedCountryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: updatedTokens })
      });
      if (res.ok) {
        setCountryData({ ...countryData, tokens: updatedTokens });
        setSaveMessage('Saved successfully');
        setEditingCountryToken(null);
        setAddingCustomToken(false);
        setNewCustomTokenKey('');
        setNewCustomTokenVal('');
      } else {
        setSaveMessage('Failed to save');
      }
    } catch {
      setSaveMessage('Network error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const countryTokenGroups = useMemo(() => {
    if (!countryData || !registry) return [];
    const search = countrySearch.toLowerCase();
    
    // Fill all registry tokens into groups
    const groups: Record<string, { key: string, value: string | null }[]> = {};
    CATEGORIES.forEach(c => groups[c] = []);
    groups['Other'] = [];

    // Add all registry tokens
    Object.values(registry.tokensByName).forEach(t => {
      const val = countryData.tokens[t.name] ?? null;
      const bucket = groups[t.category] ?? groups['Other'];
      bucket.push({ key: t.name, value: val });
    });

    // Add custom tokens not in registry
    Object.entries(countryData.tokens).forEach(([k, v]) => {
      if (!registry.tokensByName[k]) {
        groups['Other'].push({ key: k, value: v });
      }
    });

    // Filter, search, sort
    return Object.entries(groups).map(([cat, list]) => {
      const filtered = list.filter(item => {
        const amountValue = AMOUNT_TOKEN_KEYS.has(item.key) ? countryData.amounts?.[item.key] : null;
        const displayValue = AMOUNT_TOKEN_KEYS.has(item.key) ? formatUsdAmount(amountValue) : item.value;
        const hasValue = AMOUNT_TOKEN_KEYS.has(item.key) ? amountValue !== null && amountValue !== undefined : Boolean(item.value);
        if (countryMissingOnly && hasValue) return false;
        if (search) {
          return item.key.toLowerCase().includes(search) || (displayValue && displayValue.toLowerCase().includes(search));
        }
        return true;
      }).sort((a, b) => {
        const aHasValue = AMOUNT_TOKEN_KEYS.has(a.key) ? countryData.amounts?.[a.key] !== null && countryData.amounts?.[a.key] !== undefined : Boolean(a.value);
        const bHasValue = AMOUNT_TOKEN_KEYS.has(b.key) ? countryData.amounts?.[b.key] !== null && countryData.amounts?.[b.key] !== undefined : Boolean(b.value);
        if (aHasValue && !bHasValue) return -1;
        if (!aHasValue && bHasValue) return 1;
        return a.key.localeCompare(b.key);
      });
      return { category: cat, items: filtered };
    }).filter(g => g.items.length > 0);

  }, [countryData, registry, countrySearch, countryMissingOnly]);

  const coverageStats = useMemo(() => {
    if (!countryData || !registry) return { covered: 0, total: 1, percent: 0 };
    const total = Object.keys(registry.tokensByName).length;
    let covered = 0;
    Object.keys(registry.tokensByName).forEach(k => {
      if (countryData.tokens[k]) covered++;
    });
    return { covered, total, percent: Math.round((covered / total) * 100) || 0 };
  }, [countryData, registry]);

  const scrollToCategory = (cat: string) => {
    const el = document.getElementById(`cat-group-${cat}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ============================================================================
  // QUERY TAB
  // ============================================================================
  const [adminQuery, setAdminQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null);

  const handleRunQuery = async () => {
    if (!adminQuery.trim()) return;
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const res = await fetch('/api/admin-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: adminQuery.trim() })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      setQueryResult(data);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setQueryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <ScreenHeader section="Content Operations" title="Token Registry" subtitle="Manage explicit vocabulary" eyebrow="Registry" />
        <CommandPanel className="mb-6 p-5"><div className="animate-pulse h-4 bg-background-muted rounded w-1/4" /></CommandPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] flex flex-col gap-6 pb-20">
      <ScreenHeader
        section="Content Operations"
        title="Token Registry"
        subtitle="Manage the explicit vocabulary and concept mappings used in generation."
        eyebrow="Registry"
      />

      <div className="flex flex-wrap gap-2">
        {TOKEN_PAGE_MODES.map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            className={`inline-flex min-h-[32px] items-center rounded-[8px] border px-3 py-1 text-xs font-medium transition-colors ${
              mode === item.id
                ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-foreground'
                : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'registry' && registry && (
        <>
          <CommandPanel className="p-5 md:p-6">
            <div className="flex flex-row gap-6 overflow-x-auto pb-2">
              <DataStat label="Registry Version" value={registry.version} size="compact" />
              <DataStat label="Tokens" value={Object.keys(registry.tokensByName).length} size="compact" />
              <DataStat label="Aliases" value={Object.keys(registry.aliasesByName).length} size="compact" />
              <DataStat label="Concepts" value={Object.keys(registry.conceptsById).length} size="compact" />
              <DataStat label="Unresolved Rejections" value={rejections.filter(r => r.status === 'unresolved').length} size="compact" />
            </div>
            {saveMessage && (
              <div className="text-[10px] font-mono text-success mt-3 pt-2 border-t border-[var(--border)]">
                {saveMessage}
              </div>
            )}
          </CommandPanel>

          {/* TOKENS SECTION */}
          <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="section-kicker">Tokens</div>
                <span className="text-[10px] font-mono text-foreground-subtle bg-background-muted px-2 py-0.5 rounded-[4px] border border-[var(--border)]">
                  {filteredTokens.length} tokens
                </span>
              </div>
              <button onClick={() => setAddingToken(!addingToken)} className="btn btn-command text-xs">New Token</button>
            </div>

            {addingToken && (
              <div className="p-4 border border-[var(--border-strong)] bg-background-muted rounded-[8px] flex flex-col gap-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-foreground-muted">Name</label>
                    <input type="text" className="input-shell text-xs py-1.5" value={newToken.name || ''} onChange={e => setNewToken({...newToken, name: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-foreground-muted">Category</label>
                    <select className="input-shell text-xs py-1.5 bg-background" value={newToken.category} onChange={e => setNewToken({...newToken, category: e.target.value as TokenCategory})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[10px] text-foreground-muted">Description</label>
                    <input type="text" className="input-shell text-xs py-1.5" value={newToken.description || ''} onChange={e => setNewToken({...newToken, description: e.target.value})} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-[10px] text-foreground-muted hover:text-foreground">
                      <input type="checkbox" checked={newToken.enabled} onChange={e => setNewToken({...newToken, enabled: e.target.checked})} className="accent-[var(--accent-primary)]" /> Enabled
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[10px] text-foreground-muted hover:text-foreground">
                      <input type="checkbox" checked={newToken.articleForm?.enabled} onChange={e => setNewToken({...newToken, articleForm: {enabled: e.target.checked}})} className="accent-[var(--accent-primary)]" /> Article Form
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAddingToken(false)} className="btn btn-ghost text-xs">Cancel</button>
                    <button onClick={() => {
                      if (!newToken.name?.trim() || !newToken.category) return;
                      executeRegistryOp({ op: 'upsertToken', token: {
                        name: newToken.name.trim(), category: newToken.category, description: newToken.description?.trim() || undefined,
                        enabled: newToken.enabled ?? true, articleForm: newToken.articleForm
                      }});
                      setAddingToken(false); setNewToken({ category: 'executive', enabled: true });
                    }} className="btn btn-command text-xs">Save</button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <input type="text" placeholder="Search tokens..." value={tokenSearch} onChange={e => setTokenSearch(e.target.value)} className="input-shell text-xs py-1.5 md:max-w-xs w-full" />
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar shrink-0">
                  <button onClick={() => setTokenEnabledFilter('all')} className={`filter-pill ${tokenEnabledFilter === 'all' ? 'active' : ''}`}>All</button>
                  <button onClick={() => setTokenEnabledFilter('enabled')} className={`filter-pill ${tokenEnabledFilter === 'enabled' ? 'active' : ''}`}>Enabled</button>
                  <button onClick={() => setTokenEnabledFilter('disabled')} className={`filter-pill ${tokenEnabledFilter === 'disabled' ? 'active' : ''}`}>Disabled</button>
                </div>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar">
                <button onClick={() => setTokenCatFilter('all')} className={`filter-pill ${tokenCatFilter === 'all' ? 'active' : ''}`}>All</button>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setTokenCatFilter(c)} className={`filter-pill capitalize ${tokenCatFilter === c ? 'active' : ''}`}>{c}</button>
                ))}
              </div>
            </div>

            <div className="border border-[var(--border-strong)] rounded-[8px] overflow-x-auto">
              <table className="table-dense w-full">
                <thead>
                  <tr>
                    <th className="w-1/4"><SortHeader field="name" label="Name" current={tokenSort.sortField} dir={tokenSort.sortDir} onSort={tokenSort.handleSort} /></th>
                    <th className="w-1/6">Category</th>
                    <th className="w-1/3">Description</th>
                    <th className="w-[10%]"><SortHeader field="aliases" label="Aliases" current={tokenSort.sortField} dir={tokenSort.sortDir} onSort={tokenSort.handleSort} /></th>
                    <th className="w-[10%]">Tags</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map(token => (
                    <tr key={token.name} className="group">
                      {editingToken === token.name ? (
                        <td colSpan={6} className="p-3 bg-background-muted/50">
                          <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="font-mono text-xs text-foreground flex items-center">{token.name}</div>
                              <select className="input-shell text-xs py-1.5 bg-background" value={editTokenData.category} onChange={e => setEditTokenData({...editTokenData, category: e.target.value as TokenCategory})}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <input type="text" className="input-shell text-xs py-1.5 md:col-span-2" value={editTokenData.description || ''} onChange={e => setEditTokenData({...editTokenData, description: e.target.value})} placeholder="Description" />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer text-[10px] text-foreground-muted hover:text-foreground">
                                  <input type="checkbox" checked={editTokenData.enabled} onChange={e => setEditTokenData({...editTokenData, enabled: e.target.checked})} className="accent-[var(--accent-primary)]" /> Enabled
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-[10px] text-foreground-muted hover:text-foreground">
                                  <input type="checkbox" checked={editTokenData.articleForm?.enabled} onChange={e => setEditTokenData({...editTokenData, articleForm: {enabled: e.target.checked}})} className="accent-[var(--accent-primary)]" /> Article Form
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setEditingToken(null)} className="btn btn-ghost text-xs">Cancel</button>
                                <button onClick={() => {
                                   const { aliasCount: _ac, ...tokenBase } = token;
                                   executeRegistryOp({ op: 'upsertToken', token: { ...tokenBase, ...editTokenData }});
                                   setEditingToken(null);
                                 }} className="btn btn-command text-xs">Save</button>
                              </div>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="font-mono text-accent cursor-pointer hover:underline" onClick={() => { setEditingToken(token.name); setEditTokenData(token); }}>{token.name}</td>
                          <td><span className={`px-1.5 py-0.5 rounded-[2px] text-[11px] font-bold border ${getCategoryColor(token.category)}`}>{token.category}</span></td>
                          <td className="text-foreground-subtle truncate max-w-[200px]" title={token.description}>{token.description || <span className="italic opacity-50">—</span>}</td>
                          <td className="font-mono text-foreground-subtle">{token.aliasCount}</td>
                          <td>
                            <div className="flex gap-1 flex-wrap">
                              {!token.enabled && <span className="px-1.5 py-0.5 rounded-[2px] text-[9px] bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/30 font-medium">Disabled</span>}
                              {token.articleForm?.enabled && <span className="px-1.5 py-0.5 rounded-[2px] text-[9px] bg-background-muted text-foreground-subtle border border-[var(--border)] font-medium">Art. Form</span>}
                            </div>
                          </td>
                          <td className="text-right">
                            <button className="text-[var(--error)] opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--error)]/10 rounded" onClick={() => { if(confirm(`Delete ${token.name}?`)) executeRegistryOp({ op: 'deleteToken', tokenName: token.name }); }}>×</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {filteredTokens.length === 0 && <tr><td colSpan={6} className="text-center italic text-foreground-muted p-4">No tokens found.</td></tr>}
                </tbody>
              </table>
            </div>
          </CommandPanel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ALIASES SECTION */}
            <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="section-kicker">Aliases</div>
                <button onClick={() => setAddingAlias(!addingAlias)} className="btn btn-ghost text-xs border border-[var(--border-strong)]">+ Alias</button>
              </div>

              {addingAlias && (
                <div className="p-3 border border-[var(--border-strong)] bg-background-muted rounded-[8px] flex flex-col gap-3">
                  <input type="text" placeholder="Alias Name" className="input-shell text-xs py-1.5" value={newAlias.alias} onChange={e => setNewAlias({...newAlias, alias: e.target.value})} />
                  <select className="input-shell text-xs py-1.5 bg-background" value={newAlias.targetToken} onChange={e => setNewAlias({...newAlias, targetToken: e.target.value})}>
                    <option value="">-- Target Token --</option>
                    {Object.keys(registry.tokensByName).sort().map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setAddingAlias(false)} className="btn btn-ghost text-xs">Cancel</button>
                    <button onClick={() => {
                      if (!newAlias.alias.trim() || !newAlias.targetToken) return;
                      executeRegistryOp({ op: 'upsertAlias', alias: { alias: newAlias.alias.trim(), targetToken: newAlias.targetToken, source: 'manual' }});
                      setAddingAlias(false); setNewAlias({alias: '', targetToken: ''});
                    }} className="btn btn-command text-xs">Save</button>
                  </div>
                </div>
              )}

              <input type="text" placeholder="Search aliases..." value={aliasSearch} onChange={e => setAliasSearch(e.target.value)} className="input-shell text-xs py-1.5 w-full" />

              <div className="border border-[var(--border-strong)] rounded-[8px] overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="table-dense w-full relative">
                  <thead className="sticky top-0 bg-background-muted z-10 shadow-[0_1px_0_var(--border-strong)]">
                    <tr>
                      <th><SortHeader field="alias" label="Alias" current={aliasSort.sortField} dir={aliasSort.sortDir} onSort={aliasSort.handleSort} /></th>
                      <th><SortHeader field="target" label="Target" current={aliasSort.sortField} dir={aliasSort.sortDir} onSort={aliasSort.handleSort} /></th>
                      <th><SortHeader field="source" label="Source" current={aliasSort.sortField} dir={aliasSort.sortDir} onSort={aliasSort.handleSort} /></th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAliases.map(a => (
                      <tr key={a.alias} className="group">
                        <td className="font-mono">{a.alias}</td>
                        <td className="font-mono text-accent">{a.targetToken}</td>
                        <td><span className="text-[10px] text-foreground-subtle border border-[var(--border)] px-1 rounded-[2px]">{a.source}</span></td>
                        <td className="text-right"><button className="text-[var(--error)] opacity-0 group-hover:opacity-100 p-1" onClick={() => executeRegistryOp({ op: 'deleteAlias', aliasName: a.alias })}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CommandPanel>

            {/* CONCEPTS SECTION */}
            <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="section-kicker">Concepts</div>
                <button onClick={() => setAddingConcept(!addingConcept)} className="btn btn-ghost text-xs border border-[var(--border-strong)]">+ Concept</button>
              </div>

              {addingConcept && (
                <div className="p-3 border border-[var(--border-strong)] bg-background-muted rounded-[8px] flex flex-col gap-3">
                  <input type="text" placeholder="Concept text" className="input-shell text-xs py-1.5" value={newConcept.concept} onChange={e => setNewConcept({...newConcept, concept: e.target.value})} />
                  <select className="input-shell text-xs py-1.5 bg-background" value={newConcept.tokenName} onChange={e => setNewConcept({...newConcept, tokenName: e.target.value})}>
                    <option value="">-- Target Token --</option>
                    {Object.keys(registry.tokensByName).sort().map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex gap-3">
                    <input type="number" placeholder="Order" className="input-shell text-xs py-1.5 w-24" value={newConcept.order} onChange={e => setNewConcept({...newConcept, order: parseInt(e.target.value)||0})} />
                    <label className="flex items-center gap-2 cursor-pointer text-[10px] text-foreground-muted">
                      <input type="checkbox" checked={newConcept.enabled} onChange={e => setNewConcept({...newConcept, enabled: e.target.checked})} className="accent-[var(--accent-primary)]" /> Enabled
                    </label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setAddingConcept(false)} className="btn btn-ghost text-xs">Cancel</button>
                    <button onClick={() => {
                      if (!newConcept.concept.trim() || !newConcept.tokenName) return;
                      const id = `${newConcept.concept.trim()}_${newConcept.tokenName}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
                      executeRegistryOp({ op: 'upsertConcept', concept: { id, concept: newConcept.concept.trim(), tokenName: newConcept.tokenName, order: newConcept.order, enabled: newConcept.enabled }});
                      setAddingConcept(false); setNewConcept({concept: '', tokenName: '', order: 0, enabled: true});
                    }} className="btn btn-command text-xs">Save</button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input type="text" placeholder="Search concepts..." value={conceptSearch} onChange={e => setConceptSearch(e.target.value)} className="input-shell text-xs py-1.5 flex-1" />
                <div className="flex items-center border border-[var(--border-strong)] rounded-[4px] overflow-hidden">
                  <button onClick={() => setConceptEnabledFilter('all')} className={`px-2 py-1 text-[10px] ${conceptEnabledFilter === 'all' ? 'bg-[var(--border)] text-foreground' : 'text-foreground-muted'}`}>All</button>
                  <button onClick={() => setConceptEnabledFilter('enabled')} className={`px-2 py-1 text-[10px] border-l border-r border-[var(--border-strong)] ${conceptEnabledFilter === 'enabled' ? 'bg-[var(--border)] text-foreground' : 'text-foreground-muted'}`}>On</button>
                  <button onClick={() => setConceptEnabledFilter('disabled')} className={`px-2 py-1 text-[10px] ${conceptEnabledFilter === 'disabled' ? 'bg-[var(--border)] text-foreground' : 'text-foreground-muted'}`}>Off</button>
                </div>
              </div>

              <div className="border border-[var(--border-strong)] rounded-[8px] overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="table-dense w-full relative">
                  <thead className="sticky top-0 bg-background-muted z-10 shadow-[0_1px_0_var(--border-strong)]">
                    <tr>
                      <th><SortHeader field="concept" label="Concept" current={conceptSort.sortField} dir={conceptSort.sortDir} onSort={conceptSort.handleSort} /></th>
                      <th><SortHeader field="target" label="Target Token" current={conceptSort.sortField} dir={conceptSort.sortDir} onSort={conceptSort.handleSort} /></th>
                      <th><SortHeader field="order" label="Ord" current={conceptSort.sortField} dir={conceptSort.sortDir} onSort={conceptSort.handleSort} /></th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConcepts.map(c => (
                      <tr key={c.id} className={`group ${!c.enabled ? 'opacity-50' : ''}`}>
                        <td className="font-mono">{c.concept}</td>
                        <td className="font-mono text-accent">{c.tokenName}</td>
                        <td className="font-mono text-foreground-subtle">{c.order}</td>
                        <td className="text-right"><button className="text-[var(--error)] opacity-0 group-hover:opacity-100 p-1" onClick={() => executeRegistryOp({ op: 'deleteConcept', conceptId: c.id })}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CommandPanel>
          </div>

          {/* REJECTED TOKENS SECTION */}
          <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="section-kicker">Rejected Tokens</div>
              {rejections.filter(r => r.status === 'unresolved').length > 0 && (
                <span className="text-[11px] font-bold bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/50 px-2 py-0.5 rounded-[4px]">
                  {rejections.filter(r => r.status === 'unresolved').length} Unresolved
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
              <button onClick={() => setRejFilter('all')} className={`filter-pill ${rejFilter === 'all' ? 'active' : ''}`}>All</button>
              <button onClick={() => setRejFilter('unresolved')} className={`filter-pill ${rejFilter === 'unresolved' ? 'active' : ''}`}>Unresolved</button>
              <button onClick={() => setRejFilter('aliased')} className={`filter-pill ${rejFilter === 'aliased' ? 'active' : ''}`}>Aliased</button>
              <button onClick={() => setRejFilter('added')} className={`filter-pill ${rejFilter === 'added' ? 'active' : ''}`}>Added</button>
              <button onClick={() => setRejFilter('dismissed')} className={`filter-pill ${rejFilter === 'dismissed' ? 'active' : ''}`}>Dismissed</button>
            </div>

            <div className="border border-[var(--border-strong)] rounded-[8px] overflow-hidden max-h-[600px] overflow-y-auto">
              <table className="table-dense w-full relative">
                <thead className="sticky top-0 bg-background-muted z-10 shadow-[0_1px_0_var(--border-strong)]">
                  <tr>
                    <th className="w-1/4">Token Name</th>
                    <th className="w-24"><SortHeader field="count" label="Count" current={rejSort.sortField} dir={rejSort.sortDir} onSort={rejSort.handleSort} /></th>
                    <th className="w-32"><SortHeader field="lastSeen" label="Last Seen" current={rejSort.sortField} dir={rejSort.sortDir} onSort={rejSort.handleSort} /></th>
                    <th className="w-24">Status</th>
                    <th className="w-1/3">Sample Context</th>
                    <th className="w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRejections.map(rej => (
                    <tr key={rej.tokenName}>
                      <td colSpan={6} className="p-0 border-0">
                        <div className={`flex items-center p-2 border-b border-[var(--border)] ${resolvingRejection === rej.tokenName ? 'bg-background-muted' : 'hover:bg-background-muted/50'}`}>
                          <div className="w-1/4 font-mono font-bold">{rej.tokenName}</div>
                          <div className="w-24"><span className="text-[10px] font-mono text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10 px-1.5 py-0.5 rounded-[2px]">{rej.count}</span></div>
                          <div className="w-32 text-foreground-subtle font-mono text-[10px]">{new Date(rej.lastSeenAt).toLocaleDateString()}</div>
                          <div className="w-24">
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-[2px] ${rej.status === 'unresolved' ? 'bg-[var(--warning)]/20 text-[var(--warning)]' : 'bg-background-muted text-foreground-muted'}`}>
                              {rej.status}
                            </span>
                          </div>
                          <div className="w-1/3 text-foreground-subtle italic truncate text-[10px]" title={rej.sampleContext}>{rej.sampleContext || '—'}</div>
                          <div className="w-32 flex justify-end gap-1">
                            {rej.status === 'unresolved' && resolvingRejection !== rej.tokenName && (
                              <>
                                <button onClick={() => { setResolvingRejection(rej.tokenName); setResolveAction('alias'); }} className="btn btn-ghost text-[10px] py-1 px-2">Alias &rarr;</button>
                                <button onClick={() => { setResolvingRejection(rej.tokenName); setResolveAction('addToken'); }} className="btn btn-command text-[10px] py-1 px-2">+ Add</button>
                                <button onClick={() => handleResolveRejection(rej.tokenName, { action: 'dismiss' })} className="text-[10px] text-foreground-subtle hover:text-[var(--error)] p-1 ml-1">Dismiss</button>
                              </>
                            )}
                          </div>
                        </div>
                        {resolvingRejection === rej.tokenName && (
                          <div className="p-4 bg-background-muted border-b border-[var(--border-strong)] flex flex-col gap-3">
                            <div className="text-[11px] font-bold text-foreground">
                              {resolveAction === 'alias' ? 'Create Alias for Rejected Token' : 'Add Token from Rejected'}
                            </div>
                            {resolveAction === 'alias' ? (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-foreground-muted">Target Token</label>
                                  <select className="input-shell text-xs py-1.5 bg-background" value={resolveState.targetToken} onChange={e => setResolveState({...resolveState, targetToken: e.target.value})}>
                                    <option value="">Select target...</option>
                                    {Object.keys(registry.tokensByName).sort().map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-foreground-muted">Note (optional)</label>
                                  <input type="text" className="input-shell text-xs py-1.5" value={resolveState.note} onChange={e => setResolveState({...resolveState, note: e.target.value})} />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => { setResolvingRejection(null); setResolveAction(null); }} className="btn btn-ghost text-xs">Cancel</button>
                                  <button disabled={!resolveState.targetToken || saving} onClick={() => handleResolveRejection(rej.tokenName, { action: 'alias', targetToken: resolveState.targetToken, note: resolveState.note || undefined })} className="btn btn-command text-xs">Save Alias</button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-foreground-muted">Category</label>
                                  <select className="input-shell text-xs py-1.5 bg-background" value={resolveState.category} onChange={e => setResolveState({...resolveState, category: e.target.value as TokenCategory})}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                  <label className="text-[10px] text-foreground-muted">Description (optional)</label>
                                  <input type="text" className="input-shell text-xs py-1.5" value={resolveState.desc} onChange={e => setResolveState({...resolveState, desc: e.target.value})} />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => { setResolvingRejection(null); setResolveAction(null); }} className="btn btn-ghost text-xs">Cancel</button>
                                  <button disabled={saving} onClick={() => handleResolveRejection(rej.tokenName, { action: 'addToken', token: { name: rej.tokenName, category: resolveState.category, description: resolveState.desc || undefined, enabled: true }})} className="btn btn-command text-xs">Add Token</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRejections.length === 0 && <tr><td colSpan={6} className="p-4 text-center italic text-foreground-muted">No rejections match filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </CommandPanel>
        </>
      )}

      {mode === 'country' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT PANEL / TOP BAR: Selection */}
          <CommandPanel className="lg:w-80 shrink-0 h-fit p-5 md:p-6 flex flex-col gap-4 sticky top-6">
            <div className="section-kicker">Select Country</div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search countries..." 
                className="input-shell text-sm py-2 w-full pr-8"
                value={countryComboSearch}
                onChange={e => { setCountryComboSearch(e.target.value); setCountryComboOpen(true); }}
                onFocus={() => setCountryComboOpen(true)}
              />
              {countryComboOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCountryComboOpen(false)} />
                  <div className="absolute top-full mt-1 w-full bg-background border border-[var(--border-strong)] rounded-[8px] shadow-xl z-20 max-h-[300px] overflow-y-auto overflow-x-hidden">
                    {activeRegions.map(region => {
                      const rc = countries.filter(c => c.region === region && c.name.toLowerCase().includes(countryComboSearch.toLowerCase()));
                      if (rc.length === 0) return null;
                      return (
                        <div key={region}>
                          <div className="px-3 py-1 text-[11px] font-bold text-foreground-muted bg-background-muted sticky top-0">{region}</div>
                          {rc.map(c => (
                            <button key={c.id} className="w-full text-left px-4 py-2 text-xs font-mono hover:bg-background-muted hover:text-accent transition-colors truncate" onClick={() => { setSelectedCountryId(c.id); setCountryComboOpen(false); setCountryComboSearch(''); }}>
                              {c.name} <span className="text-[10px] text-foreground-subtle ml-2">{c.id}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-[var(--border)] pt-4 mt-2">
              <div className="text-[11px] font-medium text-foreground-muted mb-2">Filter Region</div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setCountryRegionFilter('all')} className={`filter-pill ${countryRegionFilter === 'all' ? 'active' : ''}`}>All Regions</button>
                {activeRegions.map(r => (
                  <button key={r} onClick={() => setCountryRegionFilter(r)} className={`filter-pill ${countryRegionFilter === r ? 'active' : ''}`}>{r}</button>
                ))}
              </div>
            </div>
          </CommandPanel>

          {/* MAIN AREA */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {!selectedCountryId ? (
              <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
                <div className="section-kicker">Country Overview</div>
                <p className="text-sm text-foreground-muted">Select a country to view its tokens.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-2">
                  {countries.filter(c => countryRegionFilter === 'all' || c.region === countryRegionFilter).map(c => (
                    <button key={c.id} onClick={() => setSelectedCountryId(c.id)} className="text-left p-3 border border-[var(--border)] rounded-[8px] bg-background-muted hover:border-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-all group">
                      <div className="font-mono font-bold text-foreground group-hover:text-accent">{c.name}</div>
                      <div className="text-[10px] font-mono text-foreground-subtle flex justify-between mt-1">
                        <span>{c.region || 'Unknown'}</span>
                        <span>{c.id}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CommandPanel>
            ) : countryLoading ? (
              <CommandPanel className="p-5 md:p-6 animate-pulse"><div className="h-4 bg-background-muted rounded w-1/3" /></CommandPanel>
            ) : countryData ? (
              <>
                <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold font-mono text-foreground">{countryData.name}</h2>
                      <div className="text-xs text-foreground-subtle font-mono mt-1">{countryData.region} &bull; {countryData.id}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-xs font-mono text-foreground mb-1">{coverageStats.covered} / {coverageStats.total} covered</div>
                      <div className="w-32 h-1.5 bg-background-muted border border-[var(--border)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--accent-primary)]" style={{ width: `${coverageStats.percent}%` }} />
                      </div>
                    </div>
                  </div>
                  {saveMessage && <div className="text-[10px] font-mono text-success pt-2 border-t border-[var(--border)]">{saveMessage}</div>}
                </CommandPanel>

                <CommandPanel className="p-5 md:p-6 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <input type="text" placeholder="Search tokens or values..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} className="input-shell text-xs py-1.5 md:w-80" />
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-foreground hover:text-accent">
                      <input type="checkbox" checked={countryMissingOnly} onChange={e => setCountryMissingOnly(e.target.checked)} className="accent-[var(--accent-primary)]" />
                      Show Missing Only
                    </label>
                  </div>
                  {!countrySearch && (
                    <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar">
                      {countryTokenGroups.map(g => (
                        <button key={g.category} onClick={() => scrollToCategory(g.category)} className="filter-pill capitalize">
                          {g.category} <span className="opacity-50 ml-1">({g.items.length})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-6 mt-4">
                    {countryTokenGroups.length === 0 ? (
                      <div className="text-center italic text-foreground-muted text-sm py-8">No tokens match filters.</div>
                    ) : (
                      countryTokenGroups.map(group => (
                        <div key={group.category} id={`cat-group-${group.category}`} className="flex flex-col gap-2">
                          <div className="text-[11px] font-bold text-foreground-subtle border-b border-[var(--border)] pb-1 mb-1">
                            {group.category} <span className="opacity-50 font-mono">({group.items.length})</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {group.items.map(item => (
                              <div key={item.key} className="group/row flex items-center justify-between p-2 hover:bg-background-muted/50 rounded-[4px] border border-transparent hover:border-[var(--border)] transition-colors">
                                {editingCountryToken === item.key ? (
                                  <div className="w-full flex items-center gap-3">
                                    <div className="w-1/3 font-mono text-xs truncate" title={item.key}>{item.key}</div>
                                    <input 
                                      autoFocus
                                      type="text" 
                                      className="input-shell flex-1 text-xs py-1" 
                                      value={editCountryTokenValue} 
                                      onChange={e => setEditCountryTokenValue(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveCountryToken(item.key, editCountryTokenValue.trim() || null);
                                        if (e.key === 'Escape') setEditingCountryToken(null);
                                      }}
                                    />
                                    <button onClick={() => handleSaveCountryToken(item.key, editCountryTokenValue.trim() || null)} className="btn btn-command text-[10px] px-2 py-1">Save</button>
                                    <button onClick={() => setEditingCountryToken(null)} className="btn btn-ghost text-[10px] px-2 py-1">Cancel</button>
                                  </div>
                                ) : (
                                  <>
                                     <div className="w-1/3 font-mono text-xs truncate pr-4 text-accent" title={item.key}>{item.key}</div>
                                    <div className="flex-1 font-mono text-xs text-foreground truncate" title={AMOUNT_TOKEN_KEYS.has(item.key) ? formatUsdAmount(countryData.amounts?.[item.key]) : (item.value || 'N/A')}>
                                      {AMOUNT_TOKEN_KEYS.has(item.key)
                                        ? formatUsdAmount(countryData.amounts?.[item.key])
                                        : (item.value || <span className="text-foreground-muted italic opacity-70">N/A</span>)}
                                    </div>
                                    <button onClick={() => { setEditingCountryToken(item.key); setEditCountryTokenValue(item.value || ''); }} className="opacity-0 group-hover/row:opacity-100 p-1 text-[10px] text-foreground-subtle hover:text-foreground">✎</button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-8 border-t border-[var(--border)] pt-4 flex flex-col gap-3">
                    {!addingCustomToken ? (
                      <button onClick={() => setAddingCustomToken(true)} className="btn btn-ghost text-xs w-fit">+ Add Custom Token Pair</button>
                    ) : (
                      <div className="p-3 bg-background-muted border border-[var(--border-strong)] rounded-[8px] flex items-center gap-3">
                        <input type="text" placeholder="Token Key" className="input-shell text-xs py-1.5 w-1/3 font-mono" value={newCustomTokenKey} onChange={e => setNewCustomTokenKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} />
                        <input type="text" placeholder="Value" className="input-shell text-xs py-1.5 flex-1 font-mono" value={newCustomTokenVal} onChange={e => setNewCustomTokenVal(e.target.value)} />
                        <button onClick={() => handleSaveCountryToken(newCustomTokenKey, newCustomTokenVal.trim() || null)} disabled={!newCustomTokenKey} className="btn btn-command text-xs px-3">Save</button>
                        <button onClick={() => setAddingCustomToken(false)} className="btn btn-ghost text-xs px-3">Cancel</button>
                      </div>
                    )}
                  </div>
                </CommandPanel>
              </>
            ) : null}
          </div>
        </div>
      )}

      {mode === 'query' && (
        <>
          <CommandPanel className="mb-6 p-5 md:p-6">
             <div className="section-kicker mb-3">Natural Language Query</div>
             <div className="flex flex-col gap-3">
               <textarea
                 value={adminQuery}
                 onChange={e => setAdminQuery(e.target.value)}
                 placeholder="e.g. Find all countries with executive tokens or find scenarios about trade..."
                 className="w-full bg-background border border-[var(--border-strong)] text-foreground text-sm font-mono p-3 rounded-[4px] focus:outline-none focus:border-accent min-h-[100px] resize-y"
                 onKeyDown={e => {
                   if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                     handleRunQuery();
                   }
                 }}
               />
               <div className="flex justify-end gap-3">
                 <button
                   onClick={handleRunQuery}
                   disabled={queryLoading || !adminQuery.trim()}
                   className="btn btn-command text-xs px-4 py-2"
                 >
                   {queryLoading ? 'Running...' : 'Run Query (Cmd+Enter)'}
                 </button>
               </div>
               {queryError && (
                 <div className="text-xs text-[var(--error)] font-mono mt-2">{queryError}</div>
               )}
             </div>
          </CommandPanel>

          {queryResult && (
             <CommandPanel className="mb-6 p-5 md:p-6">
                <div className="flex flex-col gap-6">
                  {queryResult.parsed && (
                    <div className="bg-background-muted border border-[var(--border-strong)] rounded-[4px] p-4 flex flex-col gap-2">
                       <div className="text-[11px] font-bold text-foreground-muted">Parsed Intent</div>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-[10px] text-foreground-subtle block mb-1">Target</span>
                            <span className="text-xs font-mono text-[var(--accent-primary)]">{queryResult.parsed.target}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-foreground-subtle block mb-1">Filters</span>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(queryResult.parsed).filter(([k, v]) => v !== undefined && k !== 'target' && k !== 'keywords').map(([k, v]) => (
                                <span key={k} className="text-[10px] font-mono px-1.5 py-0.5 bg-[rgba(255,255,255,0.05)] border border-[var(--border)] rounded-[2px] text-foreground-subtle">
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          </div>
                          {queryResult.parsed.keywords && queryResult.parsed.keywords.length > 0 && (
                            <div>
                              <span className="text-[10px] text-foreground-subtle block mb-1">Keywords</span>
                              <div className="flex flex-wrap gap-1">
                                {queryResult.parsed.keywords.map((kw: string) => (
                                  <span key={kw} className="text-[10px] font-mono px-1.5 py-0.5 bg-[rgba(255,255,255,0.05)] border border-[var(--border)] rounded-[2px] text-foreground-subtle">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {queryResult.results?.countries && queryResult.results.countries.length > 0 && (
                    <div>
                       <div className="section-kicker mb-3">Country Results ({queryResult.results.countries.length})</div>
                       <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-[4px]">
                         {queryResult.results.countries.map((c: any) => (
                           <div key={c.id} className="p-3 text-xs flex flex-col md:flex-row md:items-center gap-4 hover:bg-background-muted/50 transition-colors">
                              <div className="w-1/4 font-mono font-bold">{c.id}</div>
                              <div className="w-1/4 font-mono text-foreground-subtle truncate">{c.name}</div>
                              <div className="w-1/4 font-mono text-foreground-subtle truncate">{c.region || '-'}</div>
                              {c.matchedFields && c.matchedFields.length > 0 && (
                                <div className="flex-1 min-w-0 text-[10px] text-[var(--accent-secondary)] italic truncate">
                                  Matches: {c.matchedFields.join(', ')}
                                </div>
                              )}
                           </div>
                         ))}
                       </div>
                    </div>
                  )}

                  {queryResult.results?.scenarios && queryResult.results.scenarios.length > 0 && (
                    <div>
                       <div className="section-kicker mb-3">Scenario Results ({queryResult.results.scenarios.length})</div>
                       <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-[4px]">
                         {queryResult.results.scenarios.map((s: any) => (
                           <div key={s.id} className="p-3 text-xs flex flex-col md:flex-row md:items-center gap-4 hover:bg-background-muted/50 transition-colors">
                              <div className="w-1/4 font-mono font-bold text-[var(--accent-primary)]">
                                <a href={`/scenarios/${s.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {s.id}
                                </a>
                              </div>
                              <div className="flex-1 font-mono text-foreground-subtle truncate" title={s.title}>{s.title}</div>
                              {s.matchedFields && s.matchedFields.length > 0 && (
                                <div className="w-1/3 min-w-0 text-[10px] text-[var(--accent-secondary)] italic truncate" title={s.matchedFields.join(', ')}>
                                  Matches: {s.matchedFields.join(', ')}
                                </div>
                              )}
                           </div>
                         ))}
                       </div>
                    </div>
                  )}

                  {(!queryResult.results?.countries?.length && !queryResult.results?.scenarios?.length) && (
                    <div className="p-4 text-xs text-foreground-subtle font-mono text-center border border-[var(--border)] rounded-[4px]">
                       No results found.
                    </div>
                  )}
                </div>
             </CommandPanel>
          )}
        </>
      )}
    </div>
  );
}
