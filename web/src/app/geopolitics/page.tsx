'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import CommandPanel from '@/components/CommandPanel';
import ScreenHeader from '@/components/ScreenHeader';
import DataStat from '@/components/DataStat';
import type { GeopoliticalProfile, CountryRelationship, RelationshipType } from '@/types/geopolitical';

interface CountryBasic {
  id: string;
  name: string;
  region: string;
}

interface CountryGeopoliticalData {
  id: string;
  name: string;
  region: string;
  geopolitical: GeopoliticalProfile | null;
}

const RELATIONSHIP_TYPES: RelationshipType[] = [
  'formal_ally', 'strategic_partner', 'neutral', 'rival', 'adversary', 'conflict',
];

const GOVERNMENT_CATEGORIES = [
  'liberal_democracy', 'illiberal_democracy', 'hybrid_regime',
  'authoritarian', 'totalitarian', 'theocracy',
  'constitutional_monarchy', 'absolute_monarchy',
];

const GOV_LABELS: Record<string, string> = {
  liberal_democracy: 'Liberal Democracy',
  illiberal_democracy: 'Illiberal Democracy',
  hybrid_regime: 'Hybrid Regime',
  authoritarian: 'Authoritarian',
  totalitarian: 'Totalitarian',
  theocracy: 'Theocracy',
  constitutional_monarchy: 'Constitutional Monarchy',
  absolute_monarchy: 'Absolute Monarchy',
};

const REL_LABELS: Record<string, string> = {
  formal_ally: 'Formal Ally',
  strategic_partner: 'Strategic Partner',
  neutral: 'Neutral',
  rival: 'Rival',
  adversary: 'Adversary',
  conflict: 'Conflict',
};

function emptyProfile(): GeopoliticalProfile {
  return { allies: [], adversaries: [], neighbors: [], tags: [], governmentCategory: '', regimeStability: 0 };
}

