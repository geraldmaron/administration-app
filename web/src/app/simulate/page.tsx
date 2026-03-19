'use client';

import { useCallback, useEffect, useState } from 'react';
import CommandPanel from '@/components/CommandPanel';
import BundleBadge from '@/components/BundleBadge';
import DataStat from '@/components/DataStat';
import OperationsNav from '@/components/OperationsNav';
import ScreenHeader from '@/components/ScreenHeader';
import { METRIC_DISPLAY } from '@/lib/constants';
import type { CountrySummary } from '@/lib/types';

// Key metrics to show sliders for (the most simulation-relevant ones)
const SIM_METRICS = [
  'metric_economy',
  'metric_employment',
  'metric_inflation',
  'metric_public_order',
  'metric_crime',
  'metric_corruption',
  'metric_approval',
  'metric_military',
  'metric_foreign_relations',
];

// Inverse metrics (high = bad)
const INVERSE_METRICS = new Set(['metric_inflation', 'metric_crime', 'metric_corruption', 'metric_bureaucracy', 'metric_unrest', 'metric_foreign_influence', 'metric_economic_bubble']);

interface SimScenario {
  id: string;
  title: string;
  description: string;
  options: { id: string; text: string; label?: string; outcomeHeadline?: string }[];
  metadata?: { bundle?: string; severity?: string; difficulty?: number; applicable_countries?: string[] | string };
  conditions?: { metricId: string; min?: number; max?: number }[];
}

interface FilteredScenario {
  scenario: { id: string; title: string; metadata?: { bundle?: string } };
  reason: string;
}

