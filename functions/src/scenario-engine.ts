import { NewsItem } from './types';
import { getLogicParametersPrompt } from './lib/logic-parameters';
import { normalizeTokenAliases, CONCEPT_TO_TOKEN_MAP, isValidToken } from './lib/token-registry';
import { getRegionForCountry } from './data/schemas/regions';
import {
  auditScenario,
  deterministicFix,
  heuristicFix,
  scoreScenario,
  BundleScenario,
  getAuditRulesPrompt,
  isValidBundleId,
  initializeAuditConfig,
  normalizeScenarioTextFields,
} from './lib/audit-rules';
import {
  assertRequestedCountryIdsAvailable,
  loadCountryCatalog,
  type CountryCatalogSourceMetadata,
} from './lib/country-catalog';
import { ALL_BUNDLE_IDS, type BundleId } from './data/schemas/bundleIds';
import {
  logGenerationAttempt,
  logFailure,
  categorizeFailure,
  updateDailySummary,
  generateAttemptId
} from './lib/prompt-performance';
import {
  buildDrafterPrompt,
  getBundlePromptOverlay,
  getScopePromptOverlay,
  getCurrentPromptVersions,
  getDrafterPromptBase,
  getReflectionPrompt,
  getArchitectPromptBase,
} from './lib/prompt-templates';
import { Timestamp } from 'firebase-admin/firestore';
import { callModelProvider, type ModelConfig } from './lib/model-providers';
import { evaluateContentQuality } from './lib/content-quality';
import { evaluateNarrativeQuality } from './lib/narrative-review';
import {
  generateEmbedding,
  getEmbeddingText,
  findSimilarByEmbedding,
  isSemanticDedupEnabled
} from './lib/semantic-dedup';
import {
  validateGroundedEffects,
  suggestEffectCorrections
} from './lib/grounded-effects';
import {
  decideScenarioAcceptance,
  SCENARIO_ACCEPTANCE_POLICY_VERSION,
} from './lib/scenario-acceptance';
import type { ScenarioExclusivityReason, ScenarioScopeTier, ScenarioSourceKind } from './types';

// ------------------------------------------------------------------
// Rich Concept Type
// ------------------------------------------------------------------

export type GeneratedConcept = {
  concept: string;
  theme: string;
  severity: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  primaryMetrics?: string[];
  secondaryMetrics?: string[];
  actorPattern?: 'domestic' | 'ally' | 'adversary' | 'border_rival' | 'legislature' | 'cabinet' | 'judiciary' | 'mixed';
  optionShape?: 'redistribute' | 'regulate' | 'escalate' | 'negotiate' | 'invest' | 'cut' | 'reform' | 'delay';
  loopEligible?: boolean;
  // Internal: assigned by buildLoopLengthPlan
  desiredActs?: number;
  // Internal: generation path tag (not persisted)
  _generationPath?: 'standard' | 'premium';
};
// 
// Strategy:
//   - Architect (concepts/blueprints): GPT-4o-mini
//   - Drafter (scenarios): GPT-4o-mini
//   - Deduplication: text-embedding-3-small
// ------------------------------------------------------------------
const ARCHITECT_MODEL = process.env.ARCHITECT_MODEL || 'gpt-4o-mini';
const DRAFTER_MODEL = process.env.DRAFTER_MODEL || 'gpt-4o-mini';

// Model configurations for generation phases
// Token limits increased from 8K to accommodate complex scenarios with detailed outcomes
const ARCHITECT_CONFIG: ModelConfig = { maxTokens: 4096, temperature: 0.6 };
// Drafter uses ~14K input + 3K output tokens; under Tier 1 rate limits concurrent
// calls regularly take 60-120s and can exceed 120s when throttled. 300s keeps the
// call alive while staying well within the Cloud Function's 540s budget.
const DRAFTER_CONFIG: ModelConfig = { maxTokens: 10240, temperature: 0.4, timeoutMs: 300000 };
const REPAIR_MODEL = process.env.REPAIR_MODEL || 'gpt-4o-mini';
const REPAIR_CONFIG: ModelConfig = { maxTokens: 4096, temperature: 0.3 };

interface GenerationModelConfig {
  architectModel?: string;
  drafterModel?: string;
  repairModel?: string;
  contentQualityModel?: string;
  narrativeReviewModel?: string;
  embeddingModel?: string;
}

interface ResolvedGenerationScope {
  scopeTier: ScenarioScopeTier;
  scopeKey: string;
  clusterId?: string;
  exclusivityReason?: ScenarioExclusivityReason;
  sourceKind: ScenarioSourceKind;
  regions: string[];
  applicableCountries?: string[];
}

function buildActorTokenRequirement(actorPattern?: GeneratedConcept['actorPattern']): string {
  switch (actorPattern) {
    case 'ally':
      return '- Because actorPattern=ally, the scenario must explicitly use {the_ally} (or possessive {ally}\'s) in the description or outcomes. Do not replace the ally with generic phrasing like "regional partners" or "friendly states".';
    case 'adversary':
      return '- Because actorPattern=adversary, the scenario must explicitly use {the_adversary} (or possessive {adversary}\'s) in the description or outcomes. Do not replace the adversary with generic phrasing like "foreign rivals" or "hostile powers".';
    case 'border_rival':
      return '- Because actorPattern=border_rival, the scenario must explicitly use {the_border_rival} or {the_neighbor} (or possessive bare forms) in the description or outcomes. Border incidents must not be written with generic wording like "a neighboring country".';
    case 'mixed':
      return '- Because actorPattern=mixed, the scenario must explicitly use at least one concrete relationship token such as {the_ally}, {the_adversary}, {the_border_rival}, {the_neighbor}, or {the_trade_partner}. Do not collapse external actors into generic wording.';
    default:
      return '';
  }
}

function isLMStudioModel(model?: string): boolean {
  return Boolean(model?.startsWith('lmstudio:'));
}

function getSharedLMStudioModel(modelConfig?: GenerationModelConfig): string | undefined {
  return [
    modelConfig?.architectModel,
    modelConfig?.drafterModel,
    modelConfig?.repairModel,
    modelConfig?.contentQualityModel,
    modelConfig?.narrativeReviewModel,
  ].find((model): model is string => Boolean(model && isLMStudioModel(model)));
}

function isLMStudioGeneration(modelConfig?: GenerationModelConfig): boolean {
  return Boolean(getSharedLMStudioModel(modelConfig));
}

function getModelFamily(modelConfig?: GenerationModelConfig): string {
  return isLMStudioGeneration(modelConfig) ? 'lmstudio' : 'openai';
}

function inferScopeKey(scopeTier: ScenarioScopeTier, options: {
  region?: string;
  regions?: string[];
  clusterId?: string;
  applicableCountries?: string[];
}): string {
  const primaryRegion = options.region ?? options.regions?.[0];
  switch (scopeTier) {
    case 'regional':
      return primaryRegion ? `region:${primaryRegion}` : '';
    case 'cluster':
      return options.clusterId ? `cluster:${options.clusterId}` : '';
    case 'exclusive':
      return options.applicableCountries?.length === 1 ? `country:${options.applicableCountries[0]}` : '';
    default:
      return 'universal';
  }
}

function normalizeGenerationScope(request: Pick<GenerationRequest, 'mode' | 'region' | 'regions' | 'scopeTier' | 'scopeKey' | 'clusterId' | 'exclusivityReason' | 'sourceKind' | 'applicable_countries'>): ResolvedGenerationScope {
  const scopeTier = request.scopeTier ?? 'universal';
  const applicableCountries = request.applicable_countries?.filter((countryId) => countryId.trim().length > 0);
  const sourceKind = request.sourceKind ?? (request.mode === 'news' ? 'news' : 'evergreen');
  const regions = request.regions?.length
    ? request.regions
    : request.region
      ? [request.region]
      : [];
  const scopeKey = request.scopeKey ?? inferScopeKey(scopeTier, {
    region: request.region,
    regions,
    clusterId: request.clusterId,
    applicableCountries,
  });

  if (!scopeKey) {
    throw new Error(`[ScenarioEngine] Missing scopeKey for scope tier ${scopeTier}`);
  }
  if (scopeTier === 'regional' && regions.length === 0) {
    throw new Error('[ScenarioEngine] Regional generation requires region or regions');
  }
  if (scopeTier === 'cluster' && !request.clusterId) {
    throw new Error('[ScenarioEngine] Cluster generation requires clusterId');
  }
  if (scopeTier === 'exclusive') {
    if (!request.exclusivityReason) {
      throw new Error('[ScenarioEngine] Exclusive generation requires exclusivityReason');
    }
    if (!applicableCountries?.length) {
      throw new Error('[ScenarioEngine] Exclusive generation requires applicable_countries');
    }
  }

  return {
    scopeTier,
    scopeKey,
    clusterId: request.clusterId,
    exclusivityReason: request.exclusivityReason,
    sourceKind,
    regions,
    applicableCountries,
  };
}

function resolvePhaseModel(
  modelConfig: GenerationModelConfig | undefined,
  phase: 'architect' | 'drafter' | 'repair' | 'contentQuality' | 'narrativeReview'
): string {
  const sharedLMStudioModel = getSharedLMStudioModel(modelConfig);

  switch (phase) {
    case 'architect':
      return modelConfig?.architectModel || ARCHITECT_MODEL;
    case 'drafter':
      return modelConfig?.drafterModel || DRAFTER_MODEL;
    case 'repair':
      return modelConfig?.repairModel || sharedLMStudioModel || REPAIR_MODEL;
    case 'contentQuality':
      return modelConfig?.contentQualityModel || sharedLMStudioModel || 'gpt-4o-mini';
    case 'narrativeReview':
      return modelConfig?.narrativeReviewModel || sharedLMStudioModel || process.env.NARRATIVE_REVIEW_MODEL || 'gpt-4o-mini';
  }
}

// ------------------------------------------------------------------
// Generation Config — fetched from world_state/generation_config
// ------------------------------------------------------------------

interface GenerationConfig {
  concept_concurrency: number;
  max_llm_repair_attempts: number;
  llm_repair_enabled?: boolean;
  audit_pass_threshold: number;
  audit_error_penalty: number;
  audit_warning_penalty: number;
  max_bundle_concurrency: number;
  max_pending_jobs: number;
  max_scenarios_per_job: number;
  dedup_similarity_threshold: number;
  content_quality_gate_enabled?: boolean;
  narrative_review_enabled?: boolean;
  max_active_scenarios_per_bundle?: number;
  // Feature flags
  enable_funnel_telemetry?: boolean;
  enable_standard_direct_draft?: boolean;
  enable_conditional_editorial_review?: boolean;
  enable_concept_novelty_gate?: boolean;
  lmstudio_base_url?: string;
}

let _generationConfigCache: GenerationConfig | null = null;
let _generationConfigFetchedAt = 0;
const GENERATION_CONFIG_TTL_MS = 5 * 60 * 1000; // 5-minute in-memory cache

export async function getGenerationConfig(): Promise<GenerationConfig> {
  const now = Date.now();
  if (_generationConfigCache && (now - _generationConfigFetchedAt) < GENERATION_CONFIG_TTL_MS) {
    return _generationConfigCache;
  }
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  const snap = await admin.firestore().doc('world_state/generation_config').get();
  if (!snap.exists) {
    throw new Error('[ScenarioEngine] world_state/generation_config not found in Firestore. Run the seed script.');
  }
  const raw = snap.data() as GenerationConfig;
  _generationConfigCache = {
    ...raw,
    llm_repair_enabled: raw.llm_repair_enabled ?? true,
    content_quality_gate_enabled: raw.content_quality_gate_enabled ?? false,
    narrative_review_enabled: raw.narrative_review_enabled ?? false,
    max_llm_repair_attempts: raw.max_llm_repair_attempts ?? 3,
    max_active_scenarios_per_bundle: raw.max_active_scenarios_per_bundle ?? 500,
    enable_funnel_telemetry: raw.enable_funnel_telemetry ?? true,
    enable_standard_direct_draft: raw.enable_standard_direct_draft ?? false,
    enable_conditional_editorial_review: raw.enable_conditional_editorial_review ?? false,
    enable_concept_novelty_gate: raw.enable_concept_novelty_gate ?? false,
  };
  _generationConfigFetchedAt = now;
  return _generationConfigCache;
}

// Cost tracking
interface CostMetrics {
  openai: { input_tokens: number; output_tokens: number; cost_usd: number };
  total_usd: number;
}

