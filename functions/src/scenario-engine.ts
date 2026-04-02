import { NewsItem } from './types';
import { getLogicParametersPrompt, METRIC_IDS } from './lib/logic-parameters';
import { normalizeTokenAliases, CONCEPT_TO_TOKEN_MAP, isValidToken, buildCompactTokenPromptSection, preResolveTokenContext } from './lib/token-registry';
import { getRegionForCountry } from './data/schemas/regions';
import {
  auditScenario,
  deterministicFix,
  heuristicFix,
  scoreScenario,
  BundleScenario,
  getAuditRulesPrompt,
  getCompactAuditRulesPrompt,
  isValidBundleId,
  initializeAuditConfig,
  normalizeScenarioTextFields,
  repairTextIntegrity,
  getAuditConfig,
} from './lib/audit-rules';
import { classifyIssueRemediation, classifyRepairActions, type RepairAction } from './lib/issue-classification';
import {
  assertRequestedCountryIdsAvailable,
  loadCountryCatalog,
  type CountryCatalogSourceMetadata,
} from './lib/country-catalog';
import { getSeedConcepts, deduplicateAndDiversifyConcepts, persistAcceptedConcept, type ConceptSeed } from './lib/concept-seeds';
import { ALL_BUNDLE_IDS, type BundleId } from './data/schemas/bundleIds';
import {
  logGenerationAttempt,
  logFailure,
  categorizeFailure,
  updateDailySummary,
  generateAttemptId
} from './lib/prompt-performance';
import {
  buildArchitectPrompt,
  buildDrafterPrompt,
  getBundlePromptOverlay,
  getScopePromptOverlay,
  getCompactDrafterPromptBase,
  getCurrentPromptVersions,
  getDrafterPromptBase,
  getReflectionPrompt,
  getArchitectPromptBase,
  getOllamaSkeletonPrompt,
  getOllamaEffectsPrompt,
} from './lib/prompt-templates';
import { Timestamp } from 'firebase-admin/firestore';
import { callModelProvider, setModelEventHandler, aggregateCosts, type ModelConfig, type ModelEvent, type TokenUsage } from './lib/model-providers';
import { getRecentScenarioSummaries, getThemeDistribution } from './storage';

// Engine-level event handler (set by local runner for real-time Firestore logging)
type EngineEventHandler = (event: ModelEvent) => void;
let _engineEventHandler: EngineEventHandler | null = null;
export function setEngineEventHandler(fn: EngineEventHandler | null): void {
  _engineEventHandler = fn;
  setModelEventHandler(fn);
}
function emitEngineEvent(event: ModelEvent): void {
  if (_engineEventHandler) {
    try { _engineEventHandler(event); } catch { /* never throw */ }
  }
}
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
  suggestEffectCorrections,
  groundingIssueToAuditIssue,
} from './lib/grounded-effects';
import {
  getModelFamily,
  isOllamaGeneration,
  isOllamaModel,
  resolvePhaseModel,
  type GenerationModelConfig,
} from './lib/generation-models';
import { normalizeGenerationScopeInput } from './lib/generation-scope';
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
  triggerConditions?: Array<{ metricId: string; min?: number; max?: number }>;
  optionDomains?: Array<{ label: string; primaryMetric: string }>;
  _generationPath?: 'standard' | 'premium';
};
// 
// Strategy:
//   - Architect (concepts/blueprints): GPT-4o-mini
//   - Drafter (scenarios): GPT-4o-mini
//   - Deduplication: text-embedding-3-small
// ------------------------------------------------------------------
// Model configurations for generation phases
// Token limits increased from 8K to accommodate complex scenarios with detailed outcomes
const ARCHITECT_CONFIG: ModelConfig = { maxTokens: 4096, temperature: 0.6 };
// Drafter uses ~14K input + 3K output tokens; under Tier 1 rate limits concurrent
// calls regularly take 60-120s and can exceed 120s when throttled. 300s keeps the
// call alive while staying well within the Cloud Function's 540s budget.
const DRAFTER_CONFIG: ModelConfig = { maxTokens: 10240, temperature: 0.4, timeoutMs: 300000 };
// Split-phase configs for Ollama — no artificial output caps.
// Core phase generates title + description + 3 full options with outcomes.
// Advisor phase generates 39 advisor feedback entries.
// Temperature matches OpenAI drafter (0.4) for vivid, varied writing.
const OLLAMA_ADVISOR_CONFIG: ModelConfig = { maxTokens: 4096, temperature: 0.2, timeoutMs: 180000, noThink: true };
const REPAIR_CONFIG: ModelConfig = { maxTokens: 8192, temperature: 0.3 };

interface ResolvedGenerationScope {
  scopeTier: ScenarioScopeTier;
  scopeKey: string;
  clusterId?: string;
  exclusivityReason?: ScenarioExclusivityReason;
  sourceKind: ScenarioSourceKind;
  regions: string[];
  applicableCountries?: string[];
}

function buildActorTokenRequirement(actorPattern?: GeneratedConcept['actorPattern'], scopeTier?: ScenarioScopeTier): string {
  if (scopeTier === 'universal') return '';
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

function normalizeGenerationScope(request: Pick<GenerationRequest, 'mode' | 'region' | 'regions' | 'scopeTier' | 'scopeKey' | 'clusterId' | 'exclusivityReason' | 'sourceKind' | 'applicable_countries'>): ResolvedGenerationScope {
  const normalized = normalizeGenerationScopeInput(request);
  if (!normalized.ok || !normalized.value) {
    throw new Error(`[ScenarioEngine] ${normalized.error ?? 'Invalid generation scope.'}`);
  }

  return {
    scopeTier: normalized.value.scopeTier,
    scopeKey: normalized.value.scopeKey,
    clusterId: normalized.value.clusterId,
    exclusivityReason: normalized.value.exclusivityReason,
    sourceKind: normalized.value.sourceKind,
    regions: normalized.value.regions,
    applicableCountries: normalized.value.applicable_countries,
  };
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
  ollama_concept_dedup?: boolean;
  ollama_base_url?: string;
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
    narrative_review_enabled: raw.narrative_review_enabled ?? true,
    max_llm_repair_attempts: raw.max_llm_repair_attempts ?? 3,
    max_active_scenarios_per_bundle: raw.max_active_scenarios_per_bundle ?? 500,
    enable_funnel_telemetry: raw.enable_funnel_telemetry ?? true,
    enable_standard_direct_draft: raw.enable_standard_direct_draft ?? false,
    enable_conditional_editorial_review: raw.enable_conditional_editorial_review ?? false,
    enable_concept_novelty_gate: raw.enable_concept_novelty_gate ?? false,
    ollama_concept_dedup: raw.ollama_concept_dedup ?? true,
  };
  _generationConfigFetchedAt = now;
  return _generationConfigCache;
}

// Cost tracking
interface CostMetrics {
  openai: { input_tokens: number; output_tokens: number; cost_usd: number };
  ollama: { input_tokens: number; output_tokens: number; cost_usd: number };
  total_usd: number;
}

let sessionCosts: CostMetrics = {
  openai: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
  ollama: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
  total_usd: 0
};

export function getSessionCosts(): CostMetrics {
  return { ...sessionCosts };
}

export function resetSessionCosts(): void {
  sessionCosts = {
    openai: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
    ollama: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
    total_usd: 0
  };
}

export interface TokenSummary {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  callCount: number;
}

export interface GenerationResult {
  scenarios: BundleScenario[];
  tokenSummary: TokenSummary;
}

function createTokenAccumulator(): { usages: TokenUsage[]; handler: (event: ModelEvent) => void } {
  const usages: TokenUsage[] = [];
  return {
    usages,
    handler: (event: ModelEvent) => {
      if (event.code === 'llm_response' && event.data) {
        usages.push({
          inputTokens: (event.data.inputTokens as number) || 0,
          outputTokens: (event.data.outputTokens as number) || 0,
          provider: (event.data.provider as 'openai' | 'ollama') || 'openai',
          model: (event.data.model as string) || '',
        });
      }
      if (_engineEventHandler) {
        try { _engineEventHandler(event); } catch { /* never throw */ }
      }
    },
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
  const tokenHintsLine = (() => {
    const tags = [...geoTags];
    const hints: string[] = [];
    if (tags.some(t => /oil|petroleum|fossil|energy_export/i.test(t))) {
      hints.push('{major_industry} typically resolves to oil & gas or petrochemicals for these countries');
    } else if (tags.some(t => /tourism/i.test(t))) {
      hints.push('{major_industry} typically resolves to tourism and hospitality for these countries');
    } else if (tags.some(t => /manufacturing|industrial/i.test(t))) {
      hints.push('{major_industry} typically resolves to manufacturing and exports for these countries');
    } else if (tags.some(t => /agri/i.test(t))) {
      hints.push('{major_industry} typically resolves to agriculture for these countries');
    } else if (tags.some(t => /tech|innovation/i.test(t))) {
      hints.push('{major_industry} typically resolves to technology for these countries');
    } else if (tags.some(t => /mining|mineral|resource/i.test(t))) {
      hints.push('{major_industry} typically resolves to mining and natural resources for these countries');
    } else if (tags.some(t => /financ|banking/i.test(t))) {
      hints.push('{major_industry} typically resolves to financial services for these countries');
    }
    return hints.length > 0 ? `Token resolution hints: ${hints.join('. ')}.` : '';
  })();
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
${tokenHintsLine}
${vulnLine}
${strengthsLine}
${proportionalGuidance}

CRITICAL GEOPOLITICAL RULES:
- Use only tokens for country/leader/institution names (e.g. {the_player_country}, {the_adversary}, {leader_title}, {legislature}, {ruling_party}).
- If any target country has an authoritarian or totalitarian governmentCategory, do NOT generate standard democratic election or coalition-politics scenarios for them.
- If any target country has tags like 'oil_exporter' or 'resources', preferentially include energy/resources-related stakes and effects.
- If any target country has tags like 'nuclear_state', use nuclear deterrence/escalation themes sparingly and realistically — no instant apocalypse.
- If any target country has tags like 'conflict_zone' or 'post_conflict', border tension, refugee flows, and security dilemmas are appropriate.
- When writing about {major_industry} or {the_major_industry}, use the geopolitical tag context above to write sector-specific language. For example, if tags include 'oil_exporter', don't write "Your {major_industry} faces pressure" — write "Your {major_industry} faces a sustained drop in export demand as buyer nations accelerate energy transition". The token stays generic; the surrounding narrative must be specific.

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
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
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
          loopEligible: { type: 'boolean' },
          optionDomains: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                primaryMetric: { type: 'string' }
              },
              required: ['label', 'primaryMetric']
            }
          },
          triggerConditions: {
            type: 'array',
            maxItems: 2,
            items: {
              type: 'object',
              properties: {
                metricId: { type: 'string' },
                min: { type: 'number' },
                max: { type: 'number' }
              },
              required: ['metricId']
            }
          }
        },
        required: ['concept', 'theme', 'severity', 'difficulty', 'actorPattern', 'optionShape', 'primaryMetrics']
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
              required: ['targetMetricId', 'value', 'type', 'duration', 'probability']
            }
          },
          policyImplications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                target: {
                  type: 'string',
                  enum: [
                    'fiscal.taxIncome', 'fiscal.taxCorporate',
                    'fiscal.spendingMilitary', 'fiscal.spendingInfrastructure', 'fiscal.spendingSocial',
                    'policy.economicStance', 'policy.socialSpending', 'policy.defenseSpending',
                    'policy.environmentalPolicy', 'policy.tradeOpenness', 'policy.immigration',
                    'policy.environmentalProtection', 'policy.healthcareAccess',
                    'policy.educationFunding', 'policy.socialWelfare'
                  ]
                },
                delta: { type: 'number', minimum: -15, maximum: 15 }
              },
              required: ['target', 'delta']
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
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        urgency: { type: 'string', enum: ['low', 'medium', 'high', 'immediate'] },
        difficulty: { type: 'integer', minimum: 1, maximum: 5 },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['severity', 'urgency', 'difficulty']
    },
    conditions: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        properties: {
          metricId: { type: 'string' },
          min: { type: 'number' },
          max: { type: 'number' }
        },
        required: ['metricId']
      }
    },
    relationship_conditions: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          relationshipId: { type: 'string', enum: ['adversary', 'ally', 'trade_partner', 'partner', 'rival', 'border_rival', 'regional_rival', 'neutral', 'nation'] },
          min: { type: 'number', minimum: -100, maximum: 100 },
          max: { type: 'number', minimum: -100, maximum: 100 }
        },
        required: ['relationshipId']
      }
    }
  },
  required: ['title', 'description', 'options', 'metadata']
};

