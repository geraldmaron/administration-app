import type { ScenarioCondition } from '../types';

export interface ScenarioConditionInferenceInput {
  title?: string;
  description?: string;
  tags?: string[];
}

interface ConditionRule {
  metricId: string;
  min?: number;
  max?: number;
  patterns: RegExp[];
}

// Thresholds are calibrated to game-start baselines:
//   core metrics ~50–55, inverse metrics ~25–30, approval ~50, unrest ~12–18.
// Crisis-level thresholds (e.g. approval ≤ 25) should only gate scenarios whose
// narrative REQUIRES that level of state failure. Most scenarios should use
// loose conditions or none at all.
const TAG_CONDITION_RULES: Readonly<Record<string, Omit<ConditionRule, 'patterns'>>> = {
  political_instability: { metricId: 'metric_public_order', max: 45 },
  instability: { metricId: 'metric_public_order', max: 50 },
  unrest: { metricId: 'metric_public_order', max: 45 },
  economic_crisis: { metricId: 'metric_economy', max: 42 },
  economic_recovery: { metricId: 'metric_economy', max: 55 },
  recession: { metricId: 'metric_economy', max: 42 },
  crime_wave: { metricId: 'metric_crime', min: 55 },
  lawlessness: { metricId: 'metric_crime', min: 60 },
  corruption_scandal: { metricId: 'metric_corruption', min: 45 },
  corruption_crisis: { metricId: 'metric_corruption', min: 55 },
  military_crisis: { metricId: 'metric_military', max: 35 },
  military_underfunded: { metricId: 'metric_military', max: 48 },
  defense_crisis: { metricId: 'metric_military', max: 40 },
  diplomatic_crisis: { metricId: 'metric_foreign_relations', max: 35 },
  diplomatic_tension: { metricId: 'metric_foreign_relations', max: 48 },
  approval_crisis: { metricId: 'metric_approval', max: 30 },
  low_approval: { metricId: 'metric_approval', max: 45 },
  inflation_crisis: { metricId: 'metric_inflation', min: 58 },
  budget_crisis: { metricId: 'metric_budget', max: 35 },
  health_crisis: { metricId: 'metric_health', max: 42 },
  energy_crisis: { metricId: 'metric_energy', max: 42 },
  environmental_crisis: { metricId: 'metric_environment', max: 40 },
  democracy_crisis: { metricId: 'metric_democracy', max: 40 },
};

const NARRATIVE_CONDITION_RULES: readonly ConditionRule[] = [
  {
    metricId: 'metric_economy',
    max: 42,
    patterns: [
      /\b(economic\s+(crisis|collapse|recession|downturn|meltdown|turmoil|freefall))\b/i,
      /\b(recession|depression|financial\s+(crisis|collapse|meltdown))\b/i,
      /\b(market\s+(crash|collapse|meltdown))\b/i,
    ],
  },
  {
    metricId: 'metric_budget',
    max: 40,
    patterns: [
      /\b(fiscal\s+crisis|budget\s+crisis|debt\s+crisis|sovereign\s+debt)\b/i,
      /\b(austerity|bailout\s+(package|plan|request)|emergency\s+loan|default\s+on\s+debt)\b/i,
      /\b(deficit\s+crisis|debt\s+restructuring)\b/i,
    ],
  },
  {
    metricId: 'metric_employment',
    max: 45,
    patterns: [
      /\b(unemployment\s+(crisis|surge|spike|wave))\b/i,
      /\b(mass\s+(layoffs|job\s+losses))\b/i,
      /\b(widespread\s+unemployment|jobless(ness)?)\b/i,
    ],
  },
  {
    metricId: 'metric_inflation',
    min: 58,
    patterns: [
      /\b(inflation\s+(crisis|surge|spiral|emergency|pressure|pressures))\b/i,
      /\b(hyperinflation|runaway\s+(inflation|prices))\b/i,
      /\b(cost[- ]of[- ]living\s+(crisis|emergency|crunch))\b/i,
      /\b(price\s+(surge|spike|spiral)|soaring\s+(prices|costs|inflation))\b/i,
      /\b(currency\s+devaluation|currency\s+collapse)\b/i,
    ],
  },
  {
    metricId: 'metric_public_order',
    max: 45,
    patterns: [
      /\b(civil\s+unrest|riots?|mass\s+protests?)\b/i,
      /\b(public\s+order\s+(crisis|collapse|breakdown))\b/i,
      /\b(widespread\s+(unrest|rioting|disorder))\b/i,
    ],
  },
  {
    metricId: 'metric_crime',
    min: 55,
    patterns: [
      /\b(crime\s+(wave|surge|crisis|epidemic))\b/i,
      /\b(widespread\s+(lawlessness|crime|violence|looting))\b/i,
      /\b(gang\s+(warfare|violence|crisis))\b/i,
    ],
  },
  {
    metricId: 'metric_corruption',
    min: 45,
    patterns: [
      /\b(corruption\s+(scandal|crisis|probe|investigation))\b/i,
      /\b(systemic\s+(bribery|corruption|graft))\b/i,
      /\b(embezzlement\s+(scandal|scheme|ring))\b/i,
    ],
  },
  {
    metricId: 'metric_military',
    max: 45,
    patterns: [
      /\b(military\s+(budget\s+cuts?|funding\s+shortage|underfunding|readiness\s+(crisis|gap|shortfall|is\s+(declining|degraded|deteriorat\w+))|capacity\s+(gap|crisis|shortfall)))\b/i,
      /\b(reduced\s+military\s+readiness|defense\s+budget\s+(cuts?|shortfall|crisis|emergency))\b/i,
      /\b(military\s+readiness\s+(is\s+)?(declining|degraded|deteriorating|at\s+risk|under\s+strain))\b/i,
      /\b(critical\s+gaps?\s+in\s+(equipment|training|military\s+capability|force\s+readiness))\b/i,
      /\b(armed\s+forces?\s+(underfunded|budget\s+cuts?|funding\s+shortfall|operating\s+at\s+reduced|cannot\s+(maintain|sustain)))\b/i,
      /\b(generals?\s+demand\s+(emergency|additional|more)\s+(funding|budget|resources))\b/i,
      /\b(military\s+cannot\s+(maintain|sustain|afford)|defense\s+infrastructure\s+(vulnerable|crumbling|degraded))\b/i,
      /\b(force\s+(readiness|posture|capability)\s+(declining|degraded|under\s+strain|at\s+risk))\b/i,
      /\b(moderniz\w+\s+(must\s+take\s+priority|over\s+readiness|vs\.?\s+readiness))\b/i,
    ],
  },
  {
    metricId: 'metric_foreign_relations',
    max: 40,
    patterns: [
      /\b(diplomatic\s+(crisis|breakdown|rupture|collapse|incident|standoff))\b/i,
      /\b(severed?\s+(diplomatic\s+ties?|relations)|expel(led)?\s+(ambassador|diplomats?))\b/i,
      /\b(relations?\s+(deteriorat|breakdown|strain|collapse))\b/i,
    ],
  },
  {
    metricId: 'metric_health',
    max: 42,
    patterns: [
      /\b(health\s+(crisis|emergency|system\s+(collapse|failure|overwhelm)))\b/i,
      /\b(hospital\s+(overload|collapse|overcrowding)|healthcare\s+(crisis|collapse|shortage))\b/i,
      /\b(outbreak|epidemic|pandemic)\b/i,
    ],
  },
  {
    metricId: 'metric_energy',
    max: 42,
    patterns: [
      /\b(energy\s+(crisis|shortage|shortfall|collapse|blackout))\b/i,
      /\b(power\s+(outage|shortage|blackout)|electricity\s+(shortage|crisis|rationing))\b/i,
      /\b(fuel\s+(shortage|crisis|rationing))\b/i,
    ],
  },
  {
    metricId: 'metric_environment',
    max: 40,
    patterns: [
      /\b(environmental\s+(crisis|disaster|collapse|emergency))\b/i,
      /\b(ecological\s+(disaster|collapse|crisis))\b/i,
      /\b(climate\s+(crisis|emergency|disaster))\b/i,
    ],
  },
];