let sessionCosts: CostMetrics = {
  openai: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
  total_usd: 0
};

export function getSessionCosts(): CostMetrics {
  return { ...sessionCosts };
}

export function resetSessionCosts(): void {
  sessionCosts = {
    openai: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
    total_usd: 0
  };
}

export type { ModelConfig };

async function loadCountriesData(): Promise<{ countries: Record<string, any>; source: CountryCatalogSourceMetadata }> {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  const catalog = await loadCountryCatalog(admin.firestore());
  return { countries: catalog.countries, source: catalog.source };
}

// ------------------------------------------------------------------
// Country context for prompt enrichment (economic scale, geography, proportionality)
// ------------------------------------------------------------------

async function getCountryContextBlock(applicableCountryIds: string[] | undefined): Promise<string> {
  if (!applicableCountryIds?.length) {
    return `
UNIVERSAL SCENARIO: This scenario must work for countries of ANY size, from micro island states to major powers. Use relative terms ("a significant portion of GDP", "thousands of workers", "major fiscal impact") rather than hard-coded dollar amounts. Use the tokens {economic_scale}, {gdp_description}, {population_scale}, {geography_type}, {climate_risk} so the narrative adapts at runtime, and avoid treating {gdp_description} itself as a specific budget line item.`;
  }

  const { countries: data, source } = await loadCountriesData();

  const normalizeGdpToMillions = (rawGdp: number): number => {
    if (!Number.isFinite(rawGdp) || rawGdp <= 0) return 0;
    if (rawGdp >= 1_000_000_000) return rawGdp / 1_000_000;
    return rawGdp;
  };

  const formatBillions = (gdpMillions: number): string => {
    const billions = gdpMillions / 1_000;
    if (!Number.isFinite(billions) || billions <= 0) return '0';
    const rounded = billions >= 10 ? Math.round(billions) : Math.round(billions * 10) / 10;
    return rounded.toLocaleString('en-US', { maximumFractionDigits: 1 });
  };

  let minGdpMillions = Infinity;
  let maxGdpMillions = 0;
  const allVuln = new Set<string>();
  const allStrengths = new Set<string>();
  const governmentCategories = new Set<string>();
  const geoTags = new Set<string>();
  const geographies: string[] = [];
  const regions: string[] = [];
  const govSystems = new Set<string>();
  const unknownIds: string[] = [];

  for (const id of applicableCountryIds) {
    const c = data[id];
    if (!c) {
      unknownIds.push(id);
      continue;
    }
    if (c.region) regions.push(c.region);

    const gdpRaw = c.gdp ?? c.economy?.gdp ?? 0;
    if (typeof gdpRaw === 'number') {
      const gdpMillions = normalizeGdpToMillions(gdpRaw);
      if (gdpMillions > 0) {
        minGdpMillions = Math.min(minGdpMillions, gdpMillions);
        maxGdpMillions = Math.max(maxGdpMillions, gdpMillions);
      }
    }
    const profile = c.profile;
    if (profile) {
      (profile.vulnerabilities || []).forEach((v: string) => allVuln.add(v));
      (profile.strengths || []).forEach((s: string) => allStrengths.add(s));
      if (profile.geography) geographies.push(profile.geography);
    }
    if (c.geopolitical) {
      const gp = c.geopolitical;
      if (gp.governmentCategory) {
        governmentCategories.add(gp.governmentCategory);
      }
      (gp.tags || []).forEach((t: string) => geoTags.add(t));
    }
    const leaderTitle = c.tokens?.leader_title;
    const legislature = c.tokens?.legislature;
    if (leaderTitle || legislature) {
      govSystems.add([leaderTitle, legislature].filter(Boolean).join(' + '));
    }
  }

  if (unknownIds.length > 0) {
    console.warn(`[ScenarioEngine] getCountryContextBlock: unrecognized country IDs [${unknownIds.join(', ')}] not found in ${source.path}. They will be excluded from context.`);
  }

  const uniqueRegions = [...new Set(regions)];
  const uniqueGeographies = [...new Set(geographies)];

  const regionLine = uniqueRegions.length ? `Region(s): ${uniqueRegions.join(', ')}.` : '';
  const geographyLine = uniqueGeographies.length ? `Geography: ${uniqueGeographies.join(', ')}.` : '';
  const govCategoryLine = governmentCategories.size
    ? `Government categories present: ${[...governmentCategories].join(', ')}.`
    : '';
  const geoTagsLine = geoTags.size
    ? `Geopolitical tags present across these countries: ${[...geoTags].slice(0, 16).join(', ')}.`
    : '';
  const scaleLine = minGdpMillions < Infinity
    ? `Economic scale: GDP range approximately ${formatBillions(minGdpMillions)}–${formatBillions(maxGdpMillions)} in national currency (billions).`
    : '';
  const govLine = govSystems.size ? `Government systems: ${[...govSystems].slice(0, 4).join(' / ')}.` : '';
  const vulnLine = allVuln.size ? `Key vulnerabilities: ${[...allVuln].slice(0, 8).join(', ')}.` : '';
  const strengthsLine = allStrengths.size ? `Key strengths: ${[...allStrengths].slice(0, 8).join(', ')}.` : '';
  const proportionalGuidance = (() => {
    if (maxGdpMillions <= 0) return '';
    const gdpBillions = maxGdpMillions / 1_000;
    if (maxGdpMillions >= 5_000_000) {
      // Major economies ($5T+ GDP) — US, China, Japan, Germany, etc.
      return `
CRITICAL - ECONOMIC PROPORTIONALITY (MAJOR ECONOMY, GDP ~${Math.round(gdpBillions).toLocaleString()}B):
Even for the world's largest economies, corruption scandals involve millions to low billions — NOT trillions.
A scandal siphoning the entire GDP is physically impossible. Realistic corruption amounts: 0.5–3% of GDP.
For a ~$${Math.round(gdpBillions).toLocaleString()}B economy, a major scandal might involve $${Math.round(gdpBillions * 0.005).toLocaleString()}B–$${Math.round(gdpBillions * 0.03).toLocaleString()}B.
USE the token {graft_amount} for corruption/theft amounts — it auto-scales to the country's GDP.
USE the token {infrastructure_cost} for infrastructure projects or construction costs.
USE the token {disaster_cost} for natural disaster recovery or emergency response costs.
USE the token {sanctions_amount} for economic sanctions or trade embargo impacts.
USE the token {trade_value} for trade disruption amounts.
USE the token {military_budget_amount} for defense spending.
USE the token {gdp_description} ONLY to describe the overall economy (e.g., "draining resources from {gdp_description}").
NEVER treat {gdp_description} as the specific amount stolen, lost, or transferred — it resolves to the ENTIRE national GDP.`;
    }
    if (maxGdpMillions >= 500_000) {
      // Large economies ($500B–$5T)
      return `
CRITICAL - ECONOMIC PROPORTIONALITY (LARGE ECONOMY, GDP ~${Math.round(gdpBillions).toLocaleString()}B):
Corruption scandals: hundreds of millions to single-digit billions. NOT tens or hundreds of billions.
For a ~$${Math.round(gdpBillions).toLocaleString()}B economy, a scandal might involve $${Math.round(gdpBillions * 0.005).toLocaleString()}B–$${Math.round(gdpBillions * 0.03).toLocaleString()}B.
USE tokens {graft_amount}, {infrastructure_cost}, {disaster_cost}, {sanctions_amount}, {trade_value}, {military_budget_amount} for specific monetary amounts.
NEVER treat {gdp_description} as a stolen/siphoned amount — it resolves to the ENTIRE national GDP.`;
    }
    if (maxGdpMillions >= 50_000) {
      // Medium economies ($50B–$500B)
      return `
CRITICAL - ECONOMIC PROPORTIONALITY (MEDIUM ECONOMY, GDP ~${Math.round(gdpBillions).toLocaleString()}B):
Financial scandal amounts: tens of millions to low hundreds of millions. NOT billions.
USE tokens {graft_amount}, {infrastructure_cost}, {disaster_cost}, {trade_value} for proportional monetary references.
NEVER treat {gdp_description} as a stolen/siphoned amount — it resolves to the ENTIRE national GDP.`;
    }
    // Small/micro economies (<$50B)
    return `
CRITICAL - ECONOMIC PROPORTIONALITY (SMALL/MICRO ECONOMY, GDP ~${gdpBillions < 1 ? Math.round(maxGdpMillions).toLocaleString() + 'M' : Math.round(gdpBillions).toLocaleString() + 'B'}):
These scenarios target small or micro economies. All financial references MUST be proportional.
A "major economic shock" is on the order of millions, not billions. Do NOT reference impacts in the billions.
USE tokens {graft_amount}, {infrastructure_cost}, {disaster_cost}, {aid_amount} for proportional monetary references.
NEVER treat {gdp_description} as a stolen/siphoned amount — it resolves to the ENTIRE national GDP.`;
  })();

  return `
COUNTRY & GEOPOLITICAL CONTEXT (these scenarios target specific countries):
Target set size: ${applicableCountryIds.length} countries.
${regionLine}
${geographyLine}
${scaleLine}
${govLine}
${govCategoryLine}
${geoTagsLine}
${vulnLine}
${strengthsLine}
${proportionalGuidance}

CRITICAL GEOPOLITICAL RULES:
- Use only tokens for country/leader/institution names (e.g. {the_player_country}, {the_adversary}, {leader_title}, {legislature}, {ruling_party}).
- If any target country has an authoritarian or totalitarian governmentCategory, do NOT generate standard democratic election or coalition-politics scenarios for them.
- If any target country has tags like 'oil_exporter' or 'resources', preferentially include energy/resources-related stakes and effects.
- If any target country has tags like 'nuclear_state', use nuclear deterrence/escalation themes sparingly and realistically — no instant apocalypse.
- If any target country has tags like 'conflict_zone' or 'post_conflict', border tension, refugee flows, and security dilemmas are appropriate.

Use the tokens {economic_scale}, {gdp_description}, {population_scale}, {geography_type}, {climate_risk} so the narrative adapts to the player's country at runtime. Do NOT use actual country names in scenario text — they are substituted by tokens at runtime.`;
}

// Builds a specific, actionable country note for drafter/architect prompts.
// More informative than a generic "keep themes appropriate" sentence.
async function buildCountryNote(applicableCountryIds: string[] | undefined): Promise<string> {
  if (!applicableCountryIds?.length) return '';
  const { countries: data } = await loadCountriesData();

  const found: Array<{ region: string; geography: string; vulnerabilities: string[] }> = [];
  for (const id of applicableCountryIds) {
    const c = data[id];
    if (!c) continue;
    found.push({
      region: c.region || '',
      geography: c.profile?.geography || '',
      vulnerabilities: (c.profile?.vulnerabilities || []).slice(0, 3),
    });
  }
  if (!found.length) return '';

  const uniqueRegions = [...new Set(found.map(f => f.region).filter(Boolean))];
  const uniqueGeographies = [...new Set(found.map(f => f.geography).filter(Boolean))];
  const topVulns = [...new Set(found.flatMap(f => f.vulnerabilities))].slice(0, 4);

  const parts: string[] = [`These scenarios target ${found.length} specific countr${found.length === 1 ? 'y' : 'ies'}`];
  if (uniqueRegions.length) parts.push(`in ${uniqueRegions.join(' and ')}`);
  if (uniqueGeographies.length) parts.push(`(${uniqueGeographies.join('/')} nations)`);
  if (topVulns.length) parts.push(`with ${topVulns.join(', ')} as key risk factors`);
  parts.push('— ensure themes, stakes, and scale are appropriate for these nations.');
  parts.push('Never include literal country names, capitals, or abbreviations in output text; use tokens only.');

  return ' ' + parts.join(' ');
}

// ------------------------------------------------------------------
// Schemas
// ------------------------------------------------------------------

const CONCEPT_SCHEMA = {
  type: 'object',
  properties: {
    concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          concept: { type: 'string' },
          theme: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'extreme', 'critical'] },
          difficulty: { type: 'integer', minimum: 1, maximum: 5 },
          primaryMetrics: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
          secondaryMetrics: { type: 'array', items: { type: 'string' }, maxItems: 3 },
          actorPattern: {
            type: 'string',
            enum: ['domestic', 'ally', 'adversary', 'border_rival', 'legislature', 'cabinet', 'judiciary', 'mixed']
          },
          optionShape: {
            type: 'string',
            enum: ['redistribute', 'regulate', 'escalate', 'negotiate', 'invest', 'cut', 'reform', 'delay']
          },
          loopEligible: { type: 'boolean' }
        },
        required: ['concept', 'theme', 'severity', 'difficulty']
      }
    }
  },
  required: ['concepts']
};

