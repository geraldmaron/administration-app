'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CountrySummary,
  SimulationScenario,
  SimulationTokenUsage,
} from '@/lib/types';

interface TokenPreviewProps {
  scenarioId: string;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function uniqueTokenUsages(usages: SimulationTokenUsage[]): SimulationTokenUsage[] {
  const seen = new Set<string>();
  return usages.filter((usage) => {
    const key = `${usage.token}:${usage.value}:${usage.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function TokenPreview({ scenarioId }: TokenPreviewProps) {
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationScenario | null>(null);
  const [context, setContext] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/countries')
      .then((r) => r.json())
      .then((data: { countries: CountrySummary[] }) => setCountries(data.countries ?? []))
      .catch(() => undefined);
  }, []);

  const preview = useCallback(() => {
    if (!selectedCountry) return;
    setLoading(true);
    setError(null);
    fetch(`/api/scenarios/${scenarioId}/preview?countryId=${selectedCountry}`)
      .then((r) => r.json())
      .then((data: { resolved?: SimulationScenario; context?: Record<string, string>; error?: string }) => {
        if (data.error) { setError(data.error); return; }
        setResult(data.resolved ?? null);
        setContext(data.context ?? {});
      })
      .catch(() => setError('Preview request failed.'))
      .finally(() => setLoading(false));
  }, [scenarioId, selectedCountry]);

  useEffect(() => {
    if (selectedCountry) preview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  const failedChecks = result?.diagnostics?.validationChecks.filter((c) => !c.passed) ?? [];
  const fallbackTokens = result?.diagnostics?.fallbackTokens ?? [];
  const usages = uniqueTokenUsages(result?.diagnostics?.tokenUsages ?? []).slice(0, 20);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="section-kicker shrink-0">Token Preview</div>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="input-shell text-xs"
          style={{ width: 'auto', minWidth: 200 }}
        >
          <option value="">Select a country…</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>{c.name} · {c.region}</option>
          ))}
        </select>
        {loading && <span className="text-[11px] font-medium text-[var(--foreground-subtle)]">Resolving…</span>}
        {result && !loading && (
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-medium ${failedChecks.length === 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {failedChecks.length === 0 ? 'All checks pass' : `${failedChecks.length} failing`}
            </span>
            {fallbackTokens.length > 0 && (
              <span className="text-[11px] font-medium text-[var(--warning)]">
                {fallbackTokens.length} fallback{fallbackTokens.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-[var(--error)] mb-3">{error}</div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="control-surface p-4">
            <div className="text-xs font-medium text-foreground-subtle mb-1">Resolved Title</div>
            <p className="text-sm font-semibold text-foreground">{result.title}</p>
          </div>

          <div className="control-surface p-4">
            <div className="text-xs font-medium text-foreground-subtle mb-1">Resolved Description</div>
            <p className="text-sm text-foreground leading-relaxed">{result.description}</p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-medium text-foreground-subtle">Resolved Options</div>
            {result.options.map((opt, i) => (
              <div key={opt.id ?? i} className="control-surface p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--accent-muted)] text-[9px] font-mono font-bold text-[var(--accent-primary)]">
                    {OPTION_LABELS[i]}
                  </span>
                  {opt.label && (
                    <span className="text-xs font-medium text-foreground-subtle">{opt.label}</span>
                  )}
                </div>
                <p className="text-sm text-foreground leading-relaxed">{opt.text}</p>
                {opt.outcomeHeadline && (
                  <div className="mt-2 pt-2 border-t border-[var(--border)]">
                    <div className="text-xs font-medium text-foreground-subtle mb-0.5">Outcome</div>
                    <p className="text-xs font-semibold text-foreground">{opt.outcomeHeadline}</p>
                    {opt.outcomeSummary && <p className="text-xs text-foreground-muted mt-1">{opt.outcomeSummary}</p>}
                  </div>
                )}
                {opt.advisorFeedback?.map((af, j) => (
                  <div key={j} className="mt-2 pt-2 border-t border-[var(--border)]">
                    <span className="text-xs font-medium text-foreground-subtle">
                      {af.roleId.replace(/_/g, ' ')} · {af.stance}
                    </span>
                    <p className="text-xs text-foreground-muted mt-0.5">{af.feedback}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {failedChecks.length > 0 && (
            <div className="control-surface p-4">
              <div className="text-xs font-medium text-[var(--error)] mb-2">Failing Checks</div>
              <div className="space-y-1">
                {failedChecks.map((check) => (
                  <div key={check.kind} className="text-xs text-[var(--foreground-muted)]">
                    <span className="text-[var(--error)] font-mono">FAIL</span> {check.detail}
                  </div>
                ))}
              </div>
            </div>
          )}

          {usages.length > 0 && (
            <div className="control-surface p-4">
              <div className="text-xs font-medium text-foreground-subtle mb-2">Token Resolutions</div>
              <div className="grid gap-2 lg:grid-cols-2">
                {usages.map((usage, i) => (
                  <div key={`${usage.token}-${i}`} className="rounded border border-[var(--border)] px-3 py-2 text-xs">
                    <div className="font-mono text-[var(--foreground-subtle)]">{usage.raw}</div>
                    <div className="text-foreground">{usage.value || '(empty)'}</div>
                    <div className={usage.source === 'context' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>{usage.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