function normalizeCondition(condition: ScenarioCondition): ScenarioCondition | null {
  if (!condition?.metricId || typeof condition.metricId !== 'string') return null;
  const metricId = condition.metricId.trim();
  if (!metricId) return null;
  const min = typeof condition.min === 'number' ? condition.min : undefined;
  const max = typeof condition.max === 'number' ? condition.max : undefined;
  if (min === undefined && max === undefined) return null;
  return { metricId, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
}

export function mergeScenarioConditions(...groups: Array<ScenarioCondition[] | undefined>): ScenarioCondition[] {
  const merged = new Map<string, ScenarioCondition>();

  for (const group of groups) {
    for (const rawCondition of group ?? []) {
      const condition = normalizeCondition(rawCondition);
      if (!condition) continue;

      const existing = merged.get(condition.metricId);
      if (!existing) {
        merged.set(condition.metricId, condition);
        continue;
      }

      merged.set(condition.metricId, {
        metricId: condition.metricId,
        ...(existing.min !== undefined || condition.min !== undefined
          ? { min: Math.max(existing.min ?? Number.NEGATIVE_INFINITY, condition.min ?? Number.NEGATIVE_INFINITY) }
          : {}),
        ...(existing.max !== undefined || condition.max !== undefined
          ? { max: Math.min(existing.max ?? Number.POSITIVE_INFINITY, condition.max ?? Number.POSITIVE_INFINITY) }
          : {}),
      });
    }
  }

  return [...merged.values()].filter((condition) => {
    if (condition.min !== undefined && condition.max !== undefined && condition.min >= condition.max) {
      return false;
    }
    return true;
  });
}

export function inferScenarioConditions(input: ScenarioConditionInferenceInput): ScenarioCondition[] {
  const combined = `${input.title ?? ''} ${input.description ?? ''}`;
  const inferred: ScenarioCondition[] = [];

  for (const tag of input.tags ?? []) {
    const rule = TAG_CONDITION_RULES[String(tag).trim().toLowerCase()];
    if (!rule) continue;
    inferred.push({ metricId: rule.metricId, ...(rule.min !== undefined ? { min: rule.min } : {}), ...(rule.max !== undefined ? { max: rule.max } : {}) });
  }

  for (const rule of NARRATIVE_CONDITION_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(combined))) {
      inferred.push({ metricId: rule.metricId, ...(rule.min !== undefined ? { min: rule.min } : {}), ...(rule.max !== undefined ? { max: rule.max } : {}) });
    }
  }

  return mergeScenarioConditions(inferred);
}

export function buildBestEffortScenarioConditions(options: {
  existingConditions?: ScenarioCondition[];
  architectConditions?: ScenarioCondition[];
  title?: string;
  description?: string;
  tags?: string[];
}): ScenarioCondition[] {
  const inferred = inferScenarioConditions({
    title: options.title,
    description: options.description,
    tags: options.tags,
  });

  return mergeScenarioConditions(options.architectConditions, options.existingConditions, inferred);
}
