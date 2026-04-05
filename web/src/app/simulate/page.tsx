'use client';

import { useCallback, useEffect, useState } from 'react';
import CommandPanel from '@/components/CommandPanel';
import BundleBadge from '@/components/BundleBadge';
import DataStat from '@/components/DataStat';
import MetricEffect from '@/components/MetricEffect';
import OperationsNav from '@/components/OperationsNav';
import ScreenHeader from '@/components/ScreenHeader';
import { METRIC_DISPLAY, STANCE_CLASSES } from '@/lib/constants';
import { formatEffectCount, hasEffects, hasMeaningfulOutcome, summarizeAdvisorStances } from '@/lib/simulate';
import type {
  CountrySummary,
  LegislatureRequirement,
  ScenarioMetadata,
  SimulationFilteredScenario,
  SimulationResult,
  SimulationScenario,
  SimulationTokenUsage,
  SimulationValidationCheck,
} from '@/lib/types';

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

const INVERSE_METRICS = new Set(['metric_inflation', 'metric_crime', 'metric_corruption', 'metric_bureaucracy', 'metric_unrest', 'metric_foreign_influence', 'metric_economic_bubble']);

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const GEO_RELATIONSHIP_KEYS = [
  'adversary', 'ally', 'trade_partner', 'border_rival', 'regional_rival', 'neutral', 'neighbor',
] as const;

