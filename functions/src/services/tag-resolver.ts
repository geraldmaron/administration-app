/**
 * Tag Resolver Service
 *
 * Enriches scenario tags from the thin [bundle, theme] default to a richer
 * subset of CANONICAL_SCENARIO_TAGS by analyzing scenario text content.
 * Two resolution modes: deterministic (keyword matching) and LLM (for
 * ambiguous cases during batch processing).
 */

import { CANONICAL_SCENARIO_TAGS, STATE_TAG_CONDITION_MAP, inferRequirementsFromNarrative } from '../lib/audit-rules';
import type { ScenarioRequirements, TagResolutionMetadata, TagResolutionMethod } from '../types';

export const TAG_RESOLVER_VERSION = 1;

const MAX_TAGS = 6;

type CanonicalTag = (typeof CANONICAL_SCENARIO_TAGS)[number];

// ---------------------------------------------------------------------------
// Keyword → Tag Maps
// ---------------------------------------------------------------------------

const KEYWORD_TAG_MAP: ReadonlyMap<string, CanonicalTag> = new Map([
    // Governance
    ['election', 'elections'],
    ['vote', 'elections'],
    ['ballot', 'elections'],
    ['referendum', 'elections'],
    ['campaign', 'elections'],
    ['polling', 'elections'],
    ['reform', 'reform'],
    ['overhaul', 'reform'],
    ['constitutional', 'constitutional_crisis'],
    ['constitution', 'constitutional_crisis'],
    ['amendment', 'reform'],
    ['coup', 'coup'],
    ['overthrow', 'coup'],
    ['martial law', 'coup'],
    ['judiciary', 'judicial_independence'],
    ['court', 'judicial_independence'],
    ['judge', 'judicial_independence'],
    ['civil rights', 'civil_rights'],
    ['human rights', 'civil_rights'],
    ['freedom', 'civil_rights'],
    ['liberty', 'civil_rights'],
    ['censorship', 'censorship'],
    ['press freedom', 'censorship'],
    ['media ban', 'censorship'],
    ['propaganda', 'censorship'],
    ['governance', 'governance'],

    // Economic
    ['tax', 'taxation'],
    ['taxation', 'taxation'],
    ['tariff', 'taxation'],
    ['levy', 'taxation'],
    ['austerity', 'austerity'],
    ['spending cut', 'austerity'],
    ['budget cut', 'austerity'],
    ['debt', 'debt'],
    ['deficit', 'debt'],
    ['borrowing', 'debt'],
    ['bond', 'debt'],
    ['trade deal', 'trade'],
    ['trade war', 'trade'],
    ['import', 'trade'],
    ['export', 'trade'],
    ['tariff', 'trade'],
    ['sanction', 'sanctions'],
    ['embargo', 'sanctions'],
    ['blockade', 'sanctions'],
    ['privatization', 'privatization'],
    ['nationalization', 'privatization'],
    ['state-owned', 'privatization'],

    // Security
    ['terror', 'terrorism'],
    ['terrorist', 'terrorism'],
    ['extremist', 'terrorism'],
    ['radical', 'terrorism'],
    ['cyber', 'cybersecurity'],
    ['hacker', 'cybersecurity'],
    ['data breach', 'cybersecurity'],
    ['ransomware', 'cybersecurity'],
    ['arms', 'arms'],
    ['weapon', 'arms'],
    ['nuclear', 'arms'],
    ['missile', 'arms'],
    ['munition', 'arms'],
    ['peacekeep', 'peacekeeping'],
    ['cease-fire', 'peacekeeping'],
    ['ceasefire', 'peacekeeping'],
    ['spy', 'espionage'],
    ['espionage', 'espionage'],
    ['intelligence', 'espionage'],
    ['surveillance', 'espionage'],

    // Social
    ['protest', 'protest'],
    ['demonstrat', 'protest'],
    ['riot', 'protest'],
    ['strike', 'protest'],
    ['uprising', 'protest'],
    ['immigra', 'immigration'],
    ['refugee', 'immigration'],
    ['asylum', 'immigration'],
    ['migrant', 'immigration'],
    ['inequality', 'inequality'],
    ['wealth gap', 'inequality'],
    ['poverty', 'inequality'],
    ['disparity', 'inequality'],
    ['housing', 'housing'],
    ['homelessness', 'housing'],
    ['rent', 'housing'],
    ['eviction', 'housing'],

    // International
    ['foreign policy', 'foreign_policy'],
    ['diplomatic', 'foreign_policy'],
    ['ambassador', 'foreign_policy'],
    ['alliance', 'alliance'],
    ['nato', 'alliance'],
    ['treaty', 'alliance'],
    ['coalition', 'alliance'],
    ['geopolitic', 'geopolitics'],
    ['superpower', 'geopolitics'],
    ['sphere of influence', 'geopolitics'],

    // State-implying tags (detected from content describing crisis states)
    ['economic crisis', 'economic_crisis'],
    ['financial crisis', 'economic_crisis'],
    ['economic collapse', 'economic_crisis'],
    ['recession', 'recession'],
    ['downturn', 'recession'],
    ['economic recovery', 'economic_recovery'],
    ['recovery plan', 'economic_recovery'],
    ['crime wave', 'crime_wave'],
    ['crime spree', 'crime_wave'],
    ['lawless', 'lawlessness'],
    ['corruption scandal', 'corruption_scandal'],
    ['bribery', 'corruption_scandal'],
    ['corruption crisis', 'corruption_crisis'],
    ['systemic corruption', 'corruption_crisis'],
    ['military crisis', 'military_crisis'],
    ['defense crisis', 'military_crisis'],
    ['diplomatic crisis', 'diplomatic_crisis'],
    ['diplomatic fallout', 'diplomatic_crisis'],
    ['approval crisis', 'approval_crisis'],
    ['public trust', 'approval_crisis'],
    ['inflation crisis', 'inflation_crisis'],
    ['hyperinflation', 'inflation_crisis'],
    ['budget crisis', 'budget_crisis'],
    ['fiscal crisis', 'budget_crisis'],
    ['political instability', 'political_instability'],
    ['political turmoil', 'political_instability'],
    ['unrest', 'unrest'],
    ['civil unrest', 'unrest'],
]);

