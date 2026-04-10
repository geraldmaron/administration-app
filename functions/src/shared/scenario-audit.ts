/**
 * Shared audit logic. Imported by both the web admin (@shared/scenario-audit)
 * and the generation pipeline (../shared/scenario-audit).
 */

import type { ScenarioScopeTier, ScenarioSourceKind, ScenarioExclusivityReason } from './generation-contract';
import type { ScenarioApplicability, RequiresFlag } from '../types';

// ── Legacy type alias kept for internal migration use ──────────────────────────
/** @deprecated Use applicability.requires (Partial<Record<RequiresFlag, true>>) instead. */
export type ScenarioRequirements = Partial<Record<RequiresFlag, boolean>>;

export type TagResolutionMethod = 'deterministic' | 'llm' | 'manual';
export type TagResolutionStatus = 'unresolved' | 'resolved' | 'manual';

export interface TagResolutionMetadata {
    status: TagResolutionStatus;
    method?: TagResolutionMethod;
    resolverVersion?: number;
    resolvedAt?: string;
    resolvedTags?: string[];
    confidence?: number;
}

// ── Exported types ──

export interface Effect {
    targetMetricId: string;
    value: number;
    duration: number;
    probability: number;
    type?: 'delta' | 'absolute';
    delay?: number;
    description?: string;
    condition?: any;
    scaling?: any;
}

export interface PolicyImplication {
    target: string;
    delta: number;
}

export interface BundleOption {
    id: string;
    text: string;
    label?: string;
    is_authoritarian?: boolean;
    moral_weight?: number;
    effects: Effect[];
    policyImplications?: any[];
    consequences?: any[];
    outcomeHeadline?: string;
    outcomeSummary?: string;
    outcomeContext?: string;
    advisorFeedback?: any[];
    tags?: string[];
}

export interface BundleScenario {
    id: string;
    title: string;
    description: string;
    options: BundleOption[];
    _generationPath?: 'standard' | 'premium';
    metadata?: {
        bundle?: string;
        severity?: string;
        urgency?: string;
        difficulty?: 1 | 2 | 3 | 4 | 5;
        tags?: string[];
        scopeTier?: ScenarioScopeTier;
        scopeKey?: string;
        clusterId?: string;
        exclusivityReason?: ScenarioExclusivityReason;
        sourceKind?: ScenarioSourceKind;
        theme?: string;
        optionShape?: 'redistribute' | 'regulate' | 'escalate' | 'negotiate' | 'invest' | 'cut' | 'reform' | 'delay';
        optionDomains?: Array<{ label: string; primaryMetric: string }>;
        actorPattern?: 'domestic' | 'ally' | 'adversary' | 'border_rival' | 'legislature' | 'cabinet' | 'judiciary' | 'mixed';
        tokenStrategy?: 'minimal' | 'none';
        region_tags?: string[];
        generationProvenance?: {
            jobId: string;
            executionTarget: string;
            modelUsed: string;
            generatedAt: string;
        };
        requires_tags?: string[];
        excludes_tags?: string[];
        auditMetadata?: AuditMetadata;
        tagResolution?: TagResolutionMetadata;
    };
    chainsTo?: string[];
    oncePerGame?: boolean;
    cooldown?: number;
    phase?: 'root' | 'mid' | 'final';
    applicability?: ScenarioApplicability;
    chainId?: string;
    actIndex?: number;
    acts?: any[];
    isRootScenario?: boolean;
    token_map?: Record<string, string>;
    relationship_conditions?: RelationshipCondition[];
    title_template?: string;
    description_template?: string;
}

export interface RelationshipCondition {
    relationshipId: string;
    min?: number;
    max?: number;
}

export interface Issue {
    severity: 'error' | 'warn';
    rule: string;
    target: string;
    message: string;
    autoFixable: boolean;
}

export interface AuditMetadata {
    lastAudited: string;
    score: number;
    issues: string[];
    autoFixed?: boolean;
}

export interface AuditConfig {
    validMetricIds: Set<string>;
    validRoleIds: Set<string>;
    inverseMetrics: Set<string>;
    metricMagnitudeCaps: Record<string, number>;
    defaultCap: number;
    metricToRoles: Record<string, string[]>;
    categoryDomainMetrics: Record<string, string[]>;
    metricMappings: Record<string, string>;
    bannedPhrases: string[];
    bannedPhraseRegexes: Array<{ phrase: string; regex: RegExp }>;
    bannedCountryPhrases: Set<string>;
    validTokens: Set<string>;
    logicParameters: {
        duration: { min: number; max: number };
        probability: { required: number };
    };
    govTypesByCountryId?: Record<string, string>;
    countriesById?: Record<string, any>;
    canonicalRoleIds: string[];
    articleFormTokenNames: Set<string>;
    sentenceStartArticleFormTokenNames?: Set<string>;
    validSettingTargets: readonly string[];
}

export type PhraseRule = { detect: RegExp; replacement: string; suggestion: string };

export const CANONICAL_SCENARIO_TAGS = [
    'economy', 'politics', 'military', 'tech', 'environment', 'social',
    'health', 'diplomacy', 'justice', 'corruption', 'culture',
    'infrastructure', 'resources', 'authoritarian',
    'governance', 'elections', 'reform', 'constitutional_crisis', 'coup',
    'judicial_independence', 'civil_rights', 'censorship',
    'taxation', 'austerity', 'debt', 'trade', 'sanctions', 'privatization',
    'terrorism', 'cybersecurity', 'arms', 'peacekeeping', 'espionage',
    'protest', 'immigration', 'inequality', 'housing',
    'foreign_policy', 'alliance', 'geopolitics',
    'political_instability', 'instability', 'unrest',
    'economic_crisis', 'economic_recovery', 'recession',
    'crime_wave', 'lawlessness',
    'corruption_scandal', 'corruption_crisis',
    'military_crisis', 'diplomatic_crisis', 'approval_crisis',
    'inflation_crisis', 'budget_crisis',
] as const;

export type CanonicalScenarioTag = typeof CANONICAL_SCENARIO_TAGS[number];

export type RelationshipTokenName =
    | 'ally'
    | 'adversary'
    | 'border_rival'
    | 'regional_rival'
    | 'trade_partner'
    | 'neutral'
    | 'rival'
    | 'partner'
    | 'neighbor'
    | 'nation';

// ── Constants ──

export const STATE_TAG_CONDITION_MAP: Readonly<Record<string, { metricId: string; op: 'min' | 'max'; threshold: number }>> = {
    political_instability: { metricId: 'metric_public_order', op: 'max', threshold: 35 },
    instability:           { metricId: 'metric_public_order', op: 'max', threshold: 40 },
    unrest:                { metricId: 'metric_public_order', op: 'max', threshold: 35 },
    economic_crisis:       { metricId: 'metric_economy',      op: 'max', threshold: 38 },
    economic_recovery:     { metricId: 'metric_economy',      op: 'max', threshold: 45 },
    recession:             { metricId: 'metric_economy',      op: 'max', threshold: 38 },
    crime_wave:            { metricId: 'metric_crime',        op: 'min', threshold: 65 },
    lawlessness:           { metricId: 'metric_crime',        op: 'min', threshold: 65 },
    corruption_scandal:    { metricId: 'metric_corruption',   op: 'min', threshold: 60 },
    corruption_crisis:     { metricId: 'metric_corruption',   op: 'min', threshold: 60 },
    military_crisis:       { metricId: 'metric_military',     op: 'max', threshold: 30 },
    diplomatic_crisis:     { metricId: 'metric_foreign_relations', op: 'max', threshold: 30 },
    approval_crisis:       { metricId: 'metric_approval',     op: 'max', threshold: 25 },
    inflation_crisis:      { metricId: 'metric_inflation',    op: 'min', threshold: 65 },
    budget_crisis:         { metricId: 'metric_budget',       op: 'max', threshold: 40 },
};

// ---------------------------------------------------------------------------
// REQUIRES_FLAG_REGISTRY — Single source of truth for all requires flags.
//
// Every entry captures, in one place:
//   condition       — the metric gate that must accompany this flag at game time
//   narrativePatterns — prose/token patterns that imply this flag is needed
//   tokens          — token names (no {}) whose use commits the scenario to this flag
//   implies         — other flags that are also true when this flag is set
//
// All downstream structures (REQUIRES_CONDITION_MAP, NARRATIVE_GEOPOLITICAL_MAP,
// CONDITION_GATED_TOKENS in token-registry.ts) are derived from this registry.
// Add a new flag here once; everything else updates automatically.
// ---------------------------------------------------------------------------

export interface RequiresFlagDef {
    label: string;
    /** Metric condition that must co-exist with this requires flag. */
    condition?: { metricId: string; op: 'min' | 'max'; threshold: number };
    /** Prose/token patterns that imply this flag should be set. */
    narrativePatterns?: RegExp[];
    /** Token names (no braces) whose presence commits a scenario to this flag. */
    tokens?: string[];
    /** Other flags that are logically implied when this flag is set. */
    implies?: ReadonlyArray<keyof ScenarioRequirements>;
}