function uniqueTokenUsages(usages: SimulationTokenUsage[]): SimulationTokenUsage[] {
  const seen = new Set<string>();
  return usages.filter((usage) => {
    const key = `${usage.token}:${usage.value}:${usage.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ValidationRow({ check }: { check: SimulationValidationCheck }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={check.passed ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
        {check.passed ? 'PASS' : 'FAIL'}
      </span>
      <span className="text-[var(--foreground-muted)]">{check.detail}</span>
    </div>
  );
}

function hasEligibilityContent(
  metadata?: ScenarioMetadata,
  legislature_requirement?: LegislatureRequirement,
): boolean {
  if (!metadata) return !!legislature_requirement;
  const hasRequires = metadata.requires != null && Object.values(metadata.requires).some((v) => v != null);
  const hasCountries = Array.isArray(metadata.applicable_countries)
    ? metadata.applicable_countries.length > 0
    : !!metadata.applicable_countries;
  return !!(
    metadata.tags?.length ||
    metadata.scopeTier ||
    metadata.sourceKind ||
    metadata.requiredGeopoliticalTags?.length ||
    metadata.excludedGeopoliticalTags?.length ||
    metadata.requiredGovernmentCategories?.length ||
    metadata.excludedGovernmentCategories?.length ||
    hasRequires ||
    hasCountries ||
    legislature_requirement
  );
}

const REQUIRES_TAG_KEYS = ['coastal', 'landlocked', 'island_nation', 'nuclear_state'] as const;
const REQUIRES_REL_KEYS = ['formal_ally', 'adversary', 'trade_partner', 'land_border_adversary'] as const;

function ScenarioEligibility({
  metadata,
  legislature_requirement,
  passing,
}: {
  metadata?: ScenarioMetadata;
  legislature_requirement?: LegislatureRequirement;
  passing: boolean;
}) {
  if (!hasEligibilityContent(metadata, legislature_requirement)) return null;

  const passChip = 'rounded border border-[var(--success)]/25 bg-[var(--success)]/5 px-1.5 py-0.5 text-[9px] font-mono text-[var(--success)]';
  const neutralChip = 'rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--foreground-subtle)]';
  const chip = passing ? passChip : neutralChip;

  const applicableCountries = metadata?.applicable_countries
    ? (Array.isArray(metadata.applicable_countries) ? metadata.applicable_countries : [metadata.applicable_countries])
    : [];

  const requires = metadata?.requires;
  const requiresEntries: string[] = [];
  if (requires) {
    if (requires.min_power_tier != null) {
      requiresEntries.push(`power ≥ ${requires.min_power_tier.replace(/_/g, ' ')}`);
    }
    for (const key of REQUIRES_TAG_KEYS) {
      if (requires[key] != null) requiresEntries.push(`${key.replace(/_/g, ' ')} ${requires[key] ? '✓' : '✗'}`);
    }
    for (const key of REQUIRES_REL_KEYS) {
      if (requires[key] != null) requiresEntries.push(`${key.replace(/_/g, ' ')} ${requires[key] ? '✓' : '✗'}`);
    }
  }

  return (
    <div className="space-y-2 rounded border border-[var(--border)] bg-[rgba(255,255,255,0.01)] px-3 py-2.5">
      <div className="text-xs font-medium text-[var(--foreground-subtle)]">Eligibility</div>

      {metadata?.tags?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 flex-shrink-0 text-[9px] font-mono text-[var(--foreground-subtle)]">tags</span>
          {metadata.tags.map((tag) => (
            <span key={tag} className={neutralChip}>{tag}</span>
          ))}
        </div>
      ) : null}

      {(metadata?.scopeTier || metadata?.sourceKind) ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 flex-shrink-0 text-[9px] font-mono text-[var(--foreground-subtle)]">scope</span>
          {metadata?.scopeTier ? <span className={chip}>{metadata.scopeTier}</span> : null}
          {metadata?.sourceKind ? <span className={chip}>{metadata.sourceKind}</span> : null}
        </div>
      ) : null}

      {metadata?.requiredGeopoliticalTags?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 flex-shrink-0 text-[9px] font-mono text-[var(--foreground-subtle)]">req geo</span>
          {metadata.requiredGeopoliticalTags.map((tag) => (
            <span key={tag} className={chip}>{tag}</span>
          ))}
        </div>
      ) : null}

      {metadata?.excludedGeopoliticalTags?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 flex-shrink-0 text-[9px] font-mono text-[var(--foreground-subtle)]">excl geo</span>
          {metadata.excludedGeopoliticalTags.map((tag) => (
            <span key={tag} className={chip}>{tag}</span>
          ))}
        </div>
      ) : null}

      {metadata?.requiredGovernmentCategories?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 flex-shrink-0 text-[9px] font-mono text-[var(--foreground-subtle)]">req gov</span>
          {metadata.requiredGovernmentCategories.map((cat) => (
            <span key={cat} className={chip}>{cat}</span>
          ))}
        </div>
      ) : null}

      {metadata?.excludedGovernmentCategories?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 flex-shrink-0 text-[9px] font-mono text-[var(--foreground-subtle)]">excl gov</span>
          {metadata.excludedGovernmentCategories.map((cat) => (
            <span key={cat} className={chip}>{cat}</span>
          ))}
        </div>
      ) : null}

      {requiresEntries.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 flex-shrink-0 text-[9px] font-mono text-[var(--foreground-subtle)]">requires</span>
          {requiresEntries.map((entry) => (
            <span key={entry} className={chip}>{entry}</span>
          ))}
        </div>
      ) : null}

      {applicableCountries.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 flex-shrink-0 text-[9px] font-mono text-[var(--foreground-subtle)]">countries</span>
          {applicableCountries.map((id) => (
            <span key={id} className={chip}>{id}</span>
          ))}
        </div>
      ) : null}

      {legislature_requirement ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 flex-shrink-0 text-[9px] font-mono text-[var(--foreground-subtle)]">legislature</span>
          <span className={chip}>
            approval ≥ {legislature_requirement.min_approval}%
            {legislature_requirement.chamber ? ` (${legislature_requirement.chamber})` : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: SimulationScenario }) {
  const [expanded, setExpanded] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const failedChecks = scenario.diagnostics.validationChecks.filter((c) => !c.passed);
  const fallbackTokens = scenario.diagnostics.fallbackTokens;
  const uniqueUsages = uniqueTokenUsages(scenario.diagnostics.tokenUsages).slice(0, 16);

  const filteredValidationChecks = scenario.diagnostics.validationChecks.filter((check) => {
    if (!check.passed) return true;
    if (check.kind.startsWith('requires.')) return true;
    if (check.kind === 'border-rival-actor-pattern') return true;
    if (check.kind === 'token-graph') return !check.detail.includes('does not require');
    const meta = scenario.metadata;
    if (check.kind === 'required-tags') return !!(meta?.requiredGeopoliticalTags?.length);
    if (check.kind === 'excluded-tags') return !!(meta?.excludedGeopoliticalTags?.length);
    if (check.kind === 'required-government-category') return !!(meta?.requiredGovernmentCategories?.length);
    if (check.kind === 'excluded-government-category') return !!(meta?.excludedGovernmentCategories?.length);
    if (check.kind === 'applicable-countries') {
      const list = meta?.applicable_countries;
      return !!(Array.isArray(list) ? list.length > 0 : list);
    }
    return true;
  });
  const hiddenCheckCount = scenario.diagnostics.validationChecks.length - filteredValidationChecks.length;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      {/* Collapsed row */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-[rgba(255,255,255,0.025)] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {scenario.metadata?.bundle ? <BundleBadge bundle={scenario.metadata.bundle} /> : null}
        <span className="flex-1 text-[13px] text-foreground truncate">{scenario.title}</span>
        {scenario.metadata?.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="flex-shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--foreground-subtle)]">
            {tag}
          </span>
        ))}
        {(scenario.metadata?.tags?.length ?? 0) > 3 ? (
          <span className="flex-shrink-0 text-[9px] font-mono text-[var(--foreground-muted)]">
            +{scenario.metadata!.tags!.length - 3}
          </span>
        ) : null}
        {scenario.conditions?.length ? (
          <span className="flex-shrink-0 text-[10px] font-mono text-[var(--accent-secondary)]">
            {scenario.conditions.length}c
          </span>
        ) : null}
        {scenario.relationship_conditions?.length ? (
          <span className="flex-shrink-0 text-[10px] font-mono text-[var(--accent-secondary)]">
            {scenario.relationship_conditions.length}rc
          </span>
        ) : null}
        <span className={`flex-shrink-0 text-[10px] font-mono ${failedChecks.length === 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
          {failedChecks.length === 0 ? 'PASS' : `${failedChecks.length} FAIL`}
        </span>
        {fallbackTokens.length > 0 ? (
          <span className="flex-shrink-0 text-[10px] font-mono text-[var(--warning)]">{fallbackTokens.length} token fallback</span>
        ) : null}
        <svg
          className={`flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <polyline points="2,4 6,8 10,4" />
        </svg>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[rgba(255,255,255,0.01)] px-4 py-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {scenario.metadata?.difficulty != null ? (
              <span className="text-xs font-medium text-[var(--foreground-subtle)]">Diff {scenario.metadata.difficulty}</span>
            ) : null}
            {scenario.metadata?.severity ? (
              <span className="text-xs font-medium text-[var(--foreground-subtle)]">{scenario.metadata.severity}</span>
            ) : null}
            <span className={`rounded border px-2 py-0.5 text-[10px] font-mono ${failedChecks.length === 0 ? 'border-[var(--success)]/30 text-[var(--success)]' : 'border-[var(--error)]/30 text-[var(--error)]'}`}>
              {failedChecks.length === 0 ? 'Country checks pass' : `${failedChecks.length} failing`}
            </span>
            {fallbackTokens.length > 0 && (
              <span className="rounded border border-[var(--warning)]/30 px-2 py-0.5 text-[10px] font-mono text-[var(--warning)]">
                {fallbackTokens.length} fallback token{fallbackTokens.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">{scenario.description}</p>

          <ScenarioEligibility
            metadata={scenario.metadata}
            legislature_requirement={scenario.legislature_requirement}
            passing={failedChecks.length === 0}
          />

          {scenario.conditions?.length ? (
            <div className="flex flex-wrap gap-2">
              {scenario.diagnostics.conditionChecks.map((c, i) => (
                <span key={i} className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-[var(--foreground-subtle)]">
                  <span className={c.passed ? 'text-[var(--success)]' : 'text-[var(--error)]'}>{c.passed ? 'PASS' : 'FAIL'}</span>
                  {' · '}{METRIC_DISPLAY[c.metricId] ?? c.metricId}{' = '}{Math.round(c.actual)}
                  {c.min != null ? ` ≥ ${c.min}` : ''}{c.max != null ? ` ≤ ${c.max}` : ''}
                </span>
              ))}
            </div>
          ) : null}
          {scenario.relationship_conditions?.length ? (
            <div className="flex flex-wrap gap-2">
              {scenario.diagnostics.relationshipConditionChecks.map((c, i) => (
                <span key={i} className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-[var(--foreground-subtle)]">
                  <span className={c.passed ? 'text-[var(--success)]' : 'text-[var(--error)]'}>{c.passed ? 'PASS' : 'FAIL'}</span>
                  {' · '}{c.relationshipId}
                  {c.resolvedCountryId ? ` (${c.resolvedCountryId})` : ' (unresolved)'}
                  {c.actual != null ? ` = ${c.actual}` : ''}
                  {c.min != null ? ` ≥ ${c.min}` : ''}{c.max != null ? ` ≤ ${c.max}` : ''}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowDiagnostics((v) => !v); }}
              className="text-xs font-medium text-[var(--foreground-muted)] hover:text-foreground"
            >
              {showDiagnostics ? 'Hide diagnostics' : 'Show diagnostics'}
            </button>
          </div>

          {/* Options */}
          <div className="space-y-4 border-t border-[var(--border)] pt-3">
            {scenario.options.map((opt, i) => (
              <div key={opt.id ?? i}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--accent-muted)] text-[9px] font-mono font-bold text-[var(--accent-primary)]">
                    {OPTION_LABELS[i]}
                  </span>
                  {opt.label ? <span className="text-xs font-medium text-[var(--foreground-subtle)]">{opt.label}</span> : null}
                </div>
                <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">{opt.text}</p>

                {opt.advisorFeedback?.length ? (
                  <div className="mt-3 rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="mb-2 flex flex-wrap gap-2 text-xs font-medium text-[var(--foreground-subtle)]">
                      {Object.entries(summarizeAdvisorStances(opt.advisorFeedback)).map(([stance, count]) => (
                        <span key={stance} className={STANCE_CLASSES[stance] ?? 'text-[var(--foreground-muted)]'}>
                          {count} {stance}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {opt.advisorFeedback.map((feedback) => (
                        <div key={`${opt.id}-${feedback.roleId}-${feedback.stance}`} className="text-xs text-[var(--foreground-muted)]">
                          <span className={`${STANCE_CLASSES[feedback.stance] ?? 'text-[var(--foreground-muted)]'} font-medium`}>
                            {feedback.stance}
                          </span>
                          {' · '}{feedback.roleId}{' · '}{feedback.feedback}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasEffects(opt) ? (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium text-[var(--foreground-subtle)]">{formatEffectCount(opt.effects)}</div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {opt.effects.map((effect, effectIndex) => (
                        <MetricEffect key={`${opt.id}-${effect.targetMetricId}-${effectIndex}`} effect={effect} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasMeaningfulOutcome(opt) ? (
                  <div className="mt-3 space-y-2 rounded-[var(--radius-tight)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="text-xs font-medium text-[var(--foreground-subtle)]">Resolved outcome</div>
                    {opt.outcomeHeadline ? <p className="text-xs font-semibold text-foreground">{opt.outcomeHeadline}</p> : null}
                    {opt.outcomeSummary ? <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">{opt.outcomeSummary}</p> : null}
                    {opt.outcomeContext ? <p className="text-xs leading-relaxed text-[var(--foreground-subtle)]">{opt.outcomeContext}</p> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {showDiagnostics && (
            <div className="space-y-4 border-t border-[var(--border)] pt-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--foreground-subtle)]">
                  Country validation
                  {hiddenCheckCount > 0 ? (
                    <span className="opacity-50">({hiddenCheckCount} trivial hidden)</span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {filteredValidationChecks.length === 0 ? (
                    <div className="text-xs text-[var(--foreground-muted)]">No significant validation checks for this scenario.</div>
                  ) : (
                    filteredValidationChecks.map((check) => (
                      <ValidationRow key={`${scenario.id}-${check.kind}`} check={check} />
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-[var(--foreground-subtle)]">Institutional tokens</div>
                {uniqueUsages.length === 0 ? (
                  <div className="text-xs text-[var(--foreground-muted)]">No institutional tokens in this scenario.</div>
                ) : (
                  <div className="grid gap-2 lg:grid-cols-2">
                    {uniqueUsages.map((usage) => (
                      <div key={`${scenario.id}-${usage.token}-${usage.value}-${usage.source}`} className="rounded border border-[var(--border)] px-3 py-2 text-xs text-[var(--foreground-muted)]">
                        <div className="font-mono text-[var(--foreground-subtle)]">{usage.raw}</div>
                        <div>{usage.value || '(empty)'}</div>
                        <div className={usage.source === 'context' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>{usage.source}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilteredScenarioCard({ item }: { item: SimulationFilteredScenario }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-[rgba(255,255,255,0.025)] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {item.scenario.metadata?.bundle ? <BundleBadge bundle={item.scenario.metadata.bundle} /> : null}
        <span className="flex-1 text-[13px] text-[var(--foreground-muted)] truncate">{item.scenario.title}</span>
        {item.scenario.metadata?.tags?.slice(0, 2).map((tag) => (
          <span key={tag} className="flex-shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--foreground-subtle)]">
            {tag}
          </span>
        ))}
        <span className="flex-shrink-0 rounded border border-[var(--error)]/30 px-2 py-0.5 text-[10px] font-mono text-[var(--error)]">
          {item.reason}
        </span>
        <svg
          className={`flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <polyline points="2,4 6,8 10,4" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[rgba(255,255,255,0.01)] px-4 py-3 space-y-3">
          <ScenarioEligibility
            metadata={item.scenario.metadata}
            legislature_requirement={item.scenario.legislature_requirement}
            passing={false}
          />
          <div className="space-y-2">
            {item.diagnostics.validationChecks.map((check) => (
              <ValidationRow key={`${item.scenario.id}-${check.kind}`} check={check} />
            ))}
          </div>
          {item.diagnostics.conditionChecks.length ? (
            <div className="flex flex-wrap gap-2">
              {item.diagnostics.conditionChecks.map((check, i) => (
                <span key={i} className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-[var(--foreground-subtle)]">
                  <span className={check.passed ? 'text-[var(--success)]' : 'text-[var(--error)]'}>{check.passed ? 'PASS' : 'FAIL'}</span>
                  {' · '}{check.detail}
                </span>
              ))}
            </div>
          ) : null}
          {item.diagnostics.relationshipConditionChecks.length ? (
            <div className="flex flex-wrap gap-2">
              {item.diagnostics.relationshipConditionChecks.map((c, i) => (
                <span key={i} className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-mono text-[var(--foreground-subtle)]">
                  <span className={c.passed ? 'text-[var(--success)]' : 'text-[var(--error)]'}>{c.passed ? 'PASS' : 'FAIL'}</span>
                  {' · '}{c.relationshipId}
                  {c.resolvedCountryId ? ` (${c.resolvedCountryId})` : ' (unresolved)'}
                  {c.actual != null ? ` = ${c.actual}` : ''}
                  {c.min != null ? ` ≥ ${c.min}` : ''}{c.max != null ? ` ≤ ${c.max}` : ''}
                </span>
              ))}
            </div>
          ) : null}
          {item.diagnostics.fallbackTokens.length ? (
            <div className="text-xs text-[var(--warning)]">Fallback tokens: {item.diagnostics.fallbackTokens.join(', ')}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function SimulatePage() {
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [metricOverrides, setMetricOverrides] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'eligible' | 'filtered'>('eligible');

  useEffect(() => {
    fetch('/api/countries')
      .then((r) => r.json())
      .then((data: { countries: CountrySummary[] }) => setCountries(data.countries ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setMetricOverrides({});
    setResult(null);
  }, [selectedCountry]);

  const run = useCallback(() => {
    if (!selectedCountry) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ countryId: selectedCountry, showFiltered: 'true' });
    for (const [k, v] of Object.entries(metricOverrides)) params.set(k, String(v));
    fetch(`/api/simulate?${params}`)
      .then((r) => r.json())
      .then((data: SimulationResult & { error?: string }) => {
        if (data.error) { setError(data.error); return; }
        setResult(data);
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
        subtitle="Select a country and tune its state metrics to see which scenarios surface."
        eyebrow="Simulate"
        nav={<OperationsNav />}
      />

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Left: Controls */}
        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <CommandPanel className="p-4">
            <div className="section-kicker mb-2">Target</div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="input-shell"
            >
              <option value="">Select a country…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.region}</option>
              ))}
            </select>
          </CommandPanel>

          {result ? (
            <CommandPanel className="p-4">
              <div className="section-kicker mb-1.5">Profile</div>
              <div className="text-sm font-medium text-foreground">{result.country.name}</div>
              <div className="text-[11px] text-[var(--foreground-subtle)]">{result.country.region} · {result.country.governmentCategory ?? '—'}</div>
              {result.country.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.country.tags.map((tag) => (
                    <span key={tag} className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--foreground-subtle)]">{tag}</span>
                  ))}
                </div>
              ) : null}
              {(() => {
                const pairs = GEO_RELATIONSHIP_KEYS
                  .map((k) => ({ k, v: result.context?.[k] ?? '' }))
                  .filter((p) => !!p.v.trim());
                if (!pairs.length) return null;
                return (
                  <div className="mt-3">
                    <div className="section-kicker mb-1.5">Relationships</div>
                    <div className="space-y-1">
                      {pairs.map(({ k, v }) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="w-20 flex-shrink-0 text-[11px] font-medium text-[var(--foreground-subtle)]">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-foreground">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CommandPanel>
          ) : null}

          <CommandPanel className="p-4">
            <div className="section-kicker mb-3">State Tuning</div>
            <div className="space-y-3">
              {SIM_METRICS.map((key) => {
                const val = metricOverrides[key] ?? result?.metrics[key] ?? 50;
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[11px] text-[var(--foreground-muted)]">{METRIC_DISPLAY[key] ?? key}</label>
                      <span className={`text-[11px] font-mono ${metricColor(key, val)}`}>{Math.round(val)}</span>
                    </div>
                    <input
                      type="range"
                      min={0} max={100} step={1}
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
              className="btn btn-command mt-4 w-full disabled:opacity-50"
            >
              {loading ? 'Simulating…' : 'Run Simulation'}
            </button>
          </CommandPanel>
        </div>

        {/* Right: Results */}
        <div className="min-w-0 space-y-4">
          {error ? (
            <CommandPanel tone="danger" className="p-4 text-sm text-[var(--error)]">{error}</CommandPanel>
          ) : null}

          {result ? (
            <>
              {/* Compact stat row */}
              <div className="flex items-center gap-3">
                <DataStat size="compact" label="Total" value={result.totalScenarios} />
                <DataStat size="compact" label="Eligible" value={result.eligibleCount} accent="blue" />
                <DataStat size="compact" label="Filtered" value={result.filteredCount} accent={result.filteredCount > 0 ? 'warning' : undefined} />
              </div>

              {/* Tab bar */}
              <div className="flex gap-3 border-b border-[var(--border)] pb-px">
                {(['eligible', 'filtered'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2.5 text-xs font-medium transition-colors ${
                      activeTab === tab
                        ? 'border-b-2 border-[var(--accent-primary)] text-foreground'
                        : 'text-[var(--foreground-muted)] hover:text-foreground'
                    }`}
                  >
                    {tab === 'eligible' ? `Eligible (${result.eligibleCount})` : `Filtered (${result.filteredCount})`}
                  </button>
                ))}
              </div>

              {/* Results list */}
              {activeTab === 'eligible' ? (
                result.eligible.length === 0 ? (
                  <CommandPanel className="p-8 text-center">
                    <div className="text-sm text-[var(--foreground-muted)]">No eligible scenarios for these parameters.</div>
                  </CommandPanel>
                ) : (
                  <div className="command-panel overflow-hidden">
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
                  <div className="command-panel overflow-hidden">
                    {result.filtered.map((item) => (
                      <FilteredScenarioCard key={item.scenario.id} item={item} />
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