// Metric effects → tag inference mapping
// When a scenario's effects primarily target these metrics, infer the tag
const METRIC_TAG_MAP: ReadonlyMap<string, CanonicalTag> = new Map([
    ['metric_economy', 'economy'],
    ['metric_public_order', 'politics'],
    ['metric_military', 'military'],
    ['metric_innovation', 'tech'],
    ['metric_environment', 'environment'],
    ['metric_health', 'health'],
    ['metric_foreign_relations', 'diplomacy'],
    ['metric_crime', 'justice'],
    ['metric_corruption', 'corruption'],
    ['metric_infrastructure', 'infrastructure'],
    ['metric_energy', 'resources'],
    ['metric_trade', 'trade'],
    ['metric_housing', 'housing'],
    ['metric_immigration', 'immigration'],
    ['metric_equality', 'inequality'],
    ['metric_liberty', 'civil_rights'],
    ['metric_democracy', 'governance'],
    ['metric_inflation', 'economy'],
    ['metric_budget', 'economy'],
    ['metric_sovereignty', 'geopolitics'],
]);

// ---------------------------------------------------------------------------
// Scenario Text Extraction
// ---------------------------------------------------------------------------

interface ScenarioLike {
    title?: string;
    description?: string;
    options?: Array<{
        text?: string;
        effects?: Array<{ targetMetricId?: string; value?: number }>;
        outcomeHeadline?: string;
        outcomeSummary?: string;
    }>;
    metadata?: {
        tags?: string[];
        bundle?: string;
        theme?: string;
        requires?: ScenarioRequirements;
        tagResolution?: TagResolutionMetadata;
    };
}

function extractTextCorpus(scenario: ScenarioLike): string {
    const parts: string[] = [];
    if (scenario.title) parts.push(scenario.title);
    if (scenario.description) parts.push(scenario.description);
    if (scenario.options) {
        for (const opt of scenario.options) {
            if (opt.text) parts.push(opt.text);
            if (opt.outcomeHeadline) parts.push(opt.outcomeHeadline);
            if (opt.outcomeSummary) parts.push(opt.outcomeSummary);
        }
    }
    return parts.join(' ').toLowerCase();
}