const BLUEPRINT_SCHEMA = {
  type: 'object',
  properties: {
    acts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          actIndex: { type: 'number' },
          title: { type: 'string' },
          summary: { type: 'string' },
          suggestedMetrics: { type: 'array', items: { type: 'string' } }
        },
        required: ['actIndex', 'title', 'summary']
      }
    }
  },
  required: ['acts']
};

const SCENARIO_DETAILS_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    options: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
          label: { type: 'string' },
          effects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                targetMetricId: { type: 'string' },
                value: { type: 'number' },
                type: { type: 'string', enum: ['delta', 'absolute'] },
                duration: { type: 'number' },
                probability: { type: 'number' }
              },
              required: ['targetMetricId', 'value', 'type', 'duration']
            }
          },
          outcomeHeadline: { type: 'string' },
          outcomeSummary: { type: 'string' },
          outcomeContext: { type: 'string' },
          advisorFeedback: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                roleId: {
                  type: 'string',
                  enum: ['role_executive', 'role_diplomacy', 'role_defense', 'role_economy', 'role_justice', 'role_health', 'role_commerce', 'role_labor', 'role_interior', 'role_energy', 'role_environment', 'role_transport', 'role_education']
                },
                stance: { type: 'string', enum: ['support', 'neutral', 'concerned', 'oppose'] },
                feedback: { type: 'string' }
              },
              required: ['roleId', 'stance', 'feedback']
            }
          },
          is_authoritarian: { type: 'boolean' },
          moral_weight: { type: 'number', minimum: -1, maximum: 1 },
          classification: {
            type: 'object',
            properties: {
              riskLevel: { type: 'string', enum: ['safe', 'moderate', 'risky', 'dangerous'] },
              ideology: { type: 'string', enum: ['left', 'center', 'right'] },
              approach: { type: 'string', enum: ['diplomatic', 'economic', 'military', 'humanitarian', 'administrative'] }
            }
          }
        },
        required: ['id', 'text', 'label', 'effects', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext', 'advisorFeedback', 'is_authoritarian', 'moral_weight']
      }
    },
    metadata: {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'extreme', 'critical'] },
        urgency: { type: 'string', enum: ['low', 'medium', 'high', 'immediate'] },
        difficulty: { type: 'integer', minimum: 1, maximum: 5 },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['severity', 'urgency', 'difficulty']
    }
  },
  required: ['title', 'description', 'options', 'metadata']
};

// ------------------------------------------------------------------
// Main Entry Point
// ------------------------------------------------------------------

export interface GenerationRequest {
  mode: 'news' | 'manual';
  bundle: BundleId;
  count: number;
  newsContext?: NewsItem[];
  distributionConfig?: any;
  concurrency?: number;
  onProgress?: (progress: { current: number; total: number; stage: string }) => void | Promise<void>;
  /** Target regions for scenario themes (e.g. ['caribbean', 'europe']). Injected into Architect/Drafter prompts. */
  region?: string;
  /** Explicit region IDs to tag on generated scenarios (e.g. ['caribbean']). If not set, derived from applicable_countries. */
  regions?: string[];
  scopeTier?: ScenarioScopeTier;
  scopeKey?: string;
  clusterId?: string;
  exclusivityReason?: ScenarioExclusivityReason;
  sourceKind?: ScenarioSourceKind;
  /** Optional country IDs; generated scenarios will have metadata.applicable_countries set to this array. */
  applicable_countries?: string[];
  /** Optional per-request model overrides. Falls back to ARCHITECT_MODEL/DRAFTER_MODEL env vars when not set. */
  modelConfig?: {
    architectModel?: string;
    drafterModel?: string;
    repairModel?: string;
    contentQualityModel?: string;
    narrativeReviewModel?: string;
    embeddingModel?: string;
  };
  /** Called after each failed generation attempt so callers can surface live audit failure detail. */
  onAttemptFailed?: (info: { bundle: string; attempt: number; maxAttempts: number; score: number; topIssues: string[] }) => void;
  lowLatencyMode?: boolean;
}