export default function GeopoliticalPage() {
  const [countries, setCountries] = useState<CountryBasic[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [countryData, setCountryData] = useState<CountryGeopoliticalData | null>(null);
  const [profile, setProfile] = useState<GeopoliticalProfile>(emptyProfile());
  const [loading, setLoading] = useState(true);
  const [countryLoading, setCountryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [editingRel, setEditingRel] = useState<{ section: string; index: number } | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CountryRelationship>>({});
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetApplyMessage, setPresetApplyMessage] = useState<string | null>(null);

  const activeRegions = useMemo(() => {
    const r = new Set<string>();
    countries.forEach(c => { if (c.region) r.add(c.region); });
    return Array.from(r).sort();
  }, [countries]);

  const filteredCountries = useMemo(() => {
    return countries.filter(c => {
      if (regionFilter !== 'all' && c.region !== regionFilter) return false;
      if (search) return c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
      return true;
    });
  }, [countries, search, regionFilter]);

  const fetchCountries = useCallback(async () => {
    try {
      const res = await fetch('/api/countries');
      if (res.ok) {
        const data = await res.json();
        setCountries(data.countries || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchCountryGeopolitical = useCallback(async (countryId: string) => {
    setCountryLoading(true);
    try {
      const res = await fetch(`/api/countries/${countryId}/geopolitics`);
      if (res.ok) {
        const data = await res.json();
        setCountryData(data.country);
        setProfile(data.country?.geopolitical ?? emptyProfile());
      }
    } catch { /* ignore */ }
    finally { setCountryLoading(false); }
  }, []);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  useEffect(() => {
    if (selectedCountryId) {
      fetchCountryGeopolitical(selectedCountryId);
    } else {
      setCountryData(null);
      setProfile(emptyProfile());
    }
  }, [selectedCountryId, fetchCountryGeopolitical]);

  const handleSave = async () => {
    if (!selectedCountryId) return;
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const res = await fetch(`/api/countries/${selectedCountryId}/geopolitics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.geopolitical);
        setSaveMessage('Saved successfully');
        setEditingRel(null);
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error || 'Failed to save');
      }
    } catch {
      setSaveError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!selectedCountryId || !importText.trim()) return;
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const body = importFormat === 'csv' ? { csvText: importText } : JSON.parse(importText);
      const res = await fetch(
        `/api/countries/${selectedCountryId}/geopolitics/import?format=${importFormat}&mode=${importMode}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setProfile(data.geopolitical);
        setSaveMessage('Imported successfully');
        setShowImport(false);
        setImportText('');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error || 'Import failed');
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Invalid input');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'yaml') => {
    if (!selectedCountryId) return;
    window.open(`/api/countries/${selectedCountryId}/geopolitics/export?format=${format}`, '_blank');
  };

  const handleExportAll = async (format: 'json' | 'csv' | 'yaml') => {
    window.open(`/api/countries/geopolitics/export-all?format=${format}`, '_blank');
  };

  const handleApplyPreset = async () => {
    if (!selectedCountryId) return;
    setSaving(true);
    setPresetApplyMessage(null);
    try {
      const presetData = GEOPOLITICAL_PRESETS[selectedCountryId];
      if (!presetData) {
        setPresetApplyMessage('No preset available for this country');
        setSaving(false);
        return;
      }
      const res = await fetch(`/api/countries/${selectedCountryId}/geopolitics/import?format=json&mode=replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presetData),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.geopolitical);
        setPresetApplyMessage('Preset applied successfully');
        setShowPresets(false);
        setTimeout(() => setPresetApplyMessage(null), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setPresetApplyMessage(err.error || 'Failed to apply preset');
      }
    } catch {
      setPresetApplyMessage('Network error');
    } finally {
      setSaving(false);
    }
  };

  const updateRel = (section: string, index: number, field: string, value: any) => {
    setProfile(prev => {
      const list = [...(prev[section as keyof GeopoliticalProfile] as CountryRelationship[])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [section]: list };
    });
  };

  const addRel = (section: string) => {
    setProfile(prev => {
      const list = [...(prev[section as keyof GeopoliticalProfile] as CountryRelationship[])];
      list.push({ countryId: '', type: 'neutral', strength: 0, sharedBorder: false });
      return { ...prev, [section]: list };
    });
  };

  const removeRel = (section: string, index: number) => {
    setProfile(prev => {
      const list = [...(prev[section as keyof GeopoliticalProfile] as CountryRelationship[])];
      list.splice(index, 1);
      return { ...prev, [section]: list };
    });
  };

  const updateTag = (index: number, value: string) => {
    setProfile(prev => {
      const tags = [...prev.tags];
      tags[index] = value;
      return { ...prev, tags };
    });
  };

  const addTag = () => {
    setProfile(prev => ({ ...prev, tags: [...prev.tags, ''] }));
  };

  const removeTag = (index: number) => {
    setProfile(prev => {
      const tags = [...prev.tags];
      tags.splice(index, 1);
      return { ...prev, tags };
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <ScreenHeader section="Content Operations" title="Geopolitical Profiles" subtitle="Loading..." eyebrow="Geopolitics" />
        <CommandPanel className="mb-6 p-5"><div className="animate-pulse h-4 bg-background-muted rounded w-1/4" /></CommandPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] flex flex-col gap-6 pb-20">
      <ScreenHeader
        section="Content Operations"
        title="Geopolitical Profiles"
        subtitle="Manage country alliances, adversaries, neighbors, and government profiles."
        eyebrow="Geopolitics"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search countries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-sm text-foreground placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-sm text-foreground focus:border-[var(--accent-primary)] focus:outline-none"
        >
          <option value="all">All Regions</option>
          {activeRegions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={() => handleExportAll('json')}
          className="inline-flex items-center rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground hover:border-[var(--border-strong)] transition-colors"
        >
          Export All JSON
        </button>
        <button
          onClick={() => handleExportAll('csv')}
          className="inline-flex items-center rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground hover:border-[var(--border-strong)] transition-colors"
        >
          Export All CSV
        </button>
        <button
          onClick={() => handleExportAll('yaml')}
          className="inline-flex items-center rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground hover:border-[var(--border-strong)] transition-colors"
        >
          Export All YAML
        </button>
      </div>

      <div className="flex gap-6">
        {/* Country sidebar */}
        <div className="w-64 shrink-0">
          <div className="h-[calc(100vh-220px)] overflow-y-auto border border-[var(--border)] rounded-[8px] bg-[var(--background)]">
            <div className="p-3">
              <div className="text-xs font-medium text-[var(--foreground-muted)] mb-2 sticky top-0 bg-[var(--background)] py-1">
                {filteredCountries.length} countries
              </div>
              {filteredCountries.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCountryId(c.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedCountryId === c.id
                      ? 'bg-[var(--accent-muted)] text-foreground border-l-2 border-[var(--accent-primary)]'
                      : 'text-[var(--foreground-muted)] hover:text-foreground hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  <div className="truncate">{c.name}</div>
                  <div className="text-[10px] text-[var(--foreground-muted)]">{c.region}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main editor */}
        <div className="flex-1 min-w-0">
          {countryLoading && (
            <CommandPanel className="p-5"><div className="animate-pulse h-4 bg-background-muted rounded w-1/4" /></CommandPanel>
          )}

          {!countryLoading && countryData && (
            <>
              {/* Stats bar */}
              <CommandPanel className="p-5 md:p-6">
                <div className="flex flex-row gap-6 overflow-x-auto pb-2">
                  <DataStat label="Country" value={countryData.name} size="compact" />
                  <DataStat label="Government" value={GOV_LABELS[profile.governmentCategory] || '—'} size="compact" />
                  <DataStat label="Stability" value={profile.regimeStability} size="compact" />
                  <DataStat label="Allies" value={profile.allies.length} size="compact" />
                  <DataStat label="Adversaries" value={profile.adversaries.length} size="compact" />
                  <DataStat label="Neighbors" value={profile.neighbors.length} size="compact" />
                  <DataStat label="Tags" value={profile.tags.length} size="compact" />
                </div>
                {saveMessage && (
                  <div className="text-[10px] font-mono text-success mt-3 pt-2 border-t border-[var(--border)]">{saveMessage}</div>
                )}
                {saveError && (
                  <div className="text-[10px] font-mono text-[var(--danger)] mt-3 pt-2 border-t border-[var(--border)]">{saveError}</div>
                )}
              </CommandPanel>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center rounded-[8px] border border-[var(--accent-primary)] bg-[var(--accent-muted)] px-4 py-1.5 text-xs font-medium text-foreground hover:bg-[var(--accent-primary)]/20 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setShowImport(!showImport)}
                  className="inline-flex items-center rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground hover:border-[var(--border-strong)] transition-colors"
                >
                  Import
                </button>
                <button
                  onClick={() => setShowExport(!showExport)}
                  className="inline-flex items-center rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground hover:border-[var(--border-strong)] transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="inline-flex items-center rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground hover:border-[var(--border-strong)] transition-colors"
                >
                  Apply Preset
                </button>
              </div>

              {/* Import panel */}
              {showImport && (
                <CommandPanel className="p-5 mt-4" tone="accent">
                  <div className="text-xs font-medium text-[var(--foreground-muted)] mb-3">Import Data</div>
                  <div className="flex gap-3 mb-3">
                    <label className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                      <input type="radio" name="importFormat" checked={importFormat === 'json'} onChange={() => setImportFormat('json')} /> JSON
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                      <input type="radio" name="importFormat" checked={importFormat === 'csv'} onChange={() => setImportFormat('csv')} /> CSV
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                      <input type="radio" name="importMode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /> Replace
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                      <input type="radio" name="importMode" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /> Merge
                    </label>
                  </div>
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    rows={8}
                    className="w-full rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-mono text-foreground placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent-primary)] focus:outline-none resize-y"
                    placeholder={importFormat === 'json' ? '{"allies": [...], "adversaries": [...], ...}' : 'countryId,type,strength,treaty,sharedBorder'}
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleImport} disabled={saving || !importText.trim()} className="rounded-[8px] border border-[var(--accent-primary)] bg-[var(--accent-muted)] px-3 py-1 text-xs font-medium text-foreground disabled:opacity-50">
                      Import
                    </button>
                    <button onClick={() => { setShowImport(false); setImportText(''); }} className="rounded-[8px] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground-muted)]">
                      Cancel
                    </button>
                  </div>
                </CommandPanel>
              )}

              {/* Export panel */}
              {showExport && (
                <CommandPanel className="p-5 mt-4" tone="accent">
                  <div className="text-xs font-medium text-[var(--foreground-muted)] mb-3">Export Data</div>
                  <div className="flex gap-2">
                    <button onClick={() => handleExport('json')} className="rounded-[8px] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground">JSON</button>
                    <button onClick={() => handleExport('csv')} className="rounded-[8px] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground">CSV</button>
                    <button onClick={() => handleExport('yaml')} className="rounded-[8px] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground">YAML</button>
                  </div>
                </CommandPanel>
              )}

              {/* Presets panel */}
              {showPresets && (
                <CommandPanel className="p-5 mt-4" tone="accent">
                  <div className="text-xs font-medium text-[var(--foreground-muted)] mb-3">Apply Seed Preset</div>
                  <p className="text-xs text-[var(--foreground-muted)] mb-3">
                    This will replace the current geopolitical profile with the seed data for {countryData.name}.
                  </p>
                  <button
                    onClick={handleApplyPreset}
                    disabled={saving || !selectedCountryId || !GEOPOLITICAL_PRESETS[selectedCountryId]}
                    className="rounded-[8px] border border-[var(--accent-primary)] bg-[var(--accent-muted)] px-3 py-1 text-xs font-medium text-foreground disabled:opacity-50"
                  >
                    {selectedCountryId && GEOPOLITICAL_PRESETS[selectedCountryId] ? 'Apply Preset' : 'No preset available'}
                  </button>
                  {presetApplyMessage && (
                    <div className="text-[10px] font-mono mt-2 text-[var(--foreground-muted)]">{presetApplyMessage}</div>
                  )}
                </CommandPanel>
              )}

              {/* Government settings */}
              <CommandPanel className="p-5 mt-4">
                <div className="text-xs font-medium text-[var(--foreground-muted)] mb-4">Government Profile</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">Government Category</label>
                    <select
                      value={profile.governmentCategory}
                      onChange={e => setProfile(prev => ({ ...prev, governmentCategory: e.target.value }))}
                      className="w-full rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-sm text-foreground focus:border-[var(--accent-primary)] focus:outline-none"
                    >
                      <option value="">— Select —</option>
                      {GOVERNMENT_CATEGORIES.map(gc => (
                        <option key={gc} value={gc}>{GOV_LABELS[gc]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">
                      Regime Stability: {profile.regimeStability}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={profile.regimeStability}
                      onChange={e => setProfile(prev => ({ ...prev, regimeStability: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </CommandPanel>

              {/* Tags */}
              <CommandPanel className="p-5 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs font-medium text-[var(--foreground-muted)]">Geopolitical Tags</div>
                  <button onClick={addTag} className="text-xs font-medium text-[var(--accent-primary)] hover:underline">+ Add Tag</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.tags.map((tag, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input
                        value={tag}
                        onChange={e => updateTag(i, e.target.value)}
                        className="rounded-[6px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs text-foreground focus:border-[var(--accent-primary)] focus:outline-none w-36"
                        placeholder="tag..."
                      />
                      <button onClick={() => removeTag(i)} className="text-[var(--foreground-muted)] hover:text-[var(--danger)] text-xs">×</button>
                    </div>
                  ))}
                </div>
              </CommandPanel>

              {/* Relationship sections */}
              {(['allies', 'adversaries', 'neighbors'] as const).map(section => (
                <CommandPanel key={section} className="p-5 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-medium text-[var(--foreground-muted)]">
                      {section.charAt(0).toUpperCase() + section.slice(1)} ({profile[section].length})
                    </div>
                    <button onClick={() => addRel(section)} className="text-xs font-medium text-[var(--accent-primary)] hover:underline">+ Add</button>
                  </div>
                  {profile[section].length === 0 && (
                    <div className="text-xs text-[var(--foreground-muted)] italic">None defined</div>
                  )}
                  <div className="space-y-3">
                    {profile[section].map((rel, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-3 p-3 rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]">
                        <select
                          value={rel.countryId}
                          onChange={e => updateRel(section, i, 'countryId', e.target.value)}
                          className="rounded-[6px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs text-foreground focus:border-[var(--accent-primary)] focus:outline-none min-w-[120px]"
                        >
                          <option value="">— Country —</option>
                          {countries.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <select
                          value={rel.type}
                          onChange={e => updateRel(section, i, 'type', e.target.value)}
                          className="rounded-[6px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs text-foreground focus:border-[var(--accent-primary)] focus:outline-none"
                        >
                          {RELATIONSHIP_TYPES.map(t => (
                            <option key={t} value={t}>{REL_LABELS[t]}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-[var(--foreground-muted)]">Strength</label>
                          <input
                            type="number"
                            min={-100}
                            max={100}
                            value={rel.strength}
                            onChange={e => updateRel(section, i, 'strength', Number(e.target.value))}
                            className="w-16 rounded-[6px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs text-foreground focus:border-[var(--accent-primary)] focus:outline-none"
                          />
                        </div>
                        <input
                          value={rel.treaty || ''}
                          onChange={e => updateRel(section, i, 'treaty', e.target.value)}
                          placeholder="Treaty..."
                          className="rounded-[6px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs text-foreground focus:border-[var(--accent-primary)] focus:outline-none w-32"
                        />
                        <label className="flex items-center gap-1 text-xs text-[var(--foreground-muted)]">
                          <input
                            type="checkbox"
                            checked={rel.sharedBorder}
                            onChange={e => updateRel(section, i, 'sharedBorder', e.target.checked)}
                          />
                          Shared border
                        </label>
                        <button
                          onClick={() => removeRel(section, i)}
                          className="text-[var(--foreground-muted)] hover:text-[var(--danger)] text-xs ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </CommandPanel>
              ))}
            </>
          )}

          {!countryLoading && !countryData && !selectedCountryId && (
            <CommandPanel className="p-8 text-center">
              <div className="text-sm text-[var(--foreground-muted)]">Select a country from the sidebar to edit its geopolitical profile.</div>
            </CommandPanel>
          )}
        </div>
      </div>
    </div>
  );
}

// Seed presets from populate-geopolitical-data.ts
const GEOPOLITICAL_PRESETS: Record<string, any> = {
  au: {
    governmentCategory: 'constitutional_monarchy',
    regimeStability: 82,
    tags: ['island_nation', 'regional_power', 'five_eyes', 'anglosphere', 'coastal', 'indo_pacific'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 88, treaty: 'ANZUS' },
      { countryId: 'gb', type: 'formal_ally', strength: 80, treaty: 'Five Eyes' },
      { countryId: 'nz', type: 'formal_ally', strength: 85, treaty: 'ANZUS' },
      { countryId: 'jp', type: 'strategic_partner', strength: 72 },
      { countryId: 'sg', type: 'strategic_partner', strength: 65 },
    ],
    adversaries: [
      { countryId: 'cn', type: 'rival', strength: -55 },
    ],
    neighbors: [],
  },
  br: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 58,
    tags: ['coastal', 'regional_power', 'mercosur_member', 'brics_member', 'portuguese_speaking'],
    allies: [
      { countryId: 'ar', type: 'strategic_partner', strength: 55, treaty: 'MERCOSUR' },
      { countryId: 'cn', type: 'strategic_partner', strength: 48 },
    ],
    adversaries: [],
    neighbors: [],
  },
  ca: {
    governmentCategory: 'constitutional_monarchy',
    regimeStability: 84,
    tags: ['coastal', 'regional_power', 'five_eyes', 'anglosphere', 'nato_member', 'g7_member'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 90, treaty: 'NORAD' },
      { countryId: 'gb', type: 'formal_ally', strength: 82, treaty: 'Five Eyes' },
      { countryId: 'fr', type: 'formal_ally', strength: 75, treaty: 'NATO' },
    ],
    adversaries: [],
    neighbors: [
      { countryId: 'us', type: 'strategic_partner', strength: 90, sharedBorder: true },
    ],
  },
  cn: {
    governmentCategory: 'authoritarian',
    regimeStability: 78,
    tags: ['nuclear_state', 'permanent_unsc', 'coastal', 'great_power', 'brics_member', 'shangai_member'],
    allies: [
      { countryId: 'kp', type: 'formal_ally', strength: 60, treaty: 'Sino-NK Mutual Assistance' },
      { countryId: 'pk', type: 'strategic_partner', strength: 75 },
      { countryId: 'ru', type: 'strategic_partner', strength: 65 },
    ],
    adversaries: [
      { countryId: 'us', type: 'rival', strength: -70 },
      { countryId: 'jp', type: 'rival', strength: -45 },
      { countryId: 'in', type: 'rival', strength: -40 },
    ],
    neighbors: [
      { countryId: 'ru', type: 'neutral', strength: 10, sharedBorder: true },
      { countryId: 'in', type: 'rival', strength: -40, sharedBorder: true },
      { countryId: 'kp', type: 'formal_ally', strength: 60, sharedBorder: true },
      { countryId: 'vn', type: 'rival', strength: -20, sharedBorder: true },
    ],
  },
  de: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 85,
    tags: ['coastal', 'regional_power', 'eu_member', 'nato_member', 'g7_member'],
    allies: [
      { countryId: 'fr', type: 'formal_ally', strength: 85, treaty: 'Elysée Treaty' },
      { countryId: 'us', type: 'formal_ally', strength: 78, treaty: 'NATO' },
      { countryId: 'gb', type: 'formal_ally', strength: 70, treaty: 'NATO' },
    ],
    adversaries: [],
    neighbors: [
      { countryId: 'fr', type: 'formal_ally', strength: 85, sharedBorder: true },
      { countryId: 'pl', type: 'strategic_partner', strength: 55, sharedBorder: true },
    ],
  },
  fr: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 72,
    tags: ['nuclear_state', 'permanent_unsc', 'coastal', 'regional_power', 'eu_member', 'nato_member', 'g7_member'],
    allies: [
      { countryId: 'de', type: 'formal_ally', strength: 85, treaty: 'Elysée Treaty' },
      { countryId: 'gb', type: 'formal_ally', strength: 72, treaty: 'Lancaster House' },
      { countryId: 'us', type: 'formal_ally', strength: 75, treaty: 'NATO' },
    ],
    adversaries: [],
    neighbors: [
      { countryId: 'de', type: 'formal_ally', strength: 85, sharedBorder: true },
    ],
  },
  gb: {
    governmentCategory: 'constitutional_monarchy',
    regimeStability: 78,
    tags: ['nuclear_state', 'permanent_unsc', 'coastal', 'regional_power', 'five_eyes', 'nato_member', 'g7_member'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 88, treaty: 'Special Relationship' },
      { countryId: 'fr', type: 'formal_ally', strength: 72, treaty: 'Lancaster House' },
      { countryId: 'de', type: 'formal_ally', strength: 70, treaty: 'NATO' },
    ],
    adversaries: [
      { countryId: 'ru', type: 'adversary', strength: -65 },
    ],
    neighbors: [],
  },
  in: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 68,
    tags: ['nuclear_state', 'coastal', 'regional_power', 'brics_member', 'quad_member', 'non_aligned'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 60 },
      { countryId: 'ru', type: 'strategic_partner', strength: 55 },
      { countryId: 'fr', type: 'strategic_partner', strength: 50 },
    ],
    adversaries: [
      { countryId: 'cn', type: 'rival', strength: -40 },
      { countryId: 'pk', type: 'adversary', strength: -70 },
    ],
    neighbors: [
      { countryId: 'pk', type: 'adversary', strength: -70, sharedBorder: true },
      { countryId: 'cn', type: 'rival', strength: -40, sharedBorder: true },
    ],
  },
  il: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 62,
    tags: ['nuclear_state', 'coastal', 'middle_power', 'us_ally'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 90 },
    ],
    adversaries: [
      { countryId: 'ir', type: 'adversary', strength: -85 },
      { countryId: 'sy', type: 'conflict', strength: -80 },
    ],
    neighbors: [
      { countryId: 'eg', type: 'neutral', strength: 10, sharedBorder: true },
      { countryId: 'jo', type: 'neutral', strength: 20, sharedBorder: true },
    ],
  },
  ir: {
    governmentCategory: 'theocracy',
    regimeStability: 55,
    tags: ['coastal', 'regional_power', 'oil_exporter', 'shia_power', 'sanctioned_state'],
    allies: [
      { countryId: 'sy', type: 'strategic_partner', strength: 65 },
      { countryId: 'ru', type: 'strategic_partner', strength: 50 },
    ],
    adversaries: [
      { countryId: 'us', type: 'adversary', strength: -85 },
      { countryId: 'il', type: 'adversary', strength: -85 },
      { countryId: 'sa', type: 'rival', strength: -55 },
    ],
    neighbors: [
      { countryId: 'iq', type: 'neutral', strength: 10, sharedBorder: true },
    ],
  },
  jp: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 82,
    tags: ['coastal', 'regional_power', 'g7_member', 'us_ally', 'quad_member'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 90, treaty: 'US-Japan Security Treaty' },
      { countryId: 'au', type: 'strategic_partner', strength: 72 },
    ],
    adversaries: [
      { countryId: 'cn', type: 'rival', strength: -45 },
      { countryId: 'kp', type: 'adversary', strength: -70 },
    ],
    neighbors: [],
  },
  kp: {
    governmentCategory: 'totalitarian',
    regimeStability: 45,
    tags: ['nuclear_state', 'coastal', 'sanctioned_state', 'hermit_kingdom'],
    allies: [
      { countryId: 'cn', type: 'formal_ally', strength: 60, treaty: 'Sino-NK Mutual Assistance' },
    ],
    adversaries: [
      { countryId: 'us', type: 'adversary', strength: -90 },
      { countryId: 'kr', type: 'conflict', strength: -85 },
      { countryId: 'jp', type: 'adversary', strength: -70 },
    ],
    neighbors: [
      { countryId: 'kr', type: 'conflict', strength: -85, sharedBorder: true },
      { countryId: 'cn', type: 'formal_ally', strength: 60, sharedBorder: true },
    ],
  },
  kr: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 75,
    tags: ['coastal', 'regional_power', 'us_ally', 'oecd_member', 'quad_partner'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 88, treaty: 'US-ROK Mutual Defense' },
      { countryId: 'jp', type: 'strategic_partner', strength: 50 },
    ],
    adversaries: [
      { countryId: 'kp', type: 'conflict', strength: -85 },
    ],
    neighbors: [
      { countryId: 'kp', type: 'conflict', strength: -85, sharedBorder: true },
    ],
  },
  mx: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 55,
    tags: ['coastal', 'regional_power', 'nafta_member', 'g20_member'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 65, treaty: 'USMCA' },
    ],
    adversaries: [],
    neighbors: [
      { countryId: 'us', type: 'strategic_partner', strength: 65, sharedBorder: true },
    ],
  },
  ng: {
    governmentCategory: 'hybrid_regime',
    regimeStability: 42,
    tags: ['coastal', 'regional_power', 'oil_exporter', 'african_union', 'ecowas_member'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 40 },
      { countryId: 'gb', type: 'strategic_partner', strength: 45 },
    ],
    adversaries: [],
    neighbors: [],
  },
  nz: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 88,
    tags: ['island_nation', 'middle_power', 'five_eyes', 'anglosphere', 'coastal'],
    allies: [
      { countryId: 'au', type: 'formal_ally', strength: 85, treaty: 'ANZUS' },
      { countryId: 'us', type: 'strategic_partner', strength: 60 },
      { countryId: 'gb', type: 'formal_ally', strength: 75, treaty: 'Five Eyes' },
    ],
    adversaries: [],
    neighbors: [],
  },
  pk: {
    governmentCategory: 'hybrid_regime',
    regimeStability: 38,
    tags: ['nuclear_state', 'coastal', 'regional_power', 'oic_member'],
    allies: [
      { countryId: 'cn', type: 'strategic_partner', strength: 75 },
      { countryId: 'sa', type: 'strategic_partner', strength: 55 },
    ],
    adversaries: [
      { countryId: 'in', type: 'adversary', strength: -70 },
    ],
    neighbors: [
      { countryId: 'in', type: 'adversary', strength: -70, sharedBorder: true },
      { countryId: 'af', type: 'neutral', strength: 5, sharedBorder: true },
    ],
  },
  ru: {
    governmentCategory: 'authoritarian',
    regimeStability: 65,
    tags: ['nuclear_state', 'permanent_unsc', 'coastal', 'great_power', 'brics_member', 'csto_member'],
    allies: [
      { countryId: 'by', type: 'formal_ally', strength: 70, treaty: 'Union State' },
      { countryId: 'cn', type: 'strategic_partner', strength: 65 },
      { countryId: 'ir', type: 'strategic_partner', strength: 50 },
    ],
    adversaries: [
      { countryId: 'us', type: 'adversary', strength: -80 },
      { countryId: 'gb', type: 'adversary', strength: -65 },
      { countryId: 'ua', type: 'conflict', strength: -90 },
    ],
    neighbors: [
      { countryId: 'ua', type: 'conflict', strength: -90, sharedBorder: true },
      { countryId: 'cn', type: 'strategic_partner', strength: 65, sharedBorder: true },
    ],
  },
  sa: {
    governmentCategory: 'absolute_monarchy',
    regimeStability: 70,
    tags: ['coastal', 'regional_power', 'oil_exporter', 'opec_member', 'gcc_member'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 70 },
      { countryId: 'pk', type: 'strategic_partner', strength: 55 },
    ],
    adversaries: [
      { countryId: 'ir', type: 'rival', strength: -55 },
    ],
    neighbors: [],
  },
  sg: {
    governmentCategory: 'illiberal_democracy',
    regimeStability: 85,
    tags: ['island_nation', 'middle_power', 'asean_member', 'trade_hub'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 65 },
      { countryId: 'au', type: 'strategic_partner', strength: 60 },
    ],
    adversaries: [],
    neighbors: [],
  },
  sy: {
    governmentCategory: 'authoritarian',
    regimeStability: 25,
    tags: ['coastal', 'conflict_zone', 'sanctioned_state'],
    allies: [
      { countryId: 'ru', type: 'strategic_partner', strength: 70 },
      { countryId: 'ir', type: 'strategic_partner', strength: 65 },
    ],
    adversaries: [
      { countryId: 'us', type: 'adversary', strength: -75 },
      { countryId: 'il', type: 'conflict', strength: -80 },
    ],
    neighbors: [],
  },
  tr: {
    governmentCategory: 'hybrid_regime',
    regimeStability: 58,
    tags: ['coastal', 'regional_power', 'nato_member', 'g20_member'],
    allies: [
      { countryId: 'us', type: 'formal_ally', strength: 50, treaty: 'NATO' },
    ],
    adversaries: [],
    neighbors: [
      { countryId: 'sy', type: 'rival', strength: -30, sharedBorder: true },
      { countryId: 'gr', type: 'rival', strength: -35, sharedBorder: true },
    ],
  },
  ua: {
    governmentCategory: 'illiberal_democracy',
    regimeStability: 35,
    tags: ['coastal', 'conflict_zone', 'aspiring_nato', 'grain_exporter'],
    allies: [
      { countryId: 'us', type: 'strategic_partner', strength: 75 },
      { countryId: 'gb', type: 'strategic_partner', strength: 70 },
      { countryId: 'pl', type: 'strategic_partner', strength: 72 },
    ],
    adversaries: [
      { countryId: 'ru', type: 'conflict', strength: -90 },
    ],
    neighbors: [
      { countryId: 'ru', type: 'conflict', strength: -90, sharedBorder: true },
      { countryId: 'pl', type: 'strategic_partner', strength: 72, sharedBorder: true },
    ],
  },
  us: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 72,
    tags: ['nuclear_state', 'permanent_unsc', 'coastal', 'superpower', 'nato_member', 'g7_member', 'five_eyes'],
    allies: [
      { countryId: 'gb', type: 'formal_ally', strength: 88, treaty: 'Special Relationship' },
      { countryId: 'ca', type: 'formal_ally', strength: 90, treaty: 'NORAD' },
      { countryId: 'au', type: 'formal_ally', strength: 88, treaty: 'ANZUS' },
      { countryId: 'jp', type: 'formal_ally', strength: 90, treaty: 'US-Japan Security Treaty' },
      { countryId: 'kr', type: 'formal_ally', strength: 88, treaty: 'US-ROK Mutual Defense' },
      { countryId: 'il', type: 'formal_ally', strength: 90 },
      { countryId: 'fr', type: 'formal_ally', strength: 75, treaty: 'NATO' },
      { countryId: 'de', type: 'formal_ally', strength: 78, treaty: 'NATO' },
    ],
    adversaries: [
      { countryId: 'cn', type: 'rival', strength: -70 },
      { countryId: 'ru', type: 'adversary', strength: -80 },
      { countryId: 'ir', type: 'adversary', strength: -85 },
      { countryId: 'kp', type: 'adversary', strength: -90 },
    ],
    neighbors: [
      { countryId: 'ca', type: 'formal_ally', strength: 90, sharedBorder: true },
      { countryId: 'mx', type: 'strategic_partner', strength: 65, sharedBorder: true },
    ],
  },
  za: {
    governmentCategory: 'liberal_democracy',
    regimeStability: 52,
    tags: ['coastal', 'regional_power', 'brics_member', 'african_union'],
    allies: [
      { countryId: 'cn', type: 'strategic_partner', strength: 50 },
    ],
    adversaries: [],
    neighbors: [],
  },
};