// Premise corpus: title + description + option choice text only.
// Excludes outcome fields (outcomeHeadline, outcomeSummary) which describe consequences,
// not preconditions — prevents consequence text from triggering state-implying tags.
function extractPremiseCorpus(scenario: ScenarioLike): string {
    const parts: string[] = [];
    if (scenario.title) parts.push(scenario.title);
    if (scenario.description) parts.push(scenario.description);
    if (scenario.options) {
        for (const opt of scenario.options) {
            if (opt.text) parts.push(opt.text);
        }
    }
    return parts.join(' ').toLowerCase();
}

function extractDominantMetrics(scenario: ScenarioLike): string[] {
    const metricCounts = new Map<string, number>();
    if (!scenario.options) return [];
    for (const opt of scenario.options) {
        if (!opt.effects) continue;
        for (const eff of opt.effects) {
            if (!eff.targetMetricId) continue;
            metricCounts.set(eff.targetMetricId, (metricCounts.get(eff.targetMetricId) || 0) + 1);
        }
    }
    return Array.from(metricCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([metricId]) => metricId);
}

// ---------------------------------------------------------------------------
// Deterministic Resolver
// ---------------------------------------------------------------------------

export function resolveTagsDeterministic(scenario: ScenarioLike): {
    tags: string[];
    confidence: number;
} {
    const corpus = extractTextCorpus(scenario);
    const premiseCorpus = extractPremiseCorpus(scenario);
    const stateImplyingTags = new Set(Object.keys(STATE_TAG_CONDITION_MAP));
    const matchedTags = new Set<string>();

    // 1. Keyword scanning — multi-word phrases checked first for specificity.
    // State-implying tags use premise corpus only to prevent outcome/consequence text
    // from injecting metric conditions that don't reflect the scenario's preconditions.
    const sortedKeywords = Array.from(KEYWORD_TAG_MAP.entries())
        .sort((a, b) => b[0].length - a[0].length);

    for (const [keyword, tag] of sortedKeywords) {
        const searchIn = stateImplyingTags.has(tag) ? premiseCorpus : corpus;
        if (searchIn.includes(keyword)) {
            matchedTags.add(tag);
        }
    }

    // 2. Metric-based inference — look at which metrics effects target
    const dominantMetrics = extractDominantMetrics(scenario);
    for (const metricId of dominantMetrics) {
        const tag = METRIC_TAG_MAP.get(metricId);
        if (tag) matchedTags.add(tag);
    }

    // 3. Always include the bundle tag if it's canonical
    const bundle = scenario.metadata?.bundle;
    if (bundle && CANONICAL_TAG_SET.has(bundle)) {
        matchedTags.add(bundle);
    }

    // 4. Preserve any existing canonical tags
    const existingTags = scenario.metadata?.tags || [];
    for (const t of existingTags) {
        if (CANONICAL_TAG_SET.has(t)) matchedTags.add(t);
    }

    const tags = Array.from(matchedTags).slice(0, MAX_TAGS);

    // Confidence heuristic: how well-covered is the scenario?
    // 0.5 base if we found at least 2 tags, +0.1 per additional, max 0.9
    const confidence = tags.length === 0 ? 0 : Math.min(0.9, 0.4 + tags.length * 0.1);

    return { tags, confidence };
}

// ---------------------------------------------------------------------------
// LLM Resolver (batch-only)
// ---------------------------------------------------------------------------

export interface LLMResolverOptions {
    callLLM: (prompt: string) => Promise<string>;
}

export async function resolveTagsLLM(
    scenario: ScenarioLike,
    deterministicTags: string[],
    options: LLMResolverOptions,
): Promise<{ tags: string[]; confidence: number }> {
    const tagList = CANONICAL_SCENARIO_TAGS.filter(t => !BUNDLE_TAGS.has(t)).join(', ');

    const prompt = `You are a scenario classifier for a political simulation game. Given a scenario, select the most relevant tags from the canonical list.

CANONICAL TAGS: ${tagList}

SCENARIO:
Title: ${scenario.title || ''}
Description: ${scenario.description || ''}
Options: ${(scenario.options || []).map(o => o.text || '').join(' | ')}

Already assigned tags: ${deterministicTags.join(', ') || 'none'}

Return ONLY a JSON array of tag strings (max ${MAX_TAGS} total including already-assigned). Select tags that capture the scenario's core themes and any game-state conditions it implies. Example: ["elections", "reform", "political_instability"]`;

    const raw = await options.callLLM(prompt);

    // Parse response — extract JSON array from possibly wrapped response
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) {
        return { tags: deterministicTags, confidence: 0.5 };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(match[0]);
    } catch {
        return { tags: deterministicTags, confidence: 0.5 };
    }

    if (!Array.isArray(parsed)) {
        return { tags: deterministicTags, confidence: 0.5 };
    }

    const llmTags = parsed
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.toLowerCase().replace(/[\s-]+/g, '_').trim())
        .filter(t => CANONICAL_TAG_SET.has(t));

    // Merge: deterministic tags take priority, LLM fills remaining slots
    const merged = new Set<string>(deterministicTags);
    for (const t of llmTags) {
        if (merged.size >= MAX_TAGS) break;
        merged.add(t);
    }

    return { tags: Array.from(merged), confidence: 0.8 };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface ResolveTagsOptions {
    useLLM?: boolean;
    callLLM?: (prompt: string) => Promise<string>;
    force?: boolean;
}