export async function generateScenarios(request: GenerationRequest): Promise<BundleScenario[]> {
  // Validate bundle at entry point
  if (!isValidBundleId(request.bundle)) {
    throw new Error(`Invalid bundle: ${request.bundle}. Valid bundles: ${ALL_BUNDLE_IDS.join(', ')}`);
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();
  await initializeAuditConfig(db);
  const countryCatalog = await loadCountryCatalog(db);

  const genConfig = await getGenerationConfig();
  const resolvedScope = normalizeGenerationScope(request);
  const isDeployedFunction = !process.env.FUNCTIONS_EMULATOR && Boolean(process.env.K_SERVICE);
  const isBulkSafeMode = request.lowLatencyMode ?? (isDeployedFunction && request.count <= 1);

  // Concept-level concurrency: how many concepts to expand in parallel per bundle
  // Combined with max_bundle_concurrency in background-jobs.ts:
  // Total concurrent API calls = max_bundle_concurrency × concept_concurrency
  const isLMStudio = isLMStudioGeneration(request.modelConfig);
  const configuredConcurrency = request.concurrency ?? genConfig.concept_concurrency;
  const CONCURRENCY = isLMStudio ? 1 : (isBulkSafeMode ? 1 : configuredConcurrency);
  console.log(`[ScenarioEngine] Generation: Bundle=${request.bundle}, Mode=${request.mode}, Concurrency=${CONCURRENCY}${isLMStudio ? ' (LM Studio — sequential)' : ''}${isBulkSafeMode ? ' (bulk-safe)' : ''}`);

  console.log(`[ScenarioEngine] Country catalog source: ${countryCatalog.source.path}`);

  if (request.applicable_countries?.length) {
    assertRequestedCountryIdsAvailable(countryCatalog.countries, request.applicable_countries, 'ScenarioEngine');
  }

  // Region-country consistency check: reject if applicable_countries don't match requested region
  if (request.region && request.applicable_countries?.length) {
    const mismatched: string[] = [];
    for (const id of request.applicable_countries) {
      const c = countryCatalog.countries[id];
      if (c?.region && c.region !== request.region) {
        mismatched.push(`${c.name || id} (belongs to region "${c.region}", not "${request.region}")`);
      }
    }
    if (mismatched.length > 0) {
      throw new Error(
        `[ScenarioEngine] Region-country mismatch: requested region="${request.region}" but ` +
        `some countries belong to different regions: ${mismatched.join(', ')}. ` +
        `Either omit the region filter or use countries that match it.`
      );
    }
  }

  // 1. PHASE 1: Concept Seeding
  const rawConcepts = await generateConceptSeeds(request);
  const loopPlan = buildLoopLengthPlan(rawConcepts.length, request.distributionConfig);
  const concepts = rawConcepts.map((c, i) => ({ ...c, desiredActs: loopPlan[i] || 3 }));

  const allProduced: BundleScenario[] = [];
  let completedCount = 0;

  // 2. PHASE 2 & 3: Parallel Loop Expansion (batches of CONCURRENCY)
  const expandConcept = async (concept: any, idx: number): Promise<BundleScenario[]> => {
    console.log(`[ScenarioEngine] Expanding concept ${idx + 1}/${concepts.length}: ${concept.concept}`);

    const runAttempt = async (): Promise<BundleScenario[]> => {
      const loop = await expandConceptToLoop(concept, request.bundle, request.mode, {
        ...request,
        countryCatalogSource: countryCatalog.source,
        scopeTier: resolvedScope.scopeTier,
        scopeKey: resolvedScope.scopeKey,
        clusterId: resolvedScope.clusterId,
        exclusivityReason: resolvedScope.exclusivityReason,
        sourceKind: resolvedScope.sourceKind,
        lowLatencyMode: isBulkSafeMode,
      });
      normalizeLoopStructure(loop);

      const validatedLoop: BundleScenario[] = [];
      for (const act of loop) {
        const result = await auditAndRepair(act, request.bundle, request.mode, countryCatalog.source, request.modelConfig, isBulkSafeMode);
        if (result.scenario) validatedLoop.push(result.scenario);
      }

      // If the LLM generated more acts than requested, trim to desired length
      // (e.g. asked for 1-act but LLM returned 5 — take the first act as standalone)
      if (validatedLoop.length > concept.desiredActs) {
        console.warn(`[ScenarioEngine] Trimming loop from ${validatedLoop.length} to ${concept.desiredActs} acts`);
        validatedLoop.splice(concept.desiredActs);
        // Clear dangling consequence chains on the new last act
        const lastAct = validatedLoop[validatedLoop.length - 1] as any;
        lastAct.consequenceScenarioIds = [];
        lastAct.phase = validatedLoop.length === 1 ? 'root' : 'final';
      }

      // Validate loop completion
      const validation = validateLoopComplete(validatedLoop, concept.desiredActs);
      if (!validation.valid) {
        console.warn(`[ScenarioEngine] Loop validation failed: ${validation.reason}`);
        const fallbackLoop = collapseLoopToStandalone(validatedLoop);
        if (fallbackLoop.length > 0) {
          console.warn(`[ScenarioEngine] Falling back to standalone scenario for concept ${idx + 1}`);
          return fallbackLoop;
        }
        return [];
      }

      console.log(`[ScenarioEngine] Loop validated successfully: ${validatedLoop.length} acts, chainId: ${(validatedLoop[0] as any).chainId}`);
      return validatedLoop;
    };

    try {
      const first = await runAttempt();
      if (first.length > 0) return first;
      console.warn(`[ScenarioEngine] Concept ${idx + 1} yielded no scenarios on attempt 1, retrying...`);
      return await runAttempt();
    } catch (err) {
      console.warn(`[ScenarioEngine] Concept ${idx + 1} attempt 1 threw, retrying:`, err);
      try {
        return await runAttempt();
      } catch (retryErr) {
        console.error(`[ScenarioEngine] Critical failure on concept ${idx} after retry:`, retryErr);
        return [];
      }
    } finally {
      completedCount++;
      if (request.onProgress) {
        await request.onProgress({ current: completedCount, total: concepts.length, stage: 'generating' });
      }
    }
  };

  // Process in parallel batches
  for (let batchStart = 0; batchStart < concepts.length; batchStart += CONCURRENCY) {
    const batch = concepts.slice(batchStart, batchStart + CONCURRENCY);
    console.log(`[ScenarioEngine] Processing batch ${Math.floor(batchStart / CONCURRENCY) + 1}/${Math.ceil(concepts.length / CONCURRENCY)} (${batch.length} concepts in parallel)`);
    const batchResults = await Promise.all(
      batch.map((concept, i) => expandConcept(concept, batchStart + i))
    );
    for (const results of batchResults) {
      allProduced.push(...results);
    }
  }

  // Derive region_tags from explicit regions or from applicable_countries
  const derivedRegionTags: string[] = (() => {
    if (resolvedScope.regions.length) return resolvedScope.regions;
    if (resolvedScope.applicableCountries?.length) {
      const uniqueRegions = [...new Set(
        resolvedScope.applicableCountries
          .map(id => getRegionForCountry(id))
          .filter((r): r is NonNullable<typeof r> => r !== undefined)
      )];
      return uniqueRegions;
    }
    return [];
  })();

  // Enrich metadata on all produced scenarios before returning
  return allProduced.map(scenario => ({
    ...scenario,
    metadata: {
      ...scenario.metadata,
      bundle: request.bundle,
      source: request.mode as 'news' | 'manual',
      scopeTier: resolvedScope.scopeTier,
      scopeKey: resolvedScope.scopeKey,
      ...(resolvedScope.clusterId ? { clusterId: resolvedScope.clusterId } : {}),
      ...(resolvedScope.exclusivityReason ? { exclusivityReason: resolvedScope.exclusivityReason } : {}),
      sourceKind: resolvedScope.sourceKind,
      difficulty: scenario.metadata?.difficulty || 3,
      ...(resolvedScope.applicableCountries?.length ? { applicable_countries: resolvedScope.applicableCountries } : {}),
      ...(derivedRegionTags.length ? { region_tags: derivedRegionTags } : {})
    }
  }));
}

// ------------------------------------------------------------------
// LLM Repair
// ------------------------------------------------------------------

// Rules that an LLM can reliably fix with a surgical partial-JSON patch.
// Non-fixable rules (structural defects like wrong option count, invalid metrics)
// are intentionally excluded and must trigger a full re-generation.
const LLM_FIXABLE_RULES = new Set([
  'hardcoded-gov-structure',
  'advisor-boilerplate',
  'hardcoded-the-before-token',
  'sentence-start-bare-token',
  'informal-tone',
  'double-space',
  'orphaned-punctuation',
  'description-length',
  'description-word-count',
  'option-text-length',
  'option-text-word-count',
  'label-quality',
  'jargon-use',
  'complex-sentence',
  'high-clause-density',
  'high-passive-voice',
  'label-complexity',
  'outcome-second-person',
  'third-person-framing',
  'lowercase-start',
  'short-summary',
  'invalid-role-id',
  'adjacency-token-mismatch',
  'banned-phrase',
  'hardcoded-institution-phrase',
  'hard-coded-currency',
  'short-article',
  'gdp-as-amount',
  'label-has-token',
  'title-too-short',
]);

/**
 * Attempt a surgical LLM repair of a scenario using the cheapest available model.
 * Only invoked when ALL remaining issues are within LLM_FIXABLE_RULES and
 * llm_repair_enabled is true in generation config.
 * Returns the patched scenario, or null if the repair made things worse or failed.
 */
async function llmRepairScenario(
  scenario: BundleScenario,
  issues: any[],
  bundle: string,
  isNews: boolean,
  baselineScore?: number,
  modelConfig?: GenerationModelConfig
): Promise<BundleScenario | null> {
  const fixableIssues = issues.filter(i => LLM_FIXABLE_RULES.has(i.rule));
  if (fixableIssues.length === 0) return null;

  const conceptTokenTable = CONCEPT_TO_TOKEN_MAP
    .map(({ concept, token }) => `  - ${concept} → ${token}`)
    .join('\n');

  const issueList = fixableIssues
    .map(i => `[${i.severity}] ${i.rule}: ${i.message}`)
    .join('\n');

  // Extract only the text fields likely to need repair
  const repairTarget = {
    title: scenario.title,
    description: scenario.description,
    options: scenario.options.map(o => ({
      id: o.id,
      text: o.text,
      label: o.label,
      outcomeHeadline: o.outcomeHeadline,
      outcomeSummary: o.outcomeSummary,
      outcomeContext: o.outcomeContext,
      advisorFeedback: o.advisorFeedback,
    })),
  };

  const repairPrompt = `You are a surgical scenario text editor. Fix ONLY the specific audit issues listed below.

STRICT RULES:
1. Fix ONLY the fields mentioned in the ISSUES list.
2. Do NOT rewrite, restructure, or alter any field NOT explicitly cited.
3. Preserve ALL tokens exactly (e.g. {leader_title}, {the_adversary}, {the_player_country}).
4. The returned JSON must never contain the literal substring "the {" anywhere.
5. Never introduce a placeholder that is not already present in the approved whitelist or the scenario input. If a token is unavailable, rewrite with plain language.
6. Do NOT change effects, metric IDs, durations, probabilities, or any numeric data.
7. Return ONLY a partial JSON patch with the changed fields — same structure as input.
8. Do NOT wrap in markdown.

QUICK FIX REFERENCE:
- third-person-framing: "the administration" → "{leader_title}"; "the government" → "your government" (in second-person fields) or "{leader_title}'s government" (in outcome fields)
- hardcoded-the-before-token: "the {X}" → "{the_X}" (e.g. "the {adversary}" → "{the_adversary}")
- sentence-start-bare-token: sentence-opening "{X}" → "{the_X}" when an article-form token exists
- lowercase-start: capitalize the first narrative word of the field; if a field starts with a token, capitalize the first narrative word after the token
- high-passive-voice: rewrite passive as active ("was directed to" → "you directed"; "was announced by" → "{leader_title} announced")
- option-text-word-count / description-length: expand to minimum — add mechanism, trade-off, and affected group
- short-summary: expand outcomeSummary/outcomeContext — add institutional reaction, market impact, or downstream effect
- title-too-short: add 1–2 specific words to reach 4 words minimum (no tokens allowed in title)
- hardcoded-institution-phrase: replace ministry name with role token (e.g. "Interior Ministry" → "{interior_role}")
- label-has-token: remove the token from the label, replace with plain text (e.g. "Blame {the_neighbor}" → "Blame the Neighbor")
- advisor-boilerplate: rewrite with concrete mechanism, affected constituency, and causal chain
- invalid-token: never output {legislature_speaker} or {the_legislature_speaker}; rewrite as "speaker of {the_legislature}" or plain language

CONCEPT → TOKEN MAP (government structure):
${conceptTokenTable}

ISSUES TO FIX:
${issueList}

SCENARIO (text fields only):
${JSON.stringify(repairTarget, null, 2)}

Return ONLY the changed JSON fields as a partial patch.`;

  try {
    const repairResult = await callModelProvider<typeof repairTarget>(
      REPAIR_CONFIG,
      repairPrompt,
      {},
      resolvePhaseModel(modelConfig, 'repair')
    );

    if (!repairResult.data) {
      console.warn(`[ScenarioEngine] LLM repair returned null for ${scenario.id}`);
      return null;
    }

    const patch = repairResult.data as any;

    // Merge the patch back onto the scenario
    const patched: BundleScenario = { ...scenario };
    if (patch.title !== undefined) patched.title = patch.title;
    if (patch.description !== undefined) patched.description = patch.description;
    if (patch.options && Array.isArray(patch.options)) {
      patched.options = scenario.options.map(orig => {
        const patchedOpt = patch.options.find((p: any) => p.id === orig.id);
        if (!patchedOpt) return orig;
        return {
          ...orig,
          ...(patchedOpt.text !== undefined ? { text: patchedOpt.text } : {}),
          ...(patchedOpt.label !== undefined ? { label: patchedOpt.label } : {}),
          ...(patchedOpt.outcomeHeadline !== undefined ? { outcomeHeadline: patchedOpt.outcomeHeadline } : {}),
          ...(patchedOpt.outcomeSummary !== undefined ? { outcomeSummary: patchedOpt.outcomeSummary } : {}),
          ...(patchedOpt.outcomeContext !== undefined ? { outcomeContext: patchedOpt.outcomeContext } : {}),
          // Merge advisor feedback by roleId to prevent partial-array replacement
          // stripping out advisors the model didn't touch (which would cause missing-role-feedback errors)
          ...(patchedOpt.advisorFeedback !== undefined ? {
            advisorFeedback: (() => {
              const patchedAdvisors: any[] = patchedOpt.advisorFeedback;
              return (orig.advisorFeedback ?? []).map((origAdvisor: any) => {
                const replacement = patchedAdvisors.find((a: any) => a.roleId === origAdvisor.roleId);
                return replacement ?? origAdvisor;
              });
            })(),
          } : {}),
        };
      });
    }

    // Verify the repair improved things.
    // Compare against the full pre-repair score (not just fixable issues) so the
    // baseline matches the full re-audit score and we don't discard valid repairs.
    const reauditIssues = auditScenario(patched, bundle, isNews);
    const reauditScore = scoreScenario(reauditIssues);
    const originalScore = baselineScore ?? scoreScenario(issues);

    if (reauditScore <= originalScore) {
      console.warn(`[ScenarioEngine] LLM repair did not improve ${scenario.id} (${originalScore} → ${reauditScore}). Discarding patch.`);
      return null;
    }

    console.log(`[ScenarioEngine] LLM repair improved ${scenario.id}: score ${originalScore} → ${reauditScore} (issues: ${issues.length} → ${reauditIssues.length})`);
    return patched;
  } catch (err: any) {
    console.warn(`[ScenarioEngine] LLM repair failed for ${scenario.id}:`, err.message);
    return null;
  }
}

// ------------------------------------------------------------------
// Helpers: Generation Logic
// ------------------------------------------------------------------

async function auditAndRepair(
  scenario: BundleScenario,
  bundle: string,
  mode: string,
  countryCatalogSource: CountryCatalogSourceMetadata,
  modelConfig?: GenerationModelConfig,
  skipEditorialReview?: boolean
): Promise<{ scenario: BundleScenario | null; score: number; issues: any[] }> {
  const isNews = mode === 'news';

  // Normalize hallucinated tokens to valid equivalents before audit
  scenario.title = normalizeTokenAliases(scenario.title);
  scenario.description = normalizeTokenAliases(scenario.description);
  for (const opt of scenario.options) {
    opt.text = normalizeTokenAliases(opt.text);
    if (opt.label) opt.label = normalizeTokenAliases(opt.label);
    if (opt.outcomeHeadline) opt.outcomeHeadline = normalizeTokenAliases(opt.outcomeHeadline);
    if (opt.outcomeSummary) opt.outcomeSummary = normalizeTokenAliases(opt.outcomeSummary);
    if (opt.outcomeContext) opt.outcomeContext = normalizeTokenAliases(opt.outcomeContext);
    if ((opt as any).advisorFeedback) {
      for (const fb of (opt as any).advisorFeedback) {
        if (fb.feedback) fb.feedback = normalizeTokenAliases(fb.feedback);
      }
    }
  }

  normalizeScenarioTextFields(scenario);

  let issues = auditScenario(scenario, bundle, isNews);

  // 1. Initial Quality Check & Token Enforcement
  const fieldsToCheck = [scenario.description, ...scenario.options.map(o => o.text), ...scenario.options.map(o => o.outcomeSummary)];
  const hasTokens = fieldsToCheck.some(text => text && text.includes('{') && text.includes('}'));

  if (!hasTokens) {
    console.warn(`[ScenarioEngine] Scenario ${scenario.id} failed: No tokens found in content.`);
    return { scenario: null, score: 0, issues: [{ severity: 'error', rule: 'no-tokens', target: scenario.id, message: 'No tokens found in content', autoFixable: false }] };
  }

  // Token whitelist hard gate — reject invented tokens before any further processing
  const allTextContent = [
    scenario.title,
    scenario.description,
    ...scenario.options.flatMap(o => [o.text, o.label, o.outcomeHeadline, o.outcomeSummary, o.outcomeContext]),
    ...scenario.options.flatMap(o => ((o as any).advisorFeedback || []).map((f: any) => f.feedback))
  ].filter(Boolean).join(' ');

  const foundTokens = [...allTextContent.matchAll(/\{([a-z_]+)\}/g)].map(m => m[1]);
  const inventedTokens = foundTokens.filter(t => !isValidToken(t));
  if (inventedTokens.length > 0) {
    console.warn(`[ScenarioEngine] Scenario ${scenario.id} REJECTED: invented tokens [${inventedTokens.join(', ')}]`);
    return {
      scenario: null, score: 0,
      issues: inventedTokens.map(t => ({
        severity: 'error' as const,
        rule: 'invalid-token',
        target: scenario.id,
        message: `Invented token: {${t}} is not in the approved whitelist`,
        autoFixable: false
      }))
    };
  }

  // 1.5 Grounded Effects Validation
  try {
    // Validate each option's effects against its narrative
    for (const option of scenario.options) {
      const narrativeText = [
        option.outcomeHeadline,
        option.outcomeSummary,
        option.outcomeContext
      ].filter(Boolean).join(' ');

      const groundingIssues = validateGroundedEffects(narrativeText, option.effects || []);

      if (groundingIssues.length > 0) {
        console.warn(`[ScenarioEngine] Option ${option.id} has grounded effects mismatches:`, groundingIssues);
        // Add as warnings, not errors (non-blocking for now)
        issues.push(...groundingIssues.map(r => ({
          severity: 'warn' as const,
          rule: 'grounded-effects',
          target: `${scenario.id}/${option.id}`,
          message: r.message,
          autoFixable: false
        })));
      }
    }
  } catch (error: any) {
    console.warn(`[ScenarioEngine] Grounded effects validation failed (non-fatal):`, error.message);
  }

  // Always run boilerplate scrub and structural repairs regardless of audit result
  heuristicFix(scenario, [], bundle);

  // 3. Apply Deterministic Fixes (Phase normalization, metric mapping, etc.)
  if (scenario.metadata) {
    if (scenario.metadata.severity) scenario.metadata.severity = scenario.metadata.severity.toLowerCase();
    if (scenario.metadata.urgency) scenario.metadata.urgency = scenario.metadata.urgency.toLowerCase();
  }

  const detResult = deterministicFix(scenario);
  if (detResult.fixed) {
    issues = auditScenario(scenario, bundle, isNews);
  }

  // 3. Apply Heuristic Fixes
  if (issues.length > 0) {
    const heurResult = heuristicFix(scenario, issues, bundle);
    if (heurResult.fixed) {
      issues = auditScenario(scenario, bundle, isNews);
    }
  }

  // 4. Grounded Effects Repair (heuristic)
  try {
    let fixedAny = false;
    for (const option of scenario.options) {
      const narrativeText = [
        option.outcomeHeadline,
        option.outcomeSummary,
        option.outcomeContext
      ].filter(Boolean).join(' ');

      const originalEffects = JSON.stringify(option.effects || []);
      option.effects = suggestEffectCorrections(narrativeText, option.effects || []);

      if (JSON.stringify(option.effects) !== originalEffects) {
        console.log(`[ScenarioEngine] Auto-corrected grounded effects for option ${option.id}`);
        fixedAny = true;
      }
    }
    if (fixedAny) {
      issues = auditScenario(scenario, bundle, isNews);
      // Re-apply heuristic fixes since new effects may require new advisor roles
      if (issues.length > 0) {
        const heurResult2 = heuristicFix(scenario, issues, bundle);
        if (heurResult2.fixed) {
          console.log(`[ScenarioEngine] Applied post-effects heuristic fixes: ${heurResult2.fixes.join(', ')}`);
          issues = auditScenario(scenario, bundle, isNews);
        }
      }
    }
  } catch (error: any) {
    console.warn(`[ScenarioEngine] Grounded effects repair failed:`, error.message);
  }

  // LLM Repair — attempt a surgical patch when only LLM-fixable issues remain.
  // Skip if the scenario already meets the pass threshold — repair has shown it
  // can degrade passing scenarios, and there's nothing to gain by running it.
  const { llm_repair_enabled, audit_pass_threshold: repairThreshold } = await getGenerationConfig();
  const preRepairCurrentScore = scoreScenario(issues);
  if (!skipEditorialReview && llm_repair_enabled && issues.length > 0 && preRepairCurrentScore < repairThreshold) {
    const fixableIssues = issues.filter(i => LLM_FIXABLE_RULES.has(i.rule));
    if (fixableIssues.length > 0) {
      const repaired = await llmRepairScenario(scenario, fixableIssues, bundle, isNews, preRepairCurrentScore, modelConfig);
      if (repaired) {
        // Adopt the repaired scenario, apply deterministic fixes, then re-audit
        scenario.title = repaired.title;
        scenario.description = repaired.description;
        scenario.options = repaired.options;
        normalizeScenarioTextFields(scenario);
        deterministicFix(scenario);
        issues = auditScenario(scenario, bundle, isNews);
      }
    }
  }

  const score = scoreScenario(issues);
  const {
    audit_pass_threshold,
    content_quality_gate_enabled,
    narrative_review_enabled,
    enable_conditional_editorial_review,
  } = await getGenerationConfig();

  const effectiveContentQualityEnabled = Boolean(content_quality_gate_enabled) &&
    !skipEditorialReview &&
    !(skipEditorialReview && Boolean(enable_conditional_editorial_review));
  const effectiveNarrativeReviewEnabled = Boolean(narrative_review_enabled) &&
    !skipEditorialReview &&
    !(skipEditorialReview && Boolean(enable_conditional_editorial_review));

  const isNeutralContentQualityFallback = (qualityResult: Awaited<ReturnType<typeof evaluateContentQuality>> | undefined): boolean => {
    if (!qualityResult) return true;
    return qualityResult.pass === true &&
      qualityResult.warn === false &&
      qualityResult.overallScore === 3 &&
      qualityResult.regenerateFields.length === 0 &&
      [
        qualityResult.grammar,
        qualityResult.tone,
        qualityResult.coherence,
        qualityResult.readability,
        qualityResult.optionConsistency,
        qualityResult.advisorQuality,
      ].every((dimension) => dimension.score === 3 && dimension.issues.length === 0);
  };

  const isNeutralNarrativeFallback = (narrativeResult: Awaited<ReturnType<typeof evaluateNarrativeQuality>> | undefined): boolean => {
    if (!narrativeResult) return true;
    return narrativeResult.pass === true &&
      narrativeResult.overallScore === 3 &&
      narrativeResult.editorialNotes.length === 0 &&
      [
        narrativeResult.engagement,
        narrativeResult.strategicDepth,
        narrativeResult.optionDifferentiation,
        narrativeResult.consequenceQuality,
        narrativeResult.replayValue,
      ].every((dimension) => dimension.score === 3 && /review unavailable/i.test(dimension.reasoning || ''));
  };

  const contentQualityGate = {
    enabled: effectiveContentQualityEnabled,
    usable: false,
    result: undefined as Awaited<ReturnType<typeof evaluateContentQuality>> | undefined,
    error: undefined as string | undefined,
  };

  if (contentQualityGate.enabled) {
    try {
      const qualityResult = await evaluateContentQuality(scenario, resolvePhaseModel(modelConfig, 'contentQuality'));
      console.log(
        `[ScenarioEngine] Quality gate ${scenario.id}: overall=${qualityResult.overallScore.toFixed(2)} ` +
        `grammar=${qualityResult.grammar.score} tone=${qualityResult.tone.score} ` +
        `coherence=${qualityResult.coherence.score} readability=${qualityResult.readability.score} pass=${qualityResult.pass}`
      );
      if (scenario.metadata) {
        (scenario.metadata as any).contentQuality = {
          overallScore: qualityResult.overallScore,
          grammar: qualityResult.grammar.score,
          tone: qualityResult.tone.score,
          coherence: qualityResult.coherence.score,
          readability: qualityResult.readability.score,
          optionConsistency: qualityResult.optionConsistency.score,
          advisorQuality: qualityResult.advisorQuality.score,
          pass: qualityResult.pass,
        };
      }
      contentQualityGate.result = qualityResult;
      contentQualityGate.usable = !isNeutralContentQualityFallback(qualityResult);
      if (!contentQualityGate.usable) {
        contentQualityGate.error = 'Content quality gate returned neutral fallback result while enabled.';
      }
    } catch (qErr: any) {
      contentQualityGate.error = qErr.message;
      console.warn(`[ScenarioEngine] Content quality gate error: ${qErr.message}`);
    }
  }

  const narrativeReviewGate = {
    enabled: effectiveNarrativeReviewEnabled,
    usable: false,
    result: undefined as Awaited<ReturnType<typeof evaluateNarrativeQuality>> | undefined,
    error: undefined as string | undefined,
  };

  if (narrativeReviewGate.enabled) {
    try {
      const narrativeResult = await evaluateNarrativeQuality(scenario, resolvePhaseModel(modelConfig, 'narrativeReview'));
      console.log(
        `[ScenarioEngine] Narrative review ${scenario.id}: overall=${narrativeResult.overallScore.toFixed(2)} ` +
        `engagement=${narrativeResult.engagement.score} strategic=${narrativeResult.strategicDepth.score} ` +
        `differentiation=${narrativeResult.optionDifferentiation.score} consequence=${narrativeResult.consequenceQuality.score} ` +
        `replay=${narrativeResult.replayValue.score} pass=${narrativeResult.pass}`
      );
      if (scenario.metadata) {
        (scenario.metadata as any).narrativeReview = {
          overallScore: narrativeResult.overallScore,
          engagement: narrativeResult.engagement.score,
          strategicDepth: narrativeResult.strategicDepth.score,
          optionDifferentiation: narrativeResult.optionDifferentiation.score,
          consequenceQuality: narrativeResult.consequenceQuality.score,
          replayValue: narrativeResult.replayValue.score,
          pass: narrativeResult.pass,
          editorialNotes: narrativeResult.editorialNotes,
        };
      }
      narrativeReviewGate.result = narrativeResult;
      narrativeReviewGate.usable = !isNeutralNarrativeFallback(narrativeResult);
      if (!narrativeReviewGate.usable) {
        narrativeReviewGate.error = 'Narrative review gate returned neutral fallback result while enabled.';
      }
    } catch (nErr: any) {
      narrativeReviewGate.error = nErr.message;
      console.warn(`[ScenarioEngine] Narrative review error: ${nErr.message}`);
    }
  }

  const acceptanceDecision = decideScenarioAcceptance({
    auditScore: score,
    auditPassThreshold: audit_pass_threshold,
    issues,
    contentQualityGate,
    narrativeReviewGate,
  });

  if (acceptanceDecision.accepted) {
    const metadata = scenario.metadata ?? {};
    scenario.metadata = {
      ...metadata,
    };
    (scenario.metadata as any).acceptanceMetadata = {
      policyVersion: SCENARIO_ACCEPTANCE_POLICY_VERSION,
      countrySource: countryCatalogSource,
      acceptedAt: new Date().toISOString(),
      scopeTier: metadata.scopeTier ?? 'universal',
      scopeKey: metadata.scopeKey ?? 'universal',
      sourceKind: metadata.sourceKind ?? (mode === 'news' ? 'news' : 'evergreen'),
      modelFamily: getModelFamily(modelConfig),
    };
    return { scenario, score, issues };
  }

  const rejectionIssues = [...issues, ...acceptanceDecision.rejectionIssues];
  console.warn(
    `[ScenarioEngine] Scenario ${scenario.id} rejected by acceptance policy ${acceptanceDecision.policyVersion}: ${acceptanceDecision.rejectionReasons.join('; ')}`
  );
  return { scenario: null, score, issues: rejectionIssues };
}

async function generateConceptSeeds(request: GenerationRequest): Promise<any[]> {
  const resolvedScope = normalizeGenerationScope(request);
  let headlines = '';
  if (request.mode === 'news' && request.newsContext) {
    headlines = request.newsContext.slice(0, 30).map(n => `- ${n.title}`).join('\n');
  }

  const [architectPromptBase, countryContextBlock, countryNote] = await Promise.all([
    getArchitectPromptBase(),
    getCountryContextBlock(request.applicable_countries),
    buildCountryNote(request.applicable_countries),
  ]);
  const scopeOverlay = getScopePromptOverlay(resolvedScope.scopeTier);

  const CANONICAL_METRIC_IDS = [
    'economy', 'public_order', 'health', 'education', 'infrastructure', 'environment',
    'foreign_relations', 'military', 'liberty', 'equality', 'employment', 'innovation',
    'trade', 'energy', 'housing', 'democracy', 'sovereignty', 'immigration',
    'corruption', 'inflation', 'crime', 'bureaucracy', 'approval', 'budget',
    'unrest', 'economic_bubble', 'foreign_influence'
  ].join(', ');

  const prompt = `
    You are 'The Architect'. Generate ${request.count} unique scenario concepts for the '${request.bundle}' bundle.

    DIFFICULTY RATING (1-5):
    - 1 = Routine decision, low stakes, clear best option
    - 2 = Moderate complexity, some trade-offs
    - 3 = Significant dilemma, meaningful consequences either way
    - 4 = High-stakes crisis, all options have serious downsides
    - 5 = Existential threat, no good options, catastrophic potential
    Aim for a spread across difficulty levels. At least one concept should be difficulty 4-5.

    ${headlines ? `News Context (Seed Material):\n${headlines}\n\nINTEGRATION: Transform these news items into country-agnostic, tokenized concepts.` : `Theme: Focus on geopolitical strategies for '${request.bundle}'.`}
    SCOPE TARGET:
    - scopeTier: ${resolvedScope.scopeTier}
    - scopeKey: ${resolvedScope.scopeKey}
    - sourceKind: ${resolvedScope.sourceKind}
    ${resolvedScope.clusterId ? `- clusterId: ${resolvedScope.clusterId}` : ''}
    ${resolvedScope.exclusivityReason ? `- exclusivityReason: ${resolvedScope.exclusivityReason}` : ''}
    ${request.region ? `\nTARGET REGION: ${request.region}. Generate concepts that feel relevant to this region (e.g. small island states, regional dynamics, local stakes).` : ''}
    ${countryNote}

    ${countryContextBlock}

    SCOPE-SPECIFIC GUIDANCE:
    ${scopeOverlay.architect}

    ${architectPromptBase}

    CANONICAL METRIC IDs (use only these for primaryMetrics and secondaryMetrics):
    ${CANONICAL_METRIC_IDS}

    RICH CONCEPT FIELDS — include these in every concept object:
    - primaryMetrics: array of 1–3 metric IDs most directly affected (from canonical list above)
    - secondaryMetrics: array of 0–3 metric IDs secondarily affected (optional but encouraged)
    - actorPattern: one of 'domestic' | 'ally' | 'adversary' | 'border_rival' | 'legislature' | 'cabinet' | 'judiciary' | 'mixed'
      - domestic: internal actor (protest group, industry, regional faction)
      - ally: a friendly foreign power is the central actor
      - adversary: a hostile foreign power is the central actor
      - border_rival: a neighboring rival country is the central actor
      - legislature: {legislature} is the central actor blocking or pushing action
      - cabinet: a cabinet minister or internal faction is the central actor
      - judiciary: courts or rule-of-law tensions are the central actor
      - mixed: multiple actor types are equally central
    - optionShape: one of 'redistribute' | 'regulate' | 'escalate' | 'negotiate' | 'invest' | 'cut' | 'reform' | 'delay'
      - redistribute: moving resources from one group to another
      - regulate: imposing or relaxing rules on an actor
      - escalate: increasing pressure, stakes, or force
      - negotiate: diplomatic or coalition-building action
      - invest: committing budget or effort to build capacity
      - cut: reducing spending, programs, or engagement
      - reform: structural change to an institution or policy
      - delay: deferring a decision with interim measures
    - loopEligible: true if this concept has a multi-act narrative arc (acts 2–5 naturally follow from act 1); false for standalone scenarios

    Return exactly ${request.count} concepts in JSON with fields: concept, theme, severity, difficulty, primaryMetrics, secondaryMetrics, actorPattern, optionShape, loopEligible.
  `;

  const result = await callModel(ARCHITECT_CONFIG, prompt, CONCEPT_SCHEMA, resolvePhaseModel(request.modelConfig, 'architect'));
  const concepts = result?.data?.concepts;
  if (!Array.isArray(concepts) || concepts.length === 0) {
    const providerError = (result as any)?.error;
    throw new Error(
      `[ScenarioEngine] Architect returned no concepts for bundle=${request.bundle}. ` +
      `Provider error: ${providerError || 'empty or invalid concept payload'}`
    );
  }
  return concepts;
}

async function expandConceptToLoop(
  concept: GeneratedConcept,
  bundle: string,
  mode: string,
  request?: { region?: string; regions?: string[]; applicable_countries?: string[]; countryCatalogSource?: CountryCatalogSourceMetadata; modelConfig?: GenerationModelConfig; onAttemptFailed?: GenerationRequest['onAttemptFailed']; scopeTier?: ScenarioScopeTier; scopeKey?: string; clusterId?: string; exclusivityReason?: ScenarioExclusivityReason; sourceKind?: ScenarioSourceKind; lowLatencyMode?: boolean }
): Promise<BundleScenario[]> {
  const bundleOverlay = getBundlePromptOverlay(bundle as BundleId);
  const scopeTier = request?.scopeTier ?? 'universal';
  const scopeKey = request?.scopeKey ?? 'universal';
  const scopeOverlay = getScopePromptOverlay(scopeTier);

  const genConfig = await getGenerationConfig();
  const isStandardDirectDraft = Boolean(genConfig.enable_standard_direct_draft);
  const isPremium = (concept.difficulty ?? 3) >= 4 || concept.loopEligible === true;
  const useStandardPath = Boolean(request?.lowLatencyMode) || (isStandardDirectDraft && !isPremium);
  concept._generationPath = useStandardPath ? 'standard' : 'premium';

  // Load Firebase-managed prompts and supporting data
  const [promptVersions, goldenExamples, drafterPromptBase, reflectionPrompt, architectPromptBase, countryContextBlock, countryNote] = await Promise.all([
    getCurrentPromptVersions(),
    getGoldenExamples(bundle, scopeTier, scopeKey, 2),
    getDrafterPromptBase(),
    getReflectionPrompt(),
    getArchitectPromptBase(),
    getCountryContextBlock(request?.applicable_countries),
    buildCountryNote(request?.applicable_countries),
  ]);

  const regionNote = request?.region ? ` Target region: ${request.region}.` : '';
  const scopeNote = ` Scope tier: ${scopeTier}. Scope key: ${scopeKey}.`;
  const requestedRegions = request?.regions?.length ? request.regions : request?.region ? [request.region] : undefined;

  // Build a synthetic single-act blueprint for the standard path so the rest of the
  // drafting loop can be reused without duplication.
  let blueprint: { acts: Array<{ actIndex: number; title: string; summary: string }> };

  if (useStandardPath) {
    blueprint = {
      acts: [{
        actIndex: 1,
        title: concept.concept.split('.')[0].trim().slice(0, 80),
        summary: concept.concept,
      }]
    };
    console.log(`[ScenarioEngine] Standard path (direct draft) for concept: ${concept.concept.slice(0, 60)}`);
  } else {
    // Premium path: generate full narrative blueprint via Architect
    const blueprintPrompt = `
    Create a ${concept.desiredActs || 3}-act narrative blueprint for this concept: "${concept.concept}" (Severity: ${concept.severity}).
    Bundle: ${bundle}.${regionNote}${scopeNote}${countryNote}

    ${countryContextBlock}

    BUNDLE-SPECIFIC GUIDANCE:
    ${bundleOverlay.architect}

    SCOPE-SPECIFIC GUIDANCE:
    ${scopeOverlay.architect}

    CRITICAL: You must generate EXACTLY ${concept.desiredActs || 3} acts. Do not generate more or less.

    Return a sequence of acts with actIndex, title, and 1-sentence summaries.

    ${architectPromptBase}
  `;

    const blueprintAttemptId = generateAttemptId(bundle, 'blueprint');

    const blueprintResult = await callModel(ARCHITECT_CONFIG, blueprintPrompt, BLUEPRINT_SCHEMA, resolvePhaseModel(request?.modelConfig, 'architect'));
    if (!blueprintResult?.data || !blueprintResult.data.acts) {
      await logGenerationAttempt({
        attemptId: blueprintAttemptId,
        timestamp: Timestamp.now(),
        bundle,
        severity: concept.severity,
        desiredActs: concept.desiredActs || 3,
        promptVersion: promptVersions.architect,
        modelUsed: ARCHITECT_MODEL,
        phase: 'blueprint',
        success: false,
        retryCount: 0,
        failureReasons: ['Blueprint generation failed'],
      });
      throw new Error("Failed to generate blueprint");
    }

    blueprint = blueprintResult.data;

    await logGenerationAttempt({
      attemptId: blueprintAttemptId,
      timestamp: Timestamp.now(),
      bundle,
      severity: concept.severity,
      desiredActs: concept.desiredActs || 3,
      promptVersion: promptVersions.architect,
      modelUsed: ARCHITECT_MODEL,
      phase: 'blueprint',
      success: true,
      retryCount: 0,
    });
  }

  const baseId = `gen_${bundle}_${Date.now().toString(36)}`;
  const blueprintSummary = blueprint.acts.map((a: any) => `Act ${a.actIndex}: ${a.title}`).join(' -> ');
  const MAX_RETRIES = request?.lowLatencyMode
    ? 1
    : Math.max(1, (await getGenerationConfig()).max_llm_repair_attempts);
  const allExpectedIds = blueprint.acts.map((a: any) => `${baseId}_act${a.actIndex}`);

  // 2. Draft All Acts in Parallel (Drafter)
  // allSettled so a single failing act doesn't discard in-flight sibling API calls
  const actSettled = await Promise.allSettled(blueprint.acts.map(async (actPlan: any) => {
    let actScenario: BundleScenario | null = null;
    let lastAuditResult: { scenario: BundleScenario | null; score: number; issues: any[] } | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const attemptId = generateAttemptId(bundle, `act${actPlan.actIndex}`);

      // Build prompt with guard rails first (prevention before writing — reduce token waste)
      const conceptContextBlock = useStandardPath && (concept.primaryMetrics?.length || concept.actorPattern || concept.optionShape)
        ? `\nCONCEPT CONTEXT:\n- Primary metrics affected: ${(concept.primaryMetrics ?? []).join(', ')}\n- Actor pattern: ${concept.actorPattern ?? 'unspecified'}\n- Option shape: ${concept.optionShape ?? 'unspecified'}\n`
        : '';
      const actorTokenRequirementBlock = buildActorTokenRequirement(concept.actorPattern);

      let drafterPrompt = `
      **OUTPUT GUARD RAILS (comply first)**:
      description = 2–3 sentences. Each option text = 2–3 sentences. Each option: 2, 3, or 4 effects only — not 5 or more. title = 4–8 words, no tokens in title.

      Act ${actPlan.actIndex}/${blueprint.acts.length}: "${actPlan.title}"
      Concept: "${concept.concept}"
      Full Loop Arc: ${blueprintSummary}
      Act Summary: ${actPlan.summary}
      Difficulty: ${concept.difficulty || 3}/5 (1=routine, 5=existential crisis)
      ${conceptContextBlock}
      ${actorTokenRequirementBlock ? `${actorTokenRequirementBlock}\n` : ''}
      ${regionNote}${scopeNote}${countryNote}

      ${countryContextBlock}

      ${getLogicParametersPrompt(concept.severity as 'low' | 'medium' | 'high' | 'extreme' | 'critical' | undefined)}
      ${getAuditRulesPrompt()}

      BUNDLE-SPECIFIC GUIDANCE:
      ${bundleOverlay.drafter}

      SCOPE-SPECIFIC GUIDANCE:
      ${scopeOverlay.drafter}

      METADATA REQUIREMENTS:
      - severity: must be one of 'low', 'medium', 'high', 'extreme', 'critical'
      - urgency: must be one of 'low', 'medium', 'high', 'immediate'
      - difficulty: integer 1-5 matching concept difficulty (${concept.difficulty || 3})
      - tags: 2-4 relevant tags for this scenario

      ${drafterPromptBase}
      
      # ⚠️ CRITICAL FINAL REMINDER ⚠️

      **SENTENCE COUNT**: description = 2–3 sentences. Each option text = 2–3 sentences. Count . ? ! — fewer than 2 or more than 3 = REJECTED.

      **EFFECT COUNT**: Each option = 2–4 effects only. Five or more on any option = REJECTED.

      **VOICE (WRONG VOICE = REJECTED)**:
      - description, option text, advisorFeedback → SECOND PERSON: "You face...", "Your administration..."
      - outcomeHeadline, outcomeSummary, outcomeContext → THIRD PERSON (newspaper): "The administration...", "Officials announced..."
      - NEVER "you"/"your" in any outcome field. NEVER "the administration"/"the government" in description or option text.

      **DESCRIPTION**: End with stakes/urgency. NEVER preview the options or write "You must choose/decide between...".
      `;

      // Add failure-specific guidance on retry
      if (attempt > 0 && lastAuditResult) {
        const failureCategory = categorizeFailure(lastAuditResult.issues);
        drafterPrompt += `\n\n# CRITICAL: PREVIOUS ATTEMPT FAILED (Score: ${lastAuditResult.score})\n`;

        if (failureCategory === 'token-violation') {
          const hasNoTokens = lastAuditResult.issues.some((i: any) => i.rule === 'no-tokens');
          if (hasNoTokens) {
            drafterPrompt += `\n**CRITICAL: YOUR SCENARIO HAD NO TOKENS AT ALL**. Every scenario MUST reference government/country tokens. Replace hardcoded names and roles with approved token placeholders:\n  - Country name → {the_player_country} or {the_adversary}\n  - Leader → {leader_title}\n  - Minister → {finance_role}, {defense_role}, {foreign_affairs_role}, etc.\n  - Institutions → {legislature}, {ruling_party}, {judiciary_body}\nAt minimum, every description and every option text MUST contain at least one {token}.\n`;
          } else {
            drafterPrompt += `\n**TOKEN VIOLATION**: You used incorrect tokens or casing. Use only allowed tokens and ensure they are ALL LOWERCASE (e.g., {finance_role}).\n`;
          }
        } else if (failureCategory === 'readability-violation') {
          drafterPrompt += `\n**READABILITY FAILURE**: Rewrite for non-expert players.
- Replace policy jargon with simple words.
- Keep every sentence at 25 words or fewer.
- Keep each sentence to at most 3 conjunction clauses.
- Prefer active voice over passive voice.
- Make labels short direct actions (no "if", "unless", colons, or parentheses).\n`;
        } else if (failureCategory === 'adjacency-token-violation') {
          drafterPrompt += `\n**ADJACENCY TOKEN ERROR**: You used border/neighbor language ("bordering", "neighboring", "border closure", "shared border") with a non-adjacent-country token like {the_adversary} or {the_rival}. These tokens do NOT imply geographic proximity.\n- For a neighboring country: use {the_neighbor} or {the_border_rival}\n- For a non-adjacent rival or adversary: use {the_adversary} or {the_rival}\n- ONLY use border/neighboring/bordering language when combined with {the_neighbor} or {the_border_rival}\nRewrite any sentence mentioning borders or shared frontiers to use the correct token.\n`;
        } else if (failureCategory === 'banned-phrase-violation') {
          drafterPrompt += `\n**BANNED PHRASE ERROR**: Your description or options contained prohibited terms like real country names (e.g. United States) or directional borders. Use only tokens ({the_player_country}, {the_adversary}) and generic terms.\n`;
        } else if (failureCategory === 'tonal-violation') {
          drafterPrompt += `\n**UNPROFESSIONAL TONE**: Your writing style was too casual or blog-like. Use formal, measured, authoritative PRESIDENTIAL BRIEFING style. Avoid: "really bad", "freaking out", "kind of".\n`;
        } else if (failureCategory === 'option-preview-violation') {
          drafterPrompt += `\n**DESCRIPTION ERROR**: You revealed the options too early in the description. The description should establish the crisis/stakes and end with urgency, but NEVER say "You must choose..." or "Your options are...".\n`;
        } else if (failureCategory === 'sentence-length-violation') {
          drafterPrompt += `\n**SENTENCE COUNT ERROR**: DESCRIPTION must be 2–3 sentences (count . ! ?). Each OPTION text must be 2–3 sentences. Do NOT write 1 sentence or more than 3 sentences for description or option text.\n`;
        } else if (failureCategory === 'effect-count-violation') {
          drafterPrompt += `\n**EFFECT COUNT ERROR**: Each option must have 2–4 effects. You used more than 4 on at least one option. Remove or merge effects so every option has exactly 2, 3, or 4 effects.\n`;
        } else if (failureCategory === 'shallow-content') {
          drafterPrompt += `\n**CONTENT TOO SHALLOW**: Add more depth and detail to outcome summaries and context. Keep description and option text to exactly 2 sentences each.\n`;
        } else if (failureCategory === 'inverse-metric-confusion') {
          drafterPrompt += `\n**YOU MISHANDLED INVERSE METRICS**. Remember: POSITIVE values WORSEN corruption/inflation/crime/bureaucracy.\n`;
        } else if (failureCategory === 'missing-advisor-feedback') {
          const missingRoles = [...new Set(
            lastAuditResult.issues
              .filter((i: any) => i.rule === 'missing-role-feedback')
              .map((i: any) => {
                const m = i.message?.match(/Missing feedback for (\S+)/);
                return m?.[1];
              })
              .filter(Boolean)
          )];
          const rolesList = missingRoles.length > 0
            ? `These exact roles are REQUIRED and were missing: ${missingRoles.join(', ')}. Add advisorFeedback entries with those roleIds.`
            : 'Include role_executive + all roles affected by the option\'s effects.';
          drafterPrompt += `\n**YOU FORGOT ADVISOR FEEDBACK**. ${rolesList} Each feedback must name the specific policy from this scenario.\n`;
        } else if (failureCategory === 'advisor-boilerplate') {
          drafterPrompt += `\n**ADVISOR FEEDBACK WAS REJECTED AS BOILERPLATE**. Your feedback was generic template text, not specific to this scenario. EVERY feedback sentence must:
1. Name the SPECIFIC policy action from this option (e.g., "the proposed grain reserve release")
2. Identify the affected constituency (e.g., "smallholder farmers", "border communities")
3. State the causal mechanism (e.g., "reduces export revenue by ~8% but stabilizes domestic supply")

DO NOT USE: "aligns with our priorities", "supports this course of action", "warrants careful monitoring", "our department", "no strong position", "limited direct impact".

Write as if you are a real cabinet minister briefing the head of government on THIS specific decision.\n`;
        } else if (failureCategory === 'hardcoded-gov-structure') {
          drafterPrompt += `\n**HARDCODED GOVERNMENT STRUCTURE DETECTED**: You used parliamentary or government-structure terms that are not valid for all countries. Use tokens instead:\n`;
          drafterPrompt += CONCEPT_TO_TOKEN_MAP
            .slice(0, 8)
            .map(({ concept, token }) => `  - ${concept} → ${token}`)
            .join('\n');
          drafterPrompt += `\n\nNEVER write: "ruling coalition", "governing coalition", "coalition government", "parliamentary majority/minority/support". Use {ruling_party} and {legislature} tokens instead.\n`;
          drafterPrompt += `\nALSO: Never write hardcoded institution names. Use role tokens:\n- "Finance Ministry" / "Treasury Department" → {finance_role}\n- "Justice Ministry" / "Dept of Justice" → {justice_role}\n- "Foreign Ministry" / "State Department" → {foreign_affairs_role}\n- "Defense Ministry" / "Dept of Defense" → {defense_role}\n- "Interior Ministry" / "Home Office" → {interior_role}\n- "Health Ministry" / "Dept of Health" → {health_role}\n- "Education Ministry" / "Dept of Education" → {education_role}\n`;
        } else if (failureCategory === 'token-article-form-violation') {
          drafterPrompt += `\n**TOKEN ARTICLE FORM ERROR**: You wrote "the {token}" which produces broken output like "the a hostile power" at runtime. RULES:
1. NEVER write "the {something}" — use the pre-built article-form token {the_something} instead.
   ❌ "the {adversary}" → ✅ "{the_adversary}"
   ❌ "the {neighbor}" → ✅ "{the_neighbor}"
   ❌ "the {ally}" → ✅ "{the_ally}"
   Valid the_{x} tokens: {the_adversary}, {the_neighbor}, {the_ally}, {the_rival}, {the_neutral}, {the_partner}, {the_trade_partner}, {the_border_rival}, {the_regional_rival}, {the_nation}, {the_player_country}
   If no the_{x} form exists, rewrite the sentence without a definite article before the token.
2. Option LABELS must be plain text — NO tokens. "Blame {the_neighbor}" → "Blame the Neighbor"\n`;
        } else if (failureCategory === 'gdp-as-amount-violation') {
          drafterPrompt += `\n**GDP DESCRIPTION MISUSE**: You used {gdp_description} as if it were a specific stolen or siphoned amount. {gdp_description} resolves to the ENTIRE national GDP — it is a scale descriptor, not a stealable sum. Replace any reference to stealing/siphoning/diverting {gdp_description} with the token {graft_amount}, which auto-scales to a realistic corruption amount for this country's economy.\n`;
        } else if (failureCategory === 'outcome-voice-violation' || failureCategory === 'framing-violation') {
          // Both voice violations can co-occur — inject guidance for each one present
          const issueRules = new Set(lastAuditResult.issues.map((i: any) => i.rule));
          if (issueRules.has('outcome-second-person') || failureCategory === 'outcome-voice-violation') {
            drafterPrompt += `\n**OUTCOME FIELD VOICE ERROR**: Your outcomeHeadline, outcomeSummary, or outcomeContext contained "you" or "your". These three fields are displayed as NEWSPAPER ARTICLES — they must be written in THIRD PERSON, past tense, as a wire reporter covering the decision.
- ❌ "Your administration increased fossil fuel production..." → ✅ "The administration increased fossil fuel production..."
- ❌ "You opted to raise tariffs..." → ✅ "The executive branch opted to raise tariffs..."
- ❌ "Your decision has raised alarms..." → ✅ "The decision has raised alarms..."
Never use "you" or "your" in outcomeHeadline, outcomeSummary, or outcomeContext. Rewrite every sentence from a reporter's perspective.\n`;
          }
          if (issueRules.has('third-person-framing') || failureCategory === 'framing-violation') {
            drafterPrompt += `\n**FRAMING VIOLATION**: Your description or option text used "the government", "the administration", "the president", or "the executive" — these must be rewritten using second-person ("you", "your administration", "your government"). The player IS the government. Refer to them directly with "you"/"your" in description and option text fields.\n`;
          }
        }

        drafterPrompt += `\nFix these issues in this attempt.\n`;
      }

      // Add few-shot examples and reflection
      drafterPrompt = buildDrafterPrompt(drafterPrompt, goldenExamples, reflectionPrompt);

      try {
        const actResult = await callModel(DRAFTER_CONFIG, drafterPrompt, SCENARIO_DETAILS_SCHEMA, resolvePhaseModel(request?.modelConfig, 'drafter'));
        const actDetails = actResult?.data;

        if (!actDetails) {
          await logGenerationAttempt({
            attemptId,
            timestamp: Timestamp.now(),
            bundle,
            severity: concept.severity,
            desiredActs: blueprint.acts.length,
            promptVersion: promptVersions.drafter,
            modelUsed: DRAFTER_MODEL,
            phase: 'details',
            success: false,
            retryCount: attempt,
            failureReasons: ['Model returned null'],
          });
          continue;
        }

        const act: BundleScenario = {
          ...actDetails,
          id: `${baseId}_act${actPlan.actIndex}`,
          phase: 'mid',
          actIndex: actPlan.actIndex,
          metadata: {
            ...actDetails.metadata,
            source: mode as any,
            actorPattern: concept.actorPattern,
            scopeTier,
            scopeKey,
            ...(request?.clusterId ? { clusterId: request.clusterId } : {}),
            ...(request?.exclusivityReason ? { exclusivityReason: request.exclusivityReason } : {}),
            ...(request?.sourceKind ? { sourceKind: request.sourceKind } : {}),
            ...(request?.applicable_countries?.length ? { applicable_countries: request.applicable_countries } : {}),
            ...(requestedRegions?.length ? { region_tags: requestedRegions } : {}),
          }
        };

        // Audit the generated act — skip editorial review for standard-path scenarios (10% always pass through)
        const skipEditorial = Boolean(request?.lowLatencyMode) || (
          useStandardPath
          && Boolean(genConfig.enable_conditional_editorial_review)
          && Math.random() >= 0.1
        );
        lastAuditResult = await auditAndRepair(
          act,
          bundle,
          mode,
          request?.countryCatalogSource ?? { kind: 'firestore', path: 'countries' },
          request?.modelConfig,
          skipEditorial
        );

        if (lastAuditResult.scenario) {
          // Success! Attach audit metadata so it persists to Firestore and the client
          const wasAutoFixed = lastAuditResult.issues.length > 0;
          actScenario = {
            ...lastAuditResult.scenario,
            _generationPath: concept._generationPath,
            metadata: {
              ...lastAuditResult.scenario.metadata,
              auditMetadata: {
                lastAudited: new Date().toISOString(),
                score: lastAuditResult.score,
                issues: lastAuditResult.issues.map((i: any) => i.rule),
                autoFixed: wasAutoFixed,
              },
            },
          };

          await logGenerationAttempt({
            attemptId,
            timestamp: Timestamp.now(),
            bundle,
            severity: concept.severity,
            desiredActs: blueprint.acts.length,
            promptVersion: promptVersions.drafter,
            modelUsed: DRAFTER_MODEL,
            phase: 'details',
            success: true,
            auditScore: lastAuditResult.score,
            retryCount: attempt,
          });

          await updateDailySummary(new Date().toISOString().split('T')[0], {
            attemptId,
            timestamp: Timestamp.now(),
            bundle,
            severity: concept.severity,
            desiredActs: blueprint.acts.length,
            promptVersion: promptVersions.drafter,
            modelUsed: DRAFTER_MODEL,
            phase: 'details',
            success: true,
            auditScore: lastAuditResult.score,
            retryCount: attempt,
          });

          break; // Success, exit retry loop
        } else {
          // Audit failed, log and retry
          const failureCategory = categorizeFailure(lastAuditResult.issues);

          await logGenerationAttempt({
            attemptId,
            timestamp: Timestamp.now(),
            bundle,
            severity: concept.severity,
            desiredActs: blueprint.acts.length,
            promptVersion: promptVersions.drafter,
            modelUsed: DRAFTER_MODEL,
            phase: 'details',
            success: false,
            auditScore: lastAuditResult.score,
            failureReasons: lastAuditResult.issues.map(i => i.rule),
            retryCount: attempt,
          });

          await logFailure({
            failureId: attemptId,
            timestamp: Timestamp.now(),
            bundle,
            severity: concept.severity,
            promptVersion: promptVersions.drafter,
            failureCategory,
            auditScore: lastAuditResult.score,
            auditIssues: lastAuditResult.issues.map(i => ({
              type: i.severity,
              code: i.rule,
              message: i.message,
              impact: i.severity === 'error' ? -12 : -4,
            })),
            rawScenario: act,
            attemptNumber: attempt + 1,
          });

          await updateDailySummary(new Date().toISOString().split('T')[0], {
            attemptId,
            timestamp: Timestamp.now(),
            bundle,
            severity: concept.severity,
            desiredActs: blueprint.acts.length,
            promptVersion: promptVersions.drafter,
            modelUsed: DRAFTER_MODEL,
            phase: 'details',
            success: false,
            auditScore: lastAuditResult.score,
            failureReasons: lastAuditResult.issues.map(i => i.rule),
            retryCount: attempt,
          });

          console.warn(`[ScenarioEngine] Act ${actPlan.actIndex} attempt ${attempt + 1}/${MAX_RETRIES} failed (score: ${lastAuditResult.score}). Issues:`, JSON.stringify(lastAuditResult.issues, null, 2));

          request?.onAttemptFailed?.({
            bundle,
            attempt: attempt + 1,
            maxAttempts: MAX_RETRIES,
            score: lastAuditResult.score,
            topIssues: lastAuditResult.issues.slice(0, 5).map((i: any) => `[${i.severity}] ${i.message}`),
          });

        }
      } catch (error) {
        console.error(`[ScenarioEngine] Error generating Act ${actPlan.actIndex} attempt ${attempt + 1}:`, error);

        await logGenerationAttempt({
          attemptId,
          timestamp: Timestamp.now(),
          bundle,
          severity: concept.severity,
          desiredActs: blueprint.acts.length,
          promptVersion: promptVersions.drafter,
          modelUsed: DRAFTER_MODEL,
          phase: 'details',
          success: false,
          retryCount: attempt,
          failureReasons: ['Exception: ' + (error as Error).message],
        });
      }
    }

    if (!actScenario) {
      throw new Error(`Failed to generate Act ${actPlan.actIndex} after ${MAX_RETRIES} attempts`);
    }

    // Semantic deduplication check (if enabled)
    if (isSemanticDedupEnabled() && !isLMStudioGeneration(request?.modelConfig)) {
      let duplicateOf: string | null = null;
      try {
        const embeddingText = getEmbeddingText(actScenario);
        const embedding = await generateEmbedding(embeddingText);
        const similar = await findSimilarByEmbedding(embedding, bundle, allExpectedIds);
        if (similar) {
          duplicateOf = similar.id;
          console.warn(`[ScenarioEngine] Act ${actPlan.actIndex} rejected: Too similar to existing scenario ${similar.id} (similarity: ${similar.similarity.toFixed(3)})`);
        } else {
          (actScenario as any)._embedding = embedding;
          console.log(`[ScenarioEngine] Act ${actPlan.actIndex} passed semantic uniqueness check`);
        }
      } catch (error: any) {
        console.warn(`[ScenarioEngine] Semantic dedup check failed (non-fatal):`, error.message);
      }
      if (duplicateOf !== null) {
        throw new Error(`Act too similar to existing scenario (ID: ${duplicateOf})`);
      }
    } else if (isSemanticDedupEnabled() && isLMStudioGeneration(request?.modelConfig)) {
      console.log(`[ScenarioEngine] Skipping semantic dedup for ${actScenario.id} because LM Studio generation does not provide embedding-based dedup`);
    }

    return actScenario;
  }));

  const loop: BundleScenario[] = [];
  for (const result of actSettled) {
    if (result.status === 'fulfilled' && result.value !== null) {
      loop.push(result.value);
    } else if (result.status === 'rejected') {
      console.error(`[ScenarioEngine] Act failed in parallel batch:`, result.reason);
    }
  }
  return loop;
}

