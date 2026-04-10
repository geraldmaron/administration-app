import { NewsItem, ScenarioRequirements } from './types';
import { getLogicParametersPrompt, METRIC_IDS } from './lib/logic-parameters';
import { ALL_METRIC_IDS } from './data/schemas/metricIds';
import { normalizeTokenAliases, isValidToken, CONCEPT_TO_TOKEN_MAP, loadCompiledTokenRegistry, retokenizeText, deriveTokenStrategy, buildMinimalTokenPromptSection, buildExclusivePromptSection } from './lib/token-registry';
import type { CompiledTokenRegistry } from './shared/token-registry-contract';
import { TokenRejectionBuffer } from './lib/token-rejection-tracker';
import { getRegionForCountry } from './data/schemas/regions';
import {
  auditScenario,
  deterministicFix,
  scoreScenario,
  BundleScenario,
  getAuditRulesPrompt,
  getCompactAuditRulesPrompt,
  isValidBundleId,
  initializeAuditConfig,
  normalizeScenarioTextFields,
  repairTextIntegrity,
  getAuditConfig,
  STATE_TAG_CONDITION_MAP,
  CANONICAL_SCENARIO_TAGS,
  sanitizeInventedTokens,
  heuristicFix,
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
  generateAttemptId,
  logPipelineStageMetric,
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
import { buildBestEffortScenarioConditions } from './lib/scenario-conditions';
import { Timestamp } from 'firebase-admin/firestore';
import { callModelProvider, setModelEventHandler, aggregateCosts, type ModelConfig, type ModelEvent, type TokenUsage } from './lib/model-providers';
import { getRecentScenarioSummaries, getThemeDistribution } from './storage';

// Engine-level event handlers — supports multiple concurrent bundle executions
type EngineEventHandler = (event: ModelEvent) => void;
const _engineEventHandlers = new Set<EngineEventHandler>();

export function setEngineEventHandler(fn: EngineEventHandler | null): void {
  _engineEventHandlers.clear();
  if (fn) _engineEventHandlers.add(fn);
  setModelEventHandler(fn ? (e) => _engineEventHandlers.forEach(h => { try { h(e); } catch { /* never throw */ } }) : null);
}

export function addEngineEventHandler(fn: EngineEventHandler): void {
  if (_engineEventHandlers.size > 0) {
    console.warn(`[EventHandlers] addEngineEventHandler called with ${_engineEventHandlers.size} existing handler(s) — possible leak`);
  }
  _engineEventHandlers.add(fn);
  setModelEventHandler((e) => _engineEventHandlers.forEach(h => { try { h(e); } catch { /* never throw */ } }));
}

export function removeEngineEventHandler(fn: EngineEventHandler): void {
  const deleted = _engineEventHandlers.delete(fn);
  if (!deleted) {
    console.warn(`[EventHandlers] removeEngineEventHandler: handler not found in set (size=${_engineEventHandlers.size})`);
  }
  if (_engineEventHandlers.size === 0) setModelEventHandler(null);
}

function emitEngineEvent(event: ModelEvent): void {
  _engineEventHandlers.forEach(h => { try { h(event); } catch { /* never throw */ } });
}
import { evaluateContentQuality } from './lib/content-quality';
import { validateSkeleton, validateEffects } from './lib/phase-validation';
import { combineEditorialReview, shouldSkipEditorialReview } from './lib/editorial-review';
import { evaluateNarrativeQuality } from './lib/narrative-review';
import { evaluateRenderedOutputQuality } from './lib/rendered-output-qa';
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
import type { GenerationMode } from './shared/generation-contract';
import { normalizeGenerationScopeInput } from './lib/generation-scope';
import {
  decideScenarioAcceptance,
  SCENARIO_ACCEPTANCE_POLICY_VERSION,
} from './lib/scenario-acceptance';
import { resolveTagsDeterministic, TAG_RESOLVER_VERSION } from './services/tag-resolver';
import { inferRequirementsFromNarrative } from './lib/audit-rules';
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
const ARCHITECT_CONFIG: ModelConfig = { maxTokens: 8192, temperature: 0.6, noThink: true };
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
      return '- Because actorPattern=ally, write the allied actor as natural language ("the allied government", "your formal ally", "the allied nation"). Never use relationship tokens. Set metadata.requires.formal_ally=true. If the option outcome affects the relationship, add a relationshipEffects entry with relationshipId="ally".';
    case 'adversary':
      return '- Because actorPattern=adversary, write the adversarial actor as natural language ("your main adversary", "the hostile power", "your adversary"). Never use relationship tokens. Set metadata.requires.adversary=true. If the option outcome affects the relationship, add a relationshipEffects entry with relationshipId="adversary".';
    case 'border_rival':
      return '- Because actorPattern=border_rival, write the border actor as natural language ("your border rival", "the neighboring rival", "the bordering rival state"). Never use relationship tokens. Set metadata.requires.land_border_adversary=true. If the option outcome affects the relationship, add a relationshipEffects entry with relationshipId="border_rival".';
    case 'mixed':
      return '- Because actorPattern=mixed, write all foreign actors as natural language ("your border rival", "the allied government", "your adversary", "your trade partner"). Never use relationship tokens. Set the appropriate metadata.requires flags (e.g., adversary=true, formal_ally=true). Add relationshipEffects entries on options that would realistically affect those relationships.';
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
  agentic_repair_enabled?: boolean;
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
    agentic_repair_enabled: raw.agentic_repair_enabled ?? false,
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
  conceptCount?: number;
  totalDurationMs?: number;
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
  const highSensitivityMetrics = new Set<string>();
  const lowSensitivityMetrics = new Set<string>();

  for (const id of applicableCountryIds) {
    const c = data[id];
    if (!c) {
      unknownIds.push(id);
      continue;
    }
    if (c.region) regions.push(c.region);

    const gdpRaw = c.facts?.economy?.gdp_nominal_usd ?? 0;
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
    const sensitivities: Record<string, number> = c.gameplay?.metric_sensitivities ?? {};
    for (const [metricId, value] of Object.entries(sensitivities)) {
      if (value >= 1.4) highSensitivityMetrics.add(metricId);
      if (value <= 0.5) lowSensitivityMetrics.add(metricId);
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

  const highSensLine = highSensitivityMetrics.size
    ? `High-sensitivity metrics (decisions here have amplified impact): ${[...highSensitivityMetrics].join(', ')}.`
    : '';
  const lowSensLine = lowSensitivityMetrics.size
    ? `Low-sensitivity metrics (muted impact for this country type): ${[...lowSensitivityMetrics].join(', ')}.`
    : '';
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
${highSensLine}
${lowSensLine}
${proportionalGuidance}

CRITICAL GEOPOLITICAL RULES:
- Use tokens for country/leader/institution names (e.g. {player_country}, {leader_title}, {legislature}, {governing_party}). Write "the {token}" naturally — no {the_X} prefix tokens. Write relationship actors as natural language ("your adversary", "the allied government", "your border rival") — never use relationship tokens.
- High-sensitivity metrics (listed above) have amplified political impact for this country — scenarios touching these metrics should reflect that volatility (higher stakes, faster consequences, more extreme public reactions).
- Low-sensitivity metrics (listed above) are structurally muted for this country — avoid framing decisions around these as if they are pivotal or career-defining.
- If any target country has an authoritarian or totalitarian governmentCategory, do NOT generate standard democratic election or coalition-politics scenarios for them.
- If any target country has tags like 'oil_exporter' or 'resources', preferentially include energy/resources-related stakes and effects.
- If any target country has tags like 'nuclear_state', use nuclear deterrence/escalation themes sparingly and realistically — no instant apocalypse.
- If any target country has tags like 'conflict_zone' or 'post_conflict', border tension, refugee flows, and security dilemmas are appropriate.
- When writing about {major_industry}, use the geopolitical tag context above to write sector-specific language. For example, if tags include 'oil_exporter', don't write "Your {major_industry} faces pressure" — write "Your {major_industry} faces a sustained drop in export demand as buyer nations accelerate energy transition". The token stays generic; the surrounding narrative must be specific.

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
                targetMetricId: { type: 'string', enum: [...ALL_METRIC_IDS] },
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
          relationshipEffects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                relationshipId: { type: 'string', enum: ['border_rival', 'adversary', 'ally', 'trade_partner', 'partner', 'rival', 'regional_rival', 'neutral', 'neighbor', 'nation'] },
                delta: { type: 'number', minimum: -100, maximum: 100 },
                probability: { type: 'number', minimum: 0, maximum: 1 }
              },
              required: ['relationshipId', 'delta']
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
        tags: { type: 'array', maxItems: 6, items: { type: 'string', enum: [...CANONICAL_SCENARIO_TAGS] } },
        requires: {
          type: 'object',
          properties: {
            land_border_adversary: { type: 'boolean' },
            formal_ally: { type: 'boolean' },
            adversary: { type: 'boolean' },
            trade_partner: { type: 'boolean' },
            nuclear_state: { type: 'boolean' },
            island_nation: { type: 'boolean' },
            landlocked: { type: 'boolean' },
            coastal: { type: 'boolean' },
            min_power_tier: { type: 'string', enum: ['superpower', 'great_power', 'regional_power', 'middle_power', 'small_state'] }
          }
        }
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
                targetMetricId: { type: 'string', enum: [...ALL_METRIC_IDS] },
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

function buildAdvisorFeedbackPrompt(
  coreScenario: { title: string; description: string; options: Array<{ id: string; text: string; label: string }> },
  scopeTier: ScenarioScopeTier,
): string {
  const optionsSummary = coreScenario.options.map(o => `- Option "${o.id}" (${o.label}): ${o.text}`).join('\n');
  const universalScopeRules = scopeTier === 'universal'
    ? `
- UNIVERSAL SCOPE: keep feedback domestically transferable. Do NOT write real institution names like Congress, the Treasury, the Federal Reserve, Parliament, or named ministries.
- UNIVERSAL SCOPE: avoid brittle regime-specific tokens such as {legislature}, {governing_party}, and {opposition_party} unless the scenario already requires them structurally. Prefer plain-language actors like lawmakers, budget officials, judges, regulators, auditors, or central-bank officials.
- UNIVERSAL SCOPE: do NOT mention absolute money figures or named currencies such as "$200 billion", "€5 billion", or pesos. Use relative language instead.`
    : '';
  return `Generate JSON only for advisor feedback.

SCENARIO: "${coreScenario.title}"
${coreScenario.description}

OPTIONS:
${optionsSummary}

Generate advisor feedback for exactly 7 advisors for EACH option. Choose the 7 advisors most relevant to THIS scenario's domain — omit advisors whose domains are not meaningfully affected.

ALL AVAILABLE ADVISORS (pick 7, use these roleId values exactly):
- role_executive: Chief political advisor — feasibility, authority, coalition impact
- role_diplomacy: Foreign affairs advisor — international relations, treaties, diplomacy
- role_defense: Defense advisor — military readiness, national security, armed forces
- role_economy: Finance/treasury advisor — fiscal impact, macroeconomic effects, budgets
- role_justice: Legal/judicial advisor — legal authority, constitutional constraints, courts
- role_health: Health advisor — public health impact, healthcare access, epidemiology
- role_commerce: Trade/commerce advisor — business impact, competitiveness, markets
- role_labor: Labor advisor — workforce effects, employment, unions, wages
- role_interior: Internal affairs advisor — domestic security, public order, civil services
- role_energy: Energy advisor — energy supply, grid stability, fuel policy
- role_environment: Environmental advisor — pollution, conservation, climate regulation
- role_transport: Infrastructure advisor — logistics, roads, ports, transit systems
- role_education: Education advisor — schools, universities, workforce readiness

Select the same 7 advisors for every option (consistency). Prefer advisors directly impacted by the scenario's primary metrics.

RULES:
- Each feedback: 1-2 sentences, 30-50 words, specific to THIS scenario's mechanism and this advisor's domain
- Name the specific policy mechanism, affected constituency, and causal chain — not generic boilerplate
- Use {token} placeholders for institutions (e.g., the {legislature}, the {central_bank}). NEVER hardcode institution names.
- Use only token spellings that already appear in the token system for this run. Do NOT invent tokens.
- Stances must vary across options — at least 4 advisors should change stance between options
- Avoid generic civics phrases like "the government", "the administration", or "officials said". Address the player's decision directly and name the concrete domestic actor affected.
- NEVER write these boilerplate patterns (automatic rejection):
  "aligns well with our priorities", "supports this course of action", "could undermine our objectives",
  "has serious concerns about this approach", "limited direct impact on operations",
  "no strong position on this matter", "both risks and potential benefits", "warrants careful monitoring",
  "aligns with our", "our department", "course of action", "careful monitoring"
- INVALID TOKENS in feedback: {international_lender}, {international_investor}, {international_monitor}, {imf}, {world_bank}, {public_order}, {governing_party_leader} — use plain language instead
${universalScopeRules}

Return JSON: { advisorsByOption: [{ optionId, advisorFeedback: [{ roleId, stance, feedback }] }] }`;
}

// ------------------------------------------------------------------
// Main Entry Point
// ------------------------------------------------------------------

export interface GenerationRequest {
  mode: 'news' | 'manual' | 'blitz' | 'full_send';
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
  abortSignal?: AbortSignal;
  /** Job ID for pipeline stage metric attribution. */
  jobId?: string;
}

export async function generateScenarios(request: GenerationRequest): Promise<GenerationResult> {
  if (!isValidBundleId(request.bundle)) {
    throw new Error(`Invalid bundle: ${request.bundle}. Valid bundles: ${ALL_BUNDLE_IDS.join(', ')}`);
  }

  const accumulator = createTokenAccumulator();
  addEngineEventHandler(accumulator.handler);

  try {

  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();
  await initializeAuditConfig(db);
  const compiledRegistry = await loadCompiledTokenRegistry();
  const validTokenSet = new Set(compiledRegistry.allTokens);
  const rejectionBuffer = new TokenRejectionBuffer();
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

  if (rawConcepts.length > request.count) {
    console.warn(`[ScenarioEngine] Architect over-produced concepts: requested=${request.count}, received=${rawConcepts.length}. Trimming to requested count.`);
    rawConcepts = rawConcepts.slice(0, request.count);
  }

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
  const conceptDurations: number[] = [];

  // 2. PHASE 2 & 3: Parallel Loop Expansion (batches of CONCURRENCY)
  const expandConcept = async (concept: any, idx: number): Promise<BundleScenario[]> => {
    const conceptStartMs = Date.now();
    console.log(`[ScenarioEngine] Expanding concept ${idx + 1}/${concepts.length}: ${concept.concept}`);
    emitEngineEvent({ level: 'info', code: 'concept_expand', message: `Concept ${idx + 1}/${concepts.length} — ${concept.concept.slice(0, 120)}`, data: { idx: idx + 1, total: concepts.length, desiredActs: concept.desiredActs } });

    const runAttempt = async (): Promise<BundleScenario[]> => {
      const loop = await expandConceptToLoop(concept, request.bundle, request.mode, {
        ...request,
        countryCatalogSource: countryCatalog.source,
        countries: countryCatalog.countries,
        compiledValidTokenSet: validTokenSet,
        rejectionBuffer,
        compiledRegistry,
        scopeTier: resolvedScope.scopeTier,
        scopeKey: resolvedScope.scopeKey,
        clusterId: resolvedScope.clusterId,
        exclusivityReason: resolvedScope.exclusivityReason,
        sourceKind: resolvedScope.sourceKind,
        lowLatencyMode: isBulkSafeMode,
      });
      normalizeLoopStructure(loop);

      const validatedLoop: BundleScenario[] = [...loop];

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
      const retry = await runAttempt();
      if (retry.length === 0) {
        emitEngineEvent({ level: 'warning', code: 'concept_zero_output', message: `Concept ${idx + 1} yielded 0 scenarios after all retries: "${concept.concept.slice(0, 100)}"`, data: { idx: idx + 1, concept: concept.concept.slice(0, 200) } });
      }
      return retry;
    } catch (err) {
      console.warn(`[ScenarioEngine] Concept ${idx + 1} attempt 1 threw, retrying:`, err);
      try {
        return await runAttempt();
      } catch (retryErr) {
        const errMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.error(`[ScenarioEngine] Critical failure on concept ${idx} after retry:`, retryErr);
        emitEngineEvent({ level: 'error', code: 'concept_critical_failure', message: `Concept ${idx + 1} failed after all retries: ${errMsg}`, data: { idx: idx + 1, concept: concept.concept.slice(0, 200), error: errMsg } });
        return [];
      }
    } finally {
      completedCount++;
      conceptDurations.push(Date.now() - conceptStartMs);
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

  const CANONICAL_TAG_SET_LOCAL = new Set<string>(CANONICAL_SCENARIO_TAGS);

  const enrichScenario = (scenario: BundleScenario): BundleScenario => {
    // Resolve tags via deterministic keyword/metric analysis
    const { tags: resolvedTags, confidence } = resolveTagsDeterministic(scenario);
    // Infer structural geopolitical requirements from narrative text
    const narrativeCorpus = [
      scenario.title,
      scenario.description,
      ...(scenario.options ?? []).flatMap((o) => [o.text, o.outcomeHeadline, o.outcomeSummary]),
    ].filter(Boolean).join(' ');
    const inferredRequires = inferRequirementsFromNarrative(narrativeCorpus, scenario.metadata?.requires);

    // Normalize any remaining raw tags through canonical filter as fallback
    const rawTags: string[] = Array.isArray(scenario.metadata?.tags) ? scenario.metadata!.tags as string[] : [];
    const normalizedRaw = rawTags
      .map((t) => String(t).toLowerCase().replace(/[\s-]+/g, '_').trim())
      .filter((t) => CANONICAL_TAG_SET_LOCAL.has(t));

    // Merge: resolver tags + any normalized raw tags the resolver missed
    const mergedTags = Array.from(new Set([...resolvedTags, ...normalizedRaw])).slice(0, 6);

    // Auto-inject conditions for state-implying tags
    const existingConditions: Array<{ metricId: string; min?: number; max?: number }> =
      Array.isArray(scenario.conditions) ? [...scenario.conditions] : [];
    for (const tag of mergedTags) {
      const implied = STATE_TAG_CONDITION_MAP[tag];
      if (!implied) continue;
      const covered = existingConditions.some(
        (c) => c.metricId === implied.metricId && (implied.op === 'max' ? c.max !== undefined : c.min !== undefined)
      );
      if (!covered) {
        existingConditions.push(
          implied.op === 'max'
            ? { metricId: implied.metricId, max: implied.threshold }
            : { metricId: implied.metricId, min: implied.threshold }
        );
      }
    }

    const mergedRequires = Object.keys(inferredRequires).length > 0
      ? { ...scenario.metadata?.requires, ...inferredRequires }
      : scenario.metadata?.requires;

    return {
      ...scenario,
      conditions: existingConditions,
      metadata: {
        ...scenario.metadata,
        tags: mergedTags,
        tagResolution: {
          status: 'resolved',
          method: 'deterministic',
          resolverVersion: TAG_RESOLVER_VERSION,
          resolvedAt: new Date().toISOString(),
          resolvedTags: resolvedTags,
          confidence,
        },
        bundle: request.bundle,
        scopeTier: resolvedScope.scopeTier,
        scopeKey: resolvedScope.scopeKey,
        ...(resolvedScope.clusterId ? { clusterId: resolvedScope.clusterId } : {}),
        ...(resolvedScope.exclusivityReason ? { exclusivityReason: resolvedScope.exclusivityReason } : {}),
        sourceKind: resolvedScope.sourceKind,
        difficulty: scenario.metadata?.difficulty || 3,
        ...(resolvedScope.applicableCountries?.length ? { applicable_countries: resolvedScope.applicableCountries } : {}),
        ...(derivedRegionTags.length ? { region_tags: derivedRegionTags } : {}),
        ...(mergedRequires ? { requires: mergedRequires } : {}),
      },
    };
  };

  // Process in parallel batches. Enrich each scenario with final metadata immediately
  // after its batch completes, then invoke the optional onScenarioAccepted callback so
  // callers can persist scenarios incrementally rather than waiting for the full batch.
  for (let batchStart = 0; batchStart < concepts.length; batchStart += CONCURRENCY) {
    if (request.abortSignal?.aborted) {
      console.warn(`[ScenarioEngine] Abort signal received — stopping after ${allProduced.length} scenarios`);
      emitEngineEvent({ level: 'warning', code: 'engine_aborted', message: `Abort signal received — ${allProduced.length} scenarios produced before abort`, data: { producedCount: allProduced.length } });
      break;
    }
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
        }, request.bundle).catch((err) => {
          console.warn(`[ScenarioEngine] persistAcceptedConcept failed (non-fatal): ${err instanceof Error ? err.message : err}`);
        });
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
    ...(conceptDurations.length > 0 ? {
      conceptCount: conceptDurations.length,
      totalDurationMs: conceptDurations.reduce((s, d) => s + d, 0),
    } : {}),
  };

  try {
    await rejectionBuffer.flush();
  } catch (err) {
    console.warn('[ScenarioEngine] Failed to flush rejection tracker:', err);
  }

  return { scenarios, tokenSummary };

  } finally {
    removeEngineEventHandler(accumulator.handler);
  }
}

// ------------------------------------------------------------------
// LLM Repair — Targeted Action System
// ------------------------------------------------------------------

const REPAIR_ACTION_PROMPTS: Record<string, string> = {
  'text-expansion': `Expand the flagged fields to meet minimum length requirements.
SPECIFIC THRESHOLDS:
- outcomeContext: 400+ characters AND 4+ sentences (70–100 words). Structure: name an institution/actor → describe the mechanism → include a reaction (opposition/market/public) → close with a broader implication.
- outcomeSummary: 250+ characters AND 2+ sentences (one lede + one expansion).
- description: 60+ words.
- options[].text: 50+ words each.
Add mechanism details, affected groups, institutional reactions, or market impacts.
Do not change the meaning or tone — only add substantive content.
Do NOT introduce new token placeholders unless they are on the approved whitelist.
CRITICAL: NEVER use curly-brace placeholders {like_this} in your expanded text unless they exactly match the approved whitelist. Write all institution names, roles, and country references as plain English.
CRITICAL: Return the COMPLETE expanded text for each field, not just the added portion.
The returned text must be LONGER than the original — never truncate.`,

  'token-fix': `Fix token usage errors:
- Use only tokens from the approved minimal set. Write "the {finance_role}" or "your {defense_role}" naturally — no {the_X} prefix tokens.
- Replace {opposition} in prose → use {opposition_party}.
- Replace {president} or {prime_minister} → use {leader_title}.
- Replace {country} or {country_name} → use {player_country}.
- Replace hardcoded currency names with {currency} token.
- Replace any relationship token placeholders in prose with natural language ("your adversary", "the allied government", "your border rival", "a neighboring state").`,

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
- Replace hardcoded government structure terms (e.g. "ruling coalition" → "{governing_party}")
- Remove jargon ("bloc" → "alliance", "gambit" → "move")
- Remove banned phrases ("the government" in second-person fields → "your government")`,

  'option-differentiation-fix': `Fix option differentiation and optionDomains alignment:
- If metadata.optionDomains is present, each option must include at least one effect targeting its assigned primary metric.
- Avoid giving all three options the same metric set.
- Keep each option at 2-4 effects and preserve realistic effect magnitudes.`,
};

function buildRepairPromptForAction(
  action: RepairAction,
  scenario: BundleScenario,
  currentScore: number,
  passThreshold: number,
  compiledRegistry?: CompiledTokenRegistry
): string {
  const concepts: ReadonlyArray<{ concept: string; token: string }> = compiledRegistry
    ? compiledRegistry.conceptToTokenMap
    : CONCEPT_TO_TOKEN_MAP;
  const conceptTokenTable = concepts
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
  if (action.type === 'advisor-regen' || action.type === 'voice-fix' || action.type === 'tone-fix' || action.type === 'token-fix' || action.type === 'option-differentiation-fix') {
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
      ...(action.type === 'option-differentiation-fix' ? { effects: o.effects } : {}),
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
2. Preserve ALL institution tokens exactly (e.g. {leader_title}, {legislature}, {finance_role}). Keep natural language relationship phrases unchanged.
3. The returned JSON must never contain the literal substring "the {" anywhere.
4. Do NOT change effects, metric IDs, durations, probabilities, or any numeric data UNLESS action type is "option-differentiation-fix".
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
        ...(patchedOpt.effects !== undefined ? { effects: patchedOpt.effects } : {}),
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
  maxAttempts?: number,
  compiledRegistry?: CompiledTokenRegistry
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

      const prompt = buildRepairPromptForAction(action, currentScenario, currentScore, passThreshold, compiledRegistry);
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
        const repairTokenStrategy = deriveTokenStrategy((scenario.metadata as any)?.scopeTier ?? 'universal');
        if (repairTokenStrategy !== 'none') {
          normalizeTokenAliases(candidate.title) && (candidate.title = normalizeTokenAliases(candidate.title));
          candidate.description = normalizeTokenAliases(candidate.description);
          for (const opt of candidate.options) {
            opt.text = normalizeTokenAliases(opt.text);
            if (opt.outcomeHeadline) opt.outcomeHeadline = normalizeTokenAliases(opt.outcomeHeadline);
            if (opt.outcomeSummary) opt.outcomeSummary = normalizeTokenAliases(opt.outcomeSummary);
            if (opt.outcomeContext) opt.outcomeContext = normalizeTokenAliases(opt.outcomeContext);
          }
        }
        deterministicFix(candidate);
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
  mode: GenerationMode,
  countryCatalogSource: CountryCatalogSourceMetadata,
  countries: Record<string, any>,
  modelConfig?: GenerationModelConfig,
  skipEditorialReview?: boolean,
  validTokenSet?: ReadonlySet<string>,
  rejectionBuffer?: TokenRejectionBuffer,
  compiledRegistry?: CompiledTokenRegistry
): Promise<{ scenario: BundleScenario | null; score: number; issues: any[] }> {
  const PRE_EDITORIAL_BLOCKING_RULE_IDS = new Set([
    'invalid-token',
    'token-casing-error',
    'missing-advisor-feedback',
    'missing-role-feedback',
    'missing-headline',
    'missing-summary',
    'missing-context',
    'short-summary',
    'short-article',
    'outcome-second-person',
    'third-person-framing',
  ]);

  const isNews = mode === 'news';

  console.log(`[Draft] ── incoming scenario ────────────────────────────────────────────`);
  console.log(`[Draft] title:       ${scenario.title ?? '(none)'}`);
  console.log(`[Draft] description: ${(scenario.description ?? '').slice(0, 300)}${(scenario.description ?? '').length > 300 ? '…' : ''}`);
  scenario.options?.forEach((opt, i) => {
    console.log(`[Draft] option[${i}]:  ${(opt.text ?? '').slice(0, 120)}${(opt.text ?? '').length > 120 ? '…' : ''}`);
  });
  console.log(`[Draft] ─────────────────────────────────────────────────────────────────`);

  const sampleTokenMaps: Array<Record<string, string>> = [];
  const countryKeys = Object.keys(countries);
  const sampleKeys = countryKeys.length <= 3 ? countryKeys : countryKeys.slice(0, 3);
  for (const key of sampleKeys) {
    const tokens = countries[key]?.tokens;
    if (tokens && typeof tokens === 'object') {
      sampleTokenMaps.push(tokens as Record<string, string>);
    }
  }

  const scenarioTokenStrategy = deriveTokenStrategy((scenario.metadata as any)?.scopeTier ?? 'universal');

  if (scenarioTokenStrategy !== 'none') {
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

    if (sampleTokenMaps.length > 0) {
      scenario.title = retokenizeText(scenario.title, sampleTokenMaps);
      scenario.description = retokenizeText(scenario.description, sampleTokenMaps);
      for (const opt of scenario.options) {
        opt.text = retokenizeText(opt.text, sampleTokenMaps);
        if (opt.label) opt.label = retokenizeText(opt.label, sampleTokenMaps);
        if (opt.outcomeHeadline) opt.outcomeHeadline = retokenizeText(opt.outcomeHeadline, sampleTokenMaps);
        if (opt.outcomeSummary) opt.outcomeSummary = retokenizeText(opt.outcomeSummary, sampleTokenMaps);
        if (opt.outcomeContext) opt.outcomeContext = retokenizeText(opt.outcomeContext, sampleTokenMaps);
        if ((opt as any).advisorFeedback) {
          for (const fb of (opt as any).advisorFeedback) {
            if (fb.feedback) fb.feedback = retokenizeText(fb.feedback, sampleTokenMaps);
          }
        }
      }
    }
  }

  normalizeScenarioTextFields(scenario);

  const earlyTokenValidator = (t: string) => (validTokenSet ? validTokenSet.has(t) : isValidToken(t));
  deterministicFix(scenario);
  if (scenarioTokenStrategy !== 'none') {
    sanitizeInventedTokens(scenario, earlyTokenValidator);
  }

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

  // Token whitelist hard gate — reject invented tokens before any further processing
  const allTextContent = [
    scenario.title,
    scenario.description,
    ...scenario.options.flatMap(o => [o.text, o.label, o.outcomeHeadline, o.outcomeSummary, o.outcomeContext]),
    ...scenario.options.flatMap(o => ((o as any).advisorFeedback || []).map((f: any) => f.feedback))
  ].filter(Boolean).join(' ');

  const tokenValidator = (t: string) => (validTokenSet ? validTokenSet.has(t) : isValidToken(t));
  const foundTokens = [...allTextContent.matchAll(/\{([a-z_]+)\}/g)].map(m => m[1]);
  const inventedTokensBefore = foundTokens.filter(t => !tokenValidator(t));

  if (inventedTokensBefore.length > 0) {
    const { sanitized, replaced } = sanitizeInventedTokens(scenario, tokenValidator);
    if (sanitized) {
      console.log(`[ScenarioEngine] Scenario ${scenario.id}: sanitized ${replaced.length} invented token(s) → plain text: ${replaced.join('; ')}`);
    }
  }

  // Re-collect tokens after sanitization for the hard-gate check
  const allTextContentAfterSanitize = [
    scenario.title,
    scenario.description,
    ...scenario.options.flatMap(o => [o.text, o.label, o.outcomeHeadline, o.outcomeSummary, o.outcomeContext]),
    ...scenario.options.flatMap(o => ((o as any).advisorFeedback || []).map((f: any) => f.feedback))
  ].filter(Boolean).join(' ');
  const inventedTokens = [...allTextContentAfterSanitize.matchAll(/\{([a-z_]+)\}/g)]
    .map(m => m[1])
    .filter(t => !tokenValidator(t));

  if (inventedTokens.length > 0) {
    if (rejectionBuffer) {
      for (const tokenName of inventedTokens) {
        const marker = `{${tokenName}}`;
        const tokenIndex = allTextContent.indexOf(marker);
        const snippetStart = tokenIndex >= 0 ? Math.max(0, tokenIndex - 40) : 0;
        const snippetEnd = tokenIndex >= 0 ? tokenIndex + marker.length + 40 : 120;
        rejectionBuffer.record({
          tokenName,
          scenarioId: scenario.id,
          bundle,
          field: 'all',
          context: allTextContent.substring(snippetStart, snippetEnd),
        });
      }
    }
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

  const heuResult = heuristicFix(scenario, issues, bundle);
  if (heuResult.fixed) {
    issues = auditScenario(scenario, bundle, isNews);
  }

  // 3a. Grounded Effects Repair
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
    }
  } catch (error: any) {
    console.warn(`[ScenarioEngine] Grounded effects repair failed:`, error.message);
  }

  const { llm_repair_enabled, audit_pass_threshold: repairThreshold } = await getGenerationConfig();
  const preRepairCurrentScore = scoreScenario(issues);
  const scoreGap = repairThreshold - preRepairCurrentScore;

  if (llm_repair_enabled && issues.length > 0 && preRepairCurrentScore < repairThreshold && scoreGap <= 20) {
    let repaired: BundleScenario | null = null;

    repaired = await executeRepairActions(scenario, issues, bundle, isNews, repairThreshold, modelConfig, 1, compiledRegistry);

    if (repaired) {
      scenario.title = repaired.title;
      scenario.description = repaired.description;
      scenario.options = repaired.options;
      if (scenarioTokenStrategy !== 'none') {
        scenario.title = normalizeTokenAliases(scenario.title);
        scenario.description = normalizeTokenAliases(scenario.description);
        for (const opt of scenario.options) {
          opt.text = normalizeTokenAliases(opt.text);
          if (opt.outcomeHeadline) opt.outcomeHeadline = normalizeTokenAliases(opt.outcomeHeadline);
          if (opt.outcomeSummary) opt.outcomeSummary = normalizeTokenAliases(opt.outcomeSummary);
          if (opt.outcomeContext) opt.outcomeContext = normalizeTokenAliases(opt.outcomeContext);
          if ((opt as any).advisorFeedback) {
            for (const fb of (opt as any).advisorFeedback) {
              if (fb.feedback) fb.feedback = normalizeTokenAliases(fb.feedback);
            }
          }
        }
        if (sampleTokenMaps.length > 0) {
          scenario.title = retokenizeText(scenario.title, sampleTokenMaps);
          scenario.description = retokenizeText(scenario.description, sampleTokenMaps);
          for (const opt of scenario.options) {
            opt.text = retokenizeText(opt.text, sampleTokenMaps);
            if (opt.outcomeHeadline) opt.outcomeHeadline = retokenizeText(opt.outcomeHeadline, sampleTokenMaps);
            if (opt.outcomeSummary) opt.outcomeSummary = retokenizeText(opt.outcomeSummary, sampleTokenMaps);
            if (opt.outcomeContext) opt.outcomeContext = retokenizeText(opt.outcomeContext, sampleTokenMaps);
            if ((opt as any).advisorFeedback) {
              for (const fb of (opt as any).advisorFeedback) {
                if (fb.feedback) fb.feedback = retokenizeText(fb.feedback, sampleTokenMaps);
              }
            }
          }
        }
      }
      normalizeScenarioTextFields(scenario);
      deterministicFix(scenario);
      if (scenarioTokenStrategy !== 'none') {
        sanitizeInventedTokens(scenario, tokenValidator);
      }
      issues = auditScenario(scenario, bundle, isNews);
    }
  } else if (llm_repair_enabled && issues.length > 0 && preRepairCurrentScore < repairThreshold && scoreGap > 20) {
    console.log(`[ScenarioEngine] Scenario ${scenario.id}: score gap ${scoreGap} (>20) — skipping LLM repair, re-draft recommended`);
    emitEngineEvent({ level: 'warning', code: 'repair_skipped_hopeless', message: `Score ${preRepairCurrentScore} (gap ${scoreGap}) too far from threshold — re-draft recommended`, data: { scenarioId: scenario.id, score: preRepairCurrentScore, gap: scoreGap, threshold: repairThreshold } });
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

  // Derive requires metadata from token usage — ensures the iOS client only shows
  // scenarios to countries that can resolve all relationship tokens.
  const requiresCorpus = [
    scenario.title, scenario.description,
    ...scenario.options.map((o) => o.text),
    ...scenario.options.map((o) => o.outcomeSummary).filter(Boolean),
    ...scenario.options.map((o) => o.outcomeContext).filter(Boolean),
  ].join(' ');
  const derivedRequires = inferRequirementsFromNarrative(
    requiresCorpus,
    scenario.metadata?.requires as ScenarioRequirements | undefined,
  );
  if (Object.keys(derivedRequires).length > 0) {
    if (!scenario.metadata) scenario.metadata = {};
    scenario.metadata.requires = {
      ...(scenario.metadata.requires as ScenarioRequirements | undefined),
      ...derivedRequires,
    };
  }

  const hasCountries = Object.keys(countries).length > 0;
  const renderedOutputResult = hasCountries
    ? evaluateRenderedOutputQuality(scenario, countries, { strictScopeTier: scenario.metadata?.scopeTier })
    : null;
  if (renderedOutputResult && scenario.metadata) {
    (scenario.metadata as any).renderedOutputQA = {
      pass: renderedOutputResult.pass,
      sampleCount: renderedOutputResult.sampleCount,
      issueCount: renderedOutputResult.issues.length,
      sampleCountryIds: renderedOutputResult.samples.map((sample) => sample.countryId),
    };
  }

  const renderedOutputGate = {
    enabled: hasCountries,
    usable: renderedOutputResult !== null,
    result: renderedOutputResult,
    error: undefined as string | undefined,
  };

  const hasPreEditorialBlockingIssues =
    score < audit_pass_threshold ||
    (hasCountries && renderedOutputResult !== null && !renderedOutputResult.pass) ||
    issues.some((issue) => PRE_EDITORIAL_BLOCKING_RULE_IDS.has(issue.rule));

  const effectiveContentQualityEnabled =
    (Boolean(content_quality_gate_enabled) || isOllamaJob) &&
    !hasPreEditorialBlockingIssues &&
    !skipEditorialReview &&
    !(skipEditorialReview && Boolean(enable_conditional_editorial_review));
  const effectiveNarrativeReviewEnabled =
    (Boolean(narrative_review_enabled) || isOllamaJob) &&
    !hasPreEditorialBlockingIssues &&
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

  if (!effectiveContentQualityEnabled && hasPreEditorialBlockingIssues) {
    contentQualityGate.error = 'Skipped content quality review because deterministic audit/render checks already failed.';
  }

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

  if (!effectiveNarrativeReviewEnabled && hasPreEditorialBlockingIssues) {
    narrativeReviewGate.error = 'Skipped narrative review because deterministic audit/render checks already failed.';
  }

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

  const editorialReview = combineEditorialReview(contentQualityGate, narrativeReviewGate);
  if (scenario.metadata) {
    (scenario.metadata as any).editorialReview = {
      pass: editorialReview.pass,
      usable: editorialReview.usable,
      overallScore: editorialReview.overallScore,
      regenerateFields: editorialReview.regenerateFields,
      editorialNotes: editorialReview.editorialNotes,
      reasons: editorialReview.reasons,
      contentQualityOverall: editorialReview.contentQuality?.overallScore,
      narrativeOverall: editorialReview.narrativeReview?.overallScore,
    };
  }

  const acceptanceDecision = decideScenarioAcceptance({
    auditScore: score,
    auditPassThreshold: audit_pass_threshold,
    issues,
    contentQualityGate,
    narrativeReviewGate,
    renderedOutputGate,
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
      editorialReview: acceptanceDecision.editorialReview,
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
    lowLatencyMode
      ? Promise.resolve([] as Array<{ title: string; description: string }>)
      : getRecentScenarioSummaries(request.bundle, 30, {
          scopeTier: resolvedScope.scopeTier,
          scopeKey: resolvedScope.scopeKey,
          sourceKind: resolvedScope.sourceKind,
        }),
    lowLatencyMode
      ? Promise.resolve(new Map<string, number>())
      : getThemeDistribution(request.bundle, {
          scopeTier: resolvedScope.scopeTier,
          scopeKey: resolvedScope.scopeKey,
          sourceKind: resolvedScope.sourceKind,
        }),
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
    Generate ${request.count} unique governance scenario concepts for the '${request.bundle}' bundle of a political simulation game called The Administration. Output valid JSON only.

    CONCEPT QUALITY RULES:
    - Each concept MUST be 2-3 sentences with: (1) a concrete trigger event with a named actor using {tokens}, (2) the dilemma stakes, and (3) the implicit policy tension.
    - NOT acceptable: "Balancing AI Innovation with Privacy Concerns" (topic label, no trigger event, no actor, no dilemma)
    - NOT acceptable: "Managing Cybersecurity Risks" (label-style, no concrete situation)
    - ACCEPTABLE: "The tech regulator has approved a surveillance AI system that logs all public communications. Civil liberties groups are mobilizing nationally while the {defense_role} argues the system is essential for threat detection. You must decide whether to deploy, restrict, or ban it before the {legislature} forces the issue."
    - Concepts must present a genuine dilemma — the best response must not be obvious.

    TOKEN RULES FOR CONCEPTS:
    - Use {token} placeholders for all country names, institutions, currencies, and named roles.
    - NEVER write region names or country names in plain text (e.g. "asia", "europe", "south america", "brazil"). Use "the region", "the country", or a token instead.
    - Use tokens semantically correctly:
      - {central_bank}: monetary authority ONLY — interest rates, currency reserves, banking regulation. NOT for general regulators, AI oversight, or non-monetary policy.
      - {legislature}: legislative chamber — NOT executive action or regulatory agencies.
      - {finance_role}: fiscal/budget minister — NOT general policy minister.
      - When a concept involves regulatory oversight outside these domains, use plain language ("regulators", "auditors") rather than forcing a wrong token.

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
        ? "one of 'domestic' | 'cabinet' | 'judiciary' — universal scope ONLY. Do NOT use 'legislature', 'ally', 'adversary', 'border_rival', or 'mixed'; relationship tokens and country-specific constitutional setups are prohibited in universal scenarios.\n      - domestic: internal actor (protest group, industry, regional faction)\n      - cabinet: a cabinet minister or internal faction is the central actor\n      - judiciary: courts or rule-of-law tensions are the central actor"
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
  mode: GenerationMode,
  request?: { region?: string; regions?: string[]; applicable_countries?: string[]; countryCatalogSource?: CountryCatalogSourceMetadata; countries?: Record<string, any>; modelConfig?: GenerationModelConfig; onAttemptFailed?: GenerationRequest['onAttemptFailed']; scopeTier?: ScenarioScopeTier; scopeKey?: string; clusterId?: string; exclusivityReason?: ScenarioExclusivityReason; sourceKind?: ScenarioSourceKind; lowLatencyMode?: boolean; compiledValidTokenSet?: ReadonlySet<string>; rejectionBuffer?: TokenRejectionBuffer; compiledRegistry?: CompiledTokenRegistry; jobId?: string }
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
    isOllamaRun ? Promise.resolve(getCompactDrafterPromptBase(deriveTokenStrategy(scopeTier))) : getDrafterPromptBase(request?.compiledRegistry, deriveTokenStrategy(scopeTier)),
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
    ? (isOllamaRun ? 2 : 1)
    : Math.max(1, (await getGenerationConfig()).max_llm_repair_attempts);
  const allExpectedIds = blueprint.acts.map((a: any) => `${baseId}_act${a.actIndex}`);

  let resolvedDrafterPromptBase = drafterPromptBase;
  if (drafterPromptBase.includes('{{TOKEN_CONTEXT}}')) {
    const { countries: allCountries } = await loadCountriesData();
    let primaryCountryData: Record<string, any> | undefined;
    if (request?.applicable_countries?.length) {
      primaryCountryData = allCountries[request.applicable_countries[0]];
    }
    const tokenStrategy = deriveTokenStrategy(scopeTier);
    const tokenContext = tokenStrategy === 'none' && primaryCountryData
      ? buildExclusivePromptSection(primaryCountryData)
      : buildMinimalTokenPromptSection();
    resolvedDrafterPromptBase = drafterPromptBase.replace('{{TOKEN_CONTEXT}}', tokenContext);
  }

  // 2. Draft All Acts in Parallel (Drafter)
  // allSettled so a single failing act doesn't discard in-flight sibling API calls
  const actSettled = await Promise.allSettled(blueprint.acts.map(async (actPlan: any) => {
    let actScenario: BundleScenario | null = null;
    let lastAuditResult: { scenario: BundleScenario | null; score: number; issues: any[] } | null = null;
    let previousAttemptScore: number | undefined;

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

        ${getLogicParametersPrompt(concept.severity as 'low' | 'medium' | 'high' | 'critical' | undefined, request?.compiledRegistry)}
        ${getCompactAuditRulesPrompt(request?.compiledRegistry)}

        BUNDLE-SPECIFIC GUIDANCE:
        ${bundleOverlay.drafter}

        SCOPE-SPECIFIC GUIDANCE:
        ${scopeOverlay.drafter}

        METADATA REQUIREMENTS:
        - severity: one of 'low', 'medium', 'high', 'critical'
        - urgency: one of 'low', 'medium', 'high', 'immediate'
        - difficulty: integer 1-5 matching concept difficulty (${concept.difficulty || 3})
        - tags: 2-4 relevant tags
        - conditions: follow canonical rules from prompt. DIRECTION: degraded/declining/underfunded premise → max bound. Strong/elevated/opportunity premise → min bound. Maximum 2 entries, [] when not needed.
        - requires: declare structural preconditions when foreign relationship actors are involved (e.g., { "adversary": true }, { "land_border_adversary": true }, { "formal_ally": true }). Omit for domestic scenarios.
        - relationship_conditions: omit for domestic/internal scenarios
        - relationshipEffects on options: add when an option outcome would realistically change a relationship score (e.g., { "relationshipId": "adversary", "delta": -15 })

        ${resolvedDrafterPromptBase}
        `;
      } else {
        drafterPrompt = `
        **MANDATORY: USE TOKEN PLACEHOLDERS FOR INSTITUTIONS — NATURAL LANGUAGE FOR RELATIONSHIPS:**
        BAD: "The Finance Ministry announced new tariffs on Brazilian imports, drawing criticism from the opposition party."
        GOOD: "the {finance_role} announced new tariffs on imports from your trade partner, drawing criticism from the {opposition_party}."

        BAD: "The president ordered the military to secure the border with Russia."
        GOOD: "{leader_title} ordered {armed_forces_name} to secure the border with your border rival."

        GOVERNMENT ROLES → MUST use tokens: {finance_role}, {defense_role}, {foreign_affairs_role}, {leader_title}, {legislature}, {governing_party}, {armed_forces_name}, {central_bank}, {intelligence_agency}, {police_force}, {judicial_role}, {prosecutor_role}, etc.
        Write "the {finance_role}" or "your {defense_role}" naturally — NO {the_X} prefix tokens.
        RELATIONSHIP ACTORS → Write as natural language: "your border rival", "the allied government", "your main adversary", "your trade partner", "a neighboring rival". NEVER use relationship tokens.
        COUNTRY NAMES → Never hardcode. Use {player_country} for the player's country only.
        OPTION DOMAIN CONTRACT → if OPTION DOMAIN REQUIREMENTS are present, each option must include at least one effect on its assigned primary metric.

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

        ${getLogicParametersPrompt(concept.severity as 'low' | 'medium' | 'high' | 'critical' | undefined, request?.compiledRegistry)}
        ${isOllamaRun ? getCompactAuditRulesPrompt(request?.compiledRegistry) : getAuditRulesPrompt(request?.compiledRegistry)}

        BUNDLE-SPECIFIC GUIDANCE:
        ${bundleOverlay.drafter}

        SCOPE-SPECIFIC GUIDANCE:
        ${scopeOverlay.drafter}

        METADATA REQUIREMENTS:
        - severity: must be one of 'low', 'medium', 'high', 'critical'
        - urgency: must be one of 'low', 'medium', 'high', 'immediate'
        - difficulty: integer 1-5 matching concept difficulty (${concept.difficulty || 3})
        - tags: 2-4 relevant tags for this scenario
        - conditions: follow canonical rules from prompt. DIRECTION: degraded/declining/underfunded premise → max bound. Strong/elevated/opportunity premise → min bound. (e.g. military readiness declining → metric_military max 45, NOT min). Maximum 2 entries.
        - requires: if the scenario involves a foreign relationship actor, declare the structural precondition. Examples: { "adversary": true }, { "land_border_adversary": true }, { "formal_ally": true }, { "trade_partner": true }, { "nuclear_state": true }. Omit for purely domestic/internal scenarios.
        - relationship_conditions: (optional numeric gating) only include when a specific relationship strength threshold is required for the scenario to make sense (e.g. a peace deal requiring strength > 20). Maximum 3 entries.
        - relationshipEffects on options: for each option whose outcome would realistically improve or worsen a relationship, add a relationshipEffects array. Use role IDs matching the requires block. Example: { "relationshipId": "border_rival", "delta": -20 } for a military confrontation. Omit for domestic/economic options.

        ${resolvedDrafterPromptBase}

        # ⚠️ CRITICAL FINAL REMINDER ⚠️

        **SENTENCE COUNT**: description = 2–3 sentences. Each option text = 2–3 sentences. Count . ? ! — fewer than 2 or more than 3 = REJECTED.

        **EFFECT COUNT**: Each option = 2–4 effects only. Five or more on any option = REJECTED.

        **VOICE (WRONG VOICE = REJECTED)**:
        - description, option text, advisorFeedback → SECOND PERSON: "You face...", "Your administration..."
        - outcomeHeadline, outcomeSummary, outcomeContext → THIRD PERSON (newspaper): "The administration...", "Officials announced..."
        - NEVER "you"/"your" in any outcome field. NEVER "the administration"/"the government" in description or option text.

        **ACTIVE VOICE (>50% PASSIVE IN ANY MULTI-SENTENCE FIELD = REJECTED)**:
        Scan every field before submitting. Rewrite passive to active:
        ❌ "The plan was passed by the {legislature}" → ✅ "the {legislature} passed the plan"
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
          const retryRuleSet = new Set(lastAuditResult.issues.map((issue: any) => issue.rule));
          if (retryRuleSet.has('token-grammar-issue')) {
            drafterPrompt += `\nTOKEN GRAMMAR RULE: if an outcome field starts with a {token}, the next narrative word must be lowercase (example: "the {player_country} signed...").\n`;
          }
          if (retryRuleSet.has('complex-sentence')) {
            drafterPrompt += `\nREADABILITY RULE: split long sentences. Keep each sentence under 30 words, use active voice, and avoid chained clauses.\n`;
          }
          if (retryRuleSet.has('option-metric-overlap') || retryRuleSet.has('option-domain-missing-primary')) {
            drafterPrompt += `\nOPTION DIFFERENTIATION RULE: each option must target a distinct strategic metric profile. If optionDomains are provided, each option must include at least one effect on its assigned primary metric.\n`;
          }
          if (retryRuleSet.has('invalid-metric-id')) {
            drafterPrompt += `\nMETRIC RULE: every effect targetMetricId must come from the approved metric list exactly as written. Do not invent variants like "metric_interest_rates", "metric_supply_chain", or "metric_price_controls". If a concept suggests those ideas, map them to existing canonical metrics such as metric_economy, metric_trade, metric_budget, metric_inflation, metric_public_order, or other listed metrics.\n`;
          }
          if (retryRuleSet.has('rendered-output-unresolved-token') || retryRuleSet.has('rendered-output-token-leak') || retryRuleSet.has('rendered-output-fallback-heavy')) {
            drafterPrompt += `\nRENDERED OUTPUT RULE: the scenario must render cleanly for real countries. Use only approved tokens from the minimal set ({leader_title}, {finance_role}, {legislature}, {governing_party}, {player_country}, {central_bank}). Write "the {token}" naturally — no {the_X} prefix tokens. Do not leave raw tokens in titles.\n`;
          }
        } else if (failureCategory === 'token-violation') {
          const hasNoTokens = lastAuditResult.issues.some((i: any) => i.rule === 'no-tokens');
          if (hasNoTokens) {
            drafterPrompt += `\n**CRITICAL: YOUR SCENARIO HAD NO TOKENS AT ALL**. Every scenario MUST use tokens for government roles and institutions. Replace hardcoded names with approved token placeholders:\n  - Leader → {leader_title}\n  - Minister → {finance_role}, {defense_role}, {foreign_affairs_role}, {interior_role}, etc.\n  - Institutions → {legislature}, {governing_party}, {armed_forces_name}, {central_bank}\n  - Country name → {player_country}\n  Write "the {finance_role}" or "your {defense_role}" naturally — no {the_X} prefix tokens.\nNOTE: For foreign/relationship actors (adversary, ally, border rival), use natural language ("your adversary", "the allied government") — do NOT use relationship tokens.\nAt minimum, every description and every option text MUST contain at least one {token}.\n`;
          } else {
            const inventedIssues = lastAuditResult.issues.filter((i: any) => i.rule === 'invalid-token' && i.message?.includes('Invented token'));
          const inventedList = inventedIssues.map((i: any) => { const m = i.message?.match(/\{([a-z_]+)\}/); return m ? `{${m[1]}}` : null; }).filter(Boolean) as string[];
          if (inventedList.length > 0) {
            drafterPrompt += `\n**TOKEN VIOLATION**: You invented these INVALID tokens: ${inventedList.join(', ')}. They are NOT in the approved whitelist. Only use tokens from the approved minimal set.\n`;
          } else {
            drafterPrompt += `\n**TOKEN VIOLATION**: You used incorrect tokens or casing. Use only allowed tokens and ensure they are ALL LOWERCASE (e.g., {finance_role}).\n`;
          }
          }
        } else if (failureCategory === 'readability-violation') {
          drafterPrompt += `\n**READABILITY FAILURE**: Rewrite for non-expert players.
- Replace policy jargon with simple words.
- Keep every sentence at 25 words or fewer.
- Keep each sentence to at most 3 conjunction clauses.
- Active voice is required. Rewrite passive constructions: "was passed" → "the {legislature} passed", "was announced" → "{leader_title} announced", "was rejected" → "you rejected", "were imposed" → "you imposed", "has been implemented" → "{leader_title} implemented". If more than half the sentences in any field are passive, the scenario fails automatically.
- Make labels short direct actions (no "if", "unless", colons, or parentheses).\n`;
        } else if (failureCategory === 'adjacency-token-violation') {
          drafterPrompt += `\n**GEOGRAPHIC LANGUAGE ERROR**: You used border/neighbor language ("bordering", "neighboring", "border closure", "shared border") with a foreign actor. Ensure the scenario has metadata.requires.land_border_adversary=true if the scenario involves a bordering rival. Write the border actor as "your border rival" — never use relationship token placeholders.\n`;
        } else if (failureCategory === 'banned-phrase-violation') {
          drafterPrompt += `\n**BANNED PHRASE ERROR**: Your description or options contained prohibited terms like real country names (e.g. United States) or directional borders. Use tokens ({player_country}, {leader_title}) for institutional references and natural language ("your adversary", "the allied government") for relationship actors.\n`;
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
          const retryConceptMap = request?.compiledRegistry?.conceptToTokenMap ?? CONCEPT_TO_TOKEN_MAP;
          drafterPrompt += retryConceptMap
            .slice(0, 8)
            .map(({ concept, token }: { concept: string; token: string }) => `  - ${concept} → ${token}`)
            .join('\n');
          drafterPrompt += `\n\nNEVER write: "ruling coalition", "governing coalition", "coalition government", "parliamentary majority/minority/support". Use {governing_party} and {legislature} tokens instead.\n`;
          drafterPrompt += `\nALSO: Never write hardcoded institution names. Use role tokens (write "the {token}" naturally):\n- "Finance Ministry" / "Treasury Department" → the {finance_role}\n- "Justice Ministry" / "Dept of Justice" → the {justice_role}\n- "Foreign Ministry" / "State Department" → the {foreign_affairs_role}\n- "Defense Ministry" / "Dept of Defense" → the {defense_role}\n- "Interior Ministry" / "Home Office" → the {interior_role}\n- "Health Ministry" / "Dept of Health" → the {health_role}\n- "Education Ministry" / "Dept of Education" → the {education_role}\n`;
        } else if (failureCategory === 'title-violation') {
          drafterPrompt += `\n**TITLE LENGTH ERROR**: Your title must be 4–8 words. Three-word titles are rejected. Use "Verb + Agent + Outcome" pattern. Examples: "Parliament Blocks Emergency Spending Bill", "Auditors Raid Central Bank After Leak".\n`;
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
          const { countries: ollamaCountriesData } = await loadCountriesData();
          const ollamaPrimaryCountry = request?.applicable_countries?.length
            ? ollamaCountriesData[request.applicable_countries[0]]
            : undefined;
          const ollamaTokenStrategy = deriveTokenStrategy(scopeTier);
          const tokenContext = ollamaTokenStrategy === 'none' && ollamaPrimaryCountry
            ? buildExclusivePromptSection(ollamaPrimaryCountry)
            : buildMinimalTokenPromptSection();

          const SKELETON_ISSUE_RULES = new Set([
            'title-length', 'title-format', 'banned-phrase', 'hardcoded-institution-phrase',
            'hardcoded-gov-structure', 'third-person-framing', 'sentence-start-bare-token',
            'token-casing-error', 'invalid-token', 'option-preview-in-description',
          ]);
          const EFFECTS_ISSUE_RULES = new Set([
            'outcome-second-person', 'third-person-framing', 'inverse-metric-sign',
            'invalid-metric-id', 'option-metric-overlap', 'option-domain-missing-primary',
            'missing-headline', 'missing-summary', 'missing-context', 'short-summary', 'short-article',
            'hard-coded-currency',
          ]);
          let skeletonRetryFeedback: string | undefined;
          let effectsRetryFeedback: string | undefined;
          if (attempt > 0 && lastAuditResult && lastAuditResult.issues.length > 0) {
            const skelIssues = lastAuditResult.issues.filter((i: any) => SKELETON_ISSUE_RULES.has(i.rule));
            const effIssues = lastAuditResult.issues.filter((i: any) => EFFECTS_ISSUE_RULES.has(i.rule) || !SKELETON_ISSUE_RULES.has(i.rule));
            if (skelIssues.length > 0) {
              skeletonRetryFeedback = skelIssues.slice(0, 5).map((i: any) => `- [${i.rule}] ${i.message}`).join('\n');
            }
            if (effIssues.length > 0) {
              effectsRetryFeedback = effIssues.slice(0, 5).map((i: any) => `- [${i.rule}] ${i.message}`).join('\n');
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
            retryFeedback: skeletonRetryFeedback,
          });
          emitEngineEvent({ level: 'info', code: 'phase_skeleton', message: `Phase A: skeleton (${skeletonPrompt.length} chars)`, data: { promptPreview: skeletonPrompt.slice(0, 500), promptLength: skeletonPrompt.length } });

          const skelStartMs = Date.now();
          const skeletonResult = await callModel(
            { ...OLLAMA_SKELETON_CONFIG, temperature: ollamaTemp },
            skeletonPrompt,
            SCENARIO_SKELETON_SCHEMA,
            drafterModel
          );
          const skelDurationMs = Date.now() - skelStartMs;
          emitEngineEvent({ level: skeletonResult?.data ? 'success' : 'error', code: 'phase_skeleton_result', message: `Phase A result: ${skeletonResult?.data ? 'OK' : skeletonResult?.error ?? 'null'} (${skelDurationMs}ms)`, data: { responsePreview: skeletonResult?.data ? JSON.stringify(skeletonResult.data).slice(0, 600) : undefined, error: skeletonResult?.error, tokens: skeletonResult?.usage, durationMs: skelDurationMs } });
          if (!skeletonResult?.data) {
            drafterError = skeletonResult?.error ?? 'Skeleton phase returned null';
          } else {
            const skeleton = skeletonResult.data as any;
            const skeletonOptions = (skeleton.options || []).slice(0, 3);

            // Inter-phase validation: fix tokens/structure before spending more model calls
            const compiledTokens = request?.compiledValidTokenSet;
            const skelTokenValidator = (t: string) => (compiledTokens ? compiledTokens.has(t) : isValidToken(t));
            const skelValidation = validateSkeleton(
              { title: skeleton.title, description: skeleton.description, options: skeletonOptions },
              skelTokenValidator,
            );
            if (skelValidation.fixes.length > 0) {
              skeleton.title = skeletonOptions.length > 0 ? skeleton.title : skeleton.title;
              emitEngineEvent({ level: 'info', code: 'skeleton_validated', message: `Skeleton validation: ${skelValidation.fixes.length} fix(es)`, data: { fixes: skelValidation.fixes, issues: skelValidation.issues } });
            }
            if (!skelValidation.pass) {
              drafterError = `Skeleton validation failed: ${skelValidation.issues.join('; ')}`;
              emitEngineEvent({ level: 'warning', code: 'skeleton_rejected', message: drafterError, data: { issues: skelValidation.issues, fixes: skelValidation.fixes } });
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
                optionDomains: concept.optionDomains,
                retryFeedback: effectsRetryFeedback,
              });
              emitEngineEvent({ level: 'info', code: 'phase_effects', message: `Phase B: effects & outcomes (${effectsPrompt.length} chars)`, data: { promptPreview: effectsPrompt.slice(0, 500), promptLength: effectsPrompt.length } });

              const effStartMs = Date.now();
              const effectsResult = await callModel(
                { ...OLLAMA_EFFECTS_CONFIG, temperature: 0.3 },
                effectsPrompt,
                SCENARIO_EFFECTS_SCHEMA,
                drafterModel
              );
              const effDurationMs = Date.now() - effStartMs;
              emitEngineEvent({ level: effectsResult?.data ? 'success' : 'error', code: 'phase_effects_result', message: `Phase B result: ${effectsResult?.data ? 'OK' : effectsResult?.error ?? 'null'} (${effDurationMs}ms)`, data: { responsePreview: effectsResult?.data ? JSON.stringify(effectsResult.data).slice(0, 600) : undefined, error: effectsResult?.error, tokens: effectsResult?.usage, durationMs: effDurationMs } });
              if (!effectsResult?.data) {
                drafterError = effectsResult?.error ?? 'Effects phase returned null';
              } else {
                const effectsData = effectsResult.data as any;

                // Inter-phase validation: fix metrics/values before advisor call
                const effValidation = validateEffects(effectsData, auditCfg.validMetricIds, auditCfg.inverseMetrics, auditCfg.defaultCap);
                if (effValidation.fixes.length > 0) {
                  emitEngineEvent({ level: 'info', code: 'effects_validated', message: `Effects validation: ${effValidation.fixes.length} fix(es)`, data: { fixes: effValidation.fixes, issues: effValidation.issues } });
                }
                if (!effValidation.pass) {
                  drafterError = `Effects validation failed: ${effValidation.issues.join('; ')}`;
                  emitEngineEvent({ level: 'warning', code: 'effects_rejected', message: drafterError, data: { issues: effValidation.issues, fixes: effValidation.fixes } });
                } else {

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
                  conditions: buildBestEffortScenarioConditions({
                    architectConditions: concept.triggerConditions,
                    title: skeleton.title,
                    description: skeleton.description,
                    tags: metadata.tags,
                  }),
                  relationship_conditions: [],
                };

                const preAdvisorScenario: BundleScenario = {
                  ...coreData,
                  id: `${baseId}_act${actPlan.actIndex}`,
                  phase: 'mid',
                  actIndex: actPlan.actIndex,
                  metadata: {
                    ...(metadata as any),
                    source: mode as any,
                    severity: concept.severity,
                    difficulty: concept.difficulty,
                    actorPattern: concept.actorPattern,
                    optionShape: concept.optionShape,
                    ...(concept.optionDomains?.length ? { optionDomains: concept.optionDomains } : {}),
                    theme: concept.theme,
                    scopeTier,
                    scopeKey,
                    tokenStrategy: deriveTokenStrategy(scopeTier),
                    ...(request?.clusterId ? { clusterId: request.clusterId } : {}),
                    ...(request?.exclusivityReason ? { exclusivityReason: request.exclusivityReason } : {}),
                    ...(request?.sourceKind ? { sourceKind: request.sourceKind } : {}),
                    ...(request?.applicable_countries?.length ? { applicable_countries: request.applicable_countries } : {}),
                    ...(requestedRegions?.length ? { region_tags: requestedRegions } : {}),
                  },
                };

                const preAdvisorTokenStrategy = deriveTokenStrategy(scopeTier);
                if (preAdvisorTokenStrategy !== 'none') {
                  preAdvisorScenario.title = normalizeTokenAliases(preAdvisorScenario.title);
                  preAdvisorScenario.description = normalizeTokenAliases(preAdvisorScenario.description);
                  for (const opt of preAdvisorScenario.options) {
                    opt.text = normalizeTokenAliases(opt.text);
                    if (opt.outcomeHeadline) opt.outcomeHeadline = normalizeTokenAliases(opt.outcomeHeadline);
                    if (opt.outcomeSummary) opt.outcomeSummary = normalizeTokenAliases(opt.outcomeSummary);
                    if (opt.outcomeContext) opt.outcomeContext = normalizeTokenAliases(opt.outcomeContext);
                  }
                  sanitizeInventedTokens(preAdvisorScenario, (t: string) => isValidToken(t));
                }

                // Phase C.5: Pre-advisor render check — only meaningful for exclusive/cluster/regional scope
                // where specific country token data is expected to be populated. For universal scope, any
                // remaining {token} patterns are valid tokens that resolve correctly at runtime per-country;
                // sanitizeInventedTokens above has already removed all invalid token syntax.
                const renderCountries = request?.countries ?? {};
                const isCountrySpecificScope = scopeTier === 'exclusive' || scopeTier === 'cluster' || scopeTier === 'regional';
                const shouldRunPreAdvisorRenderCheck = isCountrySpecificScope && Object.keys(renderCountries).length > 0;
                let preAdvisorRenderBlocked = false;
                if (shouldRunPreAdvisorRenderCheck) {
                  const preAdvisorRenderedOutput = evaluateRenderedOutputQuality(
                    preAdvisorScenario,
                    renderCountries,
                    { strictScopeTier: scopeTier }
                  );
                  if (!preAdvisorRenderedOutput.pass) {
                    const topRenderedIssues = preAdvisorRenderedOutput.issues.slice(0, 5);
                    drafterError = `Pre-advisor rendered output validation failed: ${topRenderedIssues.map((issue) => issue.rule).join(', ')}`;
                    lastAuditResult = {
                      scenario: null,
                      score: scoreScenario(topRenderedIssues),
                      issues: topRenderedIssues,
                    };
                    preAdvisorRenderBlocked = true;
                    emitEngineEvent({
                      level: 'warning',
                      code: 'rendered_output_precheck_failed',
                      message: `Phase C.5 rendered output precheck failed: ${topRenderedIssues.map((issue) => issue.rule).join(', ')}`,
                      data: {
                        actIndex: actPlan.actIndex,
                        issues: topRenderedIssues.map((issue) => ({
                          rule: issue.rule,
                          severity: issue.severity,
                          message: issue.message,
                        })),
                      },
                    });
                  }
                }

                if (!preAdvisorRenderBlocked) {
                  // Phase D: Advisor Feedback (existing logic)
                  const advisorPrompt = buildAdvisorFeedbackPrompt({
                    title: coreData.title,
                    description: coreData.description,
                    options: mergedOptions.map((o: any) => ({ id: o.id, text: o.text, label: o.label })),
                  }, scopeTier);
                  const advisorModel = resolvePhaseModel(request?.modelConfig, 'advisor');
                  emitEngineEvent({ level: 'info', code: 'phase_advisor', message: `Phase C: advisor feedback (model=${advisorModel})` });

                  const advStartMs = Date.now();
                  const advisorResult = await callModel(OLLAMA_ADVISOR_CONFIG, advisorPrompt, ADVISOR_FEEDBACK_SCHEMA, advisorModel);
                  const advDurationMs = Date.now() - advStartMs;
                  emitEngineEvent({ level: advisorResult?.data ? 'success' : 'error', code: 'phase_advisor_result', message: `Phase C result: ${advisorResult?.data ? 'OK' : advisorResult?.error ?? 'null'} (${advDurationMs}ms)`, data: { error: advisorResult?.error, durationMs: advDurationMs } });
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
              } // end effects validation else
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
          conditions: buildBestEffortScenarioConditions({
            existingConditions: Array.isArray(actDetails.conditions) ? actDetails.conditions : undefined,
            architectConditions: concept.triggerConditions,
            title: actDetails.title,
            description: actDetails.description,
            tags: actDetails.metadata?.tags,
          }),
          metadata: {
            ...actDetails.metadata,
            source: mode as any,
            severity: concept.severity,
            difficulty: concept.difficulty,
            actorPattern: concept.actorPattern,
            optionShape: concept.optionShape,
            ...(concept.optionDomains?.length ? { optionDomains: concept.optionDomains } : {}),
            theme: concept.theme,
            scopeTier,
            scopeKey,
            tokenStrategy: deriveTokenStrategy(scopeTier),
            ...(request?.clusterId ? { clusterId: request.clusterId } : {}),
            ...(request?.exclusivityReason ? { exclusivityReason: request.exclusivityReason } : {}),
            ...(request?.sourceKind ? { sourceKind: request.sourceKind } : {}),
            ...(request?.applicable_countries?.length ? { applicable_countries: request.applicable_countries } : {}),
            ...(requestedRegions?.length ? { region_tags: requestedRegions } : {}),
          }
        };

        const isQualityCriticalManualRun = mode === 'manual' && !Boolean(request?.lowLatencyMode);
        const skipEditorial = isOllamaRun || shouldSkipEditorialReview({
          lowLatencyMode: Boolean(request?.lowLatencyMode),
          mode,
          useStandardPath,
          conditionalEditorialReviewEnabled: Boolean(genConfig.enable_conditional_editorial_review),
          qualityCriticalManualRun: isQualityCriticalManualRun,
          sampleKey: `${bundle}:${scopeKey}:${actPlan.actIndex}:${concept.concept}`,
        });
        lastAuditResult = await auditAndRepair(
          act,
          bundle,
          mode,
          request?.countryCatalogSource ?? { kind: 'firestore', path: 'countries' },
          request?.countries ?? {},
          request?.modelConfig,
          skipEditorial,
          request?.compiledValidTokenSet,
          request?.rejectionBuffer,
          request?.compiledRegistry
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

          await logPipelineStageMetric({
            scenarioId: act.id,
            jobId: request?.jobId ?? attemptId,
            bundle,
            stages: {
              architect: { passed: true, issueCount: 0, issues: [] },
              drafter: { passed: true, issueCount: 0, issues: [] },
              tokenResolve: { passed: true, unresolvedCount: 0, fallbackCount: 0 },
              audit: {
                score: lastAuditResult.score,
                issueCount: lastAuditResult.issues.length,
                issueTypes: [...new Set(lastAuditResult.issues.map((i: any) => i.rule as string))],
              },
              repair: {
                attempted: wasAutoFixed,
                repairCount: wasAutoFixed ? lastAuditResult.issues.length : 0,
                failedRepairs: [],
              },
            },
            overallPassed: true,
          });

          break; // Success, exit retry loop
        } else {
          // Audit failed, log and retry
          const failureCategory = categorizeFailure(lastAuditResult.issues);
          const remediationClassification = classifyIssueRemediation(lastAuditResult.issues);
          const topRules = [...new Set(lastAuditResult.issues.map((issue) => issue.rule))].slice(0, 5);
          const primaryIssue = lastAuditResult.issues[0];
          const errorCount = lastAuditResult.issues.filter((issue) => issue.severity === 'error').length;
          const warningCount = lastAuditResult.issues.filter((issue) => issue.severity !== 'error').length;

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
            rootCause: {
              primaryRule: primaryIssue?.rule,
              primarySeverity: primaryIssue?.severity,
              topRules,
              errorCount,
              warningCount,
              remediationBucket: remediationClassification.bucket,
            },
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

          await logPipelineStageMetric({
            scenarioId: act.id,
            jobId: request?.jobId ?? attemptId,
            bundle,
            stages: {
              architect: { passed: true, issueCount: 0, issues: [] },
              drafter: { passed: false, issueCount: lastAuditResult.issues.length, issues: topRules },
              tokenResolve: { passed: true, unresolvedCount: 0, fallbackCount: 0 },
              audit: {
                score: lastAuditResult.score,
                issueCount: lastAuditResult.issues.length,
                issueTypes: topRules,
              },
              repair: { attempted: false, repairCount: 0, failedRepairs: topRules },
            },
            overallPassed: false,
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

          if (attempt > 0 && previousAttemptScore !== undefined && lastAuditResult.score <= previousAttemptScore) {
            console.warn(`[ScenarioEngine] Act ${actPlan.actIndex}: stall detected (${previousAttemptScore} → ${lastAuditResult.score}), breaking retry loop early`);
            emitEngineEvent({ level: 'warning', code: 'retry_stall', message: `Stall: score ${previousAttemptScore} → ${lastAuditResult.score}, stopping retries`, data: { actIndex: actPlan.actIndex, attempt: attempt + 1, previousScore: previousAttemptScore, currentScore: lastAuditResult.score } });
            break;
          }
          previousAttemptScore = lastAuditResult.score;

        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const httpMatch = errMsg.match(/HTTP (\d+)/);
        console.error(`[ScenarioEngine] Error generating Act ${actPlan.actIndex} attempt ${attempt + 1}:`, error);
        emitEngineEvent({ level: 'error', code: 'drafter_exception', message: `Act ${actPlan.actIndex} attempt ${attempt + 1} exception: ${errMsg.slice(0, 200)}`, data: { actIndex: actPlan.actIndex, attempt: attempt + 1, error: errMsg.slice(0, 500), ...(httpMatch ? { httpStatus: parseInt(httpMatch[1], 10) } : {}) } });

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
          failureReasons: ['Exception: ' + errMsg],
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