export interface ResolveTagsResult {
    tags: string[];
    resolution: TagResolutionMetadata;
    conditionsToInject: Array<{ metricId: string; min?: number; max?: number }>;
    requiresToInject: Partial<ScenarioRequirements>;
}

export async function resolveScenarioTags(
    scenario: ScenarioLike,
    options: ResolveTagsOptions = {},
): Promise<ResolveTagsResult> {
    const existing = scenario.metadata?.tagResolution;

    // Never overwrite manual tags unless forced
    if (existing?.status === 'manual' && !options.force) {
        return {
            tags: scenario.metadata?.tags || [],
            resolution: existing,
            conditionsToInject: [],
            requiresToInject: {},
        };
    }

    // Skip if already resolved at current version unless forced
    if (
        existing?.status === 'resolved' &&
        existing.resolverVersion === TAG_RESOLVER_VERSION &&
        !options.force
    ) {
        return {
            tags: scenario.metadata?.tags || [],
            resolution: existing,
            conditionsToInject: [],
            requiresToInject: {},
        };
    }

    // Phase 1: Deterministic resolution
    const deterministic = resolveTagsDeterministic(scenario);
    let finalTags = deterministic.tags;
    let method: TagResolutionMethod = 'deterministic';
    let confidence = deterministic.confidence;

    // Phase 2: LLM resolution if enabled and deterministic confidence is low
    if (options.useLLM && options.callLLM && deterministic.confidence < 0.7) {
        const llmResult = await resolveTagsLLM(scenario, deterministic.tags, {
            callLLM: options.callLLM,
        });
        finalTags = llmResult.tags;
        confidence = llmResult.confidence;
        method = 'llm';
    }

    // Derive conditions that should be auto-injected for state-implying tags
    const conditionsToInject: Array<{ metricId: string; min?: number; max?: number }> = [];
    for (const tag of finalTags) {
        const implied = STATE_TAG_CONDITION_MAP[tag];
        if (!implied) continue;
        conditionsToInject.push(
            implied.op === 'max'
                ? { metricId: implied.metricId, max: implied.threshold }
                : { metricId: implied.metricId, min: implied.threshold },
        );
    }

    // Infer structural geopolitical requirements from premise text only —
    // consequences in outcome fields should not imply preconditions.
    const premiseCorpus = extractPremiseCorpus(scenario);
    const existingRequires = (scenario as { metadata?: { requires?: ScenarioRequirements } }).metadata?.requires;
    const requiresToInject = inferRequirementsFromNarrative(premiseCorpus, existingRequires);

    const resolution: TagResolutionMetadata = {
        status: 'resolved',
        method,
        resolverVersion: TAG_RESOLVER_VERSION,
        resolvedAt: new Date().toISOString(),
        resolvedTags: finalTags,
        confidence,
    };

    return { tags: finalTags, resolution, conditionsToInject, requiresToInject };
}

// ---------------------------------------------------------------------------
// Module internals
// ---------------------------------------------------------------------------

const CANONICAL_TAG_SET = new Set<string>(CANONICAL_SCENARIO_TAGS as readonly string[]);

const BUNDLE_TAGS = new Set<string>([
    'economy', 'politics', 'military', 'tech', 'environment', 'social',
    'health', 'diplomacy', 'justice', 'corruption', 'culture',
    'infrastructure', 'resources', 'dick_mode',
]);
