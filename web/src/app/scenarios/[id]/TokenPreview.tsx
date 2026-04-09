'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  CountrySummary,
  Option,
  OptionEffect,
  RelationshipEffect,
  SimulationScenario,
} from '@/lib/types';
import { METRIC_DISPLAY, INVERSE_METRICS } from '@/lib/constants';

interface TokenPreviewProps {
  scenarioId: string;
  options: Option[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const STANCE_CONFIG: Record<string, { bar: string; badge: string }> = {
  support:  { bar: 'border-l-[var(--success)]',   badge: 'text-[var(--success)]' },
  oppose:   { bar: 'border-l-[var(--error)]',     badge: 'text-[var(--error)]' },
  concerned:{ bar: 'border-l-[var(--warning)]',   badge: 'text-[var(--warning)]' },
  neutral:  { bar: 'border-l-[var(--border)]',    badge: 'text-foreground-subtle' },
};

function EffectsBar({ effects, relationshipEffects }: { effects?: OptionEffect[]; relationshipEffects?: RelationshipEffect[] }) {
  const metricEffects = effects?.filter((e) => e.value !== 0) ?? [];
  const relEffects = relationshipEffects ?? [];
  if (metricEffects.length === 0 && relEffects.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {metricEffects.map((effect, i) => {
        const isInverse = INVERSE_METRICS.has(effect.targetMetricId);
        const isGood = effect.value >= 0 ? !isInverse : isInverse;
        const label = METRIC_DISPLAY[effect.targetMetricId] ?? effect.targetMetricId.replace('metric_', '').replace(/_/g, ' ');
        return (
          <span
            key={i}
            title={effect.probability < 1 ? `${Math.round(effect.probability * 100)}% chance${isInverse ? ' · inverse metric' : ''}` : isInverse ? 'inverse metric' : undefined}
            className={`inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-1 text-[10px] font-mono ${
              isGood
                ? 'border-[var(--success)]/30 bg-[var(--success)]/8 text-[var(--success)]'
                : 'border-[var(--error)]/30 bg-[var(--error)]/8 text-[var(--error)]'
            }`}
          >
            {isInverse ? <span className="opacity-35">↕</span> : null}
            <span className="opacity-60">{label}</span>
            <span>{effect.value >= 0 ? '+' : ''}{effect.value.toFixed(1)}</span>
            {effect.probability < 1 ? <span className="opacity-40">{Math.round(effect.probability * 100)}%</span> : null}
          </span>
        );
      })}
      {relEffects.map((rel, i) => {
        const isPos = rel.delta >= 0;
        const prob = rel.probability ?? 1;
        return (
          <span
            key={`rel-${i}`}
            title={prob < 1 ? `${Math.round(prob * 100)}% chance` : undefined}
            className={`inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-1 text-[10px] font-mono ${
              isPos
                ? 'border-[var(--accent-secondary)]/30 bg-[var(--accent-secondary)]/8 text-[var(--accent-secondary)]'
                : 'border-[var(--warning)]/30 bg-[var(--warning)]/8 text-[var(--warning)]'
            }`}
          >
            <span className="opacity-60">{rel.relationshipId.replace(/_/g, ' ')}</span>
            <span>{isPos ? '+' : ''}{rel.delta}</span>
            {prob < 1 ? <span className="opacity-40">{Math.round(prob * 100)}%</span> : null}
          </span>
        );
      })}
    </div>
  );
}

function AdvisorGrid({ feedback }: { feedback: NonNullable<Option['advisorFeedback']> }) {
  return (
    <div className="mt-4 grid gap-px md:grid-cols-2">
      {feedback.map((entry, i) => {
        const cfg = STANCE_CONFIG[entry.stance?.toLowerCase() ?? 'neutral'] ?? STANCE_CONFIG.neutral;
        return (
          <div key={i} className={`border-l-2 pl-3 py-2 ${cfg.bar}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-foreground-subtle">
                {entry.roleId.replace(/_/g, ' ')}
              </span>
              <span className={`text-[9px] font-mono uppercase tracking-wide ${cfg.badge}`}>
                {entry.stance}
              </span>
            </div>
            <p className="text-xs leading-[1.6] text-foreground-muted">{entry.feedback}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function TokenPreview({ scenarioId, options }: TokenPreviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('countryId') ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationScenario | null>(null);
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
      .then((data: { resolved?: SimulationScenario; error?: string }) => {
        if (data.error) { setResult(null); setError(data.error); return; }
        setResult(data.resolved ?? null);
      })
      .catch(() => { setResult(null); setError('Preview request failed.'); })
      .finally(() => setLoading(false));
  }, [scenarioId, selectedCountry]);

  useEffect(() => {
    if (selectedCountry) preview();
  }, [preview, selectedCountry]);

  const selectedCountryData = useMemo(
    () => countries.find((c) => c.id === selectedCountry) ?? null,
    [countries, selectedCountry],
  );

  const resolvedOptions = result?.options ?? null;
  const failedChecks = result?.diagnostics?.validationChecks.filter((c) => !c.passed) ?? [];
  const fallbackTokens = result?.diagnostics?.fallbackTokens ?? [];
  const unresolvedTokens = result?.diagnostics?.unresolvedTokens ?? [];

  return (
    <div className="command-panel overflow-hidden">
      <div className="border-b border-[var(--border)] px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="section-kicker mb-1.5">Decision Paths</div>
            <h2 className="text-base font-semibold text-foreground">Options &amp; Outcomes</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {loading ? (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--warning)]">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--warning)]" />
                Resolving…
              </span>
            ) : result && selectedCountryData ? (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--success)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                {selectedCountryData.name}
              </span>
            ) : null}
            <select
              value={selectedCountry}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCountry(id);
                setResult(null);
                const params = new URLSearchParams(searchParams.toString());
                if (id) { params.set('countryId', id); } else { params.delete('countryId'); }
                router.replace(`?${params.toString()}`, { scroll: false });
              }}
              className="input-shell text-xs"
              aria-label="Resolve tokens for country"
            >
              <option value="">Pick a country to resolve tokens…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.region}</option>
              ))}
            </select>
          </div>
        </div>
        {!selectedCountry ? (
          <p className="mt-2 text-[11px] leading-5 text-foreground-subtle">
            Select a country to resolve token placeholders and validate game-runtime behavior before publishing.
          </p>
        ) : result && !loading ? (
          <div className="mt-3 border-l-2 border-l-[var(--accent-primary)] pl-3">
            <div className="mb-1 text-[10px] font-mono uppercase tracking-wide text-foreground-subtle">Resolved Description</div>
            {result.title ? <p className="text-sm font-semibold leading-6 text-foreground">{result.title}</p> : null}
            {result.description ? <p className="mt-1 text-xs leading-6 text-foreground-muted">{result.description}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="px-5 py-5 md:px-6">
        {error ? (
          <div className="mb-4 rounded-[14px] border border-[var(--error)]/35 bg-[var(--error)]/8 px-4 py-3 text-xs text-[var(--error)]">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {options.map((rawOption, index) => {
            const opt = resolvedOptions?.[index] ?? rawOption;
            const outcomeHeadline = opt.outcomeHeadline ?? rawOption.outcomeHeadline;
            const outcomeSummary = opt.outcomeSummary ?? rawOption.outcomeSummary;
            const outcomeContext = opt.outcomeContext ?? rawOption.outcomeContext;
            const hasOutcomeContent = Boolean(outcomeHeadline || outcomeSummary || outcomeContext);

            const effectCount = (opt.effects ?? rawOption.effects ?? []).filter((e) => e.value !== 0).length;
            const relCount = (opt.relationshipEffects ?? rawOption.relationshipEffects ?? []).length;

            return (
              <div key={rawOption.id ?? index} className={`control-surface overflow-hidden ${loading ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 md:px-5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-[var(--accent-primary)]/25 bg-[var(--accent-muted)] text-[10px] font-mono font-bold text-[var(--accent-primary)]">
                    {OPTION_LABELS[index] ?? index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-foreground truncate">
                    {opt.label || rawOption.label || `Option ${OPTION_LABELS[index] ?? index + 1}`}
                  </span>
                  {effectCount + relCount > 0 ? (
                    <span className="shrink-0 text-[10px] font-mono text-foreground-subtle">
                      {effectCount + relCount} effect{effectCount + relCount !== 1 ? 's' : ''}
                    </span>
                  ) : null}
                </div>
                <div className="px-4 py-4 md:px-5">
                  <p className="text-sm leading-7 text-foreground">{opt.text}</p>
                  {hasOutcomeContent ? (
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      <div className="mb-1.5 text-[10px] font-mono uppercase tracking-wide text-foreground-subtle">Outcome</div>
                      {outcomeHeadline ? <p className="text-xs font-medium leading-6 text-foreground">{outcomeHeadline}</p> : null}
                      {outcomeSummary ? <p className="text-xs leading-6 text-foreground-muted">{outcomeSummary}</p> : null}
                      {outcomeContext ? <p className="text-xs leading-6 text-foreground-subtle">{outcomeContext}</p> : null}
                    </div>
                  ) : null}
                  <EffectsBar
                    effects={opt.effects ?? rawOption.effects}
                    relationshipEffects={opt.relationshipEffects ?? rawOption.relationshipEffects}
                  />
                  {opt.advisorFeedback?.length ? <AdvisorGrid feedback={opt.advisorFeedback} /> : null}
                </div>
              </div>
            );
          })}
        </div>

        {result && !loading && (unresolvedTokens.length > 0 || fallbackTokens.length > 0 || failedChecks.length > 0) ? (
          <div className="mt-4 space-y-2">
            {unresolvedTokens.length > 0 ? (
              <div className="border-l-2 border-l-[var(--error)] pl-3 py-1">
                <div className="mb-1.5 text-[10px] font-mono font-medium text-[var(--error)]">
                  {unresolvedTokens.length} unresolved token{unresolvedTokens.length !== 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {unresolvedTokens.map((t) => (
                    <span key={t} className="text-[9px] font-mono text-[var(--error)]/70">{`{${t}}`}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {fallbackTokens.length > 0 ? (
              <div className="border-l-2 border-l-[var(--warning)] pl-3 py-1">
                <div className="mb-1.5 text-[10px] font-mono font-medium text-[var(--warning)]">
                  {fallbackTokens.length} fallback token{fallbackTokens.length !== 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {fallbackTokens.map((t) => (
                    <span key={t} className="text-[9px] font-mono text-[var(--warning)]/70">{t}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {failedChecks.length > 0 ? (
              <div className="border-l-2 border-l-[var(--error)] pl-3 py-1">
                <div className="mb-1.5 text-[10px] font-mono font-medium text-[var(--error)]">
                  {failedChecks.length} validation check{failedChecks.length !== 1 ? 's' : ''} failing
                </div>
                <div className="space-y-1.5">
                  {failedChecks.map((check) => (
                    <div key={check.kind}>
                      <span className="text-[9px] font-mono uppercase text-[var(--error)]/70">{check.kind}</span>
                      <p className="text-[10px] leading-5 text-foreground-muted">{check.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

      </div>
    </div>
  );
}