// ------------------------------------------------------------------
// Utility Functions
// ------------------------------------------------------------------

/**
 * Fetch golden examples for few-shot learning
 */
async function getGoldenExamples(bundle: string, scopeTier: ScenarioScopeTier, scopeKey: string, limit: number = 2): Promise<BundleScenario[]> {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    const db = admin.firestore();

    let snapshot;
    try {
      snapshot = await db.collection('training_scenarios')
        .where('bundle', '==', bundle)
        .where('isGolden', '==', true)
        .where('scopeTier', '==', scopeTier)
        .orderBy('auditScore', 'desc')
        .limit(Math.max(limit * 4, 8))
        .get();
    } catch (scopeQueryError) {
      console.warn(`[ScenarioEngine] Scope-filtered golden example query failed for ${bundle}/${scopeTier}:`, scopeQueryError);
      snapshot = await db.collection('training_scenarios')
        .where('bundle', '==', bundle)
        .where('isGolden', '==', true)
        .orderBy('auditScore', 'desc')
        .limit(Math.max(limit * 6, 12))
        .get();
    }

    if (snapshot.empty) {
      console.log(`[ScenarioEngine] No golden examples found for bundle: ${bundle}`);
      return [];
    }

    const examples = snapshot.docs.map((doc: any) => doc.data() as BundleScenario);
    const prioritizedExamples = examples.sort((left: BundleScenario, right: BundleScenario) => {
      const leftMeta: any = left.metadata ?? {};
      const rightMeta: any = right.metadata ?? {};
      const leftExact = leftMeta.scopeKey === scopeKey ? 1 : 0;
      const rightExact = rightMeta.scopeKey === scopeKey ? 1 : 0;
      if (leftExact !== rightExact) return rightExact - leftExact;
      return 0;
    });
    const selected: BundleScenario[] = [];
    const usedChainIds = new Set<string>();
    const usedLanes = new Set<string>();

    const buildLane = (scenario: BundleScenario): string => {
      const metadata: any = scenario.metadata ?? {};
      return [
        metadata.severity ?? 'unknown',
        metadata.difficulty ?? 'unknown',
        metadata.scopeTier ?? 'universal',
        metadata.scopeKey === scopeKey ? 'exact-scope' : 'adjacent-scope',
      ].join('|');
    };

    const addScenario = (scenario: BundleScenario): boolean => {
      const chainId = (scenario as any).chainId ?? String(scenario.id).replace(/_act\d+$/i, '');
      if (usedChainIds.has(chainId) || selected.length >= limit) {
        return false;
      }
      usedChainIds.add(chainId);
      selected.push(scenario);
      return true;
    };

    for (const scenario of prioritizedExamples) {
      const lane = buildLane(scenario);
      if (usedLanes.has(lane)) continue;
      if (addScenario(scenario)) {
        usedLanes.add(lane);
      }
    }

    for (const scenario of prioritizedExamples) {
      if (selected.length >= limit) break;
      addScenario(scenario);
    }

    return selected;
  } catch (error) {
    console.error('[ScenarioEngine] Error fetching golden examples:', error);
    return [];
  }
}

