import { ALL_REGIONS } from '@/lib/constants';
import type {
  ArticleClassification,
  GenerationJobRequest,
  NewsArticle,
  ScenarioExclusivityReason,
} from '@/lib/types';
import {
  normalizeCountryIds,
  normalizeGenerationScope,
  normalizeRegionId,
} from '@shared/generation-contract';

interface SharedRequestFields {
  priority: 'low' | 'normal' | 'high';
  description?: string;
  dryRun?: boolean;
  modelConfig?: GenerationJobRequest['modelConfig'];
  executionTarget?: GenerationJobRequest['executionTarget'];
}

interface ManualRequestPlanInput extends SharedRequestFields {
  bundles: string[];
  count: number;
  distributionConfig: NonNullable<GenerationJobRequest['distributionConfig']>;
  targetMode: 'all' | 'regions' | 'country';
  selectedRegions: string[];
  selectedCountry?: string;
  exclusivityReason: ScenarioExclusivityReason;
}

interface NewsRequestPlanInput extends SharedRequestFields {
  count: number;
  distributionConfig: NonNullable<GenerationJobRequest['distributionConfig']>;
  selectedArticleIds: number[];
  articles: NewsArticle[];
  classifications: ArticleClassification[];
  bundleOverrides?: Record<number, string>;
}

function withSharedFields(base: GenerationJobRequest, shared: SharedRequestFields): GenerationJobRequest {
  return {
    ...base,
    ...(shared.description ? { description: shared.description } : {}),
    ...(shared.dryRun ? { dryRun: true } : {}),
    ...(shared.modelConfig ? { modelConfig: shared.modelConfig } : {}),
    ...(shared.executionTarget ? { executionTarget: shared.executionTarget } : {}),
  };
}

function mapRegionId(value?: string): string | undefined {
  if (!value) return undefined;

  const byId = ALL_REGIONS.find((region) => region.id === normalizeRegionId(value));
  if (byId) return byId.id;

  const trimmed = value.trim().toLowerCase();
  const byLabel = ALL_REGIONS.find((region) => region.label.toLowerCase() === trimmed);
  return byLabel?.id;
}

function finalizeRequest(request: GenerationJobRequest, shared: SharedRequestFields): GenerationJobRequest {
  const withShared = withSharedFields(request, shared);
  const normalizedScope = normalizeGenerationScope(withShared);

  if (!normalizedScope.ok || !normalizedScope.value) {
    return withShared;
  }

  const scope = normalizedScope.value;
  return {
    ...withShared,
    ...(scope.regions[0] ? { region: scope.regions[0] } : {}),
    ...(scope.regions.length > 0 ? { regions: scope.regions } : {}),
    scopeTier: scope.scopeTier,
    scopeKey: scope.scopeKey,
    ...(scope.clusterId ? { clusterId: scope.clusterId } : {}),
    ...(scope.exclusivityReason ? { exclusivityReason: scope.exclusivityReason } : {}),
    ...(scope.applicable_countries?.length ? { applicable_countries: scope.applicable_countries } : {}),
    sourceKind: scope.sourceKind,
  };
}

export function buildManualGenerationRequests(input: ManualRequestPlanInput): GenerationJobRequest[] {
  const baseRequest: GenerationJobRequest = {
    bundles: input.bundles,
    count: input.count,
    priority: input.priority,
    distributionConfig: input.distributionConfig,
    mode: 'manual',
  };

  if (input.targetMode === 'all') {
    return [finalizeRequest({
      ...baseRequest,
      scopeTier: 'universal',
      scopeKey: 'universal',
      sourceKind: 'evergreen',
    }, input)];
  }

  if (input.targetMode === 'regions') {
    return input.selectedRegions
      .map((region) => mapRegionId(region))
      .filter((regionId): regionId is string => Boolean(regionId))
      .map((regionId) => finalizeRequest({
        ...baseRequest,
        region: regionId,
        regions: [regionId],
        scopeTier: 'regional',
        scopeKey: `region:${regionId}`,
        sourceKind: 'evergreen',
      }, input));
  }

  if (!input.selectedCountry) return [];

  return [finalizeRequest({
    ...baseRequest,
    scopeTier: 'exclusive',
    scopeKey: `country:${input.selectedCountry}`,
    exclusivityReason: input.exclusivityReason,
    applicable_countries: [input.selectedCountry],
    sourceKind: 'evergreen',
  }, input)];
}

export function buildNewsGenerationRequests(input: NewsRequestPlanInput): GenerationJobRequest[] {
  const selectedArticleIds = new Set(input.selectedArticleIds);
  const groups = new Map<string, GenerationJobRequest>();

  for (const classification of input.classifications) {
    if (!selectedArticleIds.has(classification.articleIndex)) continue;

    const bundle = input.bundleOverrides?.[classification.articleIndex] ?? classification.bundle;
    if (!bundle) continue;

    const article = input.articles[classification.articleIndex];
    if (!article) continue;

    let key = `${bundle}|global|universal`;
    let request: GenerationJobRequest = {
      bundles: [bundle],
      count: input.count,
      priority: input.priority,
      distributionConfig: input.distributionConfig,
      mode: 'news',
      newsContext: [],
      scopeTier: 'universal',
      scopeKey: 'universal',
      sourceKind: 'news',
    };

    if (classification.scope === 'regional') {
      const regionId = mapRegionId(classification.region);
      if (!regionId) continue;
      key = `${bundle}|regional|${regionId}`;
      request = {
        ...request,
        region: regionId,
        regions: [regionId],
        scopeTier: 'regional',
        scopeKey: `region:${regionId}`,
      };
    } else if (classification.scope === 'country') {
      const applicableCountries = normalizeCountryIds(classification.applicable_countries);
      if (applicableCountries.length === 0) continue;
      key = `${bundle}|country|${applicableCountries.join(',')}`;
      request = {
        ...request,
        applicable_countries: applicableCountries,
      };
    }

    const existing = groups.get(key);
    if (existing) {
      existing.newsContext = [...(existing.newsContext ?? []), article];
      continue;
    }

    groups.set(key, finalizeRequest({
      ...request,
      newsContext: [article],
    }, input));
  }

  return [...groups.values()];
}

export function countExpectedScenarios(requests: GenerationJobRequest[]): number {
  return requests.reduce((total, request) => total + (request.bundles.length * request.count), 0);
}