import type { ScenarioCondition, ScenarioDetail, ScenarioRequirements, ScenarioSummary } from '@/lib/types';

type RawScenarioDoc = Record<string, any>;

function coerceTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') return (value as { toDate: () => Date }).toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') return value;
  return undefined;
}

function normalizeCondition(condition: any): ScenarioCondition | null {
  if (!condition || typeof condition.metricId !== 'string') return null;
  const metricId = condition.metricId.trim();
  if (!metricId) return null;
  const min = typeof condition.min === 'number' ? condition.min : undefined;
  const max = typeof condition.max === 'number' ? condition.max : undefined;
  if (min === undefined && max === undefined) return null;
  return { metricId, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
}

function normalizeMetricGates(conditions: unknown): ScenarioCondition[] {
  if (!Array.isArray(conditions)) return [];
  return conditions
    .map((condition) => normalizeCondition(condition))
    .filter((condition): condition is ScenarioCondition => condition !== null);
}

export function getScenarioConditions(data: RawScenarioDoc): ScenarioCondition[] {
  return normalizeMetricGates(data.applicability?.metricGates);
}

export function getScenarioRequires(data: RawScenarioDoc): ScenarioRequirements | undefined {
  if (data.applicability?.requires && typeof data.applicability.requires === 'object') return data.applicability.requires;
  return undefined;
}

export function getApplicableCountries(data: RawScenarioDoc): string[] | string | undefined {
  if (Array.isArray(data.applicability?.applicableCountryIds)) return data.applicability.applicableCountryIds;
  return undefined;
}

export function formatConditionSummary(conditions: ScenarioCondition[]): string | null {
  if (conditions.length === 0) return null;
  return conditions
    .slice(0, 2)
    .map((condition) => {
      const parts: string[] = [];
      if (condition.min !== undefined) parts.push(`>= ${condition.min}`);
      if (condition.max !== undefined) parts.push(`<= ${condition.max}`);
      return `${condition.metricId.replace(/^metric_/, '')} ${parts.join(' ')}`.trim();
    })
    .join(' · ');
}

export function toScenarioSummary(id: string, data: RawScenarioDoc): ScenarioSummary {
  const auditScore = data.metadata?.auditMetadata?.score ?? null;
  const createdAt = coerceTimestamp(data.created_at);
  const updatedAt = coerceTimestamp(data.updated_at) ?? null;
  const tags: string[] = data.metadata?.tags ?? [];
  const applicableCountries = getApplicableCountries(data);
  const region = Array.isArray(applicableCountries)
    ? null
    : typeof applicableCountries === 'string'
    ? applicableCountries
    : null;
  const countryCount = Array.isArray(applicableCountries) ? applicableCountries.length : applicableCountries ? 1 : null;
  const conditions = getScenarioConditions(data);
  const relationshipConditions = Array.isArray(data.relationship_conditions) ? data.relationship_conditions : [];

  return {
    id,
    title: data.title ?? '',
    bundle: data.metadata?.bundle ?? null,
    severity: data.metadata?.severity ?? null,
    isActive: data.is_active ?? false,
    createdAt,
    updatedAt,
    auditScore: typeof auditScore === 'number' ? auditScore : null,
    region,
    tags,
    difficulty: data.metadata?.difficulty ?? null,
    source: data.metadata?.source ?? null,
    sourceKind: data.metadata?.sourceKind ?? null,
    scopeTier: data.metadata?.scopeTier ?? null,
    scopeKey: data.metadata?.scopeKey ?? null,
    countryCount,
    conditionCount: conditions.length,
    relationshipConditionCount: relationshipConditions.length,
    conditionSummary: formatConditionSummary(conditions),
    tagCount: tags.length,
    tagResolutionStatus: data.metadata?.tagResolution?.status ?? null,
    gaiaReviewedAt: coerceTimestamp(data.gaiaReviewedAt) ?? null,
    gaiaRunId: data.gaiaRunId ?? null,
  };
}

export function toScenarioDetail(id: string, data: RawScenarioDoc): ScenarioDetail {
  const conditions = getScenarioConditions(data);
  const metadataRequires = getScenarioRequires(data);
  const applicableCountries = getApplicableCountries(data);

  return {
    id,
    title: data.title ?? '',
    description: data.description ?? '',
    is_active: data.is_active ?? false,
    createdAt: coerceTimestamp(data.created_at),
    updatedAt: coerceTimestamp(data.updated_at),
    phase: data.phase,
    actIndex: data.actIndex,
    options: (data.options ?? []).map((opt: RawScenarioDoc) => ({
      id: opt.id ?? '',
      text: opt.text ?? '',
      label: opt.label,
      effects: opt.effects ?? [],
      relationshipEffects: opt.relationshipEffects,
      advisorFeedback: opt.advisorFeedback ?? [],
      outcomeHeadline: opt.outcomeHeadline,
      outcomeSummary: opt.outcomeSummary,
      outcomeContext: opt.outcomeContext,
    })),
    metadata: data.metadata
      ? {
          ...data.metadata,
          ...(metadataRequires ? { requires: metadataRequires } : {}),
          ...(applicableCountries !== undefined ? { applicable_countries: applicableCountries } : {}),
          auditMetadata: data.metadata.auditMetadata
            ? {
                ...data.metadata.auditMetadata,
                lastAudited: coerceTimestamp(data.metadata.auditMetadata.lastAudited) ?? data.metadata.auditMetadata.lastAudited,
              }
            : undefined,
        }
      : undefined,
    conditions,
    relationship_conditions: Array.isArray(data.relationship_conditions) ? data.relationship_conditions : [],
    chain_id: data.chain_id,
    token_map: data.token_map,
    legislature_requirement: data.legislature_requirement,
    generationProvenance: data.metadata?.generationProvenance,
    gaiaReviewedAt: coerceTimestamp(data.gaiaReviewedAt) ?? null,
    gaiaRunId: data.gaiaRunId ?? null,
  };
}