/**
 * Legacy callModel export for backward compatibility
 * Routes through model-providers.ts OpenAI-only system
 */
export async function callModel(config: ModelConfig, prompt: string, schema: any, modelOverride?: string): Promise<any> {
  // Return the full CallResult object to maintain compatibility
  // Calling code expects result.data or result.data.field patterns
  return await callModelProvider(config, prompt, schema, modelOverride);
}

/**
 * Validate loop completion and structure
 * Ensures loops are complete narratives before saving
 */
function validateLoopComplete(loop: BundleScenario[], expectedLength: number): { valid: boolean; reason?: string } {
  if (loop.length === 0) {
    return { valid: false, reason: 'Empty loop' };
  }

  if (loop.length !== expectedLength) {
    return { valid: false, reason: `Incomplete loop: expected ${expectedLength} acts, got ${loop.length}` };
  }

  // Check phases
  if (loop[0].phase !== 'root') {
    return { valid: false, reason: 'First act must be phase: root' };
  }

  // Final act check (only applies if length > 1, or if we want standalone to be final)
  // Decision: 1-act loops are 'root' and pass. Longer loops must end in 'final'.
  if (loop.length > 1 && loop[loop.length - 1].phase !== 'final') {
    return { valid: false, reason: 'Last act must be phase: final' };
  }

  // Check chaining
  for (let i = 0; i < loop.length - 1; i++) {
    const act = loop[i];
    if (!act.chainsTo || act.chainsTo.length === 0) {
      return { valid: false, reason: `Act ${i + 1} missing chainsTo field` };
    }
    if (act.chainsTo[0] !== loop[i + 1].id) {
      return { valid: false, reason: `Act ${i + 1} chains to wrong scenario` };
    }
  }

  // Check consequence chains at option level
  for (let i = 0; i < loop.length - 1; i++) {
    const act = loop[i];
    for (const option of act.options) {
      if (!(option as any).consequenceScenarioIds || (option as any).consequenceScenarioIds.length === 0) {
        return { valid: false, reason: `Act ${i + 1} option ${option.id} missing consequenceScenarioIds` };
      }
    }
  }

  return { valid: true };
}