interface SimResult {
  country: { id: string; name: string; region: string; governmentCategory?: string; tags: string[] };
  metrics: Record<string, number>;
  totalScenarios: number;
  eligibleCount: number;
  filteredCount: number;
  eligible: SimScenario[];
  filtered?: FilteredScenario[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function ScenarioCard({ scenario }: { scenario: SimScenario }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <CommandPanel className="p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {scenario.metadata?.bundle ? <BundleBadge bundle={scenario.metadata.bundle} /> : null}
        {scenario.metadata?.difficulty != null ? (
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">Diff {scenario.metadata.difficulty}</span>
        ) : null}
        {scenario.metadata?.severity ? (
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">{scenario.metadata.severity}</span>
        ) : null}
        {scenario.conditions?.length ? (
          <span className="rounded border border-[var(--accent-secondary)]/40 px-1.5 py-0.5 text-[10px] font-mono text-[var(--accent-secondary)]">
            {scenario.conditions.length} condition{scenario.conditions.length > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">{scenario.title}</h3>
      <p className="mb-3 text-sm leading-relaxed text-[var(--foreground-muted)]">{scenario.description}</p>

      {scenario.conditions?.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {scenario.conditions.map((c, i) => (
            <span key={i} className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-[var(--foreground-subtle)]">
              {METRIC_DISPLAY[c.metricId] ?? c.metricId}
              {c.min != null ? ` ≥ ${c.min}` : ''}
              {c.max != null ? ` ≤ ${c.max}` : ''}
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--foreground-muted)] hover:text-foreground"
      >
        {expanded ? 'Hide options' : 'Show options'}
      </button>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
          {scenario.options.map((opt, i) => (
            <div key={opt.id ?? i}>
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] border border-[var(--border)] bg-[rgba(25,105,220,0.14)] text-[9px] font-mono font-bold text-[var(--accent-primary)]">
                  {OPTION_LABELS[i]}
                </span>
                {opt.label ? <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-subtle)]">{opt.label}</span> : null}
              </div>
              <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">{opt.text}</p>
              {opt.outcomeHeadline ? (
                <p className="mt-1 text-xs font-semibold text-foreground">{opt.outcomeHeadline}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </CommandPanel>
  );
}

export default function SimulatePage() {
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [metricOverrides, setMetricOverrides] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFiltered, setShowFiltered] = useState(false);
  const [activeTab, setActiveTab] = useState<'eligible' | 'filtered'>('eligible');

  useEffect(() => {
    fetch('/api/countries')
      .then((r) => r.json())
      .then((data: { countries: CountrySummary[] }) => setCountries(data.countries ?? []))
      .catch(() => undefined);
  }, []);

  // When country changes, reset overrides and load defaults
  useEffect(() => {
    setMetricOverrides({});
    setResult(null);
  }, [selectedCountry]);

  const run = useCallback(() => {
    if (!selectedCountry) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ countryId: selectedCountry, showFiltered: 'true' });
    for (const [k, v] of Object.entries(metricOverrides)) {
      params.set(k, String(v));
    }

    fetch(`/api/simulate?${params}`)
      .then((r) => r.json())
      .then((data: SimResult & { error?: string }) => {
        if (data.error) { setError(data.error); return; }
        setResult(data);
        // Initialize sliders from returned metrics if not already set
        setMetricOverrides((prev) => {
          const next = { ...prev };
          for (const key of SIM_METRICS) {
            if (!(key in next) && key in data.metrics) next[key] = data.metrics[key];
          }
          return next;
        });
      })
      .catch(() => setError('Simulation request failed.'))
      .finally(() => setLoading(false));
  }, [selectedCountry, metricOverrides]);

  // Auto-run when country changes (after clearing state)
  useEffect(() => {
    if (selectedCountry) run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  function setMetric(key: string, value: number) {
    setMetricOverrides((prev) => ({ ...prev, [key]: value }));
  }

  const metricColor = (key: string, val: number) => {
    const inverse = INVERSE_METRICS.has(key);
    const bad = inverse ? val > 60 : val < 40;
    const good = inverse ? val < 40 : val > 60;
    if (bad) return 'text-[var(--error)]';
    if (good) return 'text-[var(--success)]';
    return 'text-[var(--foreground-muted)]';
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <ScreenHeader
        section="Content Operations"
        title="Country Simulation"
        subtitle="Select a country and tune its metrics to see which scenarios would surface in-game and how they resolve with that country's tokens."
        eyebrow="Simulate"
        nav={<OperationsNav />}
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Left: Controls */}
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <CommandPanel className="p-5">
            <div className="mb-4">
              <div className="section-kicker mb-2">Target</div>
              <h2 className="text-xl font-semibold text-foreground">Country</h2>
            </div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="input-shell"
            >
              <option value="">Select a country…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.region}
                </option>
              ))}
            </select>
          </CommandPanel>

          {result ? (
            <CommandPanel className="p-5">
              <div className="mb-4">
                <div className="section-kicker mb-2">Profile</div>
                <h2 className="text-xl font-semibold text-foreground">{result.country.name}</h2>
                <p className="text-xs text-[var(--foreground-muted)]">{result.country.region} · {result.country.governmentCategory ?? '—'}</p>
              </div>
              {result.country.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {result.country.tags.map((tag) => (
                    <span key={tag} className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--foreground-subtle)]">{tag}</span>
                  ))}
                </div>
              ) : null}
            </CommandPanel>
          ) : null}

          <CommandPanel className="p-5">
            <div className="mb-4">
              <div className="section-kicker mb-2">Metrics</div>
              <h2 className="text-xl font-semibold text-foreground">State Tuning</h2>
            </div>
            <div className="space-y-4">
              {SIM_METRICS.map((key) => {
                const val = metricOverrides[key] ?? result?.metrics[key] ?? 50;
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs text-[var(--foreground-muted)]">{METRIC_DISPLAY[key] ?? key}</label>
                      <span className={`text-[11px] font-mono ${metricColor(key, val)}`}>{Math.round(val)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={val}
                      onChange={(e) => setMetric(key, Number(e.target.value))}
                      className="w-full accent-[var(--accent-primary)]"
                    />
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={run}
              disabled={!selectedCountry || loading}
              className="btn btn-command mt-5 w-full disabled:opacity-50"
            >
              {loading ? 'Simulating…' : 'Run Simulation'}
            </button>
          </CommandPanel>
        </div>

        {/* Right: Results */}
        <div className="min-w-0 space-y-6">
          {error ? (
            <CommandPanel tone="danger" className="p-4 text-sm text-[var(--error)]">{error}</CommandPanel>
          ) : null}

          {result ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <DataStat label="Total Scenarios" value={result.totalScenarios} />
                <DataStat label="Eligible" value={result.eligibleCount} accent="blue" detail="Pass all filters for this country" />
                <DataStat label="Filtered Out" value={result.filteredCount} accent={result.filteredCount > 0 ? 'warning' : undefined} detail="Blocked by conditions or gates" />
              </div>

              <div className="flex gap-3 border-b border-[var(--border)] pb-px">
                {(['eligible', 'filtered'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-mono uppercase tracking-[0.14em] transition-colors ${
                      activeTab === tab
                        ? 'border-b-2 border-[var(--accent-primary)] text-foreground'
                        : 'text-[var(--foreground-muted)] hover:text-foreground'
                    }`}
                  >
                    {tab === 'eligible' ? `Eligible (${result.eligibleCount})` : `Filtered (${result.filteredCount})`}
                  </button>
                ))}
              </div>

              {activeTab === 'eligible' ? (
                result.eligible.length === 0 ? (
                  <CommandPanel className="p-8 text-center">
                    <div className="text-sm text-[var(--foreground-muted)]">No eligible scenarios for these parameters.</div>
                  </CommandPanel>
                ) : (
                  <div className="space-y-4">
                    {result.eligible.map((s) => (
                      <ScenarioCard key={s.id} scenario={s} />
                    ))}
                  </div>
                )
              ) : null}

              {activeTab === 'filtered' && result.filtered ? (
                result.filtered.length === 0 ? (
                  <CommandPanel className="p-8 text-center">
                    <div className="text-sm text-[var(--foreground-muted)]">All scenarios pass for this country.</div>
                  </CommandPanel>
                ) : (
                  <div className="space-y-2">
                    {result.filtered.map((item, i) => (
                      <CommandPanel key={item.scenario.id ?? i} className="px-4 py-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="min-w-0 flex-1">
                            {item.scenario.metadata?.bundle ? (
                              <span className="mr-2 inline-block"><BundleBadge bundle={item.scenario.metadata.bundle} /></span>
                            ) : null}
                            <span className="text-sm text-[var(--foreground-muted)]">{item.scenario.title}</span>
                          </div>
                          <span className="shrink-0 rounded border border-[var(--error)]/30 px-2 py-0.5 text-[10px] font-mono text-[var(--error)]">
                            {item.reason}
                          </span>
                        </div>
                      </CommandPanel>
                    ))}
                  </div>
                )
              ) : null}
            </>
          ) : !loading && selectedCountry ? null : !selectedCountry ? (
            <CommandPanel className="p-12 text-center">
              <div className="text-sm text-[var(--foreground-muted)]">Select a country to begin simulation.</div>
            </CommandPanel>
          ) : null}

          {loading ? (
            <CommandPanel className="p-8 text-center">
              <div className="text-sm text-[var(--foreground-muted)]">Running simulation…</div>
            </CommandPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
