const fs = require('fs');
let code = fs.readFileSync('web/src/app/tokens/page.tsx', 'utf8');

const imports = `import { useEffect, useState, useCallback, useMemo } from 'react';`;
code = code.replace(/import \{ useEffect, useState, useCallback \} from 'react';/, imports);

const countryInterfaces = `
interface CountryBasic {
  id: string;
  name: string;
  region: string;
}

interface CountryData extends CountryBasic {
  tokens: Record<string, string>;
}
`;
code = code.replace(/export default function TokenRegistryPage\(\) \{/, countryInterfaces + '\nexport default function TokenRegistryPage() {');

const topState = `
  const [mode, setMode] = useState<'registry' | 'country'>('registry');
  
  // Country State
  const [countries, setCountries] = useState<CountryBasic[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [editingCountryToken, setEditingCountryToken] = useState<string | null>(null);
  const [editCountryTokenValue, setEditCountryTokenValue] = useState('');

  const [registry, setRegistry] =`;
code = code.replace(/  const \[registry, setRegistry\] =/, topState);

const fetchReplacement = `
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
`;
code = code.replace(/  const fetchRegistry = useCallback[\s\S]*?\}, \[\]\);/, fetchReplacement);

const countryEffects = `
  useEffect(() => {
    if (mode === 'country' && selectedCountryId) {
      setCountryLoading(true);
      fetch(\`/api/countries/\${selectedCountryId}\`)
        .then(r => r.json())
        .then(d => {
          if (d.country) setCountryData(d.country);
        })
        .finally(() => setCountryLoading(false));
    } else {
      setCountryData(null);
    }
  }, [mode, selectedCountryId]);

  const handleSaveCountryToken = async (key: string, newValue: string) => {
    if (!countryData) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updatedTokens = { ...countryData.tokens, [key]: newValue };
      const res = await fetch(\`/api/countries/\${selectedCountryId}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: updatedTokens })
      });
      if (res.ok) {
        setCountryData({ ...countryData, tokens: updatedTokens });
        setSaveMessage('Saved successfully');
        setEditingCountryToken(null);
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

  const filteredCountryTokens = useMemo(() => {
    if (!countryData) return [];
    const search = countrySearch.toLowerCase();
    return Object.entries(countryData.tokens)
      .filter(([k, v]) => k.toLowerCase().includes(search) || String(v).toLowerCase().includes(search))
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [countryData, countrySearch]);

  const executeRegistryOp =`;
code = code.replace(/  const executeRegistryOp =/, countryEffects);

const renderNav = `
      <ScreenHeader
        section="Content Operations"
        title="Token Registry"
        subtitle="Manage the explicit vocabulary and concept mappings used in generation."
        eyebrow="Registry"
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'registry', label: 'Registry' },
          { id: 'country', label: 'Country Tokens' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setMode(item.id as any)}
            className={\`inline-flex min-h-[32px] items-center rounded-[8px] border px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors \${
              mode === item.id
                ? 'border-[var(--accent-primary)] bg-[rgba(25,105,220,0.16)] text-foreground'
                : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-foreground'
            }\`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'country' ? (
        <>
          <CommandPanel className="mb-6 p-5 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label className="text-[10px] text-foreground-muted block mb-1">Select Country</label>
                <select
                  value={selectedCountryId}
                  onChange={e => setSelectedCountryId(e.target.value)}
                  className="w-full bg-background border border-[var(--border-strong)] text-foreground text-xs font-mono px-2 py-2 rounded-[4px] focus:outline-none focus:border-accent"
                >
                  <option value="">-- Choose Country --</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.region ? \`(\${c.region})\` : ''}</option>
                  ))}
                </select>
              </div>
              {countryData && (
                <div className="flex-1 flex flex-col justify-end">
                  <div className="flex flex-row gap-6 overflow-x-auto pb-1">
                    <DataStat label="Total Tokens" value={Object.keys(countryData.tokens).length} size="compact" />
                    <DataStat label="Region" value={countryData.region || 'None'} size="compact" />
                  </div>
                </div>
              )}
            </div>
            {saveMessage && (
              <div className="text-[10px] font-mono text-foreground-subtle mt-3 pt-2 border-t border-[var(--border)]">
                {saveMessage}
              </div>
            )}
          </CommandPanel>

          {selectedCountryId && (
            <CommandPanel className="mb-6 p-5 md:p-6">
              {countryLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-background-muted rounded w-1/3" />
                  <div className="h-4 bg-background-muted rounded w-1/4" />
                </div>
              ) : countryData ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="section-kicker">Country Tokens</div>
                    <input
                      type="text"
                      placeholder="Search keys or values..."
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      className="bg-background border border-[var(--border-strong)] text-foreground text-xs font-mono px-3 py-1.5 rounded-[4px] focus:outline-none focus:border-accent w-full md:w-64"
                    />
                  </div>

                  <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-[4px]">
                    {filteredCountryTokens.length === 0 ? (
                      <div className="p-4 text-xs text-foreground-subtle font-mono text-center">No tokens found.</div>
                    ) : (
                      filteredCountryTokens.map(([key, value]) => (
                        <div key={key} className="p-2 text-xs flex flex-col md:flex-row md:items-center gap-4 hover:bg-background-muted/50 transition-colors group">
                          {editingCountryToken === key ? (
                            <div className="w-full flex flex-col md:flex-row gap-2">
                              <div className="w-full md:w-1/3 font-mono py-1 truncate" title={key}>{key}</div>
                              <input
                                type="text"
                                value={editCountryTokenValue}
                                onChange={e => setEditCountryTokenValue(e.target.value)}
                                className="flex-1 bg-background border border-[var(--border-strong)] text-foreground text-xs font-mono px-2 py-1 rounded-[2px] focus:outline-none focus:border-accent"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveCountryToken(key, editCountryTokenValue);
                                  if (e.key === 'Escape') setEditingCountryToken(null);
                                }}
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => setEditingCountryToken(null)} className="text-[10px] text-foreground-subtle hover:text-foreground">Cancel</button>
                                <button
                                  onClick={() => handleSaveCountryToken(key, editCountryTokenValue)}
                                  className="btn btn-primary text-xs px-3 py-1"
                                  disabled={saving}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-full md:w-1/3 font-mono truncate text-accent" title={key}>{key}</div>
                              <div className="flex-1 min-w-0 text-foreground-subtle truncate font-mono" title={String(value)}>
                                {String(value)}
                              </div>
                              <div className="shrink-0 flex justify-end">
                                <button
                                  onClick={() => {
                                    setEditingCountryToken(key);
                                    setEditCountryTokenValue(String(value));
                                  }}
                                  className="text-[10px] text-foreground-subtle hover:text-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={saving}
                                >
                                  Edit
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="text-xs text-[var(--error)] font-mono">Failed to load country data</div>
              )}
            </CommandPanel>
          )}
        </>
      ) : loading ? (`;

code = code.replace(/      <ScreenHeader[\s\S]*?eyebrow="Registry"\n      \/>\n\n      \{loading \? \(/, renderNav);

// Find the last closing tag of the registry condition and close our mode condition
// Wait, the easiest way is to add `}` to the end of the registry rendering.
// The registry part is rendered as: `) : registry && summary ? (<> ... </>) : ...`
// My new structure: `{mode === 'country' ? (<>...</>) : loading ? (...) : registry && summary ? (<>...</>) : (...)}`
// Yes, `renderNav` ends with `) : loading ? (` which perfectly splices in.

fs.writeFileSync('web/src/app/tokens/page.tsx', code);