function normalizeLoopStructure(loop: BundleScenario[]) {
  if (loop.length === 0) return;

  loop.sort((a, b) => (a.actIndex || 0) - (b.actIndex || 0));

  // Generate chainId for this loop
  const chainId = loop[0]?.id?.split('_act')[0] || `chain_${Date.now().toString(36)}`;

  loop.forEach((act, idx) => {
    // Force phases
    if (idx === 0) act.phase = 'root';
    else if (idx === loop.length - 1) act.phase = 'final';
    else act.phase = 'mid';

    // Force actIndex consistency
    act.actIndex = idx + 1;

    // Add chainId for loop grouping
    (act as any).chainId = chainId;

    // Force chaining at scenario level
    if (idx < loop.length - 1) {
      act.chainsTo = [loop[idx + 1].id];
    } else {
      act.chainsTo = [];
    }

    // Add consequence chains at option level (links options to next act)
    if (idx < loop.length - 1) {
      const nextActId = loop[idx + 1].id;
      const consequenceDelay = 2; // Default: consequence triggers 2 turns later

      act.options = act.options.map(option => ({
        ...option,
        consequenceScenarioIds: [nextActId],
        consequenceDelay
      }));

      console.log(`[LoopStructure] Act ${act.actIndex}: Wired consequence chains → ${nextActId} (delay: ${consequenceDelay})`);
    }
  });

  console.log(`[LoopStructure] Normalized ${loop.length}-act loop with chainId: ${chainId}`);
}