// Decomposed Ollama sub-phase schemas
// Phase A: skeleton — title, description, 3 options with text/label only (~800 tokens output)
const SCENARIO_SKELETON_SCHEMA = {
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
        },
        required: ['id', 'text', 'label']
      }
    }
  },
  required: ['title', 'description', 'options']
};

// Phase B: effects & outcomes for each option (~1500 tokens output)
const SCENARIO_EFFECTS_SCHEMA = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
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
              required: ['targetMetricId', 'value', 'type', 'duration', 'probability']
            }
          },
          policyImplications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                target: {
                  type: 'string',
                  enum: [
                    'fiscal.taxIncome', 'fiscal.taxCorporate',
                    'fiscal.spendingMilitary', 'fiscal.spendingInfrastructure', 'fiscal.spendingSocial',
                    'policy.economicStance', 'policy.socialSpending', 'policy.defenseSpending',
                    'policy.environmentalPolicy', 'policy.tradeOpenness', 'policy.immigration',
                    'policy.environmentalProtection', 'policy.healthcareAccess',
                    'policy.educationFunding', 'policy.socialWelfare'
                  ]
                },
                delta: { type: 'number', minimum: -15, maximum: 15 }
              },
              required: ['target', 'delta']
            }
          },
          outcomeHeadline: { type: 'string' },
          outcomeSummary: { type: 'string' },
          outcomeContext: { type: 'string' },
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
        required: ['id', 'effects', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext', 'is_authoritarian', 'moral_weight']
      }
    }
  },
  required: ['options']
};

// Decomposed Ollama configs — smaller context windows per sub-phase
const OLLAMA_SKELETON_CONFIG: ModelConfig = { maxTokens: 4096, temperature: 0.5, timeoutMs: 300000, noThink: true };
const OLLAMA_EFFECTS_CONFIG: ModelConfig = { maxTokens: 6144, temperature: 0.3, timeoutMs: 540000, noThink: true };

// Phase 2: advisor feedback for all 3 options (~2700 tokens output)
const ADVISOR_FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    advisorsByOption: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          optionId: { type: 'string' },
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
          }
        },
        required: ['optionId', 'advisorFeedback']
      }
    }
  },
  required: ['advisorsByOption']
};

function buildAdvisorFeedbackPrompt(coreScenario: { title: string; description: string; options: Array<{ id: string; text: string; label: string }> }): string {
  const optionsSummary = coreScenario.options.map(o => `- Option "${o.id}" (${o.label}): ${o.text}`).join('\n');
  return `Generate JSON only for advisor feedback.

SCENARIO: "${coreScenario.title}"
${coreScenario.description}

OPTIONS:
${optionsSummary}

Generate advisor feedback for ALL 13 advisors for EACH option.

ADVISORS:
- role_executive: Chief of Staff — political feasibility, presidential authority
- role_diplomacy: Secretary of State — foreign relations, international law, diplomacy
- role_defense: Secretary of Defense — military readiness, national security
- role_economy: Secretary of the Treasury — fiscal impact, macroeconomic effects
- role_justice: Attorney General — legal authority, constitutional constraints
- role_health: Secretary of Health — public health impact, healthcare system
- role_commerce: Secretary of Commerce — business impact, trade, competitiveness
- role_labor: Secretary of Labor — workforce effects, employment
- role_interior: Secretary of the Interior — federal lands, infrastructure
- role_energy: Secretary of Energy — energy policy, grid stability
- role_environment: EPA Administrator — environmental impact, regulatory compliance
- role_transport: Secretary of Transportation — logistics, infrastructure
- role_education: Secretary of Education — education system, youth impact

RULES:
- Each feedback must be 1 sentence, concise, and specific to THIS scenario
- Prefer 12-28 words per feedback
- No generic boilerplate
- Reference one concrete domain concern per advisor
- Stances must vary realistically across each option
- Return only JSON matching the schema`;
}

// ------------------------------------------------------------------
// Main Entry Point
// ------------------------------------------------------------------

export interface GenerationRequest {
  mode: 'news' | 'manual' | 'blitz';
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
    advisorModel?: string;
    repairModel?: string;
    contentQualityModel?: string;
    narrativeReviewModel?: string;
    embeddingModel?: string;
  };
  /** Called after each failed generation attempt so callers can surface live audit failure detail. */
  onAttemptFailed?: (info: { bundle: string; attempt: number; maxAttempts: number; score: number; topIssues: string[] }) => void;
  /** Called after each scenario passes acceptance, with full metadata applied. Enables incremental saves. */
  onScenarioAccepted?: (scenario: BundleScenario) => Promise<void>;
  lowLatencyMode?: boolean;
  /** Pre-seeded concepts to use instead of calling the architect model. Skips the architect LLM phase entirely. */
  preSeededConcepts?: GeneratedConcept[];
}