export const REQUIRES_FLAG_REGISTRY: Readonly<Partial<Record<RequiresFlag, RequiresFlagDef>>> = {
    // ── Regime type ───────────────────────────────────────────────────────────
    democratic_regime: {
        label: 'Democratic regime',
        condition: { metricId: 'metric_democracy', op: 'min', threshold: 40 },
        narrativePatterns: [
            /\{(?:the_)?legislature\}/i,
            /\{(?:the_)?upper_house\}/i,
            /\{(?:the_)?lower_house\}/i,
            /\bparliament(?:ary)?\b/i,
            /\blegislat(?:ure|ive|or)\b/i,
            /\belection(?:s|al)?\b/i,
            /\bvot(?:e|ing|ers)\s+(?:in|on|for)\b/i,
            /\{(?:the_)?governing_party(?:_short|_leader|_ideology)?\}/i,
        ],
        tokens: ['legislature', 'upper_house', 'lower_house', 'governing_party', 'governing_party_short', 'governing_party_leader', 'governing_party_ideology'],
    },
    authoritarian_regime: {
        label: 'Authoritarian regime',
        condition: { metricId: 'metric_democracy', op: 'max', threshold: 40 },
        narrativePatterns: [
            /\bauthoritarian\b/i,
            /\bdictator(?:ship)?\b/i,
            /\bone[- ]party\s+(?:state|rule)\b/i,
            /\bpolitical\s+repression\b/i,
            /\bsuppression\s+of\s+dissent\b/i,
        ],
    },
    // ── Democratic institutions ───────────────────────────────────────────────
    has_legislature: {
        label: 'Has legislature',
        condition: { metricId: 'metric_democracy', op: 'min', threshold: 25 },
        tokens: ['legislature', 'upper_house', 'lower_house'],
        implies: ['democratic_regime'],
    },
    has_opposition_party: {
        label: 'Has opposition party',
        condition: { metricId: 'metric_democracy', op: 'min', threshold: 40 },
        narrativePatterns: [
            /\{(?:the_)?opposition_party(?:_leader)?\}/i,
            /\bopposition\s+party\b/i,
            /\bopposition\s+leader\b/i,
            /\bthe\s+opposition(?:'s|\s+(?:demands|calls|vows|warns|threatens|condemns|criticizes|attacks|mobilizes|rallies|bloc|caucus|coalition|bench|lawmakers))\b/i,
        ],
        tokens: ['opposition_party', 'opposition_party_leader'],
        implies: ['democratic_regime'],
    },
    has_party_system: {
        label: 'Has multi-party system',
        condition: { metricId: 'metric_democracy', op: 'min', threshold: 30 },
        narrativePatterns: [
            /\bpolitical\s+part(?:y|ies)\b/i,
            /\bmulti[- ]?party\b/i,
            /\bparty\s+(system|politics|competition)\b/i,
            /\{(?:the_)?governing_party(?:_short|_leader|_ideology)?\}/i,
        ],
        tokens: ['governing_party', 'governing_party_short', 'governing_party_leader', 'governing_party_ideology'],
        implies: ['democratic_regime'],
    },
    has_supreme_court: {
        label: 'Has supreme court',
        condition: { metricId: 'metric_democracy', op: 'min', threshold: 25 },
        narrativePatterns: [
            /\bsupreme\s+court\b/i,
            /\bconstitutional\s+court\b/i,
            /\bjudicial\s+(review|oversight|ruling|independence)\b/i,
            /\{(?:the_)?(?:supreme_court|constitutional_court|judicial_role)\}/i,
        ],
        tokens: ['supreme_court', 'constitutional_court', 'judicial_role'],
    },
    has_written_constitution: {
        label: 'Has written constitution',
        condition: { metricId: 'metric_democracy', op: 'min', threshold: 20 },
        narrativePatterns: [
            /\bconstitution(?:al)?\b/i,
            /\bconstitutional\s+(amendment|provision|clause|right|mandate|crisis|reform)\b/i,
            /\bunconstitutional\b/i,
        ],
    },
    has_monarch: {
        label: 'Has monarch',
        narrativePatterns: [
            /\bmonarch(?:y|ical)?\b/i,
            /\bking(?:dom)?\b/i,
            /\bqueen\b/i,
            /\bsultanate?\b/i,
            /\broyal\s+(family|decree|assent|prerogative|household)\b/i,
            /\{(?:the_)?monarch\}/i,
        ],
        tokens: ['monarch'],
    },
    // ── Geopolitical relationships ────────────────────────────────────────────
    formal_ally: {
        label: 'Has formal ally',
        narrativePatterns: [
            /\bformal\s+ally\b/i,
            /\btreaty\s+(ally|partner|obligation)\b/i,
            /\ballied\s+(nation|government|state)\b/i,
            /\byour\s+(close\s+)?ally\b/i,
            /\{(?:the_)?(?:ally|primary_ally|key_alliance)\}/i,
        ],
        tokens: ['ally', 'the_ally'],
    },
    adversary: {
        label: 'Has adversary',
        narrativePatterns: [
            /\byour\s+(main\s+)?adversary\b/i,
            /\bthe\s+(hostile|opposing)\s+(state|power|nation)\b/i,
            /\bhostile\s+power\b/i,
            /\byour\s+rival\s+(state|nation|power)\b/i,
            /\{(?:the_)?(?:adversary|primary_adversary)\}/i,
        ],
        tokens: ['adversary', 'the_adversary'],
    },
    land_border_adversary: {
        label: 'Has land border with adversary',
        narrativePatterns: [
            /\bneighboring\s+regime\b/i,
            /\bborder\s+(adversary|rival|threat)\b/i,
            /\bhostile\s+neighbor\b/i,
            /\bland[- ]?border\s+(conflict|dispute|tension|standoff)\b/i,
            /\bbordering\s+(rival|adversary|regime|state)\b/i,
            /\{(?:the_)?border_rival(?:_country)?\}/i,
        ],
        tokens: ['border_rival', 'the_border_rival'],
    },
    trade_partner: {
        label: 'Has trade partner',
        narrativePatterns: [
            /\btrade\s+partner\b/i,
            /\bstrategic\s+(economic\s+)?partner\b/i,
            /\bbilateral\s+trade\s+(deal|agreement|partner)\b/i,
            /\{(?:the_)?(?:trade_partner|partner)\}/i,
        ],
        tokens: ['trade_partner', 'the_trade_partner'],
    },
    // ── Military / power ──────────────────────────────────────────────────────
    nuclear_state: {
        label: 'Nuclear state',
        condition: { metricId: 'metric_military', op: 'min', threshold: 40 },
        narrativePatterns: [
            /\bnuclear\s+(deterrent|arsenal|weapon|warhead|test|strike)\b/i,
            /\bnuclear[- ]armed\b/i,
            /\bnuclear\s+state\b/i,
        ],
    },
    large_military: {
        label: 'Large military',
        condition: { metricId: 'metric_military', op: 'min', threshold: 45 },
        narrativePatterns: [
            /\blarge\s+(military|army|armed\s+forces)\b/i,
            /\bmassive\s+military\b/i,
            /\bsignificant\s+military\s+(force|power|capability|strength)\b/i,
        ],
    },
    power_projection: {
        label: 'Power projection capability',
        condition: { metricId: 'metric_military', op: 'min', threshold: 55 },
        narrativePatterns: [
            /\bpower\s+projection\b/i,
            /\bproject\s+(military\s+)?power\b/i,
            /\boverseas\s+(military\s+)?(base|presence|deployment)\b/i,
            /\bexpeditionary\s+force\b/i,
        ],
    },
    cyber_capable: {
        label: 'Cyber capable',
        narrativePatterns: [
            /\bcyber\s+(attack|warfare|operation|capability|weapon|espionage|offensive)\b/i,
            /\bdigital\s+(warfare|weapon|attack)\b/i,
            /\bstate[- ]sponsored\s+hack\b/i,
        ],
    },
    // ── Geography ─────────────────────────────────────────────────────────────
    coastal: {
        label: 'Coastal nation',
        narrativePatterns: [
            /\bcoastal\s+(defense|erosion|infrastructure|flooding|border|waters?)\b/i,
            /\bmaritime\s+(sovereignty|border|exclusive\s+zone|dispute|trade|law|route)\b/i,
            /\bnaval\s+(base|fleet|force|blockade|patrol|power)\b/i,
            /\bsea\s+(route|lane|border|access|level)\b/i,
            /\bexclusive\s+economic\s+zone\b/i,
        ],
    },
    island_nation: {
        label: 'Island nation',
        narrativePatterns: [
            /\bisland\s+(nation|state|territory)\b/i,
            /\barchipelago\b/i,
            /\bsurrounded\s+by\s+(sea|ocean|water)\b/i,
        ],
        implies: ['coastal'],
    },
    landlocked: {
        label: 'Landlocked',
        narrativePatterns: [
            /\blandlocked\b/i,
            /\bno\s+(direct\s+)?(sea|ocean|port|coastal)\s+access\b/i,
            /\btransit\s+corridor\b/i,
        ],
    },
    // ── Economic institutions ─────────────────────────────────────────────────
    has_central_bank: {
        label: 'Has central bank',
        condition: { metricId: 'metric_economy', op: 'min', threshold: 30 },
        narrativePatterns: [
            /\{(?:the_)?central_bank\}/i,
            /\bcentral\s+bank\b/i,
            /\bmonetary\s+policy\b/i,
            /\binterest\s+rate\b/i,
            /\bbase\s+rate\b/i,
            /\bmoney\s+supply\b/i,
        ],
        tokens: ['central_bank', 'the_central_bank'],
    },
    has_stock_exchange: {
        label: 'Has stock exchange',
        condition: { metricId: 'metric_economy', op: 'min', threshold: 35 },
        narrativePatterns: [
            /\{(?:the_)?stock_exchange\}/i,
            /\bstock\s+(exchange|market|index|crash|rally|collapse)\b/i,
            /\bfinancial\s+markets?\b/i,
            /\bshare\s+(prices?|market|sell[- ]off)\b/i,
            /\bequity\s+market\b/i,
        ],
        tokens: ['stock_exchange', 'the_stock_exchange'],
    },
    // ── State fragility ───────────────────────────────────────────────────────
    fragile_state: {
        label: 'Fragile state',
        condition: { metricId: 'metric_public_order', op: 'max', threshold: 40 },
        narrativePatterns: [
            /\bfragile\s+state\b/i,
            /\bstate\s+(collapse|failure|fragility)\b/i,
            /\bfailed\s+state\b/i,
            /\bweak\s+(state|institutions)\b/i,
        ],
    },
    // ── Resources ─────────────────────────────────────────────────────────────
    resource_rich: {
        label: 'Resource rich',
        narrativePatterns: [
            /\bresource[- ]rich\b/i,
            /\bnatural\s+resources?\b/i,
            /\boil\s+(reserve|revenue|export|field|wealth)\b/i,
            /\bmineral\s+(wealth|reserve|resource)\b/i,
            /\benergy\s+export(?:er|ing)?\b/i,
        ],
    },
};

// ---------------------------------------------------------------------------
// Derived structures — computed from REQUIRES_FLAG_REGISTRY.
// Import these instead of maintaining them separately.
// ---------------------------------------------------------------------------

/**
 * Maps requires flags to the metric condition that must accompany them.
 * Rationale: a requires flag gates by country profile (static), but the metric
 * condition gates by current game state (dynamic). Without the condition, a
 * scenario tagged `democratic_regime` can fire even after the player has
 * destroyed their democracy metric.
 *
 * Audit rule: `requires-missing-condition` (warn, auto-fixable).
 */
export const REQUIRES_CONDITION_MAP: Readonly<Partial<Record<RequiresFlag, { metricId: string; op: 'min' | 'max'; threshold: number }>>> =
    Object.fromEntries(
        (Object.entries(REQUIRES_FLAG_REGISTRY) as Array<[RequiresFlag, RequiresFlagDef]>)
            .filter(([, def]) => def.condition != null)
            .map(([flag, def]) => [flag, def.condition!])
    ) as Readonly<Partial<Record<RequiresFlag, { metricId: string; op: 'min' | 'max'; threshold: number }>>>;

/**
 * Maps narrative prose patterns to the requires flags they imply.
 * Each entry corresponds to one flag in REQUIRES_FLAG_REGISTRY.
 * Implies chains are resolved by inferRequirementsFromNarrative.
 */
export const NARRATIVE_GEOPOLITICAL_MAP: ReadonlyArray<{
    patterns: RegExp[];
    requires: Partial<Record<RequiresFlag, true>>;
    implies?: ReadonlyArray<RequiresFlag>;
}> = (Object.entries(REQUIRES_FLAG_REGISTRY) as Array<[RequiresFlag, RequiresFlagDef]>)
    .filter(([, def]) => def.narrativePatterns != null && def.narrativePatterns.length > 0)
    .map(([flag, def]) => ({
        patterns: def.narrativePatterns!,
        requires: { [flag]: true } as Partial<Record<RequiresFlag, true>>,
        implies: def.implies as ReadonlyArray<RequiresFlag> | undefined,
    }));

/**
 * Maps token names (no braces) to the requires flag their use commits a scenario to.
 * Derived from REQUIRES_FLAG_REGISTRY. Consumed by token-registry.ts and audit rules.
 */
export const TOKEN_REQUIRES_MAP: Readonly<Record<string, RequiresFlag>> =
    Object.fromEntries(
        (Object.entries(REQUIRES_FLAG_REGISTRY) as Array<[RequiresFlag, RequiresFlagDef]>)
            .flatMap(([flag, def]) => (def.tokens ?? []).map(t => [t, flag]))
    );


const CANONICAL_TAG_SET = new Set<string>(CANONICAL_SCENARIO_TAGS);

export const GOV_STRUCTURE_RULES: PhraseRule[] = [
    { detect: /\bruling coalition\b/gi,       replacement: '{governing_party}',           suggestion: '"ruling coalition" → use {governing_party}' },
    { detect: /\bgoverning coalition\b/gi,    replacement: '{governing_party}',           suggestion: '"governing coalition" → use {governing_party}' },
    { detect: /\bcoalition government\b/gi,   replacement: '{governing_party}',           suggestion: '"coalition government" → use {governing_party}' },
    { detect: /\bcoalition allies\b/gi,       replacement: 'political allies in the {legislature}', suggestion: '"coalition allies" → use "political allies" or "allies in the {legislature}"' },
    { detect: /\bparliamentary majority\b/gi, replacement: '{legislature} majority',   suggestion: '"parliamentary majority" → use "{legislature} majority"' },
    { detect: /\bparliamentary minority\b/gi, replacement: '{legislature} minority',   suggestion: '"parliamentary minority" → use "{legislature} minority"' },
    { detect: /\bparliamentary support\b/gi,  replacement: '{legislature} support',    suggestion: '"parliamentary support" → use "{legislature} support"' },
    { detect: /\bparliamentary vote\b/gi,     replacement: '{legislature} vote',       suggestion: '"parliamentary vote" → use "{legislature} vote"' },
    { detect: /\bparliamentary approval\b/gi, replacement: '{legislature} approval',   suggestion: '"parliamentary approval" → use "{legislature} approval"' },
    { detect: /\bparliamentary debate\b/gi,   replacement: '{legislature} debate',     suggestion: '"parliamentary debate" → use "{legislature} debate"' },
    { detect: /\bparliamentary session\b/gi,  replacement: '{legislature} session',    suggestion: '"parliamentary session" → use "{legislature} session"' },
    { detect: /\bparliamentary committee\b/gi,replacement: '{legislature} committee',  suggestion: '"parliamentary committee" → use "{legislature} committee"' },
    { detect: /\blegislative body\b/gi,       replacement: 'the {legislature}',        suggestion: '"legislative body" → use {legislature}' },
    { detect: /\bnational legislature\b/gi,   replacement: 'the {legislature}',        suggestion: '"national legislature" → use {legislature}' },
    { detect: /\bpresidential palace\b/gi,    replacement: "{leader_title}'s office",  suggestion: '"presidential palace" → use {leader_title}\'s office' },
    { detect: /\bpresidential decree\b/gi,    replacement: "{leader_title}'s decree",  suggestion: '"presidential decree" → use {leader_title}\'s decree' },
    { detect: /\bpresidential order\b/gi,     replacement: "{leader_title}'s order",   suggestion: '"presidential order" → use {leader_title}\'s order' },
    { detect: /\bopposition\s+party\b/gi,     replacement: '{opposition_party}',          suggestion: '"opposition party" → use {opposition_party}' },
    { detect: /\bopposition\s+leader\b/gi,    replacement: '{opposition_party_leader}',   suggestion: '"opposition leader" → use {opposition_party_leader}' },
    { detect: /\bmain\s+opposition\b/gi,      replacement: 'the {opposition_party}',      suggestion: '"main opposition" → use {opposition_party}' },
];

export const INSTITUTION_PHRASE_RULES: PhraseRule[] = [
    { detect: /\bjustice\s+ministry\b/gi,                                    replacement: "the {justice_role}'s office",              suggestion: '"Justice Ministry" → use {justice_role}' },
    { detect: /\bministry\s+of\s+justice\b/gi,                               replacement: "the {justice_role}'s office",              suggestion: '"Ministry of Justice" → use {justice_role}' },
    { detect: /\b(department\s+of\s+justice|justice\s+department)\b/gi,       replacement: "the {justice_role}'s office",              suggestion: '"Department of Justice" → use {justice_role}' },
    { detect: /\bfinance\s+ministry\b/gi,                                    replacement: "the {finance_role}'s office",              suggestion: '"Finance Ministry" → use {finance_role}' },
    { detect: /\bministry\s+of\s+finance\b/gi,                               replacement: "the {finance_role}'s office",              suggestion: '"Ministry of Finance" → use {finance_role}' },
    { detect: /\b(treasury\s+department|department\s+of\s+the\s+treasury)\b/gi, replacement: "the {finance_role}'s office",           suggestion: '"Treasury Department" → use {finance_role}' },
    { detect: /\b(defense|defence)\s+ministry\b/gi,                          replacement: "the {defense_role}'s office",              suggestion: '"Defense Ministry" → use {defense_role}' },
    { detect: /\bministry\s+of\s+(defense|defence)\b/gi,                     replacement: "the {defense_role}'s office",              suggestion: '"Ministry of Defense" → use {defense_role}' },
    { detect: /\bdepartment\s+of\s+defen[cs]e\b/gi,                         replacement: "the {defense_role}'s office",              suggestion: '"Department of Defense" → use {defense_role}' },
    { detect: /\binterior\s+ministry\b/gi,                                   replacement: "the {interior_role}'s office",             suggestion: '"Interior Ministry" → use {interior_role}' },
    { detect: /\bministry\s+of\s+(interior|the\s+interior)\b/gi,             replacement: "the {interior_role}'s office",             suggestion: '"Ministry of Interior" → use {interior_role}' },
    { detect: /\bhome\s+office\b/gi,                                         replacement: "the {interior_role}'s office",             suggestion: '"Home Office" → use {interior_role}' },
    { detect: /\bdepartment\s+of\s+homeland\s+security\b/gi,                 replacement: "the {interior_role}'s office",             suggestion: '"Department of Homeland Security" → use {interior_role}' },
    { detect: /\bforeign\s+ministry\b/gi,                                    replacement: "the {foreign_affairs_role}'s office",      suggestion: '"Foreign Ministry" → use {foreign_affairs_role}' },
    { detect: /\bministry\s+of\s+foreign\s+affairs\b/gi,                     replacement: "the {foreign_affairs_role}'s office",      suggestion: '"Ministry of Foreign Affairs" → use {foreign_affairs_role}' },
    { detect: /\b(state\s+department|department\s+of\s+state)\b/gi,          replacement: "the {foreign_affairs_role}'s office",      suggestion: '"State Department" → use {foreign_affairs_role}' },
    { detect: /\bforeign\s+office\b/gi,                                      replacement: "the {foreign_affairs_role}'s office",      suggestion: '"Foreign Office" → use {foreign_affairs_role}' },
    { detect: /\bhealth\s+ministry\b/gi,                                     replacement: "the {health_role}'s office",               suggestion: '"Health Ministry" → use {health_role}' },
    { detect: /\bministry\s+of\s+health\b/gi,                                replacement: "the {health_role}'s office",               suggestion: '"Ministry of Health" → use {health_role}' },
    { detect: /\bdepartment\s+of\s+health\b/gi,                              replacement: "the {health_role}'s office",               suggestion: '"Department of Health" → use {health_role}' },
    { detect: /\beducation\s+ministry\b/gi,                                  replacement: "the {education_role}'s office",            suggestion: '"Education Ministry" → use {education_role}' },
    { detect: /\bministry\s+of\s+education\b/gi,                             replacement: "the {education_role}'s office",            suggestion: '"Ministry of Education" → use {education_role}' },
    { detect: /\bdepartment\s+of\s+education\b/gi,                           replacement: "the {education_role}'s office",            suggestion: '"Department of Education" → use {education_role}' },
    { detect: /\bcommerce\s+ministry\b/gi,                                   replacement: "the {commerce_role}'s office",             suggestion: '"Commerce Ministry" → use {commerce_role}' },
    { detect: /\bministry\s+of\s+commerce\b/gi,                              replacement: "the {commerce_role}'s office",             suggestion: '"Ministry of Commerce" → use {commerce_role}' },
    { detect: /\bdepartment\s+of\s+commerce\b/gi,                            replacement: "the {commerce_role}'s office",             suggestion: '"Department of Commerce" → use {commerce_role}' },
    { detect: /\btrade\s+ministry\b/gi,                                      replacement: "the {commerce_role}'s office",             suggestion: '"Trade Ministry" → use {commerce_role}' },
    { detect: /\bministry\s+of\s+trade\b/gi,                                 replacement: "the {commerce_role}'s office",             suggestion: '"Ministry of Trade" → use {commerce_role}' },
    { detect: /\bdepartment\s+of\s+trade\b/gi,                               replacement: "the {commerce_role}'s office",             suggestion: '"Department of Trade" → use {commerce_role}' },
    { detect: /\blabou?r\s+ministry\b/gi,                                    replacement: "the {labor_role}'s office",                suggestion: '"Labour Ministry" → use {labor_role}' },
    { detect: /\bministry\s+of\s+labou?r\b/gi,                               replacement: "the {labor_role}'s office",                suggestion: '"Ministry of Labour" → use {labor_role}' },
    { detect: /\bdepartment\s+of\s+labor\b/gi,                               replacement: "the {labor_role}'s office",                suggestion: '"Department of Labor" → use {labor_role}' },
    { detect: /\benergy\s+ministry\b/gi,                                     replacement: "the {energy_role}'s office",               suggestion: '"Energy Ministry" → use {energy_role}' },
    { detect: /\bministry\s+of\s+energy\b/gi,                                replacement: "the {energy_role}'s office",               suggestion: '"Ministry of Energy" → use {energy_role}' },
    { detect: /\bdepartment\s+of\s+energy\b/gi,                              replacement: "the {energy_role}'s office",               suggestion: '"Department of Energy" → use {energy_role}' },
    { detect: /\benvironment\s+ministry\b/gi,                                replacement: "the {environment_role}'s office",          suggestion: '"Environment Ministry" → use {environment_role}' },
    { detect: /\bministry\s+of\s+(environment|the\s+environment)\b/gi,       replacement: "the {environment_role}'s office",          suggestion: '"Ministry of Environment" → use {environment_role}' },
    { detect: /\benvironmental\s+protection\s+agency\b/gi,                   replacement: "the {environment_role}'s office",          suggestion: '"Environmental Protection Agency" → use {environment_role}' },
    { detect: /\btransport\s+ministry\b/gi,                                  replacement: "the {transport_role}'s office",            suggestion: '"Transport Ministry" → use {transport_role}' },
    { detect: /\bministry\s+of\s+transportation?\b/gi,                       replacement: "the {transport_role}'s office",            suggestion: '"Ministry of Transport" → use {transport_role}' },
    { detect: /\bdepartment\s+of\s+transportation\b/gi,                      replacement: "the {transport_role}'s office",            suggestion: '"Department of Transportation" → use {transport_role}' },
    { detect: /\bagriculture\s+ministry\b/gi,                                replacement: "the {agriculture_role}'s office",          suggestion: '"Agriculture Ministry" → use {agriculture_role}' },
    { detect: /\bministry\s+of\s+agriculture\b/gi,                           replacement: "the {agriculture_role}'s office",          suggestion: '"Ministry of Agriculture" → use {agriculture_role}' },
    { detect: /\bdepartment\s+of\s+agriculture\b/gi,                         replacement: "the {agriculture_role}'s office",          suggestion: '"Department of Agriculture" → use {agriculture_role}' },
    { detect: /\bnational\s+guard\b/gi,                                      replacement: 'the {armed_forces_name}',                    suggestion: '"National Guard" → use {armed_forces_name}' },
    { detect: /\bcoast\s+guard\b/gi,                                         replacement: 'the {armed_forces_name}',                    suggestion: '"Coast Guard" → use {armed_forces_name}' },
    { detect: /\bsecret\s+service\b/gi,                                      replacement: 'the {intelligence_agency}',                suggestion: '"Secret Service" → use {intelligence_agency}' },
    { detect: /\bsupreme\s+court\b/gi,                                       replacement: 'the {judicial_role}',                      suggestion: '"Supreme Court" → use {judicial_role}' },
    { detect: /\bhigh\s+court\b/gi,                                          replacement: 'the {judicial_role}',                      suggestion: '"High Court" → use {judicial_role}' },
    { detect: /\bconstitutional\s+court\b/gi,                                replacement: 'the {judicial_role}',                      suggestion: '"Constitutional Court" → use {judicial_role}' },
    { detect: /\battorney\s+general\b/gi,                                    replacement: 'the {prosecutor_role}',                    suggestion: '"Attorney General" → use {prosecutor_role}' },
    { detect: /\bnational\s+police\b/gi,                                     replacement: 'the {police_force}',                       suggestion: '"National Police" → use {police_force}' },
    { detect: /\bfederal\s+police\b/gi,                                      replacement: 'the {police_force}',                       suggestion: '"Federal Police" → use {police_force}' },
    { detect: /\bcentral\s+bank\b/gi,                                        replacement: 'the {central_bank}',                       suggestion: '"Central Bank" → use {central_bank}' },
    { detect: /\bfederal\s+reserve\b/gi,                                     replacement: 'the {central_bank}',                       suggestion: '"Federal Reserve" → use {central_bank}' },
    { detect: /\breserve\s+bank\b/gi,                                        replacement: 'the {central_bank}',                       suggestion: '"Reserve Bank" → use {central_bank}' },
    { detect: /\bstock\s+exchange\b/gi,                                      replacement: 'the {stock_exchange}',                     suggestion: '"Stock Exchange" → use {stock_exchange}' },
];

export const SOFT_PENALTY_RULES = new Set([
    'description-word-count',
    'option-text-word-count',
    'short-summary',
    'description-length',
    'complex-sentence',
    'hardcoded-institution-phrase',
    'hardcoded-gov-structure',
    'third-person-framing',
]);

export const RELATIONSHIP_TOKEN_NAMES = new Set<RelationshipTokenName>([
    'ally',
    'adversary',
    'border_rival',
    'regional_rival',
    'trade_partner',
    'neutral',
    'rival',
    'partner',
    'neighbor',
    'nation',
]);

export const UNIVERSAL_RELATIONSHIP_REPLACEMENTS: Record<RelationshipTokenName, { plain: string; possessive: string }> = {
    ally: { plain: 'coalition partners', possessive: 'coalition' },
    adversary: { plain: 'security pressures', possessive: 'security' },
    border_rival: { plain: 'regional pressures', possessive: 'regional' },
    regional_rival: { plain: 'regional pressures', possessive: 'regional' },
    trade_partner: { plain: 'external markets', possessive: 'foreign-exchange' },
    neutral: { plain: 'swing blocs', possessive: 'centrist' },
    rival: { plain: 'security pressures', possessive: 'security' },
    partner: { plain: 'external markets', possessive: 'market' },
    neighbor: { plain: 'regional markets', possessive: 'regional' },
    nation: { plain: 'the national economy', possessive: 'national' },
};

export const ABBREVIATION_PATTERN = /\b(?:U\.S|U\.K|U\.S\.A|D\.C|e\.g|i\.e|vs|Dr|Mr|Mrs|Ms|Prof|Sr|Jr|St|Lt|Gen|Col|Sgt|Cpl|Pvt|Inc|Ltd|Corp|Gov|Rep|Sen|Dept|Approx|Appr|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./g;

export const REPEATED_WORD_PATTERN = /\b([A-Za-z][A-Za-z'-]*)\s+\1\b/gi;

export const DANGLING_ENDING_PATTERN = /\b(a|an|the|to|for|with|from|into|onto|of|in|on|at|by)\s*([.!?])?\s*$/i;

// ── Pure helper functions ──

export function countSentences(text: string): number {
    const stripped = text.replace(ABBREVIATION_PATTERN, (m) => m.replace('.', '\x00'));
    return (stripped.match(/[.!?]+/g) || []).length;
}

export function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function splitIntoSentences(text: string): string[] {
    const stripped = text.replace(ABBREVIATION_PATTERN, (m) => m.replace(/\./g, '\x00'));
    const parts: string[] = [];
    let current = '';
    for (let i = 0; i < stripped.length; i++) {
        current += text[i];
        if (/[.!?]/.test(stripped[i])) {
            let j = i + 1;
            while (j < stripped.length && /[.!?'"\u201D)\]]/.test(stripped[j])) {
                current += text[j];
                j++;
            }
            parts.push(current.trim());
            current = '';
            i = j - 1;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts.filter(s => s.length > 0);
}

export function condenseSentences(text: string, maxSentences: number): string | null {
    const sentences = splitIntoSentences(text).filter(s => s.trim().length > 2);
    if (sentences.length <= maxSentences) return null;
    while (sentences.length > maxSentences) {
        let shortestIdx = -1;
        let shortestLen = Infinity;
        for (let i = 1; i < sentences.length; i++) {
            if (sentences[i].length < shortestLen) {
                shortestLen = sentences[i].length;
                shortestIdx = i;
            }
        }
        if (shortestIdx <= 0) shortestIdx = sentences.length - 1;
        const mergeTarget = shortestIdx > 0 ? shortestIdx - 1 : 0;
        const a = sentences[mergeTarget].replace(/[.!?]+$/, '');
        const b = sentences[shortestIdx];
        const bLower = b.charAt(0).toLowerCase() + b.slice(1);
        sentences[mergeTarget] = `${a}, and ${bLower}`;
        sentences.splice(shortestIdx, 1);
    }
    return sentences.join(' ');
}

export function repairTextIntegrity(text: string | undefined): string | undefined {
    if (!text) return text;

    return text
        .replace(REPEATED_WORD_PATTERN, '$1')
        .replace(/\b(a|an|the|to|for|with|from|into|onto|of|in|on|at|by)\s+([,.;:!?])/gi, '$2')
        .replace(DANGLING_ENDING_PATTERN, (_match, _word, punctuation) => punctuation ?? '')
        .replace(/([.!?]){2,}/g, '$1')
        .replace(/\s+([.!?,;:])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function hasRepeatedWord(text: string): boolean {
    REPEATED_WORD_PATTERN.lastIndex = 0;
    return REPEATED_WORD_PATTERN.test(text);
}

function hasDanglingEnding(text: string): boolean {
    return DANGLING_ENDING_PATTERN.test(text.trim());
}

function isHeadlineFragment(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (countWords(trimmed) >= 3) return false;
    return !/[.!?]$/.test(trimmed);
}

export function buildBannedPhrasePromptGuidance(): string {
    const lines: string[] = [
        '**BANNED GOVERNMENT STRUCTURE TERMS** (auto-repaired during audit — always use the token instead):',
    ];
    const govByReplacement = new Map<string, string[]>();
    for (const rule of GOV_STRUCTURE_RULES) {
        const terms = govByReplacement.get(rule.replacement) ?? [];
        terms.push(rule.suggestion.split('→')[0].replace(/"/g, '').trim());
        govByReplacement.set(rule.replacement, terms);
    }
    for (const [replacement, terms] of govByReplacement) {
        lines.push(`- ${terms.map(t => `"${t}"`).join(', ')} → \`${replacement}\``);
    }
    lines.push('');
    lines.push('**BANNED INSTITUTION NAMES** (auto-repaired during audit — always use the role token instead):');
    const instByToken = new Map<string, string[]>();
    for (const rule of INSTITUTION_PHRASE_RULES) {
        const tokenMatch = rule.replacement.match(/\{([^}]+)\}/);
        const key = tokenMatch ? `{${tokenMatch[1]}}` : rule.replacement;
        const terms = instByToken.get(key) ?? [];
        terms.push(rule.suggestion.split('→')[0].replace(/"/g, '').trim());
        instByToken.set(key, terms);
    }
    for (const [token, terms] of instByToken) {
        lines.push(`- ${terms.join(' / ')} → \`${token}\``);
    }
    return lines.join('\n');
}

export function inferRequirementsFromNarrative(
    corpus: string,
    existingRequires?: Partial<Record<RequiresFlag, boolean>>,
): Partial<Record<RequiresFlag, true>> {
    const injected: Partial<Record<RequiresFlag, true>> = {};

    const inject = (key: RequiresFlag) => {
        if (existingRequires?.[key] == null && injected[key] == null) {
            injected[key] = true;
            // Chase implies chains: if flag A implies flag B, inject B too.
            const def = REQUIRES_FLAG_REGISTRY[key];
            if (def?.implies) {
                for (const implied of def.implies) inject(implied as RequiresFlag);
            }
        }
    };

    for (const { patterns, requires } of NARRATIVE_GEOPOLITICAL_MAP) {
        if (!patterns.some((p) => p.test(corpus))) continue;
        for (const key of Object.keys(requires) as Array<RequiresFlag>) {
            inject(key);
        }
    }

    for (const [flag, def] of Object.entries(REQUIRES_FLAG_REGISTRY) as Array<[RequiresFlag, RequiresFlagDef]>) {
        if (!def) continue;
        if (def.narrativePatterns?.some((pattern) => pattern.test(corpus))) {
            inject(flag);
        }
        if (def.tokens?.some((tokenName) => new RegExp(`\\{(?:the_)?${tokenName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}(?:'s|'s)?`, 'i').test(corpus))) {
            inject(flag);
        }
    }
    return injected;
}

function scenarioUsesTokenVariant(corpus: string, tokenName: string): boolean {
    const escaped = tokenName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\{(?:the_)?${escaped}\\}(?:'s|'s)?`, 'i');
    return pattern.test(corpus);
}

function collectRelationshipTokens(text: string): RelationshipTokenName[] {
    const matches = text.match(/\{([a-z_]+)\}(?:'s|'s)?/gi) || [];
    const found = new Set<RelationshipTokenName>();
    for (const match of matches) {
        const normalized = match.replace(/[{}]/g, '').replace(/(?:'s|'s)$/i, '').toLowerCase();
        const baseName = normalized.startsWith('the_') ? normalized.slice(4) : normalized;
        if (RELATIONSHIP_TOKEN_NAMES.has(baseName as RelationshipTokenName)) {
            found.add(baseName as RelationshipTokenName);
        }
    }
    return Array.from(found);
}

function formatRelationshipToken(tokenName: RelationshipTokenName): string {
    if (tokenName === 'partner' || tokenName === 'nation' || tokenName === 'neighbor') {
        return `{the_${tokenName}}`;
    }
    return `{the_${tokenName}}`;
}

function getCountryGeopoliticalProfile(country: any): any {
    return country?.geopoliticalProfile ?? country?.geopolitical ?? {};
}

function getRelationshipEntries(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
}

function hasRelationshipOfType(entries: any[], types: readonly string[]): boolean {
    return entries.some((entry) => {
        const entryType = typeof entry?.type === 'string' ? entry.type.toLowerCase() : '';
        return types.includes(entryType);
    });
}

function supportsRelationshipToken(country: any, tokenName: RelationshipTokenName): boolean {
    const geopolitical = getCountryGeopoliticalProfile(country);
    const allies = getRelationshipEntries(geopolitical.allies);
    const adversaries = getRelationshipEntries(geopolitical.adversaries);
    const neighbors = getRelationshipEntries(geopolitical.neighbors);

    switch (tokenName) {
        case 'ally':
            return hasRelationshipOfType(allies, ['formal_ally']);
        case 'trade_partner':
        case 'partner':
            return hasRelationshipOfType(allies, ['strategic_partner']);
        case 'adversary':
            return adversaries.length > 0;
        case 'border_rival':
            return hasRelationshipOfType(neighbors, ['rival']);
        case 'regional_rival':
            return hasRelationshipOfType(adversaries, ['rival']);
        case 'rival':
            return hasRelationshipOfType(adversaries, ['rival']) || hasRelationshipOfType(neighbors, ['rival']);
        case 'neutral':
            return hasRelationshipOfType(allies, ['neutral']) || hasRelationshipOfType(neighbors, ['neutral']);
        case 'neighbor':
        case 'nation':
            return neighbors.length > 0;
        default:
            return false;
    }
}

export function buildBannedCountryPhrases(countriesDoc: Record<string, any>): string[] {
    const phrases = new Set<string>();
    const PARTIAL_NAME_VARIANTS: Record<string, string[]> = {
        'United States of America': ['United States', 'America'],
        'United Kingdom': ['Great Britain', 'Britain', 'England'],
        'United Arab Emirates': ['Emirates'],
        'Russian Federation': ['Russia'],
        'People\'s Republic of China': ['China'],
        'Republic of Korea': ['South Korea'],
        'Democratic People\'s Republic of Korea': ['North Korea'],
        'Republic of China': ['Taiwan'],
        'Kingdom of Saudi Arabia': ['Saudi Arabia'],
        'Kingdom of Thailand': ['Thailand'],
        'Republic of India': ['India'],
    };
    for (const country of Object.values(countriesDoc)) {
        if (!country || typeof country !== 'object') continue;
        if (country.name) {
            phrases.add(country.name);
            const variants = PARTIAL_NAME_VARIANTS[country.name];
            if (variants) {
                for (const v of variants) phrases.add(v);
            }
        }
        const cap = country.capital;
        if (typeof cap === 'string') phrases.add(cap);
        else if (cap?.name) phrases.add(cap.name);
    }
    return Array.from(phrases);
}

// ── Config-dependent functions ──

export function getRelevantRolesForEffects(effects: Effect[], config: AuditConfig): string[] {
    const { metricToRoles } = config;
    const roles = new Set<string>();
    roles.add('role_executive');
    for (const eff of effects) {
        const mapped = metricToRoles[eff.targetMetricId];
        if (mapped) mapped.forEach(r => roles.add(r));
    }
    return Array.from(roles);
}

export function auditScenario(
    scenario: BundleScenario,
    bundleCategory: string,
    config: AuditConfig,
    genMode: boolean = false
): Issue[] {
    const cfg = config;
    const issues: Issue[] = [];
    const add = (severity: Issue['severity'], rule: string, target: string, message: string, autoFixable = false) =>
        issues.push({ severity, rule, target, message, autoFixable });
    const actorPattern = scenario.metadata?.actorPattern;
    const tokenStrategy = scenario.metadata?.tokenStrategy ?? 'minimal';
    const isExclusive = tokenStrategy === 'none';

    if (!scenario.id) add('error', 'missing-id', scenario.id || '(none)', 'Scenario missing id');
    if (!scenario.title?.trim()) add('error', 'missing-title', scenario.id, 'Missing or empty title');
    if (!scenario.description?.trim()) add('error', 'missing-desc', scenario.id, 'Missing or empty description');

    const checkFraming = (
        text: string | undefined,
        fieldName: string,
        severity: 'warn' | 'error' = 'warn',
        replacementHint: string = 'your administration'
    ) => {
        if (!text) return;
        const lowerText = text.toLowerCase();
        if (lowerText.match(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bthe government\b/))
            add(severity, 'third-person-framing', scenario.id, `${fieldName} uses "the government" instead of "your government"`, severity === 'warn');
        if (lowerText.match(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bthe administration\b/))
            add(severity, 'third-person-framing', scenario.id, `${fieldName} uses "the administration" instead of "${replacementHint}"`, severity === 'warn');
        if (lowerText.includes('the president') && !text.includes('{leader_title}'))
            add(severity, 'third-person-framing', scenario.id, `${fieldName} uses "the president" instead of "you" or {leader_title}`, severity === 'warn');
        if (lowerText.match(/\bthe executive\b(?! branch| order| power)/))
            add(severity, 'third-person-framing', scenario.id, `${fieldName} uses "the executive" instead of "you"`, severity === 'warn');
        if (lowerText.includes('unknown adversary') || lowerText.includes('unknown country'))
            add('warn', 'placeholder-text', scenario.id, `${fieldName} contains placeholder text "Unknown Adversary/Country" instead of token`);
        if (/\bas\s+(you|we|i)\s+of\b/i.test(text))
            add(severity, 'invalid-second-person-framing', scenario.id, `${fieldName} uses malformed framing "As you/we/I of" — use "As {leader_title} of {the_player_country}, you face..." instead`, severity === 'warn');
    };

    checkFraming(scenario.description, 'description', 'warn');
    checkFraming(scenario.title, 'title', 'warn');

    const checkBannedPhrases = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        for (const { phrase, regex } of cfg.bannedPhraseRegexes) {
            if (regex.test(text)) {
                add('error', 'banned-phrase', scenario.id, `${fieldName} contains banned phrase: "${phrase}"`);
            }
        }
    };

    checkBannedPhrases(scenario.title, 'title');
    checkBannedPhrases(scenario.description, 'description');
    for (const opt of scenario.options) {
        checkFraming(opt.text, `option ${opt.id} text`, 'error');
        checkBannedPhrases(opt.text, `option ${opt.id} text`);
        checkBannedPhrases(opt.outcomeSummary, `option ${opt.id} outcomes`);
        checkBannedPhrases(opt.outcomeContext, `option ${opt.id} outcomeContext`);
        checkBannedPhrases(opt.outcomeHeadline, `option ${opt.id} headline`);

        const checkOutcomeVoice = (text: string | undefined, fieldName: string) => {
            if (!text) return;
            const lower = text.toLowerCase();
            if (/\byour\b/.test(lower)) {
                add('error', 'outcome-second-person', scenario.id, `${fieldName} contains second-person "your" — outcome fields must be third-person journalistic`);
            }
            if (/(?<![a-z])you(?! know| see| understand| get| can| may| might| would| should| could| will| have| are| were| had| did)\b/.test(lower)) {
                add('error', 'outcome-second-person', scenario.id, `${fieldName} contains second-person "you" — outcome fields must be third-person journalistic`);
            }
        };
        checkOutcomeVoice(opt.outcomeHeadline, `option ${opt.id} outcomeHeadline`);
        checkFraming(opt.outcomeHeadline, `option ${opt.id} outcomeHeadline`, 'warn', '{leader_title}');
        checkOutcomeVoice(opt.outcomeSummary, `option ${opt.id} outcomeSummary`);
        checkFraming(opt.outcomeSummary, `option ${opt.id} outcomeSummary`, 'warn', '{leader_title}');
        checkOutcomeVoice(opt.outcomeContext, `option ${opt.id} outcomeContext`);
        checkFraming(opt.outcomeContext, `option ${opt.id} outcomeContext`, 'warn', '{leader_title}');
    }

    if (scenario.description) {
        const optionPreviews = [
            /you must choose (between|from) .+/i,
            /you must decide (whether to|between) .+/i,
            /your options (are|include)/i,
            /you can either .+ (or|and) .+/i,
            /will you .+ or .+\?/i,
            /should you .+ or .+\?/i,
        ];
        for (const pattern of optionPreviews) {
            if (pattern.test(scenario.description)) {
                add('error', 'option-preview-in-description', scenario.id,
                    'Description reveals what options will be. End with stakes/urgency, not choice preview.');
                break;
            }
        }
    }

    const VAGUE_PATTERNS: Array<{ pattern: RegExp; hint: string }> = [
        { pattern: /(?:an?\s+)?industr(?:y|ies)\s+(?:is|are|faces?|struggles?|suffers?)/i, hint: 'name the specific sector, supply chain, or workforce affected' },
        { pattern: /(?:the\s+)?(?:economy|sector)\s+(?:is|faces?|struggles?|suffers?)\s+(?:pressure|challenges?|difficulties)/i, hint: 'name the mechanism (tariff, shortage, capital flight) and affected group' },
        { pattern: /recent\s+developments?\s+(?:have|has)\s+(?:led|caused|created)/i, hint: 'name the specific event or trigger' },
        { pattern: /(?:stakeholders?|parties?|groups?)\s+(?:are\s+)?(?:concerned|worried|divided)/i, hint: 'name the specific actors and their stakes' },
    ];
    const checkVagueness = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        for (const { pattern, hint } of VAGUE_PATTERNS) {
            if (pattern.test(text)) {
                add('warn', 'vague-reference', scenario.id, `${fieldName}: vague language detected — ${hint}`);
            }
        }
    };
    checkVagueness(scenario.description, 'description');
    for (const opt of scenario.options) {
        checkVagueness(opt.text, `option ${opt.id} text`);
        checkVagueness(opt.outcomeSummary, `option ${opt.id} outcomeSummary`);
        checkVagueness(opt.outcomeContext, `option ${opt.id} outcomeContext`);
    }

    const GENERIC_RELATIONSHIP_PHRASES: RegExp[] = [
        /\ba\s+neighboring\s+countr/i,
        /\bthe\s+neighboring\s+countr/i,
        /\ba\s+neighbor(?:ing)?\s+(?:state|nation|power)/i,
        /\bopposing\s+forces?\b/i,
        /\ba\s+foreign\s+(?:power|nation|state|government)\b/i,
        /\ba\s+hostile\s+(?:nation|state|power|government)\b/i,
        /\ba\s+rival\s+(?:nation|state|power|country)\b/i,
        /\ballied\s+(?:nation|state|power|country)\b/i,
    ];
    const isUniversal = scenario.metadata?.scopeTier === 'universal';
    const checkGenericRelationship = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        for (const pat of GENERIC_RELATIONSHIP_PHRASES) {
            if (pat.test(text)) {
                add(
                    isUniversal ? 'error' : 'warn',
                    'generic-relationship-phrase',
                    scenario.id,
                    `${fieldName}: generic foreign reference detected${isUniversal ? ' in universal scenario — must be entirely domestic' : ' — use relationship tokens ({the_neighbor}, {the_adversary}, etc.) instead'}`
                );
                break;
            }
        }
    };
    checkGenericRelationship(scenario.description, 'description');
    for (const opt of scenario.options) {
        checkGenericRelationship(opt.text, `option ${opt.id} text`);
        checkGenericRelationship(opt.outcomeSummary, `option ${opt.id} outcomeSummary`);
        checkGenericRelationship(opt.outcomeContext, `option ${opt.id} outcomeContext`);
    }

    const checkTone = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        const informalWords = [
            'really bad', 'freaking out', 'messed up', 'kind of', 'sort of',
            'crazy', 'huge deal', 'sadly', 'unfortunately', 'thankfully',
            'super', 'totally', 'basically',
        ];
        for (const word of informalWords) {
            if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
                add('warn', 'informal-tone', scenario.id,
                    `${fieldName} uses informal language: "${word}". Use presidential briefing style instead.`);
            }
        }
    };

    const checkNewsroomReadability = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        const jargonTerms = [
            {
                pattern: /\bbloc(s)?\b/i,
                replacement: 'regional group, alliance, opposition party, or the relevant institution token',
            },
            {
                pattern: /\bgambit\b/i,
                replacement: 'move, plan, bid, or proposal',
            },
        ];

        for (const term of jargonTerms) {
            if (term.pattern.test(text)) {
                add('warn', 'newsroom-jargon', scenario.id,
                    `${fieldName} uses jargon that reads unlike mainstream news copy. Replace it with plainer wording such as ${term.replacement}.`);
            }
        }
    };

    checkTone(scenario.description, 'description');
    checkNewsroomReadability(scenario.title, 'title');
    checkNewsroomReadability(scenario.description, 'description');
    for (const opt of scenario.options) {
        checkTone(opt.text, `option ${opt.id} text`);
        checkNewsroomReadability(opt.text, `option ${opt.id} text`);
        checkNewsroomReadability(opt.outcomeHeadline, `option ${opt.id} outcomeHeadline`);
        checkNewsroomReadability(opt.outcomeSummary, `option ${opt.id} outcomeSummary`);
        checkNewsroomReadability(opt.outcomeContext, `option ${opt.id} outcomeContext`);
        for (const feedback of opt.advisorFeedback ?? []) {
            checkNewsroomReadability(feedback.feedback, `option ${opt.id} advisorFeedback ${feedback.roleId}`);
        }
    }

    const checkHardCodedCurrency = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        const patterns: RegExp[] = [
            /\$\s?\d{2,}/,
            /\bUSD\b/,
            /\bEUR\b/,
            /\bGBP\b/,
            /\beuro(s)?\b/i,
            /\bpound(s)? sterling\b/i,
            /\b\d+[\s,]*(?:trillion|billion|million)\s+(?:dollar|euro|pound|yen|yuan|ruble|rupee)/i,
        ];
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                add(
                    'error',
                    'hard-coded-currency',
                    scenario.id,
                    `${fieldName} contains hard-coded currency values instead of using tokens or relative language.`,
                    false
                );
                break;
            }
        }
    };

    const checkGdpDescriptionMisuse = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        if (!text.includes('{gdp_description}')) return;
        const misuseVerbs = 'siphon|steal|stole|stolen|embezzl|divert|skim|misappropriate|loot|plunder|waste|squander|funnel|launder|lose|lost|drain|hemorrhage';
        const pattern1 = new RegExp(`(${misuseVerbs})[^.!?]*\{gdp_description\}`, 'i');
        const pattern2 = new RegExp(`\{gdp_description\}[^.!?]*(${misuseVerbs})`, 'i');
        const portionPattern = /(?:portion|fraction|share|percentage|percent|chunk|slice|part)\s+of\s+\{gdp_description\}/i;
        if (pattern1.test(text) || pattern2.test(text) || portionPattern.test(text)) {
            add(
                'error',
                'gdp-as-amount',
                scenario.id,
                `${fieldName} treats {gdp_description} as a specific amount siphoned, stolen, or lost. {gdp_description} resolves to the ENTIRE national GDP. Use {graft_amount} for corruption amounts instead.`,
                false
            );
        }
    };

    const allOptionTexts = scenario.options.flatMap(opt => [
        opt.text,
        opt.outcomeHeadline,
        opt.outcomeSummary,
        opt.outcomeContext,
    ]);

    checkHardCodedCurrency(scenario.title, 'title');
    checkHardCodedCurrency(scenario.description, 'description');
    allOptionTexts.forEach((txt, idx) => checkHardCodedCurrency(txt, `option ${scenario.options[idx]?.id ?? idx} text/outcome`));

    checkGdpDescriptionMisuse(scenario.title, 'title');
    checkGdpDescriptionMisuse(scenario.description, 'description');
    allOptionTexts.forEach((txt, idx) => checkGdpDescriptionMisuse(txt, `option ${scenario.options[idx]?.id ?? idx} text/outcome`));

    if (scenario.description) {
        const sentenceCount = countSentences(scenario.description);
        if (sentenceCount < 1 || sentenceCount > 6)
            add('warn', 'description-length', scenario.id, `Description has ${sentenceCount} sentences (prefer 2–4)`, true);
        const wordCount = countWords(scenario.description);
        if (wordCount < 30)
            add('warn', 'description-word-count', scenario.id, `Description is ${wordCount} words (min 30)`, true);
        if (wordCount > 200)
            add('warn', 'description-word-count', scenario.id, `Description is ${wordCount} words (max 200)`, true);
    }

    if (scenario.options.length !== 3)
        add('error', 'option-count', scenario.id, `Must have exactly 3 options (found ${scenario.options.length})`);

    const containsGoverningPartyToken = (text: string | undefined): boolean =>
        !!text && text.includes('{governing_party}');

    const anyTextUsesGoverningPartyToken =
        containsGoverningPartyToken(scenario.title) ||
        containsGoverningPartyToken(scenario.description) ||
        scenario.options.some(
            opt =>
                containsGoverningPartyToken(opt.text) ||
                containsGoverningPartyToken(opt.outcomeHeadline) ||
                containsGoverningPartyToken(opt.outcomeSummary) ||
                containsGoverningPartyToken(opt.outcomeContext)
        );

    if (anyTextUsesGoverningPartyToken && scenario.applicability?.applicableCountryIds?.length) {
        const govTypesByCountryId = cfg.govTypesByCountryId || {};
        const ids = scenario.applicability.applicableCountryIds;
        const flaggedGovTypes = new Set<string>();
        for (const id of ids) {
            const govType = govTypesByCountryId[id];
            if (govType === 'Presidential' || govType === 'Monarchy') {
                flaggedGovTypes.add(govType);
            }
        }
        if (flaggedGovTypes.size > 0) {
            add(
                'warn',
                'governing-party-applicability',
                scenario.id,
                `{governing_party} is used in a scenario that targets countries whose government types (${Array.from(
                    flaggedGovTypes
                ).join(', ')}) may not have a formal "governing party" concept. Consider using administration/coalition/royal court phrasing instead.`,
                false
            );
        }
    }

    // For every token that commits a scenario to a requires flag (per TOKEN_REQUIRES_MAP),
    // verify that the requires flag is actually set. This catches missing gates for
    // political tokens ({legislature}, {governing_party}), relationship tokens
    // ({adversary}, {ally}, {border_rival}, {trade_partner}), and institutional tokens
    // ({central_bank}, {stock_exchange}) alike.
    const allScenarioText = [
        scenario.title,
        scenario.description,
        ...scenario.options.flatMap(o => [o.text, o.outcomeSummary, o.outcomeContext, o.outcomeHeadline]),
    ].filter(Boolean).join(' ');

    const missingByFlag = new Map<RequiresFlag, string[]>();
    for (const [tokenName, requiredFlag] of Object.entries(TOKEN_REQUIRES_MAP) as Array<[string, RequiresFlag]>) {
        const braced = `{${tokenName}}`;
        if (!scenarioUsesTokenVariant(allScenarioText, tokenName)) continue;
        if (scenario.applicability?.requires?.[requiredFlag]) continue;
        const tokensForFlag = missingByFlag.get(requiredFlag) ?? [];
        tokensForFlag.push(braced);
        missingByFlag.set(requiredFlag, tokensForFlag);
    }
    for (const [flag, tokens] of missingByFlag) {
        add(
            'warn',
            'token-without-requires',
            scenario.id,
            `Scenario uses ${tokens.join(', ')} but applicability.requires.${flag} is not set — this scenario may fire for countries where this token cannot resolve.`,
            true
        );
    }

    if (scenario.metadata) {
        const meta = scenario.metadata;
        const validSeverities = ['low', 'medium', 'high', 'extreme', 'critical'];
        const validScopeTiers: ScenarioScopeTier[] = ['universal', 'regional', 'cluster', 'exclusive'];
        const validSourceKinds: ScenarioSourceKind[] = ['evergreen', 'news', 'neighbor', 'consequence'];
        if (meta.severity && !validSeverities.includes(meta.severity))
            add('error', 'invalid-severity', scenario.id, `Severity "${meta.severity}" is invalid`);
        const validUrgencies = ['low', 'medium', 'high', 'immediate'];
        if (meta.urgency && !validUrgencies.includes(meta.urgency))
            add('error', 'invalid-urgency', scenario.id, `Urgency "${meta.urgency}" is invalid`);
        if (meta.difficulty !== undefined && (!Number.isInteger(meta.difficulty) || meta.difficulty < 1 || meta.difficulty > 5))
            add('warn', 'invalid-difficulty', scenario.id, `Difficulty ${meta.difficulty} must be integer 1-5`, true);
        if (Array.isArray(scenario.applicability?.applicableCountryIds) && cfg.countriesById) {
            for (const id of scenario.applicability.applicableCountryIds) {
                if (!cfg.countriesById[id]) {
                    add('error', 'invalid-country-id', scenario.id,
                        `"${id}" is not a recognized country ID in the catalog — use catalog IDs (e.g. "country_de"), not names`);
                }
            }
        }
        if (!meta.scopeTier)
            add('error', 'missing-scope-tier', scenario.id, 'Scenario metadata must include scopeTier');
        else if (!validScopeTiers.includes(meta.scopeTier))
            add('error', 'invalid-scope-tier', scenario.id, `scopeTier "${meta.scopeTier}" is invalid`);
        if (!meta.scopeKey?.trim())
            add('error', 'missing-scope-key', scenario.id, 'Scenario metadata must include scopeKey');
        if (!meta.sourceKind)
            add('error', 'missing-source-kind', scenario.id, 'Scenario metadata must include sourceKind');
        else if (!validSourceKinds.includes(meta.sourceKind))
            add('error', 'invalid-source-kind', scenario.id, `sourceKind "${meta.sourceKind}" is invalid`);

        if (meta.scopeTier === 'regional' && (!Array.isArray(meta.region_tags) || meta.region_tags.length === 0))
            add('error', 'regional-missing-tags', scenario.id, 'Regional scenarios must include region_tags');

        if (meta.scopeTier === 'cluster') {
            if (!meta.clusterId?.trim()) {
                add('error', 'missing-cluster-id', scenario.id, 'Cluster scenarios must include clusterId');
            }
            if (meta.scopeKey && !meta.scopeKey.startsWith('cluster:')) {
                add('error', 'invalid-scope-key', scenario.id, 'Cluster scenarios must use a cluster:* scopeKey');
            }
        }

        if (meta.scopeTier === 'exclusive') {
            if (!meta.exclusivityReason) {
                add('error', 'missing-exclusivity-reason', scenario.id, 'Exclusive scenarios must include exclusivityReason');
            }
            if (!Array.isArray(scenario.applicability?.applicableCountryIds) || scenario.applicability.applicableCountryIds.length === 0) {
                add('error', 'exclusive-missing-countries', scenario.id, 'Exclusive scenarios must include applicability.applicableCountryIds');
            }
            if (meta.scopeKey && !meta.scopeKey.startsWith('country:')) {
                add('error', 'invalid-scope-key', scenario.id, 'Exclusive scenarios must use a country:* scopeKey');
            }
        }

        if (meta.scopeTier === 'regional' && meta.scopeKey && !meta.scopeKey.startsWith('region:')) {
            add('error', 'invalid-scope-key', scenario.id, 'Regional scenarios must use a region:* scopeKey');
        }

        if (meta.scopeTier === 'universal' && meta.scopeKey && meta.scopeKey !== 'universal') {
            add('error', 'invalid-scope-key', scenario.id, 'Universal scenarios must use the scopeKey "universal"');
        }

        // Universal scenarios must not gate on any requires flags — they are supposed to fire for all countries.
        if (meta.scopeTier === 'universal' && scenario.applicability?.requires) {
            const setRequires = Object.entries(scenario.applicability.requires)
                .filter(([, v]) => v === true || v != null)
                .map(([k]) => k);
            if (setRequires.length > 0) {
                add(
                    'warn',
                    'universal-has-requires',
                    scenario.id,
                    `Universal scenario sets requires flags (${setRequires.join(', ')}) but universal scope should apply to all countries. Move country-specific gating to a regional, cluster, or exclusive scenario instead.`,
                    false
                );
            }
        }
    }

    const validPhases = ['root', 'mid', 'final'];
    if (scenario.phase && !validPhases.includes(scenario.phase))
        add('error', 'invalid-phase', scenario.id, `Phase "${scenario.phase}" is invalid`);

    for (const opt of scenario.options) {
        const oid = `${scenario.id}/${opt.id}`;
        if (!opt.text?.trim()) { add('error', 'empty-text', oid, 'Option text is empty'); continue; }

        if (opt.text) {
            const sentenceCount = countSentences(opt.text);
            if (sentenceCount < 1 || sentenceCount > 5)
                add('warn', 'option-text-length', oid, `Option text has ${sentenceCount} sentences (prefer 2–3)`, true);
            const wordCount = countWords(opt.text);
            if (wordCount < 20)
                add('warn', 'option-text-word-count', oid, `Option text is ${wordCount} words (min 20)`, true);
            if (wordCount > 150)
                add('warn', 'option-text-word-count', oid, `Option text is ${wordCount} words (max 150)`, true);
        }

        if (!opt.effects || opt.effects.length === 0) { add('error', 'no-effects', oid, 'Option has no effects'); continue; }
        if (opt.effects.length > 4)
            add('error', 'effect-count', oid, 'Option has more than 4 effects; must have 2–4 effects per option', true);

        for (let i = 0; i < opt.effects.length; i++) {
            const eff = opt.effects[i];
            const eid = `${oid}/effects[${i}]`;

            if (!eff.targetMetricId) {
                add('error', 'missing-metric-id', eid, 'Effect missing targetMetricId');
            } else if (!cfg.validMetricIds.has(eff.targetMetricId)) {
                if (cfg.metricMappings[eff.targetMetricId]) {
                    add('error', 'invalid-metric-id', eid, `"${eff.targetMetricId}" is invalid (mappable to ${cfg.metricMappings[eff.targetMetricId]})`, true);
                } else {
                    add('error', 'invalid-metric-id', eid, `"${eff.targetMetricId}" is invalid.`);
                }
            }

            if (!Number.isFinite(eff.value)) {
                add('error', 'non-finite-value', eid, `Value non-finite: ${eff.value}`);
            } else {
                const cap = cfg.metricMagnitudeCaps[eff.targetMetricId] ?? cfg.defaultCap;
                if (Math.abs(eff.value) > cap)
                    add('error', 'effect-cap-exceeded', eid, `|${eff.value}| exceeds configured cap ${cap}; runtime would clamp or reinterpret the outcome`, true);
            }

            if (!Number.isFinite(eff.duration) || eff.duration < cfg.logicParameters.duration.min)
                add('error', 'invalid-duration', eid, `Duration < ${cfg.logicParameters.duration.min}`, true);
            if (eff.duration > cfg.logicParameters.duration.max)
                add('warn', 'excessive-duration', eid, `Duration ${eff.duration} exceeds max ${cfg.logicParameters.duration.max}`, true);
            if (eff.probability !== cfg.logicParameters.probability.required)
                add('warn', 'non-deterministic', eid, `Probability should be ${cfg.logicParameters.probability.required}`, true);
        }

        const domainMetrics = cfg.categoryDomainMetrics[bundleCategory] || [];
        if (domainMetrics.length > 0 && !opt.effects.some(e => domainMetrics.includes(e.targetMetricId)))
            add('warn', 'no-domain-metric', oid, `No effect targets ${bundleCategory} domain`);

        for (const eff of opt.effects) {
            if (cfg.inverseMetrics.has(eff.targetMetricId) && eff.value > 0)
                add('error', 'inverse-positive', `${oid}/${eff.targetMetricId}`, `Positive val on inverse metric`, true);
        }

        if (!opt.outcomeHeadline?.trim()) add('error', 'missing-headline', oid, 'Missing headline', true);
        if (!opt.outcomeSummary?.trim()) add('error', 'missing-summary', oid, 'Missing summary', true);
        if (!opt.outcomeContext?.trim()) add('error', 'missing-context', oid, 'Missing context', true);

        if (opt.outcomeSummary?.trim() && opt.outcomeSummary.trim().length < 200)
            add('warn', 'short-summary', oid, `outcomeSummary is ${opt.outcomeSummary.trim().length} chars (min 200)`, true);
        if (opt.outcomeContext?.trim()) {
            const ctxLen = opt.outcomeContext.trim().length;
            if (ctxLen < 150)
                add('error', 'short-article', oid, `outcomeContext is ${ctxLen} chars (min 150)`, true);
            else if (ctxLen < 350)
                add('warn', 'short-summary', oid, `outcomeContext is ${ctxLen} chars (min 350)`, true);
        }

        if (!opt.advisorFeedback || !Array.isArray(opt.advisorFeedback) || opt.advisorFeedback.length === 0) {
            add('error', 'missing-advisor-feedback', oid, 'Missing advisor feedback', true);
        } else {
            const feedbackRoles = new Set(opt.advisorFeedback.map((f: any) => f.roleId));
            if (opt.advisorFeedback.length < 3)
                add('warn', 'insufficient-advisor-feedback', oid, `Only ${opt.advisorFeedback.length} advisor entries (min 3)`);
            if (!feedbackRoles.has('role_executive'))
                add('error', 'missing-role-feedback', oid, 'Missing required feedback for role_executive', true);
            for (const fb of opt.advisorFeedback) {
                if (!fb.roleId || !fb.stance || !fb.feedback?.trim())
                    add('error', 'invalid-advisor-feedback', oid, `Advisor feedback entry missing roleId, stance, or feedback text`);
                else if (!cfg.validRoleIds.has(fb.roleId))
                    add('error', 'invalid-role-id', oid, `Unknown roleId: "${fb.roleId}". Must be one of the 13 canonical cabinet roles.`);
                else {
                    const feedback = fb.feedback?.trim() ?? '';
                    const HARD_FAIL_BOILERPLATE_PATTERNS = [
                        /^This aligns well with our .+ priorities\.$/i,
                        /^Our department supports this course of action\.$/i,
                        /^This could undermine our .+ objectives\.$/i,
                        /^Our department has serious concerns about this approach\.$/i,
                        /^This has limited direct impact on .+ operations\.$/i,
                        /^Our department has no strong position on this matter\.$/i,
                        /^We see both risks and potential benefits for .+\.$/i,
                        /^This warrants careful monitoring from our department\.$/i,
                    ];

                    if (HARD_FAIL_BOILERPLATE_PATTERNS.some(p => p.test(feedback))) {
                        add('error', 'advisor-boilerplate', oid, `Advisor feedback for ${fb.roleId} is exact template boilerplate and must be rewritten with concrete analysis`);
                    }
                }
            }
        }

        const VALID_RELATIONSHIP_ROLE_IDS = new Set([
            'border_rival', 'adversary', 'ally', 'trade_partner', 'partner',
            'rival', 'regional_rival', 'neutral', 'neighbor', 'nation',
        ]);
        for (const re of (opt as any).relationshipEffects ?? []) {
            if (!re.relationshipId || !VALID_RELATIONSHIP_ROLE_IDS.has(re.relationshipId))
                add('error', 'invalid-relationship-effect', oid, `Invalid relationshipEffects.relationshipId: "${re.relationshipId}". Valid ids: ${[...VALID_RELATIONSHIP_ROLE_IDS].join(', ')}`);
            if (typeof re.delta !== 'number' || re.delta < -100 || re.delta > 100)
                add('error', 'invalid-relationship-effect', oid, `relationshipEffects.delta must be a number between -100 and 100`);
            if (re.probability != null && (typeof re.probability !== 'number' || re.probability < 0 || re.probability > 1))
                add('error', 'invalid-relationship-effect', oid, `relationshipEffects.probability must be between 0 and 1`);
        }

        if (opt.outcomeSummary) {
            const sentenceCount = (opt.outcomeSummary.match(/[.!?]+/g) || []).length;
            if (sentenceCount < 2)
                add('warn', 'shallow-outcome', oid, `Summary only ${sentenceCount} sentences`, true);

            if (!isExclusive) {
                const tokenMatches = opt.outcomeSummary.match(/\{[a-z_]+\}/gi) || [];
                for (const token of tokenMatches) {
                    const tokenName = token.replace(/[{}]/g, '').toLowerCase();
                    if (!cfg.validTokens.has(tokenName))
                        add('warn', 'invalid-token', oid, `Invalid token: ${token}`, true);
                }
            }

            const startsWithToken = /^\{[a-z_]+\}/i.test(opt.outcomeSummary.trim());
            const firstNonTokenChar = opt.outcomeSummary.trim().replace(/^\{[a-z_]+\}\s*/i, '')[0];
            if (startsWithToken && firstNonTokenChar && /[A-Z]/.test(firstNonTokenChar))
                add('warn', 'token-grammar-issue', oid, `Word after leading token should stay lowercase in outcome prose`, true);
        }
    }

    const checkTokens = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        const tokenMatches = text.match(/\{[a-zA-Z_]+\}/g) || [];
        if (isExclusive && tokenMatches.length > 0) {
            add('error', 'exclusive-has-tokens', scenario.id, `Exclusive scenarios must not use {token} placeholders — use real names instead. Found in ${fieldName}: ${tokenMatches.join(', ')}`, false);
            return;
        }
        for (const token of tokenMatches) {
            const tokenName = token.replace(/[{}]/g, '');
            const tokenLower = tokenName.toLowerCase();
            if (tokenName !== tokenLower)
                add('error', 'token-casing-error', scenario.id, `Token ${token} must be lowercase: {${tokenLower}}`, true);
            if (!cfg.validTokens.has(tokenLower))
                add('warn', 'invalid-token', scenario.id, `Invalid token in ${fieldName}: ${token}`, true);
        }
    };

    checkTokens(scenario.description, 'description');
    checkTokens(scenario.title, 'title');
    for (const opt of scenario.options) {
        checkTokens(opt.text, `option ${opt.id} text`);
        checkTokens(opt.outcomeHeadline, `option ${opt.id} headline`);
        checkTokens(opt.outcomeSummary, `option ${opt.id} summary`);
        checkTokens(opt.outcomeContext, `option ${opt.id} context`);
    }

    const scenarioTextCorpus = [
        scenario.description,
        ...scenario.options.flatMap((opt) => [
            opt.text,
            opt.outcomeHeadline,
            opt.outcomeSummary,
            opt.outcomeContext,
        ]),
    ].filter((text): text is string => Boolean(text)).join(' ');

    const relationshipTokensUsed = collectRelationshipTokens(scenarioTextCorpus);

    if (scenario.metadata?.scopeTier === 'universal' && relationshipTokensUsed.length > 0) {
        add(
            'error',
            'universal-relationship-token',
            scenario.id,
            `Universal scenarios cannot depend on country relationship tokens (${relationshipTokensUsed
                .map(formatRelationshipToken)
                .join(', ')}). Scope the scenario to compatible countries or rewrite it with universal framing.`,
            false
        );
    }

    const applicableCountries = scenario.applicability?.applicableCountryIds ?? [];
    const countriesById = cfg.countriesById ?? {};
    if (relationshipTokensUsed.length > 0 && applicableCountries.length > 0) {
        for (const tokenName of relationshipTokensUsed) {
            const unsupportedCountryIds = applicableCountries.filter((countryId: string) => {
                const country = countriesById[countryId];
                return !country || !supportsRelationshipToken(country, tokenName);
            });
            if (unsupportedCountryIds.length > 0) {
                add(
                    'error',
                    'country-relationship-token-mismatch',
                    scenario.id,
                    `Scenario uses ${formatRelationshipToken(tokenName)} but applicable_countries include countries that cannot resolve it: ${unsupportedCountryIds.join(', ')}`,
                    false
                );
            }
        }
    }

    const hasNaturalLanguageRelationshipActor = (() => {
        switch (actorPattern) {
            case 'ally':
                return /\ballied\s+(government|nation|state|partner)\b|\byour\s+(formal\s+)?ally\b/i.test(scenarioTextCorpus);
            case 'adversary':
                return /\byour\s+(main\s+)?adversary\b|\bhostile\s+(power|state|nation)\b|\bopposing\s+state\b/i.test(scenarioTextCorpus);
            case 'border_rival':
                return /\bborder\s+rival\b|\bneighboring\s+rival\b|\bneighboring\s+state\b|\bacross\s+the\s+border\b/i.test(scenarioTextCorpus);
            case 'mixed':
                return /\b(ally|adversary|border\s+rival|neighboring\s+rival|hostile\s+power|trade\s+partner)\b/i.test(scenarioTextCorpus);
            default:
                return true;
        }
    })();

    if (!hasNaturalLanguageRelationshipActor && scenario.metadata?.scopeTier !== 'universal') {
        if (actorPattern === 'ally' || actorPattern === 'adversary' || actorPattern === 'border_rival' || actorPattern === 'mixed') {
            add(
                'warn',
                'missing-relationship-actor-language',
                scenario.id,
                `Scenario metadata actorPattern=${actorPattern} but prose does not clearly name the corresponding relationship actor in natural language.`,
                true
            );
        }
    }

    {
        const narrativeCorpus = [
            scenario.title,
            scenario.description,
            ...(scenario.options ?? []).flatMap((o) => [o.text, o.outcomeHeadline, o.outcomeSummary]),
        ].filter(Boolean).join(' ');
        const inferred = inferRequirementsFromNarrative(narrativeCorpus, scenario.applicability?.requires);
        // For universal scope, regime flags (democratic_regime, authoritarian_regime, fragile_state)
        // are stripped by deterministicFix — suppress coherence warns for them to avoid false positives.
        const UNIVERSAL_STRIPPED: ReadonlySet<string> = new Set(['democratic_regime', 'authoritarian_regime', 'fragile_state']);
        const isUniversal = scenario.metadata?.scopeTier === 'universal';
        const missingKeys = (Object.keys(inferred) as RequiresFlag[])
            .filter(k => !(isUniversal && UNIVERSAL_STRIPPED.has(k)));
        if (missingKeys.length > 0) {
            add(
                'warn',
                'narrative-requires-coherence',
                scenario.id,
                `Scenario narrative implies geopolitical requirements not in requires block: ${missingKeys.join(', ')}. Add applicability.requires.${missingKeys[0]}=true (and others as needed) to restrict eligibility to appropriate countries.`,
                true,
            );
        }
    }

    if (scenario.title?.trim()) {
        const wordCount = scenario.title.trim().split(/\s+/).length;
        if (wordCount < 4)
            add('error', 'title-too-short', scenario.id, `Title has ${wordCount} words (min 4)`);
        else if (wordCount > 10)
            add('warn', 'title-too-long', scenario.id, `Title has ${wordCount} words (max recommended 10)`);

        const title = scenario.title.trim();
        const formulaicPatterns: Array<[RegExp, string]> = [
            [/\b(crisis|crises)\s*(response|options|management)?\s*$/i, 'ends with "Crisis [Response/Options/Management]"'],
            [/^managing\s+/i, 'starts with "Managing"'],
            [/^(balancing|handling|navigating)\s+/i, 'starts with a generic gerund (Balancing/Handling/Navigating)'],
            [/\b(debate|decision|dilemma|challenge|conflict)\s*$/i, 'ends with a generic noun (Debate/Decision/Dilemma/Challenge/Conflict) — use a verb instead'],
            [/\b(response|response\s+options)\s*$/i, 'ends with "Response" or "Response Options" — use a verb instead'],
        ];
        for (const [pattern, reason] of formulaicPatterns) {
            if (pattern.test(title)) {
                add('error', 'formulaic-title', scenario.id, `Title is formulaic: ${reason}. Write a verb-containing headline instead (e.g. "Parliament Blocks Emergency Bill")`, true);
                break;
            }
        }

        const titleWords = title.toLowerCase().split(/\s+/);
        for (let i = 1; i < titleWords.length; i++) {
            if (titleWords[i] === titleWords[i - 1] && titleWords[i].length > 2) {
                add('error', 'duplicate-word-in-title', scenario.id, `Title has duplicate adjacent word: "${titleWords[i]}"`, true);
                break;
            }
        }
    }

    const checkTextQuality = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        if (/  +/.test(text))
            add('error', 'double-space', scenario.id, `${fieldName} contains double spaces`, true);
        if (/(?<!\.)\.{2}(?!\.)/.test(text) || /\. \./.test(text) || /, ,/.test(text))
            add('error', 'orphaned-punctuation', scenario.id, `${fieldName} contains orphaned or doubled punctuation`, true);
        if (hasRepeatedWord(text))
            add('warn', 'repeated-word', scenario.id, `${fieldName} repeats a word consecutively`, true);
        if (hasDanglingEnding(text))
            add('warn', 'dangling-ending', scenario.id, `${fieldName} ends with a dangling article or preposition`, true);
        if (fieldName.includes('headline') && isHeadlineFragment(text))
            add('warn', 'headline-fragment', scenario.id, `${fieldName} reads like an incomplete fragment`, true);
        if (fieldName.includes('option') && /\b(You|you)\s+direct(ed)?\s+to\b/.test(text))
            add('warn', 'missing-direct-object', scenario.id, `${fieldName} is missing a direct object after "direct to"`, true);
        if (!isExclusive && /\bthe \{[a-z_]+\}/i.test(text)) {
            // In the minimal strategy, "the {finance_role}" is the CORRECT way to write it
            // (no article form tokens). This rule only applies to legacy.
        }

        const startsWithAcceptableTokenLedPhrase = (() => {
            const trimmed = text.trim();
            return /^\{[a-z_]+\}/i.test(trimmed);
        })();

        const firstNarrativeChar = (() => {
            let inToken = false;
            for (const ch of text) {
                if (ch === '{') {
                    inToken = true;
                    continue;
                }
                if (ch === '}') {
                    inToken = false;
                    continue;
                }
                if (inToken) continue;
                if (/[A-Za-z]/.test(ch)) return ch;
            }
            return '';
        })();
        if (!startsWithAcceptableTokenLedPhrase && firstNarrativeChar && firstNarrativeChar === firstNarrativeChar.toLowerCase()) {
            add('warn', 'lowercase-start', scenario.id, `${fieldName} begins with lowercase wording`, true);
        }
        if (!isExclusive) {
            for (const rule of GOV_STRUCTURE_RULES) {
                if (rule.detect.test(text))
                    add('warn', 'hardcoded-gov-structure', scenario.id, `${fieldName} contains a hardcoded government-structure term — ${rule.suggestion}`);
            }
            for (const rule of INSTITUTION_PHRASE_RULES) {
                if (rule.detect.test(text))
                    add('warn', 'hardcoded-institution-phrase', scenario.id, `${fieldName} contains a hardcoded institution name — ${rule.suggestion}`);
            }
        }
        const RELATIONSHIP_TOKEN_PATTERN = /\{the_(?:adversary|border_rival|regional_rival|ally|trade_partner|neutral|rival|partner|neighbor|nation)\}|\{(?:adversary|border_rival|regional_rival|ally|trade_partner|neutral|rival|partner|neighbor|nation)\}/gi;
        if (RELATIONSHIP_TOKEN_PATTERN.test(text))
            add('error', 'relationship-token-in-prose', scenario.id, `${fieldName} uses relationship tokens ({adversary}, {ally}, {border_rival}, etc.) in prose — write as natural language instead (e.g. "your border rival", "the allied government")`);

        const sentenceBoundaries = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
        for (const sentence of sentenceBoundaries) {
            const words = sentence.split(/\s+/).filter(Boolean);
            if (words.length > 50)
                add('warn', 'complex-sentence', scenario.id, `${fieldName} has a sentence with ${words.length} words (max 50)`);
        }

        let sentenceWordCount = 0;
        for (const word of text.split(/\s+/)) {
            sentenceWordCount++;
            if (/[.!?]/.test(word)) {
                if (sentenceWordCount > 50)
                    add('warn', 'run-on-sentence', scenario.id, `${fieldName} has a run-on sentence (~${sentenceWordCount} words)`);
                sentenceWordCount = 0;
            }
        }
    };

    checkTextQuality(scenario.title, 'title');
    checkTextQuality(scenario.description, 'description');
    for (const opt of scenario.options) {
        checkTextQuality(opt.text, `option ${opt.id} text`);
        checkTextQuality(opt.outcomeHeadline, `option ${opt.id} headline`);
        checkTextQuality(opt.outcomeSummary, `option ${opt.id} summary`);
        checkTextQuality(opt.outcomeContext, `option ${opt.id} context`);
        for (const fb of ((opt.advisorFeedback ?? []) as any[])) {
            if (fb?.feedback)
                checkTextQuality(fb.feedback as string, `option ${opt.id} advisor ${fb.roleId}`);
        }
    }

    for (const opt of scenario.options) {
        if (opt.label?.trim()) {
            const labelWords = opt.label.trim().split(/\s+/).length;
            if (labelWords > 6)
                add('warn', 'label-too-long', `${scenario.id}/${opt.id}`, `Label "${opt.label}" is ${labelWords} words (max 6)`);
            if (/\{[a-z_]+\}/i.test(opt.label))
                add('warn', 'label-has-token', `${scenario.id}/${opt.id}`, `Label "${opt.label}" contains a token; labels should be plain human-readable text`);
            if (/\b(if|unless|provided|assuming)\b|[:()]/i.test(opt.label))
                add('error', 'label-complexity', `${scenario.id}/${opt.id}`, `Label "${opt.label}" is too complex. Use a short direct action phrase.`);
        }
    }

    if (Array.isArray(scenario.applicability?.metricGates)) {
        scenario.applicability!.metricGates.forEach((gate, i) => {
            if (gate.metricId && !cfg.validMetricIds.has(gate.metricId)) {
                add('error', 'conditions-invalid-metric', scenario.id,
                    `applicability.metricGates[${i}] references unknown metricId "${gate.metricId}"`);
            }
            if (gate.min !== undefined && gate.max !== undefined && gate.min >= gate.max) {
                add('warn', 'conditions-unreachable-range', scenario.id,
                    `applicability.metricGates[${i}] has unreachable range (min ${gate.min} >= gate.max ${gate.max})`);
            }
            if ((gate.max !== undefined && gate.max < 15) || (gate.min !== undefined && gate.min > 85)) {
                add('warn', 'conditions-too-restrictive', scenario.id,
                    `applicability.metricGates[${i}] threshold is extreme — scenario may rarely appear in gameplay`);
            }
        });
    }

    const VALID_RELATIONSHIP_IDS = new Set([
        'adversary', 'ally', 'trade_partner', 'partner',
        'rival', 'border_rival', 'regional_rival', 'neutral', 'nation'
    ]);
    if (Array.isArray(scenario.relationship_conditions)) {
        scenario.relationship_conditions.forEach((rc: any, i: number) => {
            if (!rc.relationshipId || !VALID_RELATIONSHIP_IDS.has(rc.relationshipId)) {
                add('error', 'relationship-condition-invalid-role', scenario.id,
                    `relationship_conditions[${i}] has unknown relationshipId "${rc.relationshipId}". Valid: ${[...VALID_RELATIONSHIP_IDS].join(', ')}`);
            }
            if ((rc.min !== undefined && (rc.min < -100 || rc.min > 100)) ||
                (rc.max !== undefined && (rc.max < -100 || rc.max > 100))) {
                add('error', 'relationship-condition-out-of-range', scenario.id,
                    `relationship_conditions[${i}] min/max must be in −100..100 (relationship strength scale)`);
            }
            if (rc.min !== undefined && rc.max !== undefined && rc.min >= rc.max) {
                add('warn', 'relationship-condition-unreachable-range', scenario.id,
                    `relationship_conditions[${i}] has unreachable range (min ${rc.min} >= max ${rc.max})`);
            }
        });
    }
    const scenarioActorPattern = scenario.metadata?.actorPattern;
    const relationalPatterns = new Set(['adversary', 'border_rival', 'ally', 'rival', 'regional_rival']);
    if (scenarioActorPattern && relationalPatterns.has(scenarioActorPattern)) {
        const hasRelCond = Array.isArray(scenario.relationship_conditions) && scenario.relationship_conditions.length > 0;
        if (!hasRelCond) {
            add('warn', 'actor-pattern-no-relationship-condition', scenario.id,
                `Scenario uses actor pattern "${scenarioActorPattern}" but has no relationship_conditions — it may appear regardless of the actual relationship state`);
        }
    }
    // Geopolitical RequiresFlags should also be paired with relationship_conditions so the scenario
    // only fires when the relationship is actually in the expected state.
    const geopoliticalRequiresFlags = new Set(['formal_ally', 'adversary', 'land_border_adversary', 'trade_partner']);
    const requires = scenario.applicability?.requires ?? {};
    const usedGeoFlags = (Object.keys(requires) as string[]).filter((f) => geopoliticalRequiresFlags.has(f));
    if (usedGeoFlags.length > 0) {
        const hasRelCond = Array.isArray(scenario.relationship_conditions) && scenario.relationship_conditions.length > 0;
        if (!hasRelCond) {
            add('warn', 'geo-flag-no-relationship-condition', scenario.id,
                `Scenario requires [${usedGeoFlags.join(', ')}] but has no relationship_conditions — relationship strength is dynamic and should be bounded`);
        }
    }

    const optionMetricSets = scenario.options.map(opt =>
        new Set((opt.effects ?? []).map((e: any) => e.targetMetricId).filter(Boolean))
    );

    const optionDomains = Array.isArray(scenario.metadata?.optionDomains)
        ? scenario.metadata?.optionDomains.filter((domain) => typeof domain?.primaryMetric === 'string' && domain.primaryMetric.trim().length > 0)
        : [];
    if (optionDomains.length > 0) {
        if (optionDomains.length !== 3) {
            add('warn', 'option-domain-count', scenario.id, `metadata.optionDomains should contain exactly 3 entries (found ${optionDomains.length})`);
        }
        const primaryMetrics = optionDomains.map((domain) => domain.primaryMetric);
        if (new Set(primaryMetrics).size !== primaryMetrics.length) {
            add('warn', 'option-domain-duplicate-primary', scenario.id, 'metadata.optionDomains has duplicate primary metrics. All three options should map to distinct primary metrics.');
        }

        scenario.options.forEach((opt, optionIndex) => {
            const expected = optionDomains[optionIndex];
            if (!expected) return;
            const effectMetrics = new Set((opt.effects ?? []).map((e: any) => e.targetMetricId).filter(Boolean));
            if (!effectMetrics.has(expected.primaryMetric)) {
                add(
                    'warn',
                    'option-domain-missing-primary',
                    `${scenario.id}/${opt.id}`,
                    `Option ${opt.id} is assigned primary metric ${expected.primaryMetric} but has no effect targeting that metric.`
                );
            }
        });
    }

    if (optionMetricSets.length === 3) {
        const same = (a: Set<string>, b: Set<string>) =>
            a.size === b.size && [...a].every(m => b.has(m));
        if (same(optionMetricSets[0], optionMetricSets[1]) && same(optionMetricSets[1], optionMetricSets[2])) {
            add('warn', 'option-metric-overlap', scenario.id,
                `All 3 options affect the same metric set (${[...optionMetricSets[0]].join(', ')}). Options should differentiate across domains.`);
        }
    }

    const severity = scenario.metadata?.severity;
    if (severity === 'critical') {
        const allEffects = scenario.options.flatMap(opt => opt.effects ?? []);
        const hasSignificant = allEffects.some((e: any) => Number.isFinite(e.value) && Math.abs(e.value) >= 5.0);
        if (allEffects.length > 0 && !hasSignificant) {
            add('error', 'severity-effect-mismatch', scenario.id,
                `Severity is "critical" but all ${allEffects.length} effects have |value| < 5.0. A critical scenario requires at least one effect ≥ 5.0 (range: 5.0–7.0).`);
        }
    } else if (severity === 'extreme') {
        const allEffects = scenario.options.flatMap(opt => opt.effects ?? []);
        const hasSignificant = allEffects.some((e: any) => Number.isFinite(e.value) && Math.abs(e.value) >= 3.5);
        if (allEffects.length > 0 && !hasSignificant) {
            add('warn', 'severity-effect-mismatch', scenario.id,
                `Severity is "extreme" but all ${allEffects.length} effects have |value| < 3.5. An extreme scenario needs at least one effect ≥ 3.5 (range: 3.5–7.0).`);
        }
    } else if (severity === 'high') {
        const allEffects = scenario.options.flatMap(opt => opt.effects ?? []);
        const hasSignificant = allEffects.some((e: any) => Number.isFinite(e.value) && Math.abs(e.value) >= 2.5);
        if (allEffects.length > 0 && !hasSignificant) {
            add('warn', 'severity-effect-mismatch', scenario.id,
                `Severity is "high" but all ${allEffects.length} effects have |value| < 2.5. A high scenario needs at least one effect ≥ 2.5 (range: 4.5–6.0).`);
        }
    }

    const stancesByRole: Record<string, Set<string>> = {};
    for (const opt of scenario.options) {
        for (const fb of (opt.advisorFeedback ?? [])) {
            if (!fb.roleId || !fb.stance) continue;
            if (!stancesByRole[fb.roleId]) stancesByRole[fb.roleId] = new Set();
            stancesByRole[fb.roleId].add(fb.stance);
        }
    }
    const uniformCount = Object.values(stancesByRole).filter(s => s.size === 1).length;
    if (uniformCount > 8) {
        add('warn', 'advisor-stance-uniformity', scenario.id,
            `${uniformCount}/13 advisors have identical stance across all options. Options should create genuine advisor disagreement.`);
    }

    for (const opt of scenario.options) {
        if (!opt.policyImplications) continue;
        for (const impl of opt.policyImplications) {
            if (!cfg.validSettingTargets.includes(impl.target as any)) {
                add('error', 'invalid-policy-target', scenario.id,
                    `Option ${opt.id} has invalid policyImplication target: "${impl.target}"`);
            }
            if (typeof impl.delta !== 'number' || impl.delta < -15 || impl.delta > 15) {
                add('error', 'policy-delta-out-of-range', scenario.id,
                    `Option ${opt.id} policyImplication delta ${impl.delta} out of range [-15, 15]`);
            }
        }
    }

    const FOREIGN_TARGET_PATTERN = /\bsanctions?\s+(?:on|against|imposed\s+on|targeting)\s+(?:the\s+)?(?:acting\s+|current\s+|incumbent\s+)?\{(?:the_)?leader_title\}/gi;
    const PLAYER_AS_FOREIGN_FIELDS: Array<[string, string]> = [
        [scenario.description, 'description'],
        ...scenario.options.flatMap(o => [[o.text, `option ${o.id} text`] as [string, string]]),
    ];
    for (const [text, field] of PLAYER_AS_FOREIGN_FIELDS) {
        if (text && FOREIGN_TARGET_PATTERN.test(text)) {
            add('error', 'player-token-as-foreign-actor', scenario.id,
                `${field}: {leader_title} used as reference to a foreign leader — this token resolves to the player's own leader. Use natural language ("a foreign leader", "the sanctioned official") instead.`);
        }
        FOREIGN_TARGET_PATTERN.lastIndex = 0;
    }

    const tags = scenario.metadata?.tags ?? [];
    for (const tag of tags) {
        if (!CANONICAL_TAG_SET.has(tag)) {
            add('warn', 'non-canonical-tag', scenario.id,
                `Tag "${tag}" is not in the canonical vocabulary and will be ignored at runtime.`);
        }
        const implied = STATE_TAG_CONDITION_MAP[tag];
        if (!implied) continue;
        const metricGates = scenario.applicability?.metricGates ?? [];
        const covered = metricGates.some(
            (g) => g.metricId === implied.metricId && (implied.op === 'max' ? g.max !== undefined : g.min !== undefined)
        );
        if (!covered) {
            add('warn', 'state-tag-missing-condition', scenario.id,
                `Tag "${tag}" implies ${implied.metricId} ${implied.op} ${implied.threshold} but no matching metricGate is set — scenario may appear in mismatched game states.`,
                true);
        }
    }

    const scenarioRequires = scenario.applicability?.requires ?? {};
    for (const [requiresKey, implied] of Object.entries(REQUIRES_CONDITION_MAP) as Array<[RequiresFlag, { metricId: string; op: 'min' | 'max'; threshold: number }]>) {
        if (!scenarioRequires[requiresKey]) continue;
        const metricGates2 = scenario.applicability?.metricGates ?? [];
        const covered = metricGates2.some(
            (g) => g.metricId === implied.metricId && (implied.op === 'max' ? g.max !== undefined : g.min !== undefined)
        );
        if (!covered) {
            add('warn', 'requires-missing-condition', scenario.id,
                `applicability.requires.${requiresKey} is set but no metricGate gates ${implied.metricId} (${implied.op} ${implied.threshold}) — scenario may fire in degraded game states where this requirement is no longer meaningful.`,
                true);
        }
    }

    return issues;
}

export function scoreScenario(issues: Issue[]): number {
    let score = 100;
    for (const issue of issues) {
        if (issue.severity === 'error') {
            score -= 12;
        } else if (SOFT_PENALTY_RULES.has(issue.rule)) {
            score -= 2;
        } else {
            score -= 4;
        }
    }
    return Math.max(0, score);
}

export function normalizeScenarioTextFields(scenario: BundleScenario): { fixed: boolean; fixes: string[] } {
    let fixed = false;
    const fixes: string[] = [];

    const normalizeTokenCase = (text: string | undefined): string | undefined =>
        text?.replace(/\{([a-zA-Z_]+)\}/g, (_match, token) => `{${String(token).toLowerCase()}}`);

    const collapseRepeatedPhrase = (text: string): string =>
        text.replace(/\b([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){0,3})\s+\1\b/gi, '$1');

    const collapseRepeatedSentences = (text: string): string => {
        const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
        const deduped: string[] = [];
        for (const sentence of sentences) {
            if (deduped[deduped.length - 1]?.toLowerCase() === sentence.toLowerCase()) continue;
            deduped.push(sentence);
        }
        return deduped.join(' ');
    };

    const capitalizeFirstNarrativeLetter = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let inToken = false;
        let seenToken = false;
        let prevType: 'boundary' | 'other' = 'boundary';
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '{') { inToken = true; continue; }
            if (ch === '}') { inToken = false; seenToken = true; continue; }
            if (inToken) continue;
            if (seenToken) return text;
            if (/\s/.test(ch)) { prevType = 'boundary'; continue; }
            if (/[A-Za-z]/.test(ch)) {
                if (prevType === 'boundary' && /[a-z]/.test(ch)) {
                    return text.slice(0, i) + ch.toUpperCase() + text.slice(i + 1);
                }
                return text;
            }
            prevType = 'other';
        }
        return text;
    };

    const capitalizeSentenceBoundaries = (text: string): string => {
        const chars = text.split('');
        let inToken = false;
        let capitalizeNextNarrativeLetter = false;
        let tokenClosedWhilePending = false;

        for (let i = 0; i < chars.length; i++) {
            const ch = chars[i];

            if (ch === '{') {
                inToken = true;
                continue;
            }
            if (ch === '}') {
                inToken = false;
                if (capitalizeNextNarrativeLetter) {
                    tokenClosedWhilePending = true;
                }
                continue;
            }
            if (inToken) continue;

            if (capitalizeNextNarrativeLetter) {
                if (/[A-Za-z]/.test(ch)) {
                    if (!tokenClosedWhilePending && /[a-z]/.test(ch)) chars[i] = ch.toUpperCase();
                    capitalizeNextNarrativeLetter = false;
                    tokenClosedWhilePending = false;
                    continue;
                }
                if (/\s|["(\[]/.test(ch)) continue;
                if (tokenClosedWhilePending && ch === '\'') {
                    capitalizeNextNarrativeLetter = false;
                    tokenClosedWhilePending = false;
                    continue;
                }
                if (/[)}\]"\u201D]/.test(ch)) continue;
                capitalizeNextNarrativeLetter = false;
                tokenClosedWhilePending = false;
            }

            if (/[.!?]/.test(ch)) {
                capitalizeNextNarrativeLetter = true;
                tokenClosedWhilePending = false;
            }
        }

        return chars.join('');
    };

    const normalizeText = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let result = normalizeTokenCase(text) ?? text;
        result = repairTextIntegrity(result) ?? result;
        result = collapseRepeatedPhrase(result);
        result = collapseRepeatedSentences(result);
        result = repairTextIntegrity(result) ?? result;
        result = capitalizeFirstNarrativeLetter(result) ?? result;
        result = capitalizeSentenceBoundaries(result);
        return result;
    };

    const apply = (value: string | undefined, label: string): string | undefined => {
        const normalized = normalizeText(value);
        if (value !== normalized) {
            fixed = true;
            fixes.push(label);
        }
        return normalized;
    };

    scenario.title = apply(scenario.title, 'normalized title') ?? scenario.title;
    scenario.description = apply(scenario.description, 'normalized description') ?? scenario.description;

    for (const option of scenario.options) {
        option.text = apply(option.text, `${option.id}: normalized text`) ?? option.text;
        if (typeof option.outcomeHeadline === 'string') {
            option.outcomeHeadline = apply(option.outcomeHeadline, `${option.id}: normalized outcomeHeadline`) ?? option.outcomeHeadline;
        }
        if (typeof option.outcomeSummary === 'string') {
            option.outcomeSummary = apply(option.outcomeSummary, `${option.id}: normalized outcomeSummary`) ?? option.outcomeSummary;
        }
        if (typeof option.outcomeContext === 'string') {
            option.outcomeContext = apply(option.outcomeContext, `${option.id}: normalized outcomeContext`) ?? option.outcomeContext;
        }
        for (const feedback of option.advisorFeedback ?? []) {
            feedback.feedback = apply(feedback.feedback, `${option.id}: normalized advisor feedback`) ?? feedback.feedback;
        }
    }

    return { fixed, fixes };
}

// ── Config builder ──

export function buildAuditConfig(params: {
    metricsData: { id: string; inverse?: boolean; effectMagnitudeCap?: number; relatedRoles?: string[] }[];
    contentRules: { banned_abbreviations?: string[]; banned_units?: string[]; banned_directions?: string[]; banned_party_names?: string[] };
    genConfig: { effect_default_cap?: number; effect_duration?: { min?: number; max?: number }; category_domain_metrics?: Record<string, string[]>; metric_mappings?: Record<string, string> };
    countriesDoc: Record<string, any>;
    canonicalRoleIds: string[];
    allTokens: string[];
    articleFormTokenNames: string[];
    sentenceStartArticleFormTokenNames?: string[];
    validSettingTargets: readonly string[];
}): AuditConfig {
    const { metricsData, contentRules, genConfig, countriesDoc, canonicalRoleIds, allTokens, articleFormTokenNames, sentenceStartArticleFormTokenNames, validSettingTargets } = params;

    const validMetricIds = new Set(metricsData.map((m) => m.id));
    const inverseMetrics = new Set(
        metricsData.filter((m) => m.inverse === true).map((m) => m.id)
    );
    const metricMagnitudeCaps: Record<string, number> = {};
    const metricToRoles: Record<string, string[]> = {};
    const validRoleIds = new Set<string>(canonicalRoleIds);
    for (const m of metricsData) {
        if (m.effectMagnitudeCap != null) metricMagnitudeCaps[m.id] = m.effectMagnitudeCap;
        if (Array.isArray(m.relatedRoles)) {
            metricToRoles[m.id] = m.relatedRoles;
            m.relatedRoles.forEach((r: string) => validRoleIds.add(r));
        }
    }

    const bannedCountryPhrasesList = buildBannedCountryPhrases(countriesDoc);
    const bannedAbbreviations: string[] = contentRules.banned_abbreviations ?? [];
    const bannedUnits: string[] = contentRules.banned_units ?? [];
    const bannedDirections: string[] = contentRules.banned_directions ?? [];
    const bannedPartyNames: string[] = contentRules.banned_party_names ?? [];
    const bannedPhrases = [
        ...bannedCountryPhrasesList,
        ...bannedAbbreviations,
        ...bannedUnits,
        ...bannedDirections,
        ...bannedPartyNames,
    ];

    const govTypesByCountryId: Record<string, string> = {};
    for (const [id, country] of Object.entries(countriesDoc)) {
        const govType = (country as any)?.governmentType as string | undefined;
        if (govType) {
            govTypesByCountryId[id] = govType;
        }
    }

    const defaultMetricMappings: Record<string, string> = {
        metric_commerce_role: 'metric_trade',
    };

    return {
        validMetricIds,
        validRoleIds,
        inverseMetrics,
        metricMagnitudeCaps,
        defaultCap: genConfig.effect_default_cap ?? 7.5,
        metricToRoles,
        categoryDomainMetrics: genConfig.category_domain_metrics ?? {},
        metricMappings: { ...defaultMetricMappings, ...(genConfig.metric_mappings ?? {}) },
        bannedPhrases,
        bannedPhraseRegexes: bannedPhrases.map(phrase => {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return {
                phrase,
                regex: /^[A-Z]+$/.test(phrase)
                    ? new RegExp(`\\b${escaped}\\b`)
                    : new RegExp(`\\b${escaped}\\b`, 'i'),
            };
        }),
        bannedCountryPhrases: new Set(bannedCountryPhrasesList),
        validTokens: new Set<string>(allTokens),
        logicParameters: {
            duration: {
                min: genConfig.effect_duration?.min ?? 1,
                max: genConfig.effect_duration?.max ?? 20,
            },
            probability: { required: 1 },
        },
        govTypesByCountryId,
        countriesById: countriesDoc,
        canonicalRoleIds,
        articleFormTokenNames: new Set<string>(articleFormTokenNames),
        sentenceStartArticleFormTokenNames: new Set<string>(sentenceStartArticleFormTokenNames ?? articleFormTokenNames),
        validSettingTargets,
    };
}