function collapseLoopToStandalone(loop: BundleScenario[]): BundleScenario[] {
  if (loop.length === 0) return [];

  const rootScenario: BundleScenario = {
    ...loop[0],
    phase: 'root',
    actIndex: 1,
    chainsTo: [],
    options: loop[0].options.map((option) => {
      const normalizedOption = { ...option } as any;
      normalizedOption.consequenceScenarioIds = [];
      delete normalizedOption.consequenceDelay;
      return normalizedOption;
    }),
  };

  return [rootScenario];
}

function buildLoopLengthPlan(count: number, config?: any): number[] {
  // Fixed mode: all scenarios share one act count (capped at 3)
  if (config?.mode === 'fixed' && config?.loopLength) {
    return Array(count).fill(Math.min(3, config.loopLength));
  }

  // Custom mode: weighted by explicit percentages (only 1–3 act keys used)
  if (config?.mode === 'custom' && config?.customDistribution) {
    const dist = config.customDistribution;
    const plan: number[] = [];
    const keys = ['1-act', '2-act', '3-act'] as const;

    keys.forEach(key => {
      const percentage = dist[key] || 0;
      const amount = Math.round((percentage / 100) * count);
      const acts = parseInt(key.split('-')[0]);
      for (let i = 0; i < amount; i++) plan.push(acts);
    });

    while (plan.length < count) plan.push(1);
    return plan.slice(0, count).sort(() => Math.random() - 0.5);
  }

  if (!config || config.mode === 'auto') {
    return Array(count).fill(1);
  }

  // Legacy weighted mode: preserved for explicit gameLength-based configs.
  const GAME_LENGTH_WEIGHTS: Record<string, number[]> = {
    short:  [1, 1, 1, 1, 1, 1, 2, 2, 2, 3],
    medium: [1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
    long:   [1, 1, 2, 2, 3, 3, 3, 3, 3, 3],
  };
  const gameLength = config?.gameLength || 'medium';
  const weightedOptions = GAME_LENGTH_WEIGHTS[gameLength] ?? GAME_LENGTH_WEIGHTS.medium;
  return Array.from({ length: count }, () => weightedOptions[Math.floor(Math.random() * weightedOptions.length)]);
}