export async function generateScenarios(request: GenerationRequest): Promise<GenerationResult> {
  if (!isValidBundleId(request.bundle)) {
    throw new Error(`Invalid bundle: ${request.bundle}. Valid bundles: ${ALL_BUNDLE_IDS.join(', ')}`);
  }

  const accumulator = createTokenAccumulator();
  setModelEventHandler(accumulator.handler);

  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();
  await initializeAuditConfig(db);
  const countryCatalog = await loadCountryCatalog(db);

  const genConfig = await getGenerationConfig();
  if (genConfig.ollama_base_url && !process.env.OLLAMA_BASE_URL) {
    process.env.OLLAMA_BASE_URL = genConfig.ollama_base_url;
  }
  const resolvedScope = normalizeGenerationScope(request);
  const isDeployedFunction = !process.env.FUNCTIONS_EMULATOR && Boolean(process.env.K_SERVICE);
  const isOllama = isOllamaGeneration(request.modelConfig);
  const isBulkSafeMode = request.lowLatencyMode ?? isOllama ?? (isDeployedFunction && request.count <= 1);

  // Concept-level concurrency: how many concepts to expand in parallel per bundle
  // Combined with max_bundle_concurrency in background-jobs.ts:
  // Total concurrent API calls = max_bundle_concurrency × concept_concurrency
  const configuredConcurrency = request.concurrency ?? genConfig.concept_concurrency;
  const CONCURRENCY = isOllama ? 1 : (isBulkSafeMode ? 1 : configuredConcurrency);
  console.log(`[ScenarioEngine] Generation: Bundle=${request.bundle}, Mode=${request.mode}, Concurrency=${CONCURRENCY}${isOllama ? ' (Ollama — sequential)' : ''}${isBulkSafeMode ? ' (bulk-safe)' : ''}`);
  emitEngineEvent({ level: 'info', code: 'engine_started', message: `Bundle=${request.bundle} Mode=${request.mode}${isOllama ? ' via Ollama (sequential)' : ''}`, data: { bundle: request.bundle, mode: request.mode, concurrency: CONCURRENCY, isOllama } });

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
  const effectiveRequest = isBulkSafeMode && !request.lowLatencyMode
    ? { ...request, lowLatencyMode: true }
    : request;
  let rawConcepts = request.preSeededConcepts && request.preSeededConcepts.length > 0
    ? request.preSeededConcepts
    : await generateConceptSeeds(effectiveRequest);

  // Concept deduplication and diversity enforcement (M5)
  if (isOllama && genConfig.ollama_concept_dedup !== false && rawConcepts.length > 0) {
    const dedupInput = rawConcepts.map(c => ({
      bundle: request.bundle,
      concept: c.concept,
      theme: c.theme,
      severity: c.severity,
      difficulty: c.difficulty ?? 3,
      primaryMetrics: c.primaryMetrics,
      actorPattern: c.actorPattern,
      optionShape: c.optionShape,
    } as ConceptSeed));
    const deduped = await deduplicateAndDiversifyConcepts(
      dedupInput,
      request.bundle,
      resolvedScope.scopeTier,
      resolvedScope.scopeKey
    );
    rawConcepts = deduped.map((d, i) => ({ ...rawConcepts[i], ...d }));
  }

  const loopPlan = buildLoopLengthPlan(rawConcepts.length, request.distributionConfig);
  const concepts = rawConcepts.map((c, i) => ({ ...c, desiredActs: loopPlan[i] || 3 }));

  const allProduced: BundleScenario[] = [];
  let completedCount = 0;

  // 2. PHASE 2 & 3: Parallel Loop Expansion (batches of CONCURRENCY)
  const expandConcept = async (concept: any, idx: number): Promise<BundleScenario[]> => {
    console.log(`[ScenarioEngine] Expanding concept ${idx + 1}/${concepts.length}: ${concept.concept}`);
    emitEngineEvent({ level: 'info', code: 'concept_expand', message: `Concept ${idx + 1}/${concepts.length} — ${concept.concept.slice(0, 120)}`, data: { idx: idx + 1, total: concepts.length, desiredActs: concept.desiredActs } });

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
      emitEngineEvent({ level: 'success', code: 'loop_validated', message: `Loop validated — ${validatedLoop.length} act(s), chainId: ${(validatedLoop[0] as any).chainId}`, data: { acts: validatedLoop.length } });
      return validatedLoop;
    };

    try {
      const first = await runAttempt();
      if (first.length > 0) return first;
      console.warn(`[ScenarioEngine] Concept ${idx + 1} yielded no scenarios on attempt 1, retrying...`);
      emitEngineEvent({ level: 'warning', code: 'concept_retry', message: `Concept ${idx + 1} yielded no scenarios, retrying`, data: { idx: idx + 1 } });
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

  // Derive region_tags from explicit regions or from applicable_countries.
  // Computed before the batch loop so it can be applied to each scenario as it's accepted.
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

  const enrichScenario = (scenario: BundleScenario): BundleScenario => ({
    ...scenario,
    metadata: {
      ...scenario.metadata,
      bundle: request.bundle,
      scopeTier: resolvedScope.scopeTier,
      scopeKey: resolvedScope.scopeKey,
      ...(resolvedScope.clusterId ? { clusterId: resolvedScope.clusterId } : {}),
      ...(resolvedScope.exclusivityReason ? { exclusivityReason: resolvedScope.exclusivityReason } : {}),
      sourceKind: resolvedScope.sourceKind,
      difficulty: scenario.metadata?.difficulty || 3,
      ...(resolvedScope.applicableCountries?.length ? { applicable_countries: resolvedScope.applicableCountries } : {}),
      ...(derivedRegionTags.length ? { region_tags: derivedRegionTags } : {}),
    },
  });

  // Process in parallel batches. Enrich each scenario with final metadata immediately
  // after its batch completes, then invoke the optional onScenarioAccepted callback so
  // callers can persist scenarios incrementally rather than waiting for the full batch.
  for (let batchStart = 0; batchStart < concepts.length; batchStart += CONCURRENCY) {
    const batch = concepts.slice(batchStart, batchStart + CONCURRENCY);
    console.log(`[ScenarioEngine] Processing batch ${Math.floor(batchStart / CONCURRENCY) + 1}/${Math.ceil(concepts.length / CONCURRENCY)} (${batch.length} concepts in parallel)`);
    const batchResults = await Promise.all(
      batch.map((concept, i) => expandConcept(concept, batchStart + i))
    );
    for (let bi = 0; bi < batchResults.length; bi++) {
      const results = batchResults[bi];
      const conceptIdx = batchStart + bi;
      const concept = concepts[conceptIdx];
      const enriched = results.map(enrichScenario);
      allProduced.push(...enriched);
      if (request.onScenarioAccepted) {
        for (const s of enriched) {
          await request.onScenarioAccepted(s);
        }
      }
      if (enriched.length > 0 && concept) {
        persistAcceptedConcept({
          bundle: request.bundle,
          concept: concept.concept,
          theme: concept.theme,
          severity: concept.severity,
          difficulty: concept.difficulty ?? 3,
          primaryMetrics: concept.primaryMetrics,
          actorPattern: concept.actorPattern,
          optionShape: concept.optionShape,
        }, request.bundle).catch(() => {});
      }
    }
  }

  const scenarios = allProduced;

  const costs = aggregateCosts(accumulator.usages);
  const tokenSummary: TokenSummary = {
    inputTokens: costs.openai.inputTokens + costs.ollama.inputTokens,
    outputTokens: costs.openai.outputTokens + costs.ollama.outputTokens,
    costUsd: Math.round(costs.totalUsd * 10000) / 10000,
    callCount: accumulator.usages.length,
  };

  setModelEventHandler(_engineEventHandler);

  return { scenarios, tokenSummary };
}

// ------------------------------------------------------------------
// LLM Repair — Targeted Action System
// ------------------------------------------------------------------

const REPAIR_ACTION_PROMPTS: Record<string, string> = {
  'text-expansion': `Expand the flagged fields to meet minimum length requirements.
Add mechanism details, affected groups, institutional reactions, or market impacts.
Do not change the meaning or tone — only add substantive content.
CRITICAL: Return the COMPLETE expanded text for each field, not just the added portion.
The returned text must be LONGER than the original — never truncate.`,

  'token-fix': `Fix token usage errors:
- "the {X}" → "{the_X}" (e.g. "the {adversary}" → "{the_adversary}")
- Sentence-opening "{X}" → "{the_X}" when an article-form token exists
- Replace hardcoded currency names with {currency} token
- Replace {gdp_description} used as a monetary amount with {graft_amount}, {trade_value}, etc.`,

  'advisor-regen': `Rewrite the flagged advisor feedback entries.
Each entry must: name the specific policy mechanism, the constituency affected, and the causal chain.
1–2 sentences from the advisor's professional perspective (30–50 words).
FORBIDDEN: "aligns with our", "our department", "course of action", "careful monitoring", "no strong position".`,

  'title-fix': `Fix the scenario title:
- Minimum 4 words, maximum 8 words
- Write like a newspaper headline with a verb and named agent
- No tokens allowed in titles
- Remove duplicate words
- BANNED: noun-stack endings ("Crisis Response"), gerund openers ("Managing X")`,

  'label-fix': `Fix option labels:
- MAX 3 words, prefer 1–2 words
- No {token} placeholders allowed — use plain text
- Keep it tight for mobile badge rendering`,

  'voice-fix': `Fix voice and perspective errors:
- outcome fields (outcomeHeadline, outcomeSummary, outcomeContext) must be third-person journalistic — no "you" or "your"
- description and options[].text must be second-person
- Rewrite passive voice as active: "was directed" → "you directed", "was announced by" → "{leader_title} announced"
- Ensure first narrative word of each field is capitalized
CRITICAL: Return the COMPLETE rewritten text for each field. Never omit or truncate content.`,

  'tone-fix': `Fix banned phrases and tone issues:
- Replace hardcoded ministry names with role tokens (e.g. "Justice Ministry" → "{justice_role}")
- Replace hardcoded government structure terms (e.g. "ruling coalition" → "{ruling_party}")
- Remove jargon ("bloc" → "alliance", "gambit" → "move")
- Remove banned phrases ("the government" in second-person fields → "your government")`,
};

function buildRepairPromptForAction(
  action: RepairAction,
  scenario: BundleScenario,
  currentScore: number,
  passThreshold: number
): string {
  const conceptTokenTable = CONCEPT_TO_TOKEN_MAP
    .map(({ concept, token }) => `  - ${concept} → ${token}`)
    .join('\n');

  const issueList = action.issues
    .map(i => `[${i.severity}] ${i.rule}: ${i.message} (field: ${i.target})`)
    .join('\n');

  const fieldsToInclude = new Set<string>();
  for (const issue of action.issues) {
    const target = issue.target;
    if (target.includes('title') || action.type === 'title-fix') fieldsToInclude.add('title');
    if (target.includes('description') || action.type === 'text-expansion') fieldsToInclude.add('description');
    if (target.includes('option') || target.includes('label') || target.includes('outcome') || target.includes('advisor')) {
      fieldsToInclude.add('options');
    }
  }
  if (action.type === 'advisor-regen' || action.type === 'voice-fix' || action.type === 'tone-fix' || action.type === 'token-fix') {
    fieldsToInclude.add('options');
  }

  const repairTarget: Record<string, unknown> = {};
  if (fieldsToInclude.has('title')) repairTarget.title = scenario.title;
  if (fieldsToInclude.has('description')) repairTarget.description = scenario.description;
  if (fieldsToInclude.has('options')) {
    repairTarget.options = scenario.options.map(o => ({
      id: o.id,
      text: o.text,
      label: o.label,
      outcomeHeadline: o.outcomeHeadline,
      outcomeSummary: o.outcomeSummary,
      outcomeContext: o.outcomeContext,
      ...(action.type === 'advisor-regen' ? { advisorFeedback: o.advisorFeedback } : {}),
    }));
  }

  return `You are a surgical scenario text editor performing a targeted "${action.type}" repair.

CURRENT AUDIT SCORE: ${currentScore}/100 (pass threshold: ${passThreshold})
You must fix these issues to raise the score above ${passThreshold}.

REPAIR FOCUS — ${action.type.toUpperCase()}:
${REPAIR_ACTION_PROMPTS[action.type] ?? 'Fix the listed issues.'}

STRICT RULES:
1. Fix ONLY the fields related to the issues below.
2. Preserve ALL tokens exactly (e.g. {leader_title}, {the_adversary}).
3. The returned JSON must never contain the literal substring "the {" anywhere.
4. Do NOT change effects, metric IDs, durations, probabilities, or any numeric data.
5. Return ONLY a partial JSON patch with the changed fields.

CONCEPT → TOKEN MAP:
${conceptTokenTable}

ISSUES TO FIX (${action.issues.length}):
${issueList}

SCENARIO (relevant fields only):
${JSON.stringify(repairTarget, null, 2)}

Return ONLY the changed JSON fields as a partial patch.`;
}

function safeTextField(original: string | undefined, patched: string | undefined, fieldName: string, scenarioId: string): string | undefined {
  if (patched === undefined) return original;
  if (!original) return patched;
  if (typeof patched !== 'string' || patched.trim().length === 0) return original;
  const origLen = original.length;
  const patchLen = patched.length;
  if (patchLen < origLen * 0.5) {
    console.warn(`[ScenarioEngine] Rejected ${fieldName} patch for ${scenarioId}: ${origLen} → ${patchLen} chars (too short)`);
    return original;
  }
  return patched;
}

function applyRepairPatch(scenario: BundleScenario, patch: any): BundleScenario {
  const patched: BundleScenario = { ...scenario };
  if (patch.title !== undefined && typeof patch.title === 'string' && patch.title.trim().length > 0) {
    patched.title = patch.title;
  }
  if (patch.description !== undefined) {
    patched.description = safeTextField(scenario.description, patch.description, 'description', scenario.id) ?? scenario.description;
  }
  if (patch.options && Array.isArray(patch.options)) {
    patched.options = scenario.options.map(orig => {
      const patchedOpt = patch.options.find((p: any) => p.id === orig.id);
      if (!patchedOpt) return orig;
      return {
        ...orig,
        ...(patchedOpt.text !== undefined ? { text: safeTextField(orig.text, patchedOpt.text, `${orig.id}/text`, scenario.id) ?? orig.text } : {}),
        ...(patchedOpt.label !== undefined ? { label: patchedOpt.label } : {}),
        ...(patchedOpt.outcomeHeadline !== undefined ? { outcomeHeadline: safeTextField(orig.outcomeHeadline, patchedOpt.outcomeHeadline, `${orig.id}/outcomeHeadline`, scenario.id) ?? orig.outcomeHeadline } : {}),
        ...(patchedOpt.outcomeSummary !== undefined ? { outcomeSummary: safeTextField(orig.outcomeSummary, patchedOpt.outcomeSummary, `${orig.id}/outcomeSummary`, scenario.id) ?? orig.outcomeSummary } : {}),
        ...(patchedOpt.outcomeContext !== undefined ? { outcomeContext: safeTextField(orig.outcomeContext, patchedOpt.outcomeContext, `${orig.id}/outcomeContext`, scenario.id) ?? orig.outcomeContext } : {}),
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
  return patched;
}

async function executeRepairActions(
  scenario: BundleScenario,
  issues: any[],
  bundle: string,
  isNews: boolean,
  passThreshold: number,
  modelConfig?: GenerationModelConfig,
  maxAttempts?: number
): Promise<BundleScenario | null> {
  const actions = classifyRepairActions(issues);
  if (actions.length === 0) return null;

  let currentScore = scoreScenario(issues);
  const scoreGap = passThreshold - currentScore;
  if (scoreGap > 30) {
    console.warn(`[ScenarioEngine] Skipping LLM repair for ${scenario.id}: score ${currentScore} is ${scoreGap} points below threshold ${passThreshold} — too far gone for targeted repair`);
    return null;
  }

  let currentScenario = scenario;
  let currentIssues = issues;
  let improved = false;
  const attemptsLeft = maxAttempts ?? 2;
  const failedActions = new Set<string>();

  for (let attempt = 0; attempt < attemptsLeft && currentScore < passThreshold; attempt++) {
    const remainingActions = classifyRepairActions(currentIssues).filter(a => !failedActions.has(a.type));
    if (remainingActions.length === 0) break;

    for (const action of remainingActions) {
      if (currentScore >= passThreshold) break;

      const prompt = buildRepairPromptForAction(action, currentScenario, currentScore, passThreshold);
      console.log(
        `[Repair] ${scenario.id} action=${action.type} attempt=${attempt + 1}/${attemptsLeft} current=${currentScore} target=${passThreshold}`
      );
      logIssueSummary(`[Repair] before ${action.type}`, currentIssues, currentScore);

      try {
        const repairResult = await callModelProvider<any>(
          REPAIR_CONFIG,
          prompt,
          {},
          resolvePhaseModel(modelConfig, isOllamaGeneration(modelConfig) ? 'drafter' : 'repair')
        );

        if (!repairResult.data) {
          console.warn(`[ScenarioEngine] ${action.type} repair returned null for ${scenario.id}`);
          failedActions.add(action.type);
          continue;
        }

        const candidate = applyRepairPatch(currentScenario, repairResult.data);
        const reauditIssues = auditScenario(candidate, bundle, isNews);
        const reauditScore = scoreScenario(reauditIssues);
        logIssueSummary(`[Repair] after ${action.type}`, reauditIssues, reauditScore);

        if (reauditScore > currentScore) {
          console.log(`[ScenarioEngine] ${action.type} repair improved ${scenario.id}: ${currentScore} → ${reauditScore}`);
          emitEngineEvent({ level: 'success', code: 'repair_action', message: `${action.type}: ${currentScore} → ${reauditScore}`, data: { scenarioId: scenario.id, action: action.type, before: currentScore, after: reauditScore } });
          currentScenario = candidate;
          currentScore = reauditScore;
          currentIssues = reauditIssues;
          improved = true;
          failedActions.delete(action.type); // reset — a new state may make it viable again
        } else {
          console.warn(`[ScenarioEngine] ${action.type} repair did not improve ${scenario.id} (${currentScore} → ${reauditScore}). Rolling back.`);
          emitEngineEvent({ level: 'warning', code: 'repair_rollback', message: `${action.type} rolled back: ${currentScore} → ${reauditScore}`, data: { scenarioId: scenario.id, action: action.type } });
          failedActions.add(action.type);
        }
      } catch (err: any) {
        console.warn(`[ScenarioEngine] ${action.type} repair failed for ${scenario.id}: ${err.message}`);
        emitEngineEvent({ level: 'error', code: 'repair_failed', message: `${action.type} failed: ${err.message}`, data: { scenarioId: scenario.id, action: action.type } });
        failedActions.add(action.type);
      }
    }
  }

  return improved ? currentScenario : null;
}

function logIssueSummary(prefix: string, issues: any[], score: number): void {
  if (issues.length === 0) {
    console.log(`${prefix}: score=${score} issues=0`);
    return;
  }

  console.log(`${prefix}: score=${score} issues=${issues.length}`);
  issues.forEach((issue) => {
    console.log(`  [${issue.severity}] ${issue.rule} :: ${issue.target} :: ${issue.message}`);
  });
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

  console.log(`[Draft] ── incoming scenario ────────────────────────────────────────────`);
  console.log(`[Draft] title:       ${scenario.title ?? '(none)'}`);
  console.log(`[Draft] description: ${(scenario.description ?? '').slice(0, 300)}${(scenario.description ?? '').length > 300 ? '…' : ''}`);
  scenario.options?.forEach((opt, i) => {
    console.log(`[Draft] option[${i}]:  ${(opt.text ?? '').slice(0, 120)}${(opt.text ?? '').length > 120 ? '…' : ''}`);
  });
  console.log(`[Draft] ─────────────────────────────────────────────────────────────────`);

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

  {
    const initialScore = scoreScenario(issues);
    if (issues.length > 0) {
      console.log(`[Audit] ── initial audit: score=${initialScore}  issues=${issues.length} ────────────────────`);
      issues.forEach(iss => {
        const tag = iss.severity === 'error' ? '✗ ERR ' : '⚠ WARN';
        console.log(`[Audit]   ${tag}  [${iss.rule}]  ${iss.target}  —  ${iss.message}`);
      });
      console.log(`[Audit] ─────────────────────────────────────────────────────────────────`);
    } else {
      console.log(`[Audit] ── initial audit: score=${initialScore}  ✓ no issues ─────────────────────────`);
    }
  }

  // 1. Initial Quality Check & Token Enforcement
  const fieldsToCheck = [scenario.description, ...scenario.options.map(o => o.text), ...scenario.options.map(o => o.outcomeSummary)];
  const hasTokens = fieldsToCheck.some(text => text && text.includes('{') && text.includes('}'));

  if (!hasTokens) {
    console.log(`[ScenarioEngine] Scenario ${scenario.id}: no tokens found — attempting token injection`);
    const TOKEN_INJECTION_PATTERNS: Array<[RegExp, string]> = [
      [/\bthe president\b/gi, '{leader_title}'],
      [/\bthe prime minister\b/gi, '{leader_title}'],
      [/\bthe chancellor\b/gi, '{leader_title}'],
      [/\bthe head of (state|government)\b/gi, '{leader_title}'],
      [/\bthe vice president\b/gi, '{the_vice_leader}'],
      [/\bthe deputy (prime minister|leader)\b/gi, '{the_vice_leader}'],
      [/\bthe parliament\b/gi, '{the_legislature}'],
      [/\bthe congress\b/gi, '{the_legislature}'],
      [/\bthe legislature\b/gi, '{the_legislature}'],
      [/\bthe national assembly\b/gi, '{the_legislature}'],
      [/\bthe senate\b/gi, '{the_legislature}'],
      [/\bthe house of representatives\b/gi, '{the_lower_house}'],
      [/\bthe ruling party\b/gi, '{the_ruling_party}'],
      [/\bthe governing party\b/gi, '{the_ruling_party}'],
      [/\bthe opposition\b/gi, '{the_opposition_party}'],
      [/\bthe opposition party\b/gi, '{the_opposition_party}'],
      [/\bthe opposition leader\b/gi, '{the_opposition_leader}'],
      [/\bthe central bank\b/gi, '{the_central_bank}'],
      [/\bthe stock exchange\b/gi, '{the_stock_exchange}'],
      [/\bthe armed forces\b/gi, '{the_armed_forces_name}'],
      [/\bthe military\b/gi, '{the_military_branch}'],
      [/\bthe army\b/gi, '{the_military_branch}'],
      [/\bthe navy\b/gi, '{the_military_branch}'],
      [/\bthe air force\b/gi, '{the_military_branch}'],
      [/\bthe special forces\b/gi, '{the_special_forces}'],
      [/\bthe capital\b(?!\s+(city|gains|markets|flows|flight|investment|account))/gi, '{the_capital_city}'],
      [/\bour country\b/gi, '{the_player_country}'],
      [/\bthe nation\b/gi, '{the_nation}'],
      [/\bthe country\b/gi, '{the_player_country}'],
      [/\byour government\b/gi, 'your administration'],
      [/\bthe finance minister\b/gi, '{the_finance_role}'],
      [/\bthe defense minister\b/gi, '{the_defense_role}'],
      [/\bthe defence minister\b/gi, '{the_defense_role}'],
      [/\bthe interior minister\b/gi, '{the_interior_role}'],
      [/\bthe foreign minister\b/gi, '{the_foreign_affairs_role}'],
      [/\bthe health minister\b/gi, '{the_health_role}'],
      [/\bthe education minister\b/gi, '{the_education_role}'],
      [/\bthe energy minister\b/gi, '{the_energy_role}'],
      [/\bthe environment minister\b/gi, '{the_environment_role}'],
      [/\bthe transport minister\b/gi, '{the_transport_role}'],
      [/\bthe agriculture minister\b/gi, '{the_agriculture_role}'],
      [/\bthe commerce minister\b/gi, '{the_commerce_role}'],
      [/\bthe labor minister\b/gi, '{the_labor_role}'],
      [/\bthe justice minister\b/gi, '{the_justice_role}'],
      [/\bthe minister of finance\b/gi, '{the_finance_role}'],
      [/\bthe minister of defen[cs]e\b/gi, '{the_defense_role}'],
      [/\bthe minister of (the )?interior\b/gi, '{the_interior_role}'],
      [/\bthe minister of foreign affairs\b/gi, '{the_foreign_affairs_role}'],
      [/\bthe minister of health\b/gi, '{the_health_role}'],
      [/\bthe minister of education\b/gi, '{the_education_role}'],
      [/\bthe minister of energy\b/gi, '{the_energy_role}'],
      [/\bthe supreme court\b/gi, '{the_judicial_role}'],
      [/\bthe high court\b/gi, '{the_judicial_role}'],
      [/\bthe constitutional court\b/gi, '{the_judicial_role}'],
      [/\bthe attorney general\b/gi, '{the_prosecutor_role}'],
      [/\bthe intelligence (agency|service)\b/gi, '{the_intelligence_agency}'],
      [/\bthe secret service\b/gi, '{the_intelligence_agency}'],
      [/\bthe police\b(?!\s+force)/gi, '{the_police_force}'],
      [/\bthe police force\b/gi, '{the_police_force}'],
      [/\bthe security council\b/gi, '{the_security_council}'],
      [/\b(?:the\s+)?dollar(?:s)?\b/gi, '{currency}'],
      [/\b(?:the\s+)?euro(?:s)?\b(?!\s*(?:pe|zone|area))/gi, '{currency}'],
      [/\b(?:the\s+)?pound(?:s)?\b(?!\s*(?:of|sterling))/gi, '{currency}'],
      [/\b(?:the\s+)?yen\b/gi, '{currency}'],
      [/\b(?:the\s+)?yuan\b/gi, '{currency}'],
      [/\b(?:the\s+)?ruble(?:s)?\b/gi, '{currency}'],
      [/\b(?:the\s+)?rupee(?:s)?\b/gi, '{currency}'],
      [/\bthe state media\b/gi, '{the_state_media}'],
      [/\bstate television\b/gi, '{state_media}'],
      [/\bthe national broadcaster\b/gi, '{the_state_media}'],
    ];
    const injectTokens = (text: string): string => {
      let result = text;
      for (const [pattern, replacement] of TOKEN_INJECTION_PATTERNS) {
        result = result.replace(pattern, replacement);
      }
      return result;
    };
    scenario.description = injectTokens(scenario.description);
    for (const opt of scenario.options) {
      opt.text = injectTokens(opt.text);
      if (opt.outcomeSummary) opt.outcomeSummary = injectTokens(opt.outcomeSummary);
      if (opt.outcomeContext) opt.outcomeContext = injectTokens(opt.outcomeContext);
      if (opt.outcomeHeadline) opt.outcomeHeadline = injectTokens(opt.outcomeHeadline);
    }
    const recheckFields = [scenario.description, ...scenario.options.map(o => o.text), ...scenario.options.map(o => o.outcomeSummary)];
    const nowHasTokens = recheckFields.some(text => text && text.includes('{') && text.includes('}'));
    if (!nowHasTokens) {
      console.warn(`[ScenarioEngine] Scenario ${scenario.id} failed: No tokens found even after injection attempt.`);
      return { scenario: null, score: 0, issues: [{ severity: 'error', rule: 'no-tokens', target: scenario.id, message: 'No tokens found in content', autoFixable: false }] };
    }
    console.log(`[ScenarioEngine] Token injection succeeded for ${scenario.id} — continuing with audit`);
    issues = auditScenario(scenario, bundle, isNews);
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

  for (const field of ['title', 'description'] as const) {
    if (scenario[field]) scenario[field] = repairTextIntegrity(scenario[field]) ?? scenario[field];
  }
  for (const opt of scenario.options) {
    for (const field of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
      if (opt[field]) (opt as any)[field] = repairTextIntegrity(opt[field] as string) ?? opt[field];
    }
  }

  // 3. Apply Deterministic Fixes (Phase normalization, metric mapping, etc.)
  if (scenario.metadata) {
    if (scenario.metadata.severity) {
      scenario.metadata.severity = scenario.metadata.severity.toLowerCase();
      if (scenario.metadata.severity === 'extreme') scenario.metadata.severity = 'critical';
    }
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

  const { llm_repair_enabled, audit_pass_threshold: repairThreshold, max_llm_repair_attempts } = await getGenerationConfig();
  const preRepairCurrentScore = scoreScenario(issues);
  if (llm_repair_enabled && issues.length > 0 && preRepairCurrentScore < repairThreshold) {
    const repaired = await executeRepairActions(scenario, issues, bundle, isNews, repairThreshold, modelConfig, max_llm_repair_attempts);
    if (repaired) {
      scenario.title = repaired.title;
      scenario.description = repaired.description;
      scenario.options = repaired.options;
      normalizeScenarioTextFields(scenario);
      deterministicFix(scenario);
      for (const option of scenario.options) {
        const narrativeText = [
          option.outcomeHeadline,
          option.outcomeSummary,
          option.outcomeContext,
        ].filter(Boolean).join(' ');
        option.effects = suggestEffectCorrections(narrativeText, option.effects || []);
      }
      issues = auditScenario(scenario, bundle, isNews);
      if (issues.length > 0) {
        const heurResultAfterRepair = heuristicFix(scenario, issues, bundle);
        if (heurResultAfterRepair.fixed) {
          issues = auditScenario(scenario, bundle, isNews);
        }
      }
    }
  }

  try {
    const groundedAuditIssues = scenario.options.flatMap((option) => {
      const narrativeText = [
        option.outcomeHeadline,
        option.outcomeSummary,
        option.outcomeContext,
      ].filter(Boolean).join(' ');

      return validateGroundedEffects(narrativeText, option.effects || [])
        .map((groundingIssue) => groundingIssueToAuditIssue(groundingIssue, `${scenario.id}/${option.id}`));
    });

    if (groundedAuditIssues.length > 0) {
      console.warn(`[ScenarioEngine] Scenario ${scenario.id} has unresolved grounded effects issues:`, groundedAuditIssues);
      issues.push(...groundedAuditIssues);
    }
  } catch (error: any) {
    console.warn(`[ScenarioEngine] Grounded effects validation failed (non-fatal):`, error.message);
  }

  const score = scoreScenario(issues);
  const {
    audit_pass_threshold,
    content_quality_gate_enabled,
    narrative_review_enabled,
    enable_conditional_editorial_review,
  } = await getGenerationConfig();

  const isOllamaJob = isOllamaGeneration(modelConfig);

  const effectiveContentQualityEnabled =
    (Boolean(content_quality_gate_enabled) || isOllamaJob) &&
    !skipEditorialReview &&
    !(skipEditorialReview && Boolean(enable_conditional_editorial_review));
  const effectiveNarrativeReviewEnabled =
    (Boolean(narrative_review_enabled) || isOllamaJob) &&
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
      emitEngineEvent({ level: qualityResult.pass ? 'success' : 'warning', code: 'quality_gate', message: `Quality gate ${scenario.id}: overall=${qualityResult.overallScore.toFixed(2)} pass=${qualityResult.pass}`, data: { scenarioId: scenario.id, overall: qualityResult.overallScore, grammar: qualityResult.grammar.score, tone: qualityResult.tone.score, pass: qualityResult.pass } });
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
      emitEngineEvent({ level: narrativeResult.pass ? 'success' : 'warning', code: 'narrative_review', message: `Narrative review ${scenario.id}: overall=${narrativeResult.overallScore.toFixed(2)} pass=${narrativeResult.pass}`, data: { scenarioId: scenario.id, overall: narrativeResult.overallScore, engagement: narrativeResult.engagement.score, strategicDepth: narrativeResult.strategicDepth.score, pass: narrativeResult.pass } });
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
  const remediationClassification = classifyIssueRemediation(issues);

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
      remediationClassification,
    };
    return { scenario, score, issues };
  }

  const rejectionIssues = [...issues, ...acceptanceDecision.rejectionIssues];
  if (remediationClassification.bucket === 'manual-review' && issues.length > 0) {
    rejectionIssues.push({
      severity: 'error',
      rule: 'manual-editorial-review-required',
      target: scenario.id,
      message: `Scenario requires manual editorial review after repair attempts (${remediationClassification.reason}).`,
      autoFixable: false,
    });
  }
  console.warn(
    `[ScenarioEngine] Scenario ${scenario.id} rejected by acceptance policy ${acceptanceDecision.policyVersion}: ${acceptanceDecision.rejectionReasons.join('; ')} | remediation=${remediationClassification.bucket}:${remediationClassification.reason}`
  );
  return { scenario: null, score, issues: rejectionIssues };
}

type OptionShapeValue = 'redistribute' | 'regulate' | 'escalate' | 'negotiate' | 'invest' | 'cut' | 'reform' | 'delay';

function inferOptionShape(concept: string, theme?: string): OptionShapeValue {
  const text = `${concept} ${theme ?? ''}`.toLowerCase();
  const rules: Array<[RegExp, OptionShapeValue]> = [
    [/negotiat|treaty|agreement|coalition|pact|diplomac|summit|mediat/i, 'negotiate'],
    [/escalat|military|force|deploy|strike|mobiliz|confront|wartime/i, 'escalate'],
    [/budget|allocat|fund|spend|redistribut|subsid|transfer|welfare/i, 'redistribute'],
    [/regulat|ban|restrict|enforce|compliance|license|mandate|standard/i, 'regulate'],
    [/invest|build|develop|infrastructure|capacity|construct|expand/i, 'invest'],
    [/cut|reduc|austerity|slash|elimina|withdraw|downsize/i, 'cut'],
    [/reform|overhaul|restructur|moderniz|reorganiz|transform/i, 'reform'],
    [/delay|defer|postpone|interim|moratorium|suspend|freeze/i, 'delay'],
  ];
  for (const [pattern, shape] of rules) {
    if (pattern.test(text)) return shape;
  }
  return 'regulate';
}

async function generateConceptSeeds(request: GenerationRequest): Promise<any[]> {
  const resolvedScope = normalizeGenerationScope(request);
  const lowLatencyMode = Boolean(request.lowLatencyMode);
  let headlines = '';
  if (request.mode === 'news' && request.newsContext) {
    headlines = request.newsContext.slice(0, 30).map(n => `- ${n.title}`).join('\n');
  }

  const [architectPromptBase, countryContextBlock, countryNote, recentSummaries, themeDistribution] = await Promise.all([
    getArchitectPromptBase().then((prompt) => buildArchitectPrompt(prompt, { lowLatencyMode })),
    lowLatencyMode ? Promise.resolve('') : getCountryContextBlock(request.applicable_countries),
    buildCountryNote(request.applicable_countries),
    lowLatencyMode ? Promise.resolve([] as Array<{ title: string; description: string }>) : getRecentScenarioSummaries(request.bundle, 30),
    lowLatencyMode ? Promise.resolve(new Map<string, number>()) : getThemeDistribution(request.bundle),
  ]);
  const scopeOverlay = getScopePromptOverlay(resolvedScope.scopeTier);
  const bundleOverlay = getBundlePromptOverlay(request.bundle as BundleId);

  const CANONICAL_METRIC_IDS = Object.values(METRIC_IDS).join(', ');

  const themeCoverageBlock = (() => {
    if (themeDistribution.size === 0) return '';
    const sorted = [...themeDistribution.entries()].sort((a, b) => b[1] - a[1]);
    const overrepresented = sorted.slice(0, 5).map(([t, n]) => `${t} (${n})`);
    return `\nTHEME COVERAGE — the following themes are already well-represented in this bundle. Prioritize DIFFERENT sub-topics to broaden coverage:\n  Overrepresented: ${overrepresented.join(', ')}\n  Aim for themes not listed above. Variety across sub-topics within '${request.bundle}' is critical.\n`;
  })();

  const prompt = `
    You are 'The Architect'. Generate ${request.count} unique scenario concepts for the '${request.bundle}' bundle.

    DIFFICULTY RATING (1-5):
    - 1 = Routine decision, low stakes, clear best option
    - 2 = Moderate complexity, some trade-offs
    - 3 = Significant dilemma, meaningful consequences either way
    - 4 = High-stakes crisis, all options have serious downsides
    - 5 = Existential threat, no good options, catastrophic potential
    ${(() => {
      const n = request.count;
      const easy = Math.max(1, Math.ceil(n * 0.17));
      const med = Math.max(1, Math.round(n * 0.33));
      const hard = Math.max(1, Math.round(n * 0.33));
      const extreme = Math.max(1, Math.floor(n * 0.17));
      return `DIFFICULTY DISTRIBUTION — generate concepts in EXACTLY this spread (content must match the assigned difficulty):\n    • Difficulty 1–2 (routine governance, low-stakes tradeoffs): ${easy} concept(s)\n    • Difficulty 3   (moderate crisis, meaningful consequences either way): ${med} concept(s)\n    • Difficulty 4   (serious challenge, all options have real downsides): ${hard} concept(s)\n    • Difficulty 5   (existential/constitutional crisis, no good options): ${extreme} concept(s)\n    CRITICAL: difficulty-1 concepts are everyday governance decisions — a permit dispute, a minor regulatory change, a procurement choice. Do not write them as crises. Difficulty-5 concepts are rare and catastrophic. Match the CONTENT of each concept to its assigned difficulty level.`;
    })()}

    ${headlines ? `News Context (Seed Material):\n${headlines}\n\nINTEGRATION: Transform these news items into country-agnostic, tokenized concepts.` : `Theme: Focus on geopolitical strategies for '${request.bundle}'.`}
    ${recentSummaries.length > 0 ? `\nALREADY IN THE LIBRARY — these ${recentSummaries.length} scenarios exist in the '${request.bundle}' bundle. Generate concepts with meaningfully different premises, crises, and stakeholder configurations — not variations of these:\n${recentSummaries.map((s) => `- ${s.title}${s.description ? ': ' + s.description : ''}`).join('\n')}\n` : ''}${themeCoverageBlock}
    SCOPE TARGET:
    - scopeTier: ${resolvedScope.scopeTier}
    - scopeKey: ${resolvedScope.scopeKey}
    - sourceKind: ${resolvedScope.sourceKind}
    ${resolvedScope.clusterId ? `- clusterId: ${resolvedScope.clusterId}` : ''}
    ${resolvedScope.exclusivityReason ? `- exclusivityReason: ${resolvedScope.exclusivityReason}` : ''}
    ${request.region ? `\nTARGET REGION: ${request.region}. Generate concepts that feel relevant to this region (e.g. small island states, regional dynamics, local stakes).` : ''}
    ${countryNote}

    ${countryContextBlock}

    BUNDLE-SPECIFIC GUIDANCE:
    ${bundleOverlay.architect}

    SCOPE-SPECIFIC GUIDANCE:
    ${scopeOverlay.architect}

    ${architectPromptBase}

    CANONICAL METRIC IDs (use only these for primaryMetrics and secondaryMetrics):
    ${CANONICAL_METRIC_IDS}

    RICH CONCEPT FIELDS — include these in every concept object:
    - primaryMetrics: array of 1–3 metric IDs most directly affected (from canonical list above)
    - secondaryMetrics: array of 0–3 metric IDs secondarily affected (optional but encouraged)
    - actorPattern: ${resolvedScope.scopeTier === 'universal'
        ? "one of 'domestic' | 'legislature' | 'cabinet' | 'judiciary' — universal scope ONLY. Do NOT use 'ally', 'adversary', 'border_rival', or 'mixed'; relationship tokens are prohibited in universal scenarios.\n      - domestic: internal actor (protest group, industry, regional faction)\n      - legislature: {legislature} is the central actor blocking or pushing action\n      - cabinet: a cabinet minister or internal faction is the central actor\n      - judiciary: courts or rule-of-law tensions are the central actor"
        : "one of 'domestic' | 'ally' | 'adversary' | 'border_rival' | 'legislature' | 'cabinet' | 'judiciary' | 'mixed'\n      - domestic: internal actor (protest group, industry, regional faction)\n      - ally: a friendly foreign power is the central actor\n      - adversary: a hostile foreign power is the central actor\n      - border_rival: a neighboring rival country is the central actor\n      - legislature: {legislature} is the central actor blocking or pushing action\n      - cabinet: a cabinet minister or internal faction is the central actor\n      - judiciary: courts or rule-of-law tensions are the central actor\n      - mixed: multiple actor types are equally central"
      }
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
    - triggerConditions (optional): array of { metricId, min?, max? } — include ONLY when the concept requires a specific metric state to be plausible (e.g. recession, crime wave, unrest). Use canonical metric IDs with the "metric_" prefix (e.g. "metric_economy"). Example: [{ "metricId": "metric_economy", "max": 38 }]. Omit for neutral governance, diplomatic, or institutional concepts.
    - optionDomains: exactly 3 items, one per option direction. Each has { label: string, primaryMetric: string }. The 3 primaryMetric values MUST be different — this forces each option to specialize in a distinct part of the game state. The player must face a genuine tradeoff, not just a choice of magnitude. Example for an economic crisis scenario: [{ "label": "stimulus", "primaryMetric": "metric_economy" }, { "label": "social investment", "primaryMetric": "metric_equality" }, { "label": "austerity", "primaryMetric": "metric_inflation" }]. Choose metrics that reflect real policy tradeoffs relevant to the concept.

    Return exactly ${request.count} concepts in JSON with fields: concept, theme, severity, difficulty, primaryMetrics, secondaryMetrics, actorPattern, optionShape, loopEligible, triggerConditions, optionDomains.
  `;

  const normalizeConcepts = (concepts: GeneratedConcept[]): GeneratedConcept[] => {
    if (resolvedScope.scopeTier !== 'universal') return concepts;
    const externalPatterns = new Set(['ally', 'adversary', 'border_rival', 'mixed']);
    return concepts.map((c: GeneratedConcept) =>
      externalPatterns.has(c.actorPattern as string) ? { ...c, actorPattern: 'domestic' } : c
    );
  };

  const loadFirestoreFallback = async (reason: string): Promise<GeneratedConcept[] | null> => {
    const fallbackSeeds = await getSeedConcepts({
      bundle: request.bundle,
      scopeTier: resolvedScope.scopeTier,
      scopeKey: resolvedScope.scopeKey,
      count: request.count,
    });

    if (fallbackSeeds.length === 0) return null;

    console.warn(
      `[ScenarioEngine] Architect yielded no usable concepts for bundle=${request.bundle}. ` +
      `Using ${fallbackSeeds.length} Firestore concept seed(s). Reason: ${reason}`
    );

    return normalizeConcepts(fallbackSeeds.map((seed) => ({
      concept: seed.concept,
      theme: seed.theme,
      severity: seed.severity,
      difficulty: seed.difficulty,
      primaryMetrics: seed.primaryMetrics,
      secondaryMetrics: seed.secondaryMetrics,
      actorPattern: seed.actorPattern,
      optionShape: seed.optionShape,
      loopEligible: seed.loopEligible,
    })));
  };

  try {
    const architectConfig = lowLatencyMode ? { ...ARCHITECT_CONFIG, maxRetries: 0 } : ARCHITECT_CONFIG;
    const result = await callModel(architectConfig, prompt, CONCEPT_SCHEMA, resolvePhaseModel(request.modelConfig, 'architect'));
    const concepts = result?.data?.concepts;
    if (!Array.isArray(concepts) || concepts.length === 0) {
      const providerError = (result as any)?.error || 'empty or invalid concept payload';
      const fallback = await loadFirestoreFallback(providerError);
      if (fallback) return fallback;
      throw new Error(
        `[ScenarioEngine] Architect returned no concepts for bundle=${request.bundle}. ` +
        `Provider error: ${providerError}`
      );
    }
    let normalized = normalizeConcepts(concepts);

    if (resolvedScope.scopeTier === 'universal') {
      const RELATIONSHIP_CONCEPT_PATTERNS = [
        /neighbor/i, /border.*rival/i, /bilateral/i, /foreign.*power/i,
        /allied.*nation/i, /adversar/i, /rival.*nation/i, /trade.*partner/i,
        /hostile.*nation/i, /border.*conflict/i, /cross.*border/i,
      ];
      const before = normalized.length;
      normalized = normalized.filter(c => {
        const text = `${c.concept} ${c.theme ?? ''}`;
        const hasRelationship = RELATIONSHIP_CONCEPT_PATTERNS.some(p => p.test(text));
        if (hasRelationship) {
          console.log(`[ScenarioEngine] Filtered universal concept with relationship language: "${c.concept}"`);
        }
        return !hasRelationship;
      });
      if (normalized.length < before) {
        console.log(`[ScenarioEngine] Filtered ${before - normalized.length} universal concepts with foreign relationship language`);
      }
    }

    const VALID_OPTION_SHAPES: ReadonlySet<string> = new Set(['redistribute', 'regulate', 'escalate', 'negotiate', 'invest', 'cut', 'reform', 'delay']);
    normalized = normalized.map(c => {
      if (c.optionShape && VALID_OPTION_SHAPES.has(c.optionShape)) return c;
      const inferred = inferOptionShape(c.concept, c.theme);
      console.warn(`[ScenarioEngine] Concept "${c.concept.substring(0, 40)}..." missing optionShape, inferred: ${inferred}`);
      return { ...c, optionShape: inferred };
    });

    if (normalized.length >= 3) {
      // Build target distribution: ~17% easy (1-2), ~33% medium (3), ~33% hard (4), ~17% extreme (5)
      const n = normalized.length;
      const targetDifficulties: number[] = [];
      const easyCount = Math.max(1, Math.ceil(n * 0.17));
      const medCount = Math.max(1, Math.round(n * 0.33));
      const hardCount = Math.max(1, Math.round(n * 0.33));
      const extremeCount = Math.max(0, n - easyCount - medCount - hardCount);
      for (let i = 0; i < easyCount; i++) targetDifficulties.push(2);
      for (let i = 0; i < medCount; i++) targetDifficulties.push(3);
      for (let i = 0; i < hardCount; i++) targetDifficulties.push(4);
      for (let i = 0; i < extremeCount; i++) targetDifficulties.push(5);
      while (targetDifficulties.length < n) targetDifficulties.push(4);

      const actual = normalized.map((c) => c.difficulty ?? 3);
      const hasLow = actual.some((d) => d <= 2);
      const hasHigh = actual.some((d) => d >= 4);

      if (!hasLow || !hasHigh) {
        // Full redistribution: sort concepts by their LLM-assigned difficulty, map to target spread
        console.warn(
          `[ScenarioEngine] Difficulty distribution imbalanced for bundle=${request.bundle}: ` +
          `[${actual.join(', ')}] — redistributing to target [${targetDifficulties.join(', ')}]`
        );
        const sorted = [...normalized].sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));
        normalized = sorted.map((c, i) => ({ ...c, difficulty: targetDifficulties[i] as 1 | 2 | 3 | 4 | 5 }));
      }
    }

    return normalized;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const fallback = await loadFirestoreFallback(reason);
    if (fallback) return fallback;
    throw error;
  }
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
  const isOllamaRun = isOllamaGeneration(request?.modelConfig);
  concept._generationPath = useStandardPath ? 'standard' : 'premium';

  // Load Firebase-managed prompts and supporting data
  const [promptVersions, goldenExamples, drafterPromptBase, reflectionPrompt, architectPromptBase, countryContextBlock, countryNote] = await Promise.all([
    getCurrentPromptVersions(),
    getGoldenExamples(bundle, scopeTier, scopeKey, 2),
    isOllamaRun ? Promise.resolve(getCompactDrafterPromptBase()) : getDrafterPromptBase(),
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
    emitEngineEvent({ level: 'info', code: 'phase_draft', message: `Phase: draft (standalone) — ${concept.concept.slice(0, 80)}` });
  } else {
    // Premium path: generate full narrative blueprint via Architect
    emitEngineEvent({ level: 'info', code: 'phase_blueprint', message: `Phase: blueprint — ${concept.desiredActs || 3}-act narrative for "${concept.concept.slice(0, 80)}"` });
    const blueprintModel = resolvePhaseModel(request?.modelConfig, 'architect');
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

    const blueprintResult = await callModel(ARCHITECT_CONFIG, blueprintPrompt, BLUEPRINT_SCHEMA, blueprintModel);
    if (!blueprintResult?.data || !blueprintResult.data.acts) {
      const providerError = (blueprintResult as any)?.error;
      await logGenerationAttempt({
        attemptId: blueprintAttemptId,
        timestamp: Timestamp.now(),
        bundle,
        severity: concept.severity,
        desiredActs: concept.desiredActs || 3,
        promptVersion: promptVersions.architect,
        modelUsed: blueprintModel,
        phase: 'blueprint',
        success: false,
        retryCount: 0,
        failureReasons: providerError
          ? [`Blueprint generation failed: ${providerError}`]
          : ['Blueprint generation failed'],
      });
      throw new Error(`Failed to generate blueprint${providerError ? `: ${providerError}` : ''}`);
    }

    blueprint = blueprintResult.data;

    await logGenerationAttempt({
      attemptId: blueprintAttemptId,
      timestamp: Timestamp.now(),
      bundle,
      severity: concept.severity,
      desiredActs: concept.desiredActs || 3,
      promptVersion: promptVersions.architect,
      modelUsed: blueprintModel,
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
      const triggerConditionsHint = concept.triggerConditions?.length
        ? `\n- Trigger conditions (metric state that makes this premise relevant): ${JSON.stringify(concept.triggerConditions)}`
        : '';
      const optionDomainsHint = concept.optionDomains?.length === 3
        ? `\n\nOPTION DOMAIN REQUIREMENTS — each option MUST have at least one effect on its assigned primary metric, and at least one effect metric that NO other option targets:\n${concept.optionDomains.map((d, i) => `  Option ${i + 1} (${d.label}): primary metric = ${d.primaryMetric}`).join('\n')}`
        : '';
      const conceptContextBlock = useStandardPath && (concept.primaryMetrics?.length || concept.actorPattern || concept.optionShape || concept.triggerConditions?.length || concept.optionDomains?.length)
        ? `\nCONCEPT CONTEXT:\n- Primary metrics affected: ${(concept.primaryMetrics ?? []).join(', ')}\n- Actor pattern: ${concept.actorPattern ?? 'unspecified'}\n- Option shape: ${concept.optionShape ?? 'unspecified'}${triggerConditionsHint}${optionDomainsHint}\n`
        : '';
      const actorTokenRequirementBlock = buildActorTokenRequirement(concept.actorPattern, scopeTier);

      let drafterPrompt: string;
      if (isOllamaRun) {
        drafterPrompt = `
        Act ${actPlan.actIndex}/${blueprint.acts.length}: "${actPlan.title}"
        Concept: "${concept.concept}"
        Full Loop Arc: ${blueprintSummary}
        Act Summary: ${actPlan.summary}
        Difficulty: ${concept.difficulty || 3}/5
        ${conceptContextBlock}
        ${actorTokenRequirementBlock ? `${actorTokenRequirementBlock}\n` : ''}
        ${regionNote}${scopeNote}${countryNote}

        ${countryContextBlock}

        ${getLogicParametersPrompt(concept.severity as 'low' | 'medium' | 'high' | 'critical' | undefined)}
        ${getCompactAuditRulesPrompt()}

        BUNDLE-SPECIFIC GUIDANCE:
        ${bundleOverlay.drafter}

        SCOPE-SPECIFIC GUIDANCE:
        ${scopeOverlay.drafter}

        METADATA REQUIREMENTS:
        - severity: one of 'low', 'medium', 'high', 'critical'
        - urgency: one of 'low', 'medium', 'high', 'immediate'
        - difficulty: integer 1-5 matching concept difficulty (${concept.difficulty || 3})
        - tags: 2-4 relevant tags
        - conditions: maximum 2 entries, [] when not needed
        - relationship_conditions: omit for domestic/internal scenarios

        ${drafterPromptBase}
        `;
      } else {
        drafterPrompt = `
        **MANDATORY: USE TOKEN PLACEHOLDERS — EXAMPLES:**
        BAD: "The Finance Ministry announced new tariffs on Brazilian imports, drawing criticism from the opposition party."
        GOOD: "{finance_role} announced new tariffs on imports from {the_trade_partner}, drawing criticism from {the_opposition}."

        BAD: "The president ordered the military to secure the border with Russia."
        GOOD: "{leader_title} ordered {military_branch} to secure the border with {the_border_rival}."

        You MUST use {token} placeholders for ALL government roles, institutions, countries, and political entities. Never write hardcoded names.

        **OUTPUT GUARD RAILS (comply first)**:
        description = 2–3 sentences, 60–140 words (hard minimum 60 words — count before submitting). Each option text = 2–3 sentences, 50–80 words. Each option: 2, 3, or 4 effects only — not 5 or more. title = 4–8 words, no tokens in title.

        Act ${actPlan.actIndex}/${blueprint.acts.length}: "${actPlan.title}"
        Concept: "${concept.concept}"
        Full Loop Arc: ${blueprintSummary}
        Act Summary: ${actPlan.summary}
        Difficulty: ${concept.difficulty || 3}/5 (1=routine, 5=existential crisis)
        ${conceptContextBlock}
        ${actorTokenRequirementBlock ? `${actorTokenRequirementBlock}\n` : ''}
        ${regionNote}${scopeNote}${countryNote}

        ${countryContextBlock}

        ${getLogicParametersPrompt(concept.severity as 'low' | 'medium' | 'high' | 'critical' | undefined)}
        ${isOllamaRun ? getCompactAuditRulesPrompt() : getAuditRulesPrompt()}

        BUNDLE-SPECIFIC GUIDANCE:
        ${bundleOverlay.drafter}

        SCOPE-SPECIFIC GUIDANCE:
        ${scopeOverlay.drafter}

        METADATA REQUIREMENTS:
        - severity: must be one of 'low', 'medium', 'high', 'critical'
        - urgency: must be one of 'low', 'medium', 'high', 'immediate'
        - difficulty: integer 1-5 matching concept difficulty (${concept.difficulty || 3})
        - tags: 2-4 relevant tags for this scenario
        - conditions: follow canonical rules from prompt (economic crisis → metric_economy max 38, etc.). Output [] for neutral governance scenarios. Maximum 2 entries. Key must be "conditions".
        - relationship_conditions: if a named relational actor (adversary, rival, ally, trade partner) is central to this scenario, include the matching relationship condition (e.g. hostile attack → { "relationshipId": "adversary", "max": -25 }). For domestic/economic/internal scenarios: omit. Maximum 3 entries. Key must be "relationship_conditions".

        ${drafterPromptBase}

        # ⚠️ CRITICAL FINAL REMINDER ⚠️

        **SENTENCE COUNT**: description = 2–3 sentences. Each option text = 2–3 sentences. Count . ? ! — fewer than 2 or more than 3 = REJECTED.

        **EFFECT COUNT**: Each option = 2–4 effects only. Five or more on any option = REJECTED.

        **VOICE (WRONG VOICE = REJECTED)**:
        - description, option text, advisorFeedback → SECOND PERSON: "You face...", "Your administration..."
        - outcomeHeadline, outcomeSummary, outcomeContext → THIRD PERSON (newspaper): "The administration...", "Officials announced..."
        - NEVER "you"/"your" in any outcome field. NEVER "the administration"/"the government" in description or option text.

        **ACTIVE VOICE (>50% PASSIVE IN ANY MULTI-SENTENCE FIELD = REJECTED)**:
        Scan every field before submitting. Rewrite passive to active:
        ❌ "The plan was passed by {the_legislature}" → ✅ "{the_legislature} passed the plan"
        ❌ "Protests were fueled by the cuts" → ✅ "The cuts fueled protests"
        ❌ "fiscal discipline is restored" (advisor feedback) → ✅ "austerity restores fiscal discipline"
        ❌ "concerns were raised" → ✅ "opposition lawmakers raised concerns"
        In advisorFeedback, prefer: "X approved Y because...", "X warned that...", "X opposed Y citing..."

        **JARGON = REJECTED**: Never write "fiscal consolidation", "quantitative easing", "regulatory capture", "tariff corridor", "geopolitical hedge", "counter-cyclical", "sterilized intervention". Rewrite: "fiscal consolidation" → "spending cuts", "QE" → "money printing", "counter-cyclical" → "recession-fighting".

        **OPTION DIFFERENTIATION**: If OPTION DOMAIN REQUIREMENTS appear above, each option MUST include at least one effect on its assigned primary metric. Options that all hit the same 3 metrics = REJECTED.

        **DESCRIPTION**: End with stakes/urgency. NEVER preview the options or write "You must choose/decide between...".
        `;
      }

      // Add failure-specific guidance on retry
      if (attempt > 0 && lastAuditResult) {
        const failureCategory = categorizeFailure(lastAuditResult.issues);
        drafterPrompt += `\n\n# CRITICAL: PREVIOUS ATTEMPT FAILED (Score: ${lastAuditResult.score})\n`;

        if (isOllamaRun) {
          const retryIssues = lastAuditResult.issues
            .slice(0, 8)
            .map((issue: any) => `- [${issue.severity}] ${issue.rule}: ${issue.message}`)
            .join('\n');
          drafterPrompt += `\nFix these exact issues and return only valid JSON:\n${retryIssues}\n`;
        } else if (failureCategory === 'token-violation') {
          const hasNoTokens = lastAuditResult.issues.some((i: any) => i.rule === 'no-tokens');
          if (hasNoTokens) {
            drafterPrompt += `\n**CRITICAL: YOUR SCENARIO HAD NO TOKENS AT ALL**. Every scenario MUST reference government/country tokens. Replace hardcoded names and roles with approved token placeholders:\n  - Country name → {the_player_country} or {the_adversary}\n  - Leader → {leader_title}\n  - Minister → {finance_role}, {defense_role}, {foreign_affairs_role}, etc.\n  - Institutions → {legislature}, {ruling_party}, {judiciary_body}\nAt minimum, every description and every option text MUST contain at least one {token}.\n`;
          } else {
            const inventedIssues = lastAuditResult.issues.filter((i: any) => i.rule === 'invalid-token' && i.message?.includes('Invented token'));
          const inventedList = inventedIssues.map((i: any) => { const m = i.message?.match(/\{([a-z_]+)\}/); return m ? `{${m[1]}}` : null; }).filter(Boolean) as string[];
          if (inventedList.length > 0) {
            drafterPrompt += `\n**TOKEN VIOLATION**: You invented these INVALID tokens: ${inventedList.join(', ')}. They are NOT in the approved whitelist.\n`;
            for (const t of inventedList) {
              const m = t.match(/^\{the_(\w+)\}$/);
              if (m) drafterPrompt += `- \`${t}\` does not exist. Use \`{${m[1]}}\` (bare form) or the correct article-form token.\n`;
            }
          } else {
            drafterPrompt += `\n**TOKEN VIOLATION**: You used incorrect tokens or casing. Use only allowed tokens and ensure they are ALL LOWERCASE (e.g., {finance_role}).\n`;
          }
          }
        } else if (failureCategory === 'readability-violation') {
          drafterPrompt += `\n**READABILITY FAILURE**: Rewrite for non-expert players.
- Replace policy jargon with simple words.
- Keep every sentence at 25 words or fewer.
- Keep each sentence to at most 3 conjunction clauses.
- Active voice is required. Rewrite passive constructions: "was passed" → "{the_legislature} passed", "was announced" → "{leader_title} announced", "was rejected" → "{the_player_country} rejected", "were imposed" → "you imposed", "has been implemented" → "{leader_title} implemented". If more than half the sentences in any field are passive, the scenario fails automatically.
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
          drafterPrompt += `\n**YOU MISHANDLED INVERSE METRICS**. ALL values for corruption/inflation/crime/bureaucracy MUST be NEGATIVE. Example: { "targetMetricId": "metric_corruption", "value": -1.5 }. Any positive value on these metrics = REJECTED.\n`;
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
      drafterPrompt = buildDrafterPrompt(drafterPrompt, goldenExamples, reflectionPrompt, {
        lowLatencyMode: Boolean(request?.lowLatencyMode),
        omitExamples: isOllamaRun,
        omitReflection: isOllamaRun,
      });

      try {
        const drafterModel = resolvePhaseModel(request?.modelConfig, 'drafter');
        const isOllamaDrafter = isOllamaModel(drafterModel);

        let actDetails: any = null;
        let drafterError: string | null = null;

        if (isOllamaDrafter) {
          // Decomposed 4-phase Ollama draft: skeleton → effects/outcomes → metadata (deterministic) → advisor
          // Each sub-call stays under 5K tokens, well within local model context windows.
          emitEngineEvent({ level: 'info', code: 'drafter_decomposed', message: `Using decomposed 4-phase Ollama drafter for ${drafterModel}`, data: { drafterModel } });

          const ollamaTemp = attempt === 0 ? 0.5 : 0.3;

          // Phase A: Skeleton — title, description, 3 option texts
          // Pre-resolve tokens for the target country when available (M4)
          let tokenContext = buildCompactTokenPromptSection();
          if (request?.applicable_countries?.length) {
            const { countries: countriesData } = await loadCountriesData();
            const primaryCountryId = request.applicable_countries[0];
            const primaryCountry = countriesData[primaryCountryId];
            if (primaryCountry) {
              tokenContext = preResolveTokenContext(primaryCountry, scopeTier);
            }
          }

          const skeletonPrompt = getOllamaSkeletonPrompt({
            concept: concept.concept,
            bundle,
            scopeTier,
            scopeNote: ` Scope tier: ${scopeTier}. Scope key: ${scopeKey}.`,
            countryNote,
            countryContextBlock,
            bundleGuidance: bundleOverlay.drafter,
            scopeGuidance: scopeOverlay.drafter,
            tokenContext,
          });
          emitEngineEvent({ level: 'info', code: 'phase_skeleton', message: `Phase A: skeleton (${skeletonPrompt.length} chars)`, data: { promptPreview: skeletonPrompt.slice(0, 500), promptLength: skeletonPrompt.length } });

          const skeletonResult = await callModel(
            { ...OLLAMA_SKELETON_CONFIG, temperature: ollamaTemp },
            skeletonPrompt,
            SCENARIO_SKELETON_SCHEMA,
            drafterModel
          );
          emitEngineEvent({ level: skeletonResult?.data ? 'success' : 'error', code: 'phase_skeleton_result', message: `Phase A result: ${skeletonResult?.data ? 'OK' : skeletonResult?.error ?? 'null'}`, data: { responsePreview: skeletonResult?.data ? JSON.stringify(skeletonResult.data).slice(0, 600) : undefined, error: skeletonResult?.error, tokens: skeletonResult?.usage } });
          if (!skeletonResult?.data) {
            drafterError = skeletonResult?.error ?? 'Skeleton phase returned null';
          } else {
            const skeleton = skeletonResult.data as any;
            const skeletonOptions = (skeleton.options || []).slice(0, 3);
            if (skeletonOptions.length < 3) {
              drafterError = `Skeleton phase returned ${skeletonOptions.length} options (need 3)`;
            } else {
              // Phase B: Effects & Outcomes
              const auditCfg = getAuditConfig();
              const effectsPrompt = getOllamaEffectsPrompt({
                skeleton: {
                  title: skeleton.title,
                  description: skeleton.description,
                  options: skeletonOptions.map((o: any) => ({ id: o.id, text: o.text, label: o.label })),
                },
                bundle,
                validMetricIds: Array.from(auditCfg.validMetricIds),
                inverseMetrics: Array.from(auditCfg.inverseMetrics),
                scopeTier,
              });
              emitEngineEvent({ level: 'info', code: 'phase_effects', message: `Phase B: effects & outcomes (${effectsPrompt.length} chars)`, data: { promptPreview: effectsPrompt.slice(0, 500), promptLength: effectsPrompt.length } });

              const effectsResult = await callModel(
                { ...OLLAMA_EFFECTS_CONFIG, temperature: 0.3 },
                effectsPrompt,
                SCENARIO_EFFECTS_SCHEMA,
                drafterModel
              );
              emitEngineEvent({ level: effectsResult?.data ? 'success' : 'error', code: 'phase_effects_result', message: `Phase B result: ${effectsResult?.data ? 'OK' : effectsResult?.error ?? 'null'}`, data: { responsePreview: effectsResult?.data ? JSON.stringify(effectsResult.data).slice(0, 600) : undefined, error: effectsResult?.error, tokens: effectsResult?.usage } });
              if (!effectsResult?.data) {
                drafterError = effectsResult?.error ?? 'Effects phase returned null';
              } else {
                const effectsData = effectsResult.data as any;
                const effectsMap = new Map<string, any>();
                for (const optEffects of (effectsData.options || [])) {
                  effectsMap.set(optEffects.id, optEffects);
                }

                // Phase C: Metadata (deterministic — no LLM call)
                const metadata = {
                  severity: concept.severity || 'medium',
                  urgency: concept.severity === 'critical' ? 'immediate' : concept.severity === 'high' ? 'high' : 'medium',
                  difficulty: concept.difficulty || 3,
                  tags: [bundle, concept.theme || concept.actorPattern || 'governance'].filter(Boolean),
                };

                // Merge skeleton + effects + metadata into core scenario
                const mergedOptions = skeletonOptions.map((skelOpt: any) => {
                  const eff = effectsMap.get(skelOpt.id) || {};
                  return {
                    ...skelOpt,
                    effects: eff.effects || [],
                    policyImplications: eff.policyImplications || [],
                    outcomeHeadline: eff.outcomeHeadline || '',
                    outcomeSummary: eff.outcomeSummary || '',
                    outcomeContext: eff.outcomeContext || '',
                    is_authoritarian: eff.is_authoritarian ?? false,
                    moral_weight: eff.moral_weight ?? 0,
                    classification: eff.classification || {},
                    advisorFeedback: [],
                  };
                });

                const coreData = {
                  title: skeleton.title,
                  description: skeleton.description,
                  options: mergedOptions,
                  metadata,
                  conditions: [],
                  relationship_conditions: [],
                };

                // Phase D: Advisor Feedback (existing logic)
                const advisorPrompt = buildAdvisorFeedbackPrompt({
                  title: coreData.title,
                  description: coreData.description,
                  options: mergedOptions.map((o: any) => ({ id: o.id, text: o.text, label: o.label })),
                });
                const advisorModel = resolvePhaseModel(request?.modelConfig, 'advisor');
                emitEngineEvent({ level: 'info', code: 'phase_advisor', message: `Phase D: advisor feedback (model=${advisorModel})` });

                const advisorResult = await callModel(OLLAMA_ADVISOR_CONFIG, advisorPrompt, ADVISOR_FEEDBACK_SCHEMA, advisorModel);
                if (!advisorResult?.data) {
                  drafterError = advisorResult?.error ?? 'Advisor phase returned null';
                } else {
                  const advisorData = advisorResult.data as any;
                  const advisorMap = new Map<string, any[]>();
                  for (const entry of (advisorData.advisorsByOption || [])) {
                    advisorMap.set(entry.optionId, entry.advisorFeedback || []);
                  }
                  actDetails = {
                    ...coreData,
                    options: coreData.options.map((opt: any) => ({
                      ...opt,
                      advisorFeedback: advisorMap.get(opt.id) ?? [],
                    })),
                  };
                }
              }
            }
          }
        } else {
          const actResult = await callModel(DRAFTER_CONFIG, drafterPrompt, SCENARIO_DETAILS_SCHEMA, drafterModel);
          actDetails = actResult?.data ?? null;
          if (!actDetails) drafterError = actResult?.error ?? 'Model returned null';
        }

        if (!actDetails) {
          await logGenerationAttempt({
            attemptId,
            timestamp: Timestamp.now(),
            bundle,
            severity: concept.severity,
            desiredActs: blueprint.acts.length,
            promptVersion: promptVersions.drafter,
            modelUsed: drafterModel,
            phase: 'details',
            success: false,
            retryCount: attempt,
            failureReasons: [drafterError ? `Provider error: ${drafterError}` : 'Model returned null'],
          });
          continue;
        }

        console.log(
          `[DraftParse] act=${actPlan.actIndex} title="${actDetails.title ?? '(none)'}" options=${actDetails.options?.length ?? 0}`
        );
        console.log(
          `[DraftParse] descriptionWords=${String(actDetails.description ?? '').split(/\s+/).filter(Boolean).length} descriptionPreview=${JSON.stringify(String(actDetails.description ?? '').slice(0, 220))}`
        );
        (actDetails.options ?? []).forEach((opt: any, index: number) => {
          console.log(
            `[DraftParse] option=${index + 1} id=${opt.id ?? '(none)'} textWords=${String(opt.text ?? '').split(/\s+/).filter(Boolean).length} effects=${Array.isArray(opt.effects) ? opt.effects.length : 0} advisors=${Array.isArray(opt.advisorFeedback) ? opt.advisorFeedback.length : 0}`
          );
        });

        const act: BundleScenario = {
          ...actDetails,
          id: `${baseId}_act${actPlan.actIndex}`,
          phase: 'mid',
          actIndex: actPlan.actIndex,
          metadata: {
            ...actDetails.metadata,
            source: mode as any,
            severity: concept.severity,
            difficulty: concept.difficulty,
            actorPattern: concept.actorPattern,
            optionShape: concept.optionShape,
            theme: concept.theme,
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
          emitEngineEvent({ level: 'success', code: 'audit_pass', message: `Act ${actPlan.actIndex} audit passed — score ${lastAuditResult.score}${wasAutoFixed ? ' (auto-fixed)' : ''}`, data: { actIndex: actPlan.actIndex, score: lastAuditResult.score, autoFixed: wasAutoFixed, scenarioId: act.id } });
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
            modelUsed: drafterModel,
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
            modelUsed: drafterModel,
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
            modelUsed: drafterModel,
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
            modelUsed: drafterModel,
            phase: 'details',
            success: false,
            auditScore: lastAuditResult.score,
            failureReasons: lastAuditResult.issues.map(i => i.rule),
            retryCount: attempt,
          });

          console.warn(`[ScenarioEngine] Act ${actPlan.actIndex} attempt ${attempt + 1}/${MAX_RETRIES} failed (score: ${lastAuditResult.score}). Issues:`, JSON.stringify(lastAuditResult.issues, null, 2));
          emitEngineEvent({ level: 'warning', code: 'audit_fail', message: `Act ${actPlan.actIndex} attempt ${attempt + 1}/${MAX_RETRIES} — score ${lastAuditResult.score} — ${lastAuditResult.issues.slice(0, 3).map((i: any) => i.rule).join(', ')}`, data: { actIndex: actPlan.actIndex, attempt: attempt + 1, score: lastAuditResult.score, issues: lastAuditResult.issues.slice(0, 5).map((i: any) => ({ rule: i.rule, severity: i.severity, message: i.message })) } });

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
          modelUsed: resolvePhaseModel(request?.modelConfig, 'drafter'),
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
    if (isSemanticDedupEnabled() && !isOllamaGeneration(request?.modelConfig)) {
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
    } else if (isSemanticDedupEnabled() && isOllamaGeneration(request?.modelConfig)) {
      console.log(`[ScenarioEngine] Skipping semantic dedup for ${actScenario.id} because Ollama generation does not provide embedding-based dedup`);
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

