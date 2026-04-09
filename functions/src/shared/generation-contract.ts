export type ScenarioScopeTier = 'universal' | 'regional' | 'cluster' | 'exclusive';

export type ScenarioSourceKind = 'evergreen' | 'news' | 'neighbor' | 'consequence';

export type ScenarioExclusivityReason =
  | 'constitution'
  | 'historical'
  | 'bilateral_dispute'
  | 'unique_institution'
  | 'unique_military_doctrine';

export type GenerationMode = 'manual' | 'news' | 'blitz' | 'full_send';

export interface GenerationDistributionConfig {
  mode: 'fixed' | 'auto';
  loopLength?: 1 | 2 | 3;
  gameLength?: 'short' | 'medium' | 'long';
}

export interface GenerationModelConfig {
  architectModel?: string;
  drafterModel?: string;
  advisorModel?: string;
  repairModel?: string;
  contentQualityModel?: string;
  narrativeReviewModel?: string;
  embeddingModel?: string;
}

export interface GenerationNewsContextItem {
  title: string;
  link: string;
  snippet?: string;
  source: string;
  pubDate: string;
}

export interface GenerationScopeFields {
  region?: string;
  regions?: string[];
  scopeTier?: ScenarioScopeTier;
  scopeKey?: string;
  clusterId?: string;
  exclusivityReason?: ScenarioExclusivityReason;
  applicable_countries?: string[];
  sourceKind?: ScenarioSourceKind;
}

export interface GenerationScopeInput extends GenerationScopeFields {
  mode?: GenerationMode;
}

export interface NormalizedGenerationScope extends Omit<GenerationScopeFields, 'regions' | 'scopeTier' | 'scopeKey' | 'sourceKind'> {
  scopeTier: ScenarioScopeTier;
  scopeKey: string;
  sourceKind: ScenarioSourceKind;
  regions: string[];
}

export interface GenerationScopeNormalizationResult {
  ok: boolean;
  error?: string;
  value?: NormalizedGenerationScope;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function normalizeRegionId(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = slugify(value);
  return normalized || undefined;
}

export function normalizeRegionIds(values?: string[]): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map(normalizeRegionId).filter((value): value is string => Boolean(value)))];
}

export function normalizeCountryIds(values?: string[]): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

export function inferDefaultSourceKind(mode?: GenerationMode): ScenarioSourceKind {
  return mode === 'news' ? 'news' : 'evergreen';
}

export function inferScopeKey(
  scopeTier: ScenarioScopeTier,
  options: { region?: string; regions?: string[]; clusterId?: string; applicableCountries?: string[] }
): string | undefined {
  const primaryRegion = normalizeRegionId(options.region) ?? options.regions?.[0];

  switch (scopeTier) {
    case 'regional':
      return primaryRegion ? `region:${primaryRegion}` : undefined;
    case 'cluster':
      return options.clusterId?.trim() ? `cluster:${options.clusterId.trim()}` : undefined;
    case 'exclusive':
      return options.applicableCountries?.length === 1 ? `country:${options.applicableCountries[0]}` : undefined;
    default:
      return 'universal';
  }
}

export function normalizeGenerationScope(input: GenerationScopeInput): GenerationScopeNormalizationResult {
  const scopeTier = input.scopeTier ?? 'universal';
  const regions = normalizeRegionIds(input.regions?.length ? input.regions : input.region ? [input.region] : []);
  const applicableCountries = normalizeCountryIds(input.applicable_countries);
  const clusterId = input.clusterId ? slugify(input.clusterId) : undefined;
  const explicitScopeKey = input.scopeKey?.trim() || undefined;
  const VALID_SOURCE_KINDS: ScenarioSourceKind[] = ['evergreen', 'news', 'neighbor', 'consequence'];
  const rawSourceKind = input.sourceKind ?? inferDefaultSourceKind(input.mode);
  const sourceKind: ScenarioSourceKind = VALID_SOURCE_KINDS.includes(rawSourceKind) ? rawSourceKind : inferDefaultSourceKind(input.mode);

  if (scopeTier === 'regional' && regions.length === 0) {
    return { ok: false, error: 'Regional jobs require region or regions.' };
  }

  if (scopeTier === 'cluster' && !clusterId) {
    return { ok: false, error: 'Cluster jobs require clusterId.' };
  }

  if (scopeTier === 'exclusive') {
    if (!input.exclusivityReason) {
      return { ok: false, error: 'Exclusive jobs require exclusivityReason.' };
    }
    if (applicableCountries.length === 0) {
      return { ok: false, error: 'Exclusive jobs require applicable_countries.' };
    }
  }

  const scopeKey = explicitScopeKey ?? inferScopeKey(scopeTier, {
    region: input.region,
    regions,
    clusterId,
    applicableCountries,
  });

  if (!scopeKey) {
    return { ok: false, error: `Missing scopeKey for scope tier ${scopeTier}.` };
  }

  return {
    ok: true,
    value: {
      scopeTier,
      scopeKey,
      ...(clusterId ? { clusterId } : {}),
      ...(input.exclusivityReason ? { exclusivityReason: input.exclusivityReason } : {}),
      ...(applicableCountries.length > 0 ? { applicable_countries: applicableCountries } : {}),
      sourceKind,
      regions,
    },
  };
}
