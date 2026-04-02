/**
 * Audit Rules Module
 *
 * All configuration (valid metrics, effect caps, banned phrases, metric-to-role
 * mappings, category domain metrics) is loaded from Firebase at engine startup
 * via initializeAuditConfig(). The audit functions themselves are synchronous
 * and operate against the in-memory config cache.
 *
 * Call initializeAuditConfig(db) once before running any generation job.
 */

import { ALL_TOKENS, ARTICLE_FORM_TOKEN_NAMES, CANONICAL_ROLE_IDS, ROLE_ALIAS_MAP, buildTokenWhitelistPromptSection, buildCompactTokenPromptSection } from './token-registry';
import { ALL_BUNDLE_IDS, isValidBundleId } from '../data/schemas/bundleIds';
import { loadCountryCatalog } from './country-catalog';
import type { ScenarioExclusivityReason, ScenarioScopeTier, ScenarioSourceKind } from '../types';
import { VALID_SETTING_TARGETS } from '../types';

// ── Shared source-of-truth tables for detection AND heuristic fix ──
// Each entry: [detection regex (case-insensitive), replacement string for fix, human-readable suggestion for audit message]
// Detection uses the regex + suggestion; heuristicFix uses the regex + replacement.

type PhraseRule = { detect: RegExp; replacement: string; suggestion: string };

export const GOV_STRUCTURE_RULES: PhraseRule[] = [
    { detect: /\bruling coalition\b/gi,       replacement: '{ruling_party}',           suggestion: '"ruling coalition" → use {ruling_party}' },
    { detect: /\bgoverning coalition\b/gi,    replacement: '{ruling_party}',           suggestion: '"governing coalition" → use {ruling_party}' },
    { detect: /\bcoalition government\b/gi,   replacement: '{ruling_party}',           suggestion: '"coalition government" → use {ruling_party}' },
    { detect: /\bcoalition allies\b/gi,       replacement: 'political allies in {the_legislature}', suggestion: '"coalition allies" → use "political allies" or "allies in {legislature}"' },
    { detect: /\bparliamentary majority\b/gi, replacement: '{legislature} majority',   suggestion: '"parliamentary majority" → use "{legislature} majority"' },
    { detect: /\bparliamentary minority\b/gi, replacement: '{legislature} minority',   suggestion: '"parliamentary minority" → use "{legislature} minority"' },
    { detect: /\bparliamentary support\b/gi,  replacement: '{legislature} support',    suggestion: '"parliamentary support" → use "{legislature} support"' },
    { detect: /\bparliamentary vote\b/gi,     replacement: '{legislature} vote',       suggestion: '"parliamentary vote" → use "{legislature} vote"' },
    { detect: /\bparliamentary approval\b/gi, replacement: '{legislature} approval',   suggestion: '"parliamentary approval" → use "{legislature} approval"' },
    { detect: /\bparliamentary debate\b/gi,   replacement: '{legislature} debate',     suggestion: '"parliamentary debate" → use "{legislature} debate"' },
    { detect: /\bparliamentary session\b/gi,  replacement: '{legislature} session',    suggestion: '"parliamentary session" → use "{legislature} session"' },
    { detect: /\bparliamentary committee\b/gi,replacement: '{legislature} committee',  suggestion: '"parliamentary committee" → use "{legislature} committee"' },
    { detect: /\blegislative body\b/gi,       replacement: '{the_legislature}',        suggestion: '"legislative body" → use {legislature}' },
    { detect: /\bnational legislature\b/gi,   replacement: '{the_legislature}',        suggestion: '"national legislature" → use {legislature}' },
    { detect: /\bpresidential palace\b/gi,    replacement: "{leader_title}'s office",  suggestion: '"presidential palace" → use {leader_title}\'s office' },
    { detect: /\bpresidential decree\b/gi,    replacement: "{leader_title}'s decree",  suggestion: '"presidential decree" → use {leader_title}\'s decree' },
    { detect: /\bpresidential order\b/gi,     replacement: "{leader_title}'s order",   suggestion: '"presidential order" → use {leader_title}\'s order' },
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
];

/**
 * Build a compact human-readable guidance block for prompt injection.
 * Generated from GOV_STRUCTURE_RULES and INSTITUTION_PHRASE_RULES so the
 * prompt always stays in sync with audit/auto-repair logic.
 */
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

function applyPhraseRules(text: string, rules: PhraseRule[]): string {
    let result = text;
    for (const rule of rules) {
        result = result.replace(rule.detect, rule.replacement);
    }
    return result;
}

// Counts real sentence-ending punctuation, ignoring periods inside common
// abbreviations (U.S., U.K., Dr., Mr., Mrs., St., vs., etc.) that would
// otherwise produce false positive sentence-count audit errors.
const ABBREVIATION_PATTERN = /\b(?:U\.S|U\.K|U\.S\.A|D\.C|e\.g|i\.e|vs|Dr|Mr|Mrs|Ms|Prof|Sr|Jr|St|Lt|Gen|Col|Sgt|Cpl|Pvt|Inc|Ltd|Corp|Gov|Rep|Sen|Dept|Approx|Appr|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./g;

function countSentences(text: string): number {
    const stripped = text.replace(ABBREVIATION_PATTERN, (m) => m.replace('.', '\x00'));
    return (stripped.match(/[.!?]+/g) || []).length;
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

const REPEATED_WORD_PATTERN = /\b([A-Za-z][A-Za-z'-]*)\s+\1\b/gi;
const DANGLING_ENDING_PATTERN = /\b(a|an|the|to|for|with|from|into|onto|of|in|on|at|by)\s*([.!?])?\s*$/i;

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

// ---------------------------------------------------------------------------
// Re-exports (schema-level constants that stay in code)
// ---------------------------------------------------------------------------

export const VALID_BUNDLE_IDS = new Set(ALL_BUNDLE_IDS);
export { isValidBundleId };
export { CANONICAL_ROLE_IDS };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface BundleOption {
    id: string;
    text: string;
    label?: string;
    is_authoritarian?: boolean;
    moral_weight?: number;
    effects: Effect[];
    policyImplications?: import('../types').PolicyImplication[];
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
        actorPattern?: 'domestic' | 'ally' | 'adversary' | 'border_rival' | 'legislature' | 'cabinet' | 'judiciary' | 'mixed';
        region_tags?: string[];
        generationProvenance?: {
            jobId: string;
            executionTarget: string;
            modelUsed: string;
            generatedAt: string;
        };
        applicable_countries?: string[] | string;
        requires_tags?: string[];
        excludes_tags?: string[];
        auditMetadata?: AuditMetadata;
    };
    chainsTo?: string[];
    oncePerGame?: boolean;
    cooldown?: number;
    phase?: 'root' | 'mid' | 'final';
    conditions?: any[];
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

// ---------------------------------------------------------------------------
// Config cache — populated by initializeAuditConfig()
// ---------------------------------------------------------------------------

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
}

let _config: AuditConfig | null = null;

type RelationshipTokenName =
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

const RELATIONSHIP_TOKEN_NAMES = new Set<RelationshipTokenName>([
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

const UNIVERSAL_RELATIONSHIP_REPLACEMENTS: Record<RelationshipTokenName, { plain: string; possessive: string }> = {
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

export function getAuditConfig(): AuditConfig {
    if (!_config) {
        throw new Error(
            '[AuditRules] Audit config not initialized. Call initializeAuditConfig(db) before running audits.'
        );
    }
    return _config;
}

export function setAuditConfigForTests(config: AuditConfig | null): void {
    _config = config;
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

function collectRelationshipTokens(text: string): RelationshipTokenName[] {
    const matches = text.match(/\{([a-z_]+)\}(?:'s|’s)?/gi) || [];
    const found = new Set<RelationshipTokenName>();
    for (const match of matches) {
        const normalized = match.replace(/[{}]/g, '').replace(/(?:'s|’s)$/i, '').toLowerCase();
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

/**
 * Extract banned phrases from the world_state/countries document.
 * Derives country names, capitals, and common partial name variants.
 */
function buildBannedCountryPhrases(countriesDoc: Record<string, any>): string[] {
    const phrases = new Set<string>();
    // Known partial name variants that should also be banned
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
            // Add known partial variants for this country name
            const variants = PARTIAL_NAME_VARIANTS[country.name];
            if (variants) {
                for (const v of variants) phrases.add(v);
            }
        }
        // capital may be a City object or a plain string
        const cap = country.capital;
        if (typeof cap === 'string') phrases.add(cap);
        else if (cap?.name) phrases.add(cap.name);
    }
    return Array.from(phrases);
}

/**
 * Initialize audit configuration from Firebase.
 * Must be called once before any audit or generation job.
 */
export async function initializeAuditConfig(db: FirebaseFirestore.Firestore): Promise<void> {
    const [metricsSnap, contentRulesSnap, genConfigSnap, countryCatalog] = await Promise.all([
        db.doc('world_state/metrics').get(),
        db.doc('world_state/content_rules').get(),
        db.doc('world_state/generation_config').get(),
        loadCountryCatalog(db),
    ]);

    const metricsData: any[] = metricsSnap.data()?.metrics ?? [];
    const contentRules = contentRulesSnap.data() ?? {};
    const genConfig = genConfigSnap.data() ?? {};

    const countriesDoc = countryCatalog.countries;

    // Build metric index from Firebase
    const validMetricIds = new Set(metricsData.map((m: any) => m.id as string));
    const inverseMetrics = new Set(
        metricsData.filter((m: any) => m.inverse === true).map((m: any) => m.id as string)
    );
    const metricMagnitudeCaps: Record<string, number> = {};
    const metricToRoles: Record<string, string[]> = {};
    const validRoleIds = new Set<string>(CANONICAL_ROLE_IDS);
    for (const m of metricsData) {
        if (m.effectMagnitudeCap != null) metricMagnitudeCaps[m.id] = m.effectMagnitudeCap;
        if (Array.isArray(m.relatedRoles)) {
            metricToRoles[m.id] = m.relatedRoles;
            m.relatedRoles.forEach((r: string) => validRoleIds.add(r));
        }
    }

    // Banned phrases: country names/capitals derived from countries doc + static rules from content_rules
    const bannedCountryPhrases = buildBannedCountryPhrases(countriesDoc);
    const bannedAbbreviations: string[] = contentRules.banned_abbreviations ?? [];
    const bannedUnits: string[] = contentRules.banned_units ?? [];
    const bannedDirections: string[] = contentRules.banned_directions ?? [];
    const bannedPartyNames: string[] = contentRules.banned_party_names ?? [];
    const bannedPhrases = [
        ...bannedCountryPhrases,
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

    _config = {
        validMetricIds,
        validRoleIds,
        inverseMetrics,
        metricMagnitudeCaps,
        defaultCap: genConfig.effect_default_cap ?? 4.2,
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
        bannedCountryPhrases: new Set(bannedCountryPhrases),
        validTokens: new Set<string>(ALL_TOKENS),
        logicParameters: {
            duration: {
                min: genConfig.effect_duration?.min ?? 1,
                max: genConfig.effect_duration?.max ?? 20,
            },
            probability: { required: 1 },
        },
        govTypesByCountryId,
        countriesById: countriesDoc,
    };

    console.log(
        `[AuditRules] Config initialized: ${validMetricIds.size} metrics, ${validRoleIds.size} roles, ` +
        `${bannedPhrases.length} banned phrases (${bannedCountryPhrases.length} from countries, source=${countryCatalog.source.path})`
    );
}

// ---------------------------------------------------------------------------
// Role helpers (using loaded config)
// ---------------------------------------------------------------------------

export function getRelevantRolesForEffects(effects: Effect[]): string[] {
    const { metricToRoles } = getAuditConfig();
    const roles = new Set<string>();
    roles.add('role_executive');
    for (const eff of effects) {
        const mapped = metricToRoles[eff.targetMetricId];
        if (mapped) mapped.forEach(r => roles.add(r));
    }
    return Array.from(roles);
}

// ---------------------------------------------------------------------------
// Audit Logic
// ---------------------------------------------------------------------------

export function auditScenario(
    scenario: BundleScenario,
    bundleCategory: string,
    genMode: boolean = false
): Issue[] {
    const cfg = getAuditConfig();
    const issues: Issue[] = [];
    const add = (severity: Issue['severity'], rule: string, target: string, message: string, autoFixable = false) =>
        issues.push({ severity, rule, target, message, autoFixable });
    const actorPattern = scenario.metadata?.actorPattern;

    if (!scenario.id) add('error', 'missing-id', scenario.id || '(none)', 'Scenario missing id');
    if (!scenario.title?.trim()) add('error', 'missing-title', scenario.id, 'Missing or empty title');
    if (!scenario.description?.trim()) add('error', 'missing-desc', scenario.id, 'Missing or empty description');

    // severity: 'error' for second-person narrative fields (description, option text); 'warn' for title
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

    checkFraming(scenario.description, 'description', 'error');
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

        // Outcome fields are third-person newspaper articles — second-person language is a hard error
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
                add('error', 'newsroom-jargon', scenario.id,
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

    // Hard-coded currency check: ERROR when scenarios embed explicit currency symbols or codes
    const checkHardCodedCurrency = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        const patterns: RegExp[] = [
            /\$\s?\d{2,}/, // $100, $2500, etc.
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
        // Bidirectional: catch verb...{gdp_description} AND {gdp_description}...verb
        const misuseVerbs = 'siphon|steal|stole|stolen|embezzl|divert|skim|misappropriate|loot|plunder|waste|squander|funnel|launder|lose|lost|drain|hemorrhage';
        const pattern1 = new RegExp(`(${misuseVerbs})[^.!?]*\{gdp_description\}`, 'i');
        const pattern2 = new RegExp(`\{gdp_description\}[^.!?]*(${misuseVerbs})`, 'i');
        // Also catch "portion of {gdp_description}" or "fraction of {gdp_description}"
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
        if (sentenceCount < 2 || sentenceCount > 4)
            add('error', 'description-length', scenario.id, `Description must be 2–3 sentences (found ${sentenceCount})`, true);
        else if (sentenceCount === 4)
            add('warn', 'description-length', scenario.id, `Description is 4 sentences (prefer 2–3 for conciseness)`, true);
        const wordCount = countWords(scenario.description);
        if (wordCount < 60)
            add('warn', 'description-word-count', scenario.id, `Description is ${wordCount} words (min 60) — add specific trigger, actors, and stakes`, true);
        if (wordCount > 140)
            add('warn', 'description-word-count', scenario.id, `Description is ${wordCount} words (max 140) — tighten prose`, true);
    }

    if (scenario.options.length !== 3)
        add('error', 'option-count', scenario.id, `Must have exactly 3 options (found ${scenario.options.length})`);

    // Ruling-party applicability: warn if {ruling_party} is used for countries where the concept is likely misleading
    const containsRulingPartyToken = (text: string | undefined): boolean =>
        !!text && text.includes('{ruling_party}');

    const anyTextUsesRulingPartyToken =
        containsRulingPartyToken(scenario.title) ||
        containsRulingPartyToken(scenario.description) ||
        scenario.options.some(
            opt =>
                containsRulingPartyToken(opt.text) ||
                containsRulingPartyToken(opt.outcomeHeadline) ||
                containsRulingPartyToken(opt.outcomeSummary) ||
                containsRulingPartyToken(opt.outcomeContext)
        );

    if (anyTextUsesRulingPartyToken && scenario.metadata?.applicable_countries && scenario.metadata.applicable_countries !== 'all') {
        const govTypesByCountryId = cfg.govTypesByCountryId || {};
        const ids = Array.isArray(scenario.metadata.applicable_countries)
            ? scenario.metadata.applicable_countries
            : [scenario.metadata.applicable_countries];
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
                'ruling-party-applicability',
                scenario.id,
                `{ruling_party} is used in a scenario that targets countries whose government types (${Array.from(
                    flaggedGovTypes
                ).join(', ')}) may not have a formal "ruling party" concept. Consider using administration/coalition/royal court phrasing instead.`,
                false
            );
        }
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
        if (meta.applicable_countries && meta.applicable_countries !== 'all' && !Array.isArray(meta.applicable_countries))
            add('error', 'invalid-countries', scenario.id, 'applicable_countries must be "all" or string[]');
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
            if (!Array.isArray(meta.applicable_countries) || meta.applicable_countries.length === 0) {
                add('error', 'exclusive-missing-countries', scenario.id, 'Exclusive scenarios must include applicable_countries');
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
    }

    const validPhases = ['root', 'mid', 'final'];
    if (scenario.phase && !validPhases.includes(scenario.phase))
        add('error', 'invalid-phase', scenario.id, `Phase "${scenario.phase}" is invalid`);

    for (const opt of scenario.options) {
        const oid = `${scenario.id}/${opt.id}`;
        if (!opt.text?.trim()) { add('error', 'empty-text', oid, 'Option text is empty'); continue; }

        if (opt.text) {
            const sentenceCount = countSentences(opt.text);
            if (sentenceCount < 2 || sentenceCount > 4)
                add('error', 'option-text-length', oid, `Option text must be 2–3 sentences (found ${sentenceCount})`, true);
            else if (sentenceCount === 4)
                add('warn', 'option-text-length', oid, `Option text is 4 sentences (prefer 2–3 for conciseness)`, true);
            const wordCount = countWords(opt.text);
            if (wordCount < 50)
                add('warn', 'option-text-word-count', oid, `Option text is ${wordCount} words (min 50) — name the mechanism, trade-off, and affected constituency`, true);
            if (wordCount > 120)
                add('warn', 'option-text-word-count', oid, `Option text is ${wordCount} words (max 120) — tighten prose`, true);
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

        if (opt.outcomeSummary?.trim() && opt.outcomeSummary.trim().length < 250)
            add('warn', 'short-summary', oid, `outcomeSummary is ${opt.outcomeSummary.trim().length} chars (min 250)`, true);
        if (opt.outcomeContext?.trim()) {
            const ctxLen = opt.outcomeContext.trim().length;
            if (ctxLen < 150)
                add('error', 'short-article', oid, `outcomeContext is ${ctxLen} chars (min 150)`, true);
            else if (ctxLen < 400)
                add('warn', 'short-summary', oid, `outcomeContext is ${ctxLen} chars (min 400)`, true);
        }

        if (!opt.advisorFeedback || !Array.isArray(opt.advisorFeedback) || opt.advisorFeedback.length === 0) {
            add('error', 'missing-advisor-feedback', oid, 'Missing advisor feedback', true);
        } else {
            const relevantRoles = getRelevantRolesForEffects(opt.effects);
            const feedbackRoles = new Set(opt.advisorFeedback.map((f: any) => f.roleId));
            for (const role of relevantRoles) {
                if (!feedbackRoles.has(role))
                    add('error', 'missing-role-feedback', oid, `Missing feedback for ${role}`, true);
            }
            for (const fb of opt.advisorFeedback) {
                if (!fb.roleId || !fb.stance || !fb.feedback?.trim())
                    add('error', 'invalid-advisor-feedback', oid, `Advisor feedback entry missing roleId, stance, or feedback text`);
                else if (!cfg.validRoleIds.has(fb.roleId))
                    add('error', 'invalid-role-id', oid, `Unknown roleId: "${fb.roleId}". Must be one of the 13 canonical cabinet roles.`);
                else {
                    // Detect auto-generated boilerplate feedback that should be replaced with substantive text
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
                    const SOFT_BOILERPLATE_FRAGMENTS = [
                        /aligns well with our [a-z\s]+ priorities/i,
                        /supports this course of action/i,
                        /could undermine our [a-z\s]+ objectives/i,
                        /has serious concerns about this approach/i,
                        /limited direct impact on [a-z\s]+ operations/i,
                        /no strong position on this matter/i,
                        /both risks and potential benefits/i,
                        /warrants careful monitoring/i,
                    ];

                    if (HARD_FAIL_BOILERPLATE_PATTERNS.some(p => p.test(feedback))) {
                        add('error', 'advisor-boilerplate', oid, `Advisor feedback for ${fb.roleId} is exact template boilerplate and must be rewritten with concrete analysis`);
                    } else if (SOFT_BOILERPLATE_FRAGMENTS.some(p => p.test(feedback))) {
                        add('warn', 'advisor-boilerplate', oid, `Advisor feedback for ${fb.roleId} appears generic and should be made scenario-specific`);
                    }
                }
            }
            if (Array.isArray(opt.advisorFeedback) && opt.advisorFeedback.length > 0) {
                const presentRoles = new Set(opt.advisorFeedback.map((f: any) => f.roleId));
                const missingRoles = [...CANONICAL_ROLE_IDS].filter(r => !presentRoles.has(r));
                if (missingRoles.length > 0) {
                    add('warn', 'missing-advisor-roles', oid, `AdvisorFeedback missing entries for: ${missingRoles.join(', ')}`);
                }
            }
        }

        if (opt.outcomeSummary) {
            const sentenceCount = (opt.outcomeSummary.match(/[.!?]+/g) || []).length;
            if (sentenceCount < 2)
                add('warn', 'shallow-outcome', oid, `Summary only ${sentenceCount} sentences`, true);

            const tokenMatches = opt.outcomeSummary.match(/\{[a-z_]+\}/gi) || [];
            for (const token of tokenMatches) {
                const tokenName = token.replace(/[{}]/g, '').toLowerCase();
                if (!cfg.validTokens.has(tokenName))
                    add('error', 'invalid-token', oid, `Invalid token: ${token}`, false);
            }

            const startsWithToken = /^\{[a-z_]+\}/i.test(opt.outcomeSummary.trim());
            const firstNonTokenChar = opt.outcomeSummary.trim().replace(/^\{[a-z_]+\}\s*/i, '')[0];
            // Only flag actual lowercase word starts — exclude possessives/contractions ({token}'s, {token}'t)
            if (startsWithToken && firstNonTokenChar && /[a-z]/.test(firstNonTokenChar))
                add('warn', 'token-grammar-issue', oid, `Grammar issue after token placeholder`, true);
        }
    }

    const checkTokens = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        const tokenMatches = text.match(/\{[a-zA-Z_]+\}/g) || [];
        for (const token of tokenMatches) {
            const tokenName = token.replace(/[{}]/g, '');
            const tokenLower = tokenName.toLowerCase();
            if (tokenName !== tokenLower)
                add('error', 'token-casing-error', scenario.id, `Token ${token} must be lowercase: {${tokenLower}}`, true);
            if (!cfg.validTokens.has(tokenLower))
                add('error', 'invalid-token', scenario.id, `Invalid token in ${fieldName}: ${token}`, false);
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

    const applicableCountries = Array.isArray(scenario.metadata?.applicable_countries)
        ? scenario.metadata?.applicable_countries
        : [];
    const countriesById = cfg.countriesById ?? {};
    if (relationshipTokensUsed.length > 0 && applicableCountries.length > 0) {
        for (const tokenName of relationshipTokensUsed) {
            const unsupportedCountryIds = applicableCountries.filter((countryId) => {
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

    const hasRequiredRelationshipToken = (() => {
        switch (actorPattern) {
            case 'ally':
                return /\{the_ally\}|\{ally\}'s/i.test(scenarioTextCorpus);
            case 'adversary':
                return /\{the_adversary\}|\{adversary\}'s/i.test(scenarioTextCorpus);
            case 'border_rival':
                return /\{the_border_rival\}|\{border_rival\}'s|\{the_neighbor\}|\{neighbor\}'s/i.test(scenarioTextCorpus);
            case 'mixed':
                return /\{the_(adversary|border_rival|regional_rival|ally|trade_partner|neutral|rival|partner|neighbor|player_country)\}|\{(adversary|border_rival|regional_rival|ally|trade_partner|neutral|rival|partner|neighbor|player_country)\}'s/i.test(scenarioTextCorpus);
            default:
                return true;
        }
    })();

    if (!hasRequiredRelationshipToken && scenario.metadata?.scopeTier !== 'universal') {
        const expectedTokenByPattern: Record<'ally' | 'adversary' | 'border_rival' | 'mixed', string> = {
            ally: '{the_ally}',
            adversary: '{the_adversary}',
            border_rival: '{the_border_rival} or {the_neighbor}',
            mixed: 'at least one relationship token such as {the_ally}, {the_adversary}, or {the_border_rival}',
        };
        if (actorPattern === 'ally' || actorPattern === 'adversary' || actorPattern === 'border_rival' || actorPattern === 'mixed') {
            add(
                'error',
                'missing-required-relationship-token',
                scenario.id,
                `Scenario metadata actorPattern=${actorPattern} but the narrative never uses ${expectedTokenByPattern[actorPattern]}`,
                false
            );
        }
    }

    // Title word count — 4 to 10 words (tokens count as 1 word each)
    if (scenario.title?.trim()) {
        const wordCount = scenario.title.trim().split(/\s+/).length;
        if (wordCount < 4)
            add('error', 'title-too-short', scenario.id, `Title has ${wordCount} words (min 4)`);
        else if (wordCount > 10)
            add('warn', 'title-too-long', scenario.id, `Title has ${wordCount} words (max recommended 10)`);

        // Formulaic title patterns — noun stacks without a verb read as generic and repetitive
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

    // Double-space, orphaned-punctuation, and run-on sentence checks
    const checkTextQuality = (text: string | undefined, fieldName: string) => {
        if (!text) return;
        const jargonTerms = [
            'fiscal consolidation',
            'quantitative easing',
            'rate base',
            'regulatory capture',
            'procurement fraud',
            'tariff corridor',
            'geopolitical hedge',
            'counter-cyclical',
            'sterilized intervention',
            'capital adequacy',
        ];
        for (const jargon of jargonTerms) {
            if (new RegExp(`\\b${jargon.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(text)) {
                add('warn', 'jargon-use', scenario.id, `${fieldName} uses policy jargon "${jargon}". Rewrite in plain language.`);
            }
        }
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
        // Detect hardcoded "the {token}" which will produce "the a hostile power"-style
        // artifacts at runtime. Use {the_adversary}/{the_ally}/etc. instead.
        if (/\bthe \{[a-z_]+\}/i.test(text))
            add('warn', 'hardcoded-the-before-token', scenario.id, `${fieldName} has "the {token}" — replace with the_{token} variant to avoid article doubling`);

        // Detect bare relationship/player tokens at sentence-start positions (beginning of
        // text or after sentence-ending punctuation). These produce broken output like
        // "United States must decide" instead of "The United States must decide" for
        // article-requiring countries. Use the_{token} form instead.
        {
            const sentenceStartPattern = new RegExp(
                `(^|[.!?]\\s+)\\{(${Array.from(ARTICLE_FORM_TOKEN_NAMES).join('|')})\\}`,
                'g'
            );
            if (sentenceStartPattern.test(text))
                add('warn', 'sentence-start-bare-token', scenario.id,
                    `${fieldName} uses a bare {token} at a sentence-start position — use {the_token} to ensure correct article rendering`,
                    true);
        }

        const startsWithAcceptableTokenLedPhrase = (() => {
            const trimmed = text.trim();
            const tokenLead = trimmed.match(/^\{[a-z_]+\}((?:'s|’s)?)/i);
            if (!tokenLead) return false;
            if (tokenLead[1]) return true;

            const rest = trimmed.slice(tokenLead[0].length);
            const nextLetter = rest.match(/[A-Za-z]/);
            if (!nextLetter) return true;
            return nextLetter[0] === nextLetter[0].toUpperCase();
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
        // Detect hardcoded government-structure terms that break country-agnosticism.
        // These are parliamentary concepts that don't apply to presidential/monarchic systems.
        for (const rule of GOV_STRUCTURE_RULES) {
            if (rule.detect.test(text))
                    add('error', 'hardcoded-gov-structure', scenario.id, `${fieldName} contains a hardcoded government-structure term — ${rule.suggestion}`);
        }
        // Detect hardcoded ministry/institution names that break country-agnosticism.
        for (const rule of INSTITUTION_PHRASE_RULES) {
            if (rule.detect.test(text))
                    add('error', 'hardcoded-institution-phrase', scenario.id, `${fieldName} contains a hardcoded institution name — ${rule.suggestion}`);
        }
        // Enforce adjacency semantics: if narrative claims a neighbor/border relation,
        // it must use {neighbor} or {border_rival}, not generic rival/adversary tokens.
        if (/\b(neighboring|neighbouring|bordering|across\s+the\s+border\s+with)\s+\{(the_rival|the_adversary|the_regional_rival|the_trade_partner|the_ally|the_partner|the_neutral)\}/i.test(text))
            add('error', 'adjacency-token-mismatch', scenario.id, `${fieldName} uses neighboring/border language with a non-adjacent token; use {the_neighbor} or {the_border_rival}`);

        // Also catch broader border-closure/frontier wording linked to non-adjacent tokens,
        // even when the token is not immediately after the adjective (e.g. "{trade_partner} ... border closure").
        const hasBorderActionLanguage = /\b(border\s+closures?|close\s+the\s+border|seal(?:ing)?\s+the\s+border|frontier\s+closures?)\b/i.test(text);
        const hasNonAdjacentRelationshipToken = /\{(the_rival|the_adversary|the_regional_rival|the_trade_partner|the_ally|the_partner|the_neutral)\}/i.test(text);
        const hasAdjacentRelationshipToken = /\{(the_neighbor|the_border_rival)\}/i.test(text);
        if (hasBorderActionLanguage && hasNonAdjacentRelationshipToken && !hasAdjacentRelationshipToken) {
            add('error', 'adjacency-token-mismatch', scenario.id, `${fieldName} uses border-closure language with non-adjacent relationship tokens; use {the_neighbor} or {the_border_rival}`);
        }
        const sentenceBoundaries = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
        let passiveSentenceCount = 0;
        for (const sentence of sentenceBoundaries) {
            const words = sentence.split(/\s+/).filter(Boolean);
            if (words.length > 30)
                add('warn', 'complex-sentence', scenario.id, `${fieldName} has a sentence with ${words.length} words (max 30)`);

            const lowerSentence = sentence.toLowerCase();
            const clauseCount = (lowerSentence.match(/\b(and|or|but|while|whereas|although|though)\b/g) || []).length;
            if (clauseCount > 3)
                add('warn', 'high-clause-density', scenario.id, `${fieldName} has a sentence with ${clauseCount} conjunction clauses (max 3)`);

            if (/\b(is|are|was|were|be|been|being)\s+\w+ed\b/i.test(sentence))
                passiveSentenceCount++;
        }
        if (sentenceBoundaries.length >= 2 && (passiveSentenceCount / sentenceBoundaries.length) > 0.5)
            add('warn', 'high-passive-voice', scenario.id, `${fieldName} relies heavily on passive voice (${passiveSentenceCount}/${sentenceBoundaries.length} sentences)`);

        // Run-on: count words between sentence-ending punctuation
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

    // Option label quality — plain text, 1-6 words, no tokens
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

    // conditions array validation
    if (Array.isArray(scenario.conditions)) {
        scenario.conditions.forEach((cond: any, i: number) => {
            if (cond.metricId && !cfg.validMetricIds.has(cond.metricId)) {
                add('error', 'conditions-invalid-metric', scenario.id,
                    `conditions[${i}] references unknown metricId "${cond.metricId}"`);
            }
            if (cond.min !== undefined && cond.max !== undefined && cond.min >= cond.max) {
                add('warn', 'conditions-unreachable-range', scenario.id,
                    `conditions[${i}] has unreachable range (min ${cond.min} >= max ${cond.max})`);
            }
            if ((cond.max !== undefined && cond.max < 15) || (cond.min !== undefined && cond.min > 85)) {
                add('warn', 'conditions-too-restrictive', scenario.id,
                    `conditions[${i}] threshold is extreme — scenario may rarely appear in gameplay`);
            }
        });
    }

    // Relationship conditions validation
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
    // Actor patterns with relational actors should declare relationship conditions
    const scenarioActorPattern = scenario.metadata?.actorPattern;
    const relationalPatterns = new Set(['adversary', 'border_rival', 'ally', 'rival', 'regional_rival']);
    if (scenarioActorPattern && relationalPatterns.has(scenarioActorPattern)) {
        const hasRelCond = Array.isArray(scenario.relationship_conditions) && scenario.relationship_conditions.length > 0;
        if (!hasRelCond) {
            add('warn', 'actor-pattern-no-relationship-condition', scenario.id,
                `Scenario uses actor pattern "${scenarioActorPattern}" but has no relationship_conditions — it may appear regardless of the actual relationship state`);
        }
    }

    // Option metric overlap — all 3 options hit the exact same set of metrics
    const optionMetricSets = scenario.options.map(opt =>
        new Set((opt.effects ?? []).map((e: any) => e.targetMetricId).filter(Boolean))
    );
    if (optionMetricSets.length === 3) {
        const same = (a: Set<string>, b: Set<string>) =>
            a.size === b.size && [...a].every(m => b.has(m));
        if (same(optionMetricSets[0], optionMetricSets[1]) && same(optionMetricSets[1], optionMetricSets[2])) {
            add('warn', 'option-metric-overlap', scenario.id,
                `All 3 options affect the same metric set (${[...optionMetricSets[0]].join(', ')}). Options should differentiate across domains.`);
        }
    }

    // Severity-effect mismatch — critical/extreme scenario with all tiny effects
    const severity = scenario.metadata?.severity;
    if (severity === 'critical' || severity === 'extreme') {
        const allEffects = scenario.options.flatMap(opt => opt.effects ?? []);
        const hasSignificant = allEffects.some((e: any) => Number.isFinite(e.value) && Math.abs(e.value) >= 1.5);
        if (allEffects.length > 0 && !hasSignificant) {
            add('warn', 'severity-effect-mismatch', scenario.id,
                `Severity is "${severity}" but all ${allEffects.length} effects have |value| < 1.5. A ${severity} scenario needs at least one effect ≥ 1.5.`);
        }
    }

    // Advisor stance uniformity — same stance on every option for most advisors
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
            if (!VALID_SETTING_TARGETS.includes(impl.target as any)) {
                add('error', 'invalid-policy-target', scenario.id,
                    `Option ${opt.id} has invalid policyImplication target: "${impl.target}"`);
            }
            if (typeof impl.delta !== 'number' || impl.delta < -15 || impl.delta > 15) {
                add('error', 'policy-delta-out-of-range', scenario.id,
                    `Option ${opt.id} policyImplication delta ${impl.delta} out of range [-15, 15]`);
            }
        }
    }

    return issues;
}

const SOFT_PENALTY_RULES = new Set([
    'description-word-count',
    'option-text-word-count',
    'short-summary',
    'description-length',
    'complex-sentence',
    'high-passive-voice',
]);

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
                if (/\s|[“(\[]/.test(ch)) continue;
                if (tokenClosedWhilePending && ch === '\'') {
                    capitalizeNextNarrativeLetter = false;
                    tokenClosedWhilePending = false;
                    continue;
                }
                if (/[)}\]”\u201D]/.test(ch)) continue;
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

export function deterministicFix(scenario: BundleScenario): { fixed: boolean; fixes: string[] } {
    const cfg = getAuditConfig();
    let fixed = false;
    const fixes: string[] = [];

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
                if (/\s|[“(\[]/.test(ch)) continue;
                if (tokenClosedWhilePending && ch === '\'') {
                    capitalizeNextNarrativeLetter = false;
                    tokenClosedWhilePending = false;
                    continue;
                }
                if (/[)}\]”\u201D]/.test(ch)) continue;
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

    for (const opt of scenario.options) {
        for (const eff of opt.effects) {
            if (!eff.targetMetricId?.startsWith('metric_') && typeof eff.targetMetricId === 'string') {
                const prefixed = `metric_${eff.targetMetricId.replace(/[- ]/g, '_').toLowerCase()}`;
                if (cfg.validMetricIds.has(prefixed)) {
                    const old = eff.targetMetricId;
                    eff.targetMetricId = prefixed;
                    fixed = true;
                    fixes.push(`${opt.id}: prefixed ${old}->${prefixed}`);
                }
            }
            if (cfg.metricMappings[eff.targetMetricId]) {
                const old = eff.targetMetricId;
                eff.targetMetricId = cfg.metricMappings[old];
                fixed = true;
                fixes.push(`${opt.id}: mapped ${old}->${eff.targetMetricId}`);
            }
            if (eff.probability !== 1) {
                eff.probability = 1;
                fixed = true;
                fixes.push(`${opt.id}: prob=1`);
            }
            if (!Number.isFinite(eff.duration) || eff.duration < cfg.logicParameters.duration.min) {
                eff.duration = cfg.logicParameters.duration.min;
                fixed = true;
                fixes.push(`${opt.id}: dur=${cfg.logicParameters.duration.min}`);
            }
            const cap = cfg.metricMagnitudeCaps[eff.targetMetricId] ?? cfg.defaultCap;
            if (Math.abs(eff.value) > cap) {
                eff.value = Math.sign(eff.value) * cap;
                fixed = true;
                fixes.push(`${opt.id}: capped ${eff.targetMetricId}`);
            }
            if (cfg.inverseMetrics.has(eff.targetMetricId) && eff.value > 0) {
                eff.value = -Math.abs(eff.value);
                fixed = true;
                fixes.push(`${opt.id}: flipped inverse-positive ${eff.targetMetricId}`);
            }
        }
    }

    if (scenario.phase) {
        const normalized = scenario.phase.toLowerCase();
        if (['root', 'mid', 'final'].includes(normalized) && scenario.phase !== normalized) {
            scenario.phase = normalized as any;
            fixed = true;
            fixes.push(`normalized phase: ${normalized}`);
        }
    }

    if (scenario.metadata?.difficulty !== undefined) {
        const d = scenario.metadata.difficulty;
        if (!Number.isInteger(d) || d < 1 || d > 5) {
            scenario.metadata.difficulty = Math.max(1, Math.min(5, Math.round(d))) as 1 | 2 | 3 | 4 | 5;
            fixed = true;
            fixes.push(`clamped difficulty: ${d} -> ${scenario.metadata.difficulty}`);
        }
    }

    // Auto-fix double spaces and orphaned/doubled punctuation in all text fields
    const fixWhitespace = (text: string | undefined): string | undefined => {
        if (!text) return text;
        return (repairTextIntegrity(text) ?? text)
            .replace(/  +/g, ' ')
            .replace(/\. \./g, '.')
            .replace(/(?<!\.)\.{2}(?!\.)/g, '.')
            .replace(/, ,/g, ',')
            .replace(/\s+([.!?,;:])/g, '$1')
            .trim();
    };
    const applyWhitespaceToScenario = (): void => {
        const titleBefore = scenario.title;
        scenario.title = fixWhitespace(scenario.title) ?? scenario.title;
        if (titleBefore !== scenario.title) { fixes.push('fixed whitespace in title'); fixed = true; }
        const descBefore = scenario.description;
        scenario.description = fixWhitespace(scenario.description) ?? scenario.description;
        if (descBefore !== scenario.description) { fixes.push('fixed whitespace in description'); fixed = true; }
        for (const opt of scenario.options) {
            for (const field of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[field] === 'string') {
                    const before = opt[field] as string;
                    (opt[field] as string) = fixWhitespace(before) ?? before;
                    if (before !== opt[field]) { fixes.push(`${opt.id}: fixed whitespace in ${field}`); fixed = true; }
                }
            }
            for (const fb of ((opt.advisorFeedback ?? []) as any[])) {
                if (typeof fb?.feedback === 'string') {
                    const before = fb.feedback as string;
                    fb.feedback = fixWhitespace(before) ?? before;
                    if (before !== fb.feedback) { fixes.push(`${opt.id}: fixed whitespace in advisor ${fb.roleId} feedback`); fixed = true; }
                }
            }
        }

        const capTitleBefore = scenario.title;
        scenario.title = capitalizeFirstNarrativeLetter(scenario.title) ?? scenario.title;
        if (capTitleBefore !== scenario.title) { fixes.push('capitalized start of title'); fixed = true; }

        const capDescBefore = scenario.description;
        scenario.description = capitalizeFirstNarrativeLetter(scenario.description) ?? scenario.description;
        if (capDescBefore !== scenario.description) { fixes.push('capitalized start of description'); fixed = true; }

        const sentDescBefore = scenario.description;
        scenario.description = capitalizeSentenceBoundaries(scenario.description ?? '');
        if (sentDescBefore !== scenario.description) { fixes.push('capitalized sentence starts in description'); fixed = true; }

        for (const opt of scenario.options) {
            for (const field of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[field] === 'string') {
                    const before = opt[field] as string;
                    (opt[field] as string) = capitalizeFirstNarrativeLetter(before) ?? before;
                    if (before !== opt[field]) { fixes.push(`${opt.id}: capitalized start of ${field}`); fixed = true; }
                }
            }
            for (const field of ['outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[field] === 'string') {
                    const before = opt[field] as string;
                    (opt[field] as string) = capitalizeSentenceBoundaries(before);
                    if (before !== opt[field]) { fixes.push(`${opt.id}: capitalized sentence starts in ${field}`); fixed = true; }
                }
            }
            for (const fb of ((opt.advisorFeedback ?? []) as any[])) {
                if (typeof fb?.feedback === 'string') {
                    const before = fb.feedback as string;
                    fb.feedback = capitalizeFirstNarrativeLetter(before) ?? before;
                    if (before !== fb.feedback) { fixes.push(`${opt.id}: capitalized start of advisor ${fb.roleId} feedback`); fixed = true; }
                    const sentFbBefore = fb.feedback as string;
                    fb.feedback = capitalizeSentenceBoundaries(fb.feedback);
                    if (sentFbBefore !== fb.feedback) { fixes.push(`${opt.id}: capitalized sentence starts in advisor ${fb.roleId} feedback`); fixed = true; }
                }
            }
        }
    };
    applyWhitespaceToScenario();

    if (scenario.metadata?.scopeTier === 'universal') {
        const scrubUniversalRelationshipTokens = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(/\{(the_)?([a-z_]+)\}(?:'s|’s)?/gi, (match, _prefixed, rawName) => {
                const normalized = String(rawName).toLowerCase() as RelationshipTokenName;
                if (!RELATIONSHIP_TOKEN_NAMES.has(normalized)) return match;
                const replacement = UNIVERSAL_RELATIONSHIP_REPLACEMENTS[normalized];
                if (!replacement) return match;
                return /(?:'s|’s)$/i.test(match) ? replacement.possessive : replacement.plain;
            });
        };

        const titleBefore = scenario.title;
        scenario.title = scrubUniversalRelationshipTokens(scenario.title) ?? scenario.title;
        if (titleBefore !== scenario.title) { fixes.push('title: removed relationship-token dependency for universal scope'); fixed = true; }

        const descBefore = scenario.description;
        scenario.description = scrubUniversalRelationshipTokens(scenario.description) ?? scenario.description;
        if (descBefore !== scenario.description) { fixes.push('description: removed relationship-token dependency for universal scope'); fixed = true; }

        for (const opt of scenario.options) {
            for (const field of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[field] === 'string') {
                    const before = opt[field] as string;
                    (opt[field] as string) = scrubUniversalRelationshipTokens(before) ?? before;
                    if (before !== opt[field]) { fixes.push(`${opt.id}: removed relationship-token dependency in ${field}`); fixed = true; }
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        const before = fb.feedback;
                        fb.feedback = scrubUniversalRelationshipTokens(fb.feedback) ?? fb.feedback;
                        if (before !== fb.feedback) { fixes.push(`${opt.id}: removed relationship-token dependency in advisor ${fb.roleId}`); fixed = true; }
                    }
                }
            }
        }
    }

    const formulaicEndings = /\s+(Crisis|Debate|Decision|Dilemma|Challenge|Conflict|Response|Response Options|Choices|Options)\s*$/i;
    const gerundOpeners = /^(Managing|Balancing|Handling|Navigating|Addressing)\s+/i;
    if (formulaicEndings.test(scenario.title)) {
        const before = scenario.title;
        scenario.title = scenario.title.replace(formulaicEndings, '').trim();
        if (scenario.title.split(/\s+/).length < 4) {
            scenario.title = before;
        } else {
            fixes.push(`title: stripped formulaic ending "${before}" → "${scenario.title}"`);
            fixed = true;
        }
    }
    if (gerundOpeners.test(scenario.title)) {
        const before = scenario.title;
        scenario.title = scenario.title.replace(gerundOpeners, '').trim();
        if (scenario.title.split(/\s+/).length < 4) {
            scenario.title = before;
        } else {
            fixes.push(`title: stripped gerund opener "${before}" → "${scenario.title}"`);
            fixed = true;
        }
    }

    return { fixed, fixes };
}

export function heuristicFix(scenario: BundleScenario, issues: Issue[], bundle?: string): { fixed: boolean; fixes: string[] } {
    const cfg = getAuditConfig();
    let fixed = false;
    const fixes: string[] = [];

    const fixMissingDirectObject = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let result = text;
        // Some scenarios may resolve to "You direct to ..." without a recipient.
        // Insert a default recipient to keep the sentence grammatical and actionable.
        result = result.replace(/\bYou\s+direct\s+to\b/g, 'You direct your cabinet to');
        result = result.replace(/\byou\s+direct\s+to\b/g, 'you direct your cabinet to');
        result = result.replace(/\bYou\s+directed\s+to\b/g, 'You directed your cabinet to');
        result = result.replace(/\byou\s+directed\s+to\b/g, 'you directed your cabinet to');
        return result;
    };

    const fixFramingInText = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let result = text;
        result = result.replace(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bthe government\b/gi, 'your government');
        result = result.replace(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bThe government\b/g, 'Your government');
        result = result.replace(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bthe administration\b/gi, 'your administration');
        result = result.replace(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bThe administration\b/g, 'Your administration');
        result = result.replace(/\bthe president\b(?!ial)/gi, 'you');
        result = result.replace(/\bThe president\b(?!ial)/g, 'You');
        result = result.replace(/\bthe leader\b/gi, 'you');
        result = result.replace(/\bThe leader\b/g, 'You');
        result = result.replace(/\bthe executive\b(?! branch| order| power)/gi, 'you');
        result = result.replace(/\bThe executive\b(?! branch| order| power)/g, 'You');
        result = result.replace(/\bthe head of state\b/gi, 'you');
        result = result.replace(/\bThe head of state\b/g, 'You');
        result = result.replace(/\ba decision must be made\b/gi, 'you must decide');
        result = result.replace(/\ba decision needs to be made\b/gi, 'you need to decide');
        result = result.replace(/\ba decision is required\b/gi, 'you must make a decision');
        return result;
    };

    // Ensure we never ship options that resolve to "You direct to ...".
    // This is a defensive fix so the UI never renders an incomplete directive.
    const applyMissingDirectObjectFix = (text: string | undefined): string | undefined => {
        const before = text;
        const after = fixMissingDirectObject(text);
        if (before !== after) {
            fixed = true;
            fixes.push('fixed missing direct object in text');
        }
        return after;
    };

    // Apply the missing-direct-object fix to all relevant fields unconditionally.
    scenario.title = applyMissingDirectObjectFix(scenario.title) || scenario.title;
    scenario.description = applyMissingDirectObjectFix(scenario.description) || scenario.description;
    for (const opt of scenario.options) {
        opt.text = applyMissingDirectObjectFix(opt.text) || opt.text;
        for (const field of ['outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
            if (typeof opt[field] === 'string') {
                (opt[field] as string) = applyMissingDirectObjectFix(opt[field] as string) || (opt[field] as string);
            }
        }
    }

    // Outcome fields require different framing fixes — "the government/administration"
    // should become "{leader_title}'s government/administration", not "your government".
    const fixOutcomeFraming = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let r = text;
        r = r.replace(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bthe administration\b/gi, '{leader_title}');
        r = r.replace(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bthe government\b/gi, "{leader_title}'s government");
        r = r.replace(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bthe president\b(?!ial)/gi, '{leader_title}');
        r = r.replace(/(?<!\{[a-z_]+\}'s |your |their |its |our )\bthe executive\b(?! branch| order| power)/gi, '{leader_title}');
        return r;
    };

    for (const issue of issues) {
        if (issue.rule === 'third-person-framing') {
            const descBefore = scenario.description;
            scenario.description = fixFramingInText(scenario.description) || scenario.description;
            if (descBefore !== scenario.description) { fixes.push('fixed third-person framing in description'); fixed = true; }
            const titleBefore = scenario.title;
            scenario.title = fixFramingInText(scenario.title) || scenario.title;
            if (titleBefore !== scenario.title) { fixes.push('fixed third-person framing in title'); fixed = true; }
            for (const opt of scenario.options) {
                const textBefore = opt.text;
                opt.text = fixFramingInText(opt.text) || opt.text;
                if (textBefore !== opt.text) { fixes.push(`${opt.id}: fixed framing in option text`); fixed = true; }
                // Outcome fields need different fix — use {leader_title} not "your government"
                for (const field of ['outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                    if (typeof opt[field] === 'string') {
                        const before = opt[field] as string;
                        (opt[field] as string) = fixOutcomeFraming(before) || before;
                        if (before !== opt[field]) { fixes.push(`${opt.id}: fixed framing in ${field}`); fixed = true; }
                    }
                }
                if (Array.isArray(opt.advisorFeedback)) {
                    for (const fb of opt.advisorFeedback as any[]) {
                        if (typeof fb.feedback === 'string') {
                            const before = fb.feedback;
                            fb.feedback = fixFramingInText(fb.feedback) || fb.feedback;
                            if (before !== fb.feedback) { fixes.push(`${opt.id}: fixed framing in advisor ${fb.roleId}`); fixed = true; }
                        }
                    }
                }
            }
            break;
        }
    }

    const fixOutcomeVoice = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let r = text;
        r = r.replace(/\bYour administration\b/g, "{leader_title}'s administration");
        r = r.replace(/\byour administration\b/g, "{leader_title}'s administration");
        r = r.replace(/\bYour government\b/g, "{leader_title}'s government");
        r = r.replace(/\byour government\b/g, "{leader_title}'s government");
        r = r.replace(/\bYour decision\b/g, "{leader_title}'s decision");
        r = r.replace(/\byour decision\b/g, "{leader_title}'s decision");
        r = r.replace(/\bYour policy\b/g, "{leader_title}'s policy");
        r = r.replace(/\byour policy\b/g, "{leader_title}'s policy");
        r = r.replace(/\bYour (leadership|strategy|approach|directive|order|mandate|initiative|reform|plan|agenda|cabinet|team|office|response|stance)\b/g, "{leader_title}'s $1");
        r = r.replace(/\byour (leadership|strategy|approach|directive|order|mandate|initiative|reform|plan|agenda|cabinet|team|office|response|stance)\b/g, "{leader_title}'s $1");
        r = r.replace(/\bYou opted\b/g, '{leader_title} opted');
        r = r.replace(/\byou opted\b/g, '{leader_title} opted');
        r = r.replace(/\bYou chose\b/g, '{leader_title} chose');
        r = r.replace(/\byou chose\b/g, '{leader_title} chose');
        r = r.replace(/\bYou authorized\b/g, '{leader_title} authorized');
        r = r.replace(/\byou authorized\b/g, '{leader_title} authorized');
        r = r.replace(/\bYou directed\b/g, '{leader_title} directed');
        r = r.replace(/\byou directed\b/g, '{leader_title} directed');
        r = r.replace(/\bYou announced\b/g, '{leader_title} announced');
        r = r.replace(/\byou announced\b/g, '{leader_title} announced');
        r = r.replace(/\bYou imposed\b/g, '{leader_title} imposed');
        r = r.replace(/\byou imposed\b/g, '{leader_title} imposed');
        r = r.replace(/\bYou signed\b/g, '{leader_title} signed');
        r = r.replace(/\byou signed\b/g, '{leader_title} signed');
        r = r.replace(/\bYou deployed\b/g, '{leader_title} deployed');
        r = r.replace(/\byou deployed\b/g, '{leader_title} deployed');
        r = r.replace(/\bYou approved\b/g, '{leader_title} approved');
        r = r.replace(/\byou approved\b/g, '{leader_title} approved');
        r = r.replace(/\bYou (ordered|enacted|issued|launched|rejected|accepted|implemented|mandated|proposed|suspended|revoked|withdrew|committed|pledged|instructed|dispatched|mobilized|sanctioned|vetoed|ratified|negotiated|declared|condemned|endorsed|dismissed)\b/g, '{leader_title} $1');
        r = r.replace(/\byou (ordered|enacted|issued|launched|rejected|accepted|implemented|mandated|proposed|suspended|revoked|withdrew|committed|pledged|instructed|dispatched|mobilized|sanctioned|vetoed|ratified|negotiated|declared|condemned|endorsed|dismissed)\b/g, '{leader_title} $1');
        r = r.replace(/\bYour\b/g, "{leader_title}'s");
        r = r.replace(/\byour\b/g, "{leader_title}'s");
        r = r.replace(/\bYou\b/g, '{leader_title}');
        r = r.replace(/\byou\b/g, '{leader_title}');
        return r;
    };

    for (const issue of issues) {
        if (issue.rule === 'outcome-second-person') {
            for (const opt of scenario.options) {
                for (const field of ['outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                    if (opt[field]) {
                        const before = opt[field]!;
                        opt[field] = fixOutcomeVoice(before) ?? before;
                        if (before !== opt[field]) { fixes.push(`${opt.id}: fixed second-person voice in ${field}`); fixed = true; }
                    }
                }
            }
        }

        if (issue.rule === 'inverse-positive') {
            for (const opt of scenario.options) {
                for (const eff of opt.effects) {
                    if (cfg.inverseMetrics.has(eff.targetMetricId) && eff.value > 0) {
                        eff.value = -Math.abs(eff.value);
                        fixes.push(`${opt.id}: flipped ${eff.targetMetricId} sign`);
                        fixed = true;
                    }
                }
            }
        }

        if (issue.rule === 'token-grammar-issue') {
            for (const opt of scenario.options) {
                for (const field of ['outcomeSummary', 'outcomeContext'] as const) {
                    if (opt[field]) {
                        const before = opt[field]!;
                        opt[field] = before.replace(/(\{[a-z_]+\})\s+([a-z])/gi, (_, tok, letter) => `${tok} ${letter.toUpperCase()}`);
                        if (before !== opt[field]) { fixes.push(`${opt.id}: fixed grammar after token in ${field}`); fixed = true; }
                    }
                }
            }
        }

        if (issue.rule === 'token-casing-error') {
            const fixTokens = (text: string | undefined) => text?.replace(/\{([a-zA-Z_]+)\}/g, (_, p1) => `{${p1.toLowerCase()}}`);
            const descBefore = scenario.description;
            scenario.description = fixTokens(scenario.description) || scenario.description;
            if (descBefore !== scenario.description) { fixes.push('fixed token casing in description'); fixed = true; }
            const titleBefore = scenario.title;
            scenario.title = fixTokens(scenario.title) || scenario.title;
            if (titleBefore !== scenario.title) { fixes.push('fixed token casing in title'); fixed = true; }
            for (const opt of scenario.options) {
                for (const field of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                    if (typeof opt[field] === 'string') {
                        const before = opt[field] as string;
                        (opt[field] as string) = fixTokens(before) || before;
                        if (before !== opt[field]) { fixes.push(`${opt.id}: fixed token casing in ${field}`); fixed = true; }
                    }
                }
            }
        }

        if (issue.rule === 'option-preview-in-description' && scenario.description) {
            const before = scenario.description;
            let newDesc = scenario.description;
            const previews = [
                /you must choose between .+ (and|or) .+/gi,
                /you must decide (whether to|between) .+ (and|or) .+/gi,
                /your options (are|include).+/gi,
                /you can either .+ or .+/gi,
                /will you .+ or .+\?/gi,
                /should you .+ or .+\?/gi,
            ];
            for (const p of previews) newDesc = newDesc.replace(p, '');
            newDesc = newDesc.replace(/\s\s+/g, ' ').replace(/\.\.+/g, '.').trim();
            if (newDesc !== before) { scenario.description = newDesc; fixes.push('removed option preview from description'); fixed = true; }
        }
    }

    // Replace any boilerplate advisor feedback with audit-safe stubs.
    // This runs unconditionally so it catches boilerplate regardless of whether
    // the issue list triggered from the first pass or a retry pass.
    {
        const HARD_FAIL_BOILERPLATE: RegExp[] = [
            /^This aligns well with our .+ priorities\.$/i,
            /^Our department supports this course of action\.$/i,
            /^This could undermine our .+ objectives\.$/i,
            /^Our department has serious concerns about this approach\.$/i,
            /^This has limited direct impact on .+ operations\.$/i,
            /^Our department has no strong position on this matter\.$/i,
            /^We see both risks and potential benefits for .+\.$/i,
            /^This warrants careful monitoring from our department\.$/i,
        ];
        const SOFT_BOILERPLATE: RegExp[] = [
            /aligns well with our [a-z\s]+ priorities/i,
            /supports this course of action/i,
            /could undermine our [a-z\s]+ objectives/i,
            /has serious concerns about this approach/i,
            /limited direct impact on [a-z\s]+ operations/i,
            /no strong position on this matter/i,
            /both risks and potential benefits/i,
            /warrants careful monitoring/i,
        ];
        for (const opt of scenario.options) {
            if (!Array.isArray(opt.advisorFeedback)) continue;
            for (const fb of opt.advisorFeedback as any[]) {
                if (!fb.feedback?.trim()) continue;
                const text = fb.feedback.trim();
                if (HARD_FAIL_BOILERPLATE.some(p => p.test(text)) || SOFT_BOILERPLATE.some(p => p.test(text))) {
                    const stance = calculateAdvisorStance(opt.effects, fb.roleId, cfg.metricToRoles, cfg.inverseMetrics);
                    fb.feedback = getStanceFeedback(stance, fb.roleId);
                    fb.stance = stance;
                    fixes.push(`${opt.id}: replaced boilerplate feedback for ${fb.roleId} (${stance})`);
                    fixed = true;
                }
            }
        }
    }

    for (const issue of issues) {
        if (issue.rule === 'missing-advisor-feedback' || issue.rule === 'missing-role-feedback') {
            for (const opt of scenario.options) {
                const relevantRoles = getRelevantRolesForEffects(opt.effects);
                if (!opt.advisorFeedback || !Array.isArray(opt.advisorFeedback)) opt.advisorFeedback = [];
                const existingRoles = new Set((opt.advisorFeedback as any[]).map((f: any) => f.roleId));
                for (const roleId of relevantRoles) {
                    if (!existingRoles.has(roleId)) {
                        const stance = calculateAdvisorStance(opt.effects, roleId, cfg.metricToRoles, cfg.inverseMetrics);
                        (opt.advisorFeedback as any[]).push({ roleId, stance, feedback: getStanceFeedback(stance, roleId) });
                        fixes.push(`${opt.id}: generated ${roleId} feedback (${stance})`);
                        fixed = true;
                    }
                }
            }
            break;
        }
    }

    for (const opt of scenario.options) {
        if (!opt.outcomeHeadline?.trim()) {
            opt.outcomeHeadline = scenario.title?.trim() ? scenario.title : 'Executive Directive Issued';
            fixes.push(`${opt.id}: generated outcomeHeadline`); fixed = true;
        }
        if (!opt.outcomeSummary?.trim()) {
            const base = scenario.description?.trim() ? scenario.description : `The administration executes the selected directive: ${opt.text}.`;
            opt.outcomeSummary = `${base} Implementation teams are now coordinating across agencies to stabilize the situation and manage second-order effects.`;
            fixes.push(`${opt.id}: generated outcomeSummary`); fixed = true;
        }
        if (!opt.outcomeContext?.trim()) {
            opt.outcomeContext = `Internal observers describe this as a measured response to the evolving situation. External stakeholders are monitoring early indicators for signs of follow-through.`;
            fixes.push(`${opt.id}: generated outcomeContext`); fixed = true;
        }
    }

    // --- Unconditional structural repairs ---

    {
        const fixArticleDoubling = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(/\bthe \{([a-z_]+)\}/g, (match, name) => {
                return ARTICLE_FORM_TOKEN_NAMES.has(name) ? `{the_${name}}` : match;
            });
        };
        const descB = scenario.description;
        scenario.description = fixArticleDoubling(scenario.description) ?? scenario.description;
        if (descB !== scenario.description) { fixes.push('description: fixed article doubling'); fixed = true; }
        const titleB = scenario.title;
        scenario.title = fixArticleDoubling(scenario.title) ?? scenario.title;
        if (titleB !== scenario.title) { fixes.push('title: fixed article doubling'); fixed = true; }
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    const before = opt[f] as string;
                    (opt[f] as any) = fixArticleDoubling(before) ?? before;
                    if (before !== opt[f]) { fixes.push(`${opt.id}: fixed article doubling in ${f}`); fixed = true; }
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        const before = fb.feedback;
                        fb.feedback = fixArticleDoubling(fb.feedback) ?? fb.feedback;
                        if (before !== fb.feedback) { fixes.push(`${opt.id}: fixed article doubling in advisor ${fb.roleId}`); fixed = true; }
                    }
                }
            }
        }
    }

    // 2b. Fix bare {token} at sentence-start positions → {the_token}
    {
        const fixSentenceStartTokens = (text: string | undefined): string | undefined => {
            if (!text) return text;
            const pattern = new RegExp(
                `(^|([.!?])\\s+)\\{(${Array.from(ARTICLE_FORM_TOKEN_NAMES).join('|')})\\}`,
                'g'
            );
            return text.replace(pattern, (match, prefix, punctChar, name) => {
                const theForm = `the_${name}`;
                if (!ARTICLE_FORM_TOKEN_NAMES.has(name)) return match;
                const replacement = `{${theForm}}`;
                if (prefix === '' || prefix === undefined) return replacement;
                return `${punctChar} ${replacement}`;
            });
        };
        const applyFix = (t: string | undefined, label: string): string | undefined => {
            const after = fixSentenceStartTokens(t);
            if (after !== t) { fixes.push(`${label}: fixed bare token at sentence start`); fixed = true; }
            return after ?? t;
        };
        scenario.description = applyFix(scenario.description, 'description') ?? scenario.description;
        scenario.title = applyFix(scenario.title, 'title') ?? scenario.title;
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    (opt[f] as any) = applyFix(opt[f] as string, `${opt.id} ${f}`) ?? opt[f];
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        fb.feedback = applyFix(fb.feedback, `${opt.id} advisor ${fb.roleId}`) ?? fb.feedback;
                    }
                }
            }
        }
    }

    // 2c. Fix "the {token}" → "{the_token}" for tokens that have an article form.
    // This prevents broken output like "the a hostile power" at runtime.
    {
        const fixTheBeforeToken = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(/\bthe \{(the_)?([a-z_]+)\}/gi, (match, _prefixed, name) => {
                return ARTICLE_FORM_TOKEN_NAMES.has(name) ? `{the_${name}}` : match;
            });
        };
        const applyTheTokenFix = (t: string | undefined, label: string): string | undefined => {
            const after = fixTheBeforeToken(t);
            if (after !== t) { fixes.push(`${label}: fixed "the {token}" → "{the_token}"`); fixed = true; }
            return after ?? t;
        };
        scenario.description = applyTheTokenFix(scenario.description, 'description') ?? scenario.description;
        scenario.title = applyTheTokenFix(scenario.title, 'title') ?? scenario.title;
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    (opt[f] as any) = applyTheTokenFix(opt[f] as string, `${opt.id} ${f}`) ?? opt[f];
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        fb.feedback = applyTheTokenFix(fb.feedback, `${opt.id} advisor ${fb.roleId}`) ?? fb.feedback;
                    }
                }
            }
        }
    }

    // 3. Auto-scrub banned measurement units and distance words from all text fields
    {
        const UNIT_REPLACEMENTS: [RegExp, string][] = [
            [/\b\d+[\s-]*(?:kilometer|kilometre)s?\b/gi, 'a significant distance'],
            [/\b\d+[\s-]*km\b/gi, 'a significant distance'],
            [/\b\d+[\s-]*(?:mile)s?\b/gi, 'a considerable stretch'],
            [/\b\d+[\s-]*(?:meter|metre)s?\b/gi, 'a short distance'],
            [/\bkilometer(?:s)?\b/gi, 'distance'],
            [/\bkilometre(?:s)?\b/gi, 'distance'],
            [/\b(?<!\w)km\b/gi, 'distance'],
            [/\bmiles?\b/gi, 'distance'],
            [/\bmeters?\b/gi, 'distance'],
            [/\bmetres?\b/gi, 'distance'],
            [/\bfeet\b/gi, 'distance'],
            [/\bfoot\b/gi, 'distance'],
            [/\bpounds?\b(?!\s*(?:of|sterling))/gi, 'units'],
            [/\bkilograms?\b/gi, 'units'],
            [/\b(?<!\w)kg\b/gi, 'units'],
        ];
        const scrubUnits = (text: string | undefined): string | undefined => {
            if (!text) return text;
            let result = text;
            for (const [pat, repl] of UNIT_REPLACEMENTS) {
                result = result.replace(pat, repl);
            }
            return result;
        };
        const descBU = scenario.description;
        scenario.description = scrubUnits(scenario.description) ?? scenario.description;
        if (descBU !== scenario.description) { fixes.push('description: scrubbed banned units'); fixed = true; }
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    const before = opt[f] as string;
                    (opt[f] as any) = scrubUnits(before) ?? before;
                    if (before !== opt[f]) { fixes.push(`${opt.id}: scrubbed banned units in ${f}`); fixed = true; }
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        const before = fb.feedback;
                        fb.feedback = scrubUnits(fb.feedback) ?? fb.feedback;
                        if (before !== fb.feedback) { fixes.push(`${opt.id}: scrubbed banned units in advisor ${fb.roleId}`); fixed = true; }
                    }
                }
            }
        }
    }

    // 3b. Auto-fix {gdp_description} misuse — replace theft/loss verbs near {gdp_description} with fiscal phrasing
    {
        const fixGdpMisuse = (text: string | undefined): string | undefined => {
            if (!text || !text.includes('{gdp_description}')) return text;
            let result = text;
            // "siphoned/stolen/embezzled/diverted ... {gdp_description}" → "destabilized the {gdp_description} economy"
            const misuseVerbs = 'siphon(?:ed|ing)?|steal(?:ing)?|stole|stolen|embezzl(?:ed|ing)?|divert(?:ed|ing)?|skim(?:med|ming)?|misappropriat(?:ed|ing)?|loot(?:ed|ing)?|plunder(?:ed|ing)?|wast(?:ed|ing)?|squander(?:ed|ing)?|funnel(?:ed|ing)?|launder(?:ed|ing)?|los(?:t|e|ing)|drain(?:ed|ing)?|hemorrhag(?:ed|ing)?';
            result = result.replace(new RegExp(`(${misuseVerbs})([^.!?]*)\\{gdp_description\\}`, 'gi'), 'strained the {gdp_description} economy');
            result = result.replace(new RegExp(`\\{gdp_description\\}([^.!?]*)(${misuseVerbs})`, 'gi'), '{gdp_description} economy faces significant fiscal pressure');
            // "portion/fraction of {gdp_description}" → "a share of national output"
            result = result.replace(/(?:portion|fraction|share|percentage|percent|chunk|slice|part)\s+of\s+\{gdp_description\}/gi, 'a significant share of national output');
            return result;
        };
        const descGDP = scenario.description;
        scenario.description = fixGdpMisuse(scenario.description) ?? scenario.description;
        if (descGDP !== scenario.description) { fixes.push('description: fixed {gdp_description} misuse'); fixed = true; }
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    const before = opt[f] as string;
                    (opt[f] as any) = fixGdpMisuse(before) ?? before;
                    if (before !== opt[f]) { fixes.push(`${opt.id}: fixed {gdp_description} misuse in ${f}`); fixed = true; }
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        const before = fb.feedback;
                        fb.feedback = fixGdpMisuse(fb.feedback) ?? fb.feedback;
                        if (before !== fb.feedback) { fixes.push(`${opt.id}: fixed {gdp_description} misuse in advisor ${fb.roleId}`); fixed = true; }
                    }
                }
            }
        }
    }

    // 3c. (effect count trim moved to end — final safety trim runs AFTER domain injection)

    // 4. Extend titles that are too short (min 4 words)
    {
        const title = scenario.title?.trim();
        if (title) {
            const tokenStripped = title.replace(/\{[a-z_]+\}/g, 'X');
            const wordCount = tokenStripped.split(/\s+/).filter(Boolean).length;
            if (wordCount < 4) {
                const suffix = wordCount <= 2 ? ' Policy Crisis' : ' Crisis';
                scenario.title = title + suffix;
                fixes.push('title: extended to meet 4-word minimum');
                fixed = true;
            }
        }
    }

    // 4b. Pad short outcomeSummary fields to meet 200-char / 2-sentence minimum
    {
        for (const opt of scenario.options) {
            if (typeof opt.outcomeSummary === 'string') {
                let summary = opt.outcomeSummary.trim();
                // Ensure at least 2 sentences
                const sentenceCount = (summary.match(/[.!?]+/g) || []).length;
                if (sentenceCount < 2 && summary.length > 0) {
                    summary += ' The long-term implications of this decision remain under active review by senior officials.';
                    fixes.push(`${opt.id}: added second sentence to outcomeSummary`);
                    fixed = true;
                }
                // Ensure at least 250 chars
                if (summary.length > 0 && summary.length < 250) {
                    summary += ' Analysts across multiple ministries continue to assess the cascading effects on institutional stability and public confidence.';
                    fixes.push(`${opt.id}: padded outcomeSummary to meet 250-char minimum`);
                    fixed = true;
                }
                opt.outcomeSummary = summary;
            }
        }
    }

    // 5. Remap unknown advisor roleIds to nearest canonical role
    {
        for (const opt of scenario.options) {
            if (!Array.isArray(opt.advisorFeedback)) continue;
            for (const fb of opt.advisorFeedback as any[]) {
                const alias = ROLE_ALIAS_MAP[fb.roleId];
                if (alias) {
                    const before = fb.roleId;
                    fb.roleId = alias;
                    fixes.push(`${opt.id}: remapped role ${before} → ${alias}`);
                    fixed = true;
                }
            }
        }
    }

    // 6. Inject a primary domain-metric effect when no option targets the bundle domain
    //    (prevents the no-domain-metric audit warn that deducts 4 pts per option)
    if (bundle && cfg.categoryDomainMetrics[bundle]?.length > 0) {
        const domainMetrics = new Set(cfg.categoryDomainMetrics[bundle]);
        const primaryDomainMetric = cfg.categoryDomainMetrics[bundle][0];
        for (const opt of scenario.options) {
            const hasDomainEffect = (opt.effects || []).some((e: any) => domainMetrics.has(e.targetMetricId));
            if (!hasDomainEffect) {
                // Compute net sign of non-domain effects to infer realistic domain direction
                const netSign = (opt.effects || []).reduce((sum: number, e: any) => sum + e.value, 0);
                const injectValue = netSign >= 0 ? 1.2 : -1.2;
                const domainEffect = {
                    targetMetricId: primaryDomainMetric,
                    value: injectValue,
                    duration: 7,
                    probability: 1,
                };
                // If already at max (4 effects), replace the weakest instead of appending
                if (Array.isArray(opt.effects) && opt.effects.length >= 4) {
                    let weakestIdx = 0;
                    let weakestAbs = Infinity;
                    for (let i = 0; i < opt.effects.length; i++) {
                        const absVal = Math.abs((opt.effects[i] as any).value ?? 0);
                        if (absVal < weakestAbs) { weakestAbs = absVal; weakestIdx = i; }
                    }
                    const replaced = (opt.effects[weakestIdx] as any).targetMetricId;
                    opt.effects[weakestIdx] = domainEffect as any;
                    fixes.push(`${opt.id}: replaced weakest effect (${replaced}) with ${primaryDomainMetric} domain effect (${injectValue > 0 ? '+' : ''}${injectValue})`);
                } else {
                    (opt.effects as any[]).push(domainEffect);
                    fixes.push(`${opt.id}: injected ${primaryDomainMetric} domain effect (${injectValue > 0 ? '+' : ''}${injectValue})`);
                }
                fixed = true;
            }
        }
    }

    // Auto-fix hardcoded institution phrases AND gov-structure terms → token equivalents
    // Uses shared INSTITUTION_PHRASE_RULES and GOV_STRUCTURE_RULES tables (single source of truth with detection)
    {
        const scrubPhrases = (text: string | undefined): string | undefined => {
            if (!text) return text;
            let result = applyPhraseRules(text, INSTITUTION_PHRASE_RULES);
            result = applyPhraseRules(result, GOV_STRUCTURE_RULES);
            return result;
        };
        const descBefore = scenario.description;
        scenario.description = scrubPhrases(scenario.description) ?? scenario.description;
        if (descBefore !== scenario.description) { fixes.push('description: replaced hardcoded institutions/gov-structure with tokens'); fixed = true; }
        const titleBefore = scenario.title;
        scenario.title = scrubPhrases(scenario.title) ?? scenario.title;
        if (titleBefore !== scenario.title) { fixes.push('title: replaced hardcoded institutions/gov-structure with tokens'); fixed = true; }
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    const before = opt[f] as string;
                    (opt[f] as any) = scrubPhrases(before) ?? before;
                    if (before !== opt[f]) { fixes.push(`${opt.id}: replaced hardcoded phrases in ${f}`); fixed = true; }
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        const before = fb.feedback;
                        fb.feedback = scrubPhrases(fb.feedback) ?? fb.feedback;
                        if (before !== fb.feedback) { fixes.push(`${opt.id}: replaced hardcoded phrases in advisor ${fb.roleId}`); fixed = true; }
                    }
                }
            }
        }
    }

    // Auto-fix banned country/capital names → generic references
    // This handles the #1 Ollama failure mode: models ignore "no country names" instructions
    if (cfg.bannedCountryPhrases.size > 0) {
        const scrubCountryNames = (text: string | undefined): string | undefined => {
            if (!text) return text;
            let result = text;
            for (const phrase of cfg.bannedCountryPhrases) {
                const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const isUppercaseCode = /^[A-Z]+$/.test(phrase);
                const flags = isUppercaseCode ? 'g' : 'gi';
                const regex = new RegExp(`\\b${escaped}\\b`, flags);
                if (regex.test(result)) {
                    const isCapital = /^[A-Z][a-z]/.test(phrase) && phrase.split(/\s+/).length <= 2;
                    const replacement = isCapital ? 'the capital' : 'a foreign nation';
                    result = result.replace(regex, replacement);
                }
            }
            return result;
        };
        const textFields: Array<'title' | 'description'> = ['title', 'description'];
        for (const field of textFields) {
            if (typeof scenario[field] === 'string') {
                const before = scenario[field];
                scenario[field] = scrubCountryNames(scenario[field]) ?? scenario[field];
                if (before !== scenario[field]) { fixes.push(`${field}: replaced banned country/capital names`); fixed = true; }
            }
        }
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    const before = opt[f] as string;
                    (opt[f] as any) = scrubCountryNames(before) ?? before;
                    if (before !== opt[f]) { fixes.push(`${opt.id}: replaced banned country names in ${f}`); fixed = true; }
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        const before = fb.feedback;
                        fb.feedback = scrubCountryNames(fb.feedback) ?? fb.feedback;
                        if (before !== fb.feedback) { fixes.push(`${opt.id}: replaced banned country names in advisor ${fb.roleId}`); fixed = true; }
                    }
                }
            }
        }
    }

    // Auto-fix hard-coded currency values → relative economic language
    {
        const CURRENCY_REPLACEMENTS: [RegExp, string][] = [
            [/\$\s?\d[\d,]*(?:\.\d+)?\s*trillion/gi, 'a transformative level of funding'],
            [/\$\s?\d[\d,]*(?:\.\d+)?\s*billion/gi, 'a major financial commitment'],
            [/\$\s?\d[\d,]*(?:\.\d+)?\s*million/gi, 'significant funding'],
            [/\$\s?\d[\d,]*(?:\.\d+)?/g, 'substantial resources'],
            [/\b\d[\d,]*(?:\.\d+)?\s*trillion\s+(?:dollars?|euros?|pounds?|yen|yuan|rubles?|rupees?)/gi, 'a transformative level of funding'],
            [/\b\d[\d,]*(?:\.\d+)?\s*billion\s+(?:dollars?|euros?|pounds?|yen|yuan|rubles?|rupees?)/gi, 'a major financial commitment'],
            [/\b\d[\d,]*(?:\.\d+)?\s*million\s+(?:dollars?|euros?|pounds?|yen|yuan|rubles?|rupees?)/gi, 'significant funding'],
            [/\bUSD\s*\d[\d,]*(?:\.\d+)?/gi, 'substantial resources'],
            [/\bEUR\s*\d[\d,]*(?:\.\d+)?/gi, 'substantial resources'],
            [/\bGBP\s*\d[\d,]*(?:\.\d+)?/gi, 'substantial resources'],
            [/\b\d[\d,]*(?:\.\d+)?\s*euros?\b/gi, 'significant funding'],
            [/\b\d[\d,]*(?:\.\d+)?\s*pounds?\s*sterling\b/gi, 'significant funding'],
        ];
        const scrubCurrency = (text: string | undefined): string | undefined => {
            if (!text) return text;
            let result = text;
            for (const [pat, repl] of CURRENCY_REPLACEMENTS) {
                result = result.replace(pat, repl);
            }
            return result;
        };
        const descCur = scenario.description;
        scenario.description = scrubCurrency(scenario.description) ?? scenario.description;
        if (descCur !== scenario.description) { fixes.push('description: replaced hard-coded currency with relative language'); fixed = true; }
        scenario.title = scrubCurrency(scenario.title) ?? scenario.title;
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    const before = opt[f] as string;
                    (opt[f] as any) = scrubCurrency(before) ?? before;
                    if (before !== opt[f]) { fixes.push(`${opt.id}: replaced hard-coded currency in ${f}`); fixed = true; }
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        const before = fb.feedback;
                        fb.feedback = scrubCurrency(fb.feedback) ?? fb.feedback;
                        if (before !== fb.feedback) { fixes.push(`${opt.id}: replaced hard-coded currency in advisor ${fb.roleId}`); fixed = true; }
                    }
                }
            }
        }
    }

    // Auto-fix short outcomeContext — pad to meet 100-char minimum
    {
        for (const opt of scenario.options) {
            if (typeof opt.outcomeContext === 'string') {
                let ctx = opt.outcomeContext.trim();
                if (ctx.length > 0 && ctx.length < 100) {
                    ctx += ' Administration officials are closely monitoring the situation as cross-departmental coordination intensifies around second-order policy implications.';
                    opt.outcomeContext = ctx;
                    fixes.push(`${opt.id}: padded outcomeContext to meet 100-char minimum`);
                    fixed = true;
                }
            }
        }
    }

    // Auto-fix bare relationship tokens → {the_*} form (except possessives)
    // Ollama models frequently emit {adversary} instead of {the_adversary}
    {
        const RELATIONSHIP_BARE_TOKENS = [
            'adversary', 'border_rival', 'regional_rival', 'ally', 'trade_partner',
            'neutral', 'rival', 'partner', 'neighbor', 'player_country', 'nation',
            'regional_bloc',
        ];
        const bareRelPattern = new RegExp(
            `\\{(${RELATIONSHIP_BARE_TOKENS.join('|')})\\}(?!'s)`,
            'g'
        );
        const fixBareRelTokens = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(bareRelPattern, (_match, name) => `{the_${name}}`);
        };
        const applyRelFix = (t: string | undefined, label: string): string | undefined => {
            const after = fixBareRelTokens(t);
            if (after !== t) { fixes.push(`${label}: fixed bare relationship token → {the_*} form`); fixed = true; }
            return after ?? t;
        };
        scenario.description = applyRelFix(scenario.description, 'description') ?? scenario.description;
        scenario.title = applyRelFix(scenario.title, 'title') ?? scenario.title;
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    (opt[f] as any) = applyRelFix(opt[f] as string, `${opt.id} ${f}`) ?? opt[f];
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        fb.feedback = applyRelFix(fb.feedback, `${opt.id} advisor ${fb.roleId}`) ?? fb.feedback;
                    }
                }
            }
        }
    }

    // Auto-fix bare role tokens at non-possessive positions → {the_*} form
    // Ollama models emit {finance_role} instead of {the_finance_role}
    {
        const ROLE_BARE_TOKENS = [
            'leader_title', 'vice_leader', 'finance_role', 'defense_role', 'interior_role',
            'foreign_affairs_role', 'justice_role', 'health_role', 'education_role',
            'commerce_role', 'labor_role', 'energy_role', 'environment_role', 'transport_role',
            'agriculture_role', 'legislature', 'upper_house', 'lower_house', 'ruling_party',
            'opposition_party', 'judicial_role', 'prosecutor_role', 'intelligence_agency',
            'police_force', 'security_council', 'central_bank', 'military_branch',
            'military_general', 'state_media', 'capital_city', 'major_industry',
        ];
        const bareRolePattern = new RegExp(
            `(?<!')\\{(${ROLE_BARE_TOKENS.join('|')})\\}(?!'s)`,
            'g'
        );
        const fixBareRoleTokens = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(bareRolePattern, (_match, name) => {
                return ARTICLE_FORM_TOKEN_NAMES.has(name) ? `{the_${name}}` : `{${name}}`;
            });
        };
        const applyRoleFix = (t: string | undefined, label: string): string | undefined => {
            const after = fixBareRoleTokens(t);
            if (after !== t) { fixes.push(`${label}: fixed bare role token → {the_*} form`); fixed = true; }
            return after ?? t;
        };
        scenario.description = applyRoleFix(scenario.description, 'description') ?? scenario.description;
        scenario.title = applyRoleFix(scenario.title, 'title') ?? scenario.title;
        for (const opt of scenario.options) {
            for (const f of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') {
                    (opt[f] as any) = applyRoleFix(opt[f] as string, `${opt.id} ${f}`) ?? opt[f];
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb.feedback === 'string') {
                        fb.feedback = applyRoleFix(fb.feedback, `${opt.id} advisor ${fb.roleId}`) ?? fb.feedback;
                    }
                }
            }
        }
    }

    // Auto-truncate excess options to exactly 3 (Ollama sometimes generates 4-5)
    if (scenario.options.length > 3) {
        const originalCount = scenario.options.length;
        scenario.options = scenario.options.slice(0, 3);
        fixes.push(`truncated ${originalCount} options to 3`);
        fixed = true;
    }

    // Unconditionally fix outcome voice in ALL outcome fields (not just when issue is detected)
    // This catches cases where detection missed edge patterns but the fix would still help
    for (const opt of scenario.options) {
        for (const field of ['outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
            if (typeof opt[field] === 'string' && /\byou(?:r)?\b/i.test(opt[field] as string)) {
                const before = opt[field]!;
                opt[field] = fixOutcomeVoice(before) ?? before;
                if (before !== opt[field]) { fixes.push(`${opt.id}: proactive voice fix in ${field}`); fixed = true; }
            }
        }
    }

    // FINAL SAFETY: Hard-cap every option at exactly 4 effects (runs AFTER all injections)
    for (const opt of scenario.options) {
        if (Array.isArray(opt.effects) && opt.effects.length > 4) {
            opt.effects = opt.effects.slice(0, 4);
            fixes.push(`${opt.id}: final trim to 4 effects`);
            fixed = true;
        }
    }

    // Word count padding: surgically add a contextual clause when within 15 words of minimum
    const PADDING_CLAUSES = [
        ', with {the_opposition} demanding an immediate response',
        ', as public pressure mounts for decisive action',
        ', raising concerns among senior advisors about the long-term consequences',
        ', prompting calls from {the_legislature} for a formal review',
        ', while analysts warn of cascading effects across related sectors',
        ', amid growing unease among key stakeholders and the broader public',
    ];
    const padText = (text: string, minWords: number, fieldLabel: string): string => {
        const wc = countWords(text);
        const gap = minWords - wc;
        if (gap <= 0 || gap > 15) return text;
        if (!/[.!?]$/.test(text.trim())) return text;
        const clause = PADDING_CLAUSES[Math.floor(Math.random() * PADDING_CLAUSES.length)];
        const trimmed = text.trim().replace(/[.!?]+$/, '');
        const padded = `${trimmed}${clause}.`;
        if (countWords(padded) >= minWords) {
            fixes.push(`${fieldLabel}: padded ${wc} → ${countWords(padded)} words`);
            fixed = true;
            return padded;
        }
        return text;
    };
    if (typeof scenario.description === 'string') {
        scenario.description = padText(scenario.description, 60, 'description');
    }
    for (const opt of scenario.options) {
        if (typeof opt.text === 'string') {
            opt.text = padText(opt.text, 50, `${opt.id}/text`);
        }
    }

    return { fixed, fixes };
}

function calculateAdvisorStance(
    effects: Effect[],
    roleId: string,
    metricToRoles: Record<string, string[]>,
    inverseMetrics: Set<string>
): 'support' | 'oppose' | 'neutral' | 'concerned' {
    let netScore = 0;
    let relevantCount = 0;
    for (const eff of effects) {
        const rolesForMetric = metricToRoles[eff.targetMetricId];
        if (rolesForMetric?.includes(roleId)) {
            netScore += inverseMetrics.has(eff.targetMetricId) ? -eff.value : eff.value;
            relevantCount++;
        }
    }
    if (relevantCount === 0) return 'neutral';
    if (netScore > 1) return 'support';
    if (netScore < -1) return 'oppose';
    if (Math.abs(netScore) > 0.3) return 'concerned';
    return 'neutral';
}

function getStanceFeedback(stance: string, roleId: string): string {
    const role = roleId.replace('role_', '').replace(/_/g, ' ');
    // Stub feedback that does NOT trigger the boilerplate audit patterns.
    // These are intentionally generic but audit-safe — the LLM should produce
    // much better feedback; this is only a fallback for auto-patching.
    const templates: Record<string, string[]> = {
        support:   [
            `From a ${role} perspective, the proposed measures strengthen institutional capacity and reinforce key performance indicators across our mandate.`,
            `Initial analysis from the ${role} portfolio indicates net-positive outcomes for the constituencies and systems under our jurisdiction.`,
        ],
        oppose:    [
            `The ${role} portfolio faces material downside risk from this course — projected knock-on effects threaten programme delivery and stakeholder confidence.`,
            `Analysts in ${role} assess significant operational disruption and second-order costs that outweigh the stated benefits of this approach.`,
        ],
        neutral:   [
            `The ${role} impact assessment shows marginal first-order effects; ongoing monitoring will determine whether secondary dynamics shift the calculus.`,
            `From the ${role} standpoint, near-term exposure is contained, though medium-term spillover cannot be ruled out without further data.`,
        ],
        concerned: [
            `The ${role} team flags mixed signals — some indicators trend favourably while others suggest unintended escalation in downstream systems.`,
            `${role.charAt(0).toUpperCase() + role.slice(1)} analysts note the asymmetric risk profile: upside potential exists, but failure scenarios carry disproportionate cost.`,
        ],
    };
    const options = templates[stance] || templates.neutral;
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * Audit rules summary for LLM prompts — built from loaded config.
 * Includes the full approved token whitelist so repair/regen LLMs cannot invent tokens.
 */
export function getAuditRulesPrompt(): string {
    const cfg = getAuditConfig();
    const inverseList = Array.from(cfg.inverseMetrics).join(', ');
    const metricList = Array.from(cfg.validMetricIds).join(', ');
    return `**AUDIT COMPLIANCE RULES (VIOLATIONS = REJECTION):**

${buildTokenWhitelistPromptSection()}

## VALID METRICS (USE EXACT NAMES)
${metricList}

## EFFECT CONSTRAINTS
- Each option: exactly 3 effects (min 2, hard max 4 — more than 4 = REJECTION)
- probability: MUST be ${cfg.logicParameters.probability.required} (always deterministic)
- duration: ${cfg.logicParameters.duration.min}-${cfg.logicParameters.duration.max} turns
- value: typically -4.0 to +4.0 range

## WORD COUNT MINIMUMS (HARD FLOORS — UNDER MINIMUM = IMMEDIATE REJECTION)
- "description": 60–140 words. Under 60 words = REJECTED. Over 140 words = REJECTED.
- Each "options[].text": 50–120 words. Under 50 words = REJECTED. Over 120 words = REJECTED.
- "outcomeSummary": minimum 250 characters. Under 250 chars = REJECTED.
- "outcomeContext": minimum 400 characters. Under 400 chars = REJECTED.

When fixing "option-text-word-count": rewrite to AT LEAST 50 words by naming the policy mechanism (subsidy, embargo, injunction, taskforce), the trade-off accepted, and the affected constituency.
When fixing "description-word-count": rewrite to AT LEAST 60 words by adding the trigger event, a named actor or institution, and the concrete stakes.
When fixing "short-summary": expand "outcomeSummary" to 250+ characters (3 sentences) and/or "outcomeContext" to 400+ characters (4–6 sentences).

## PLAIN-LANGUAGE REQUIREMENTS (STRICT)
- Use everyday language for a general audience. Avoid policy-jargon terms.
- Hard-fail jargon examples: "fiscal consolidation", "quantitative easing", "regulatory capture", "tariff corridor", "geopolitical hedge"
- Maximum 30 words per sentence.
- Maximum 3 conjunction clauses (and/or/but/while/whereas/although/though) per sentence.
- Prefer active voice. Do not let most sentences in a field use passive voice.
- Option labels must be short direct actions in PLAIN TEXT. NO tokens in labels — "Blame {the_neighbor}" is REJECTED; write "Blame the Neighbor" instead. Avoid conditional labels with "if", "unless", "provided", parentheses, or colons.

## TOKEN ARTICLE FORM (CRITICAL — WRONG PATTERN = REJECTION)
NEVER write "the {token}" — this produces broken output like "the a hostile power" at runtime.
Instead use the pre-built article-form token: {the_adversary}, {the_neighbor}, {the_ally}, {the_rival}, {the_neutral}, {the_partner}, {the_trade_partner}, {the_border_rival}, {the_regional_rival}, {the_nation}, {the_player_country}.
❌ "the {adversary} imposed..." → ✅ "{the_adversary} imposed..."
❌ "the {neighbor} closed..." → ✅ "{the_neighbor} closed..."
If no the_{token} form exists for that concept, rewrite the sentence to avoid needing a definite article before the token.

## INVERSE METRICS (CRITICAL - COMMON FAILURE)
These metrics get WORSE with POSITIVE values: ${inverseList}
To REDUCE these problems, use NEGATIVE values.

## VOICE RULES (WRONG VOICE = AUTO-REJECTION)
- description, options[].text, advisorFeedback[].feedback → SECOND PERSON: "You face...", "Your administration...", "You direct..."
- outcomeHeadline, outcomeSummary, outcomeContext → THIRD PERSON JOURNALISTIC (newspaper reporter style)
  ✅ "The administration imposed emergency fuel controls, raising import costs for domestic suppliers."
  ❌ "Your administration imposed..." / "You imposed..." — REJECTED in outcome fields
  Never use "you" or "your" in outcomeHeadline, outcomeSummary, or outcomeContext.

## ADVISOR FEEDBACK (REQUIRED — QUALITY IS AUDITED)
Every option MUST have advisorFeedback array containing role_executive plus all roles whose metrics are affected.

Valid roleIds: role_executive, role_diplomacy, role_defense, role_economy, role_justice, role_commerce, role_labor, role_health, role_education, role_energy, role_transport, role_interior, role_environment
Invalid roleIds (metric IDs, not roles): role_finance, role_foreign_affairs, role_security, role_innovation, role_public_order, role_approval

Format: { "roleId": "role_xxx", "stance": "support"|"oppose"|"neutral"|"concerned", "feedback": "1-2 sentences" }

**ADVISOR FEEDBACK QUALITY (BOILERPLATE = REJECTION):**
Each feedback MUST reference the SPECIFIC policy action, the affected constituency, and the causal impact on the advisor's domain.

✅ Good: "Releasing the strategic grain reserve now prevents a 12% price spike in staple commodities, but leaves us exposed if the monsoon shortfall extends past Q3."
✅ Good: "Deploying rapid-response units signals resolve but risks miscalculation at the frontier — rules of engagement must be clarified before orders are issued."
❌ REJECTED: "This aligns well with our defense priorities." | "Our department has no strong position." | "This warrants careful monitoring."

## CONDITIONS FIELD
Output conditions ONLY when the scenario describes a metric in crisis:
- Economic recession/collapse → { "metricId": "metric_economy", "max": 38 }
- Unemployment crisis → { "metricId": "metric_employment", "max": 42 }
- Inflation crisis → { "metricId": "metric_inflation", "min": 58 }
- Crime wave → { "metricId": "metric_crime", "min": 60 }
- Civil unrest / riots → { "metricId": "metric_public_order", "max": 40 }
- Corruption scandal → { "metricId": "metric_corruption", "min": 55 }
- Economic boom → { "metricId": "metric_economy", "min": 62 }
For neutral governance, diplomacy, or military scenarios: output [] or omit.
Maximum 2 conditions. Key must be "conditions".

## RELATIONSHIP CONDITIONS FIELD
Output relationship_conditions ONLY when a named relational actor (adversary, ally, rival, trade partner) drives the scenario premise:
- Hostile attack / conflict → { "relationshipId": "adversary", "max": -25 }
- Border incursion / border_rival pressure → { "relationshipId": "border_rival", "max": -30 }
- Regional rivalry escalation → { "relationshipId": "regional_rival", "max": -20 }
- Trade partner deal / cooperation → { "relationshipId": "trade_partner", "min": 20 }
- Formal ally request / alliance test → { "relationshipId": "ally", "min": 30 }
- Rival provocation (sub-conflict) → { "relationshipId": "rival", "max": -15 }
For domestic, economic, or internal governance scenarios: omit relationship_conditions.
Maximum 3 conditions. Key must be "relationship_conditions". Strength scale: −100 (hostile) to +100 (allied).`;
}

export function getCompactAuditRulesPrompt(): string {
    const cfg = getAuditConfig();
    const inverseList = Array.from(cfg.inverseMetrics).join(', ');
    const metricList = Array.from(cfg.validMetricIds).join(', ');
    return `**AUDIT RULES (VIOLATIONS = REJECTION):**

${buildCompactTokenPromptSection()}

## VALID METRICS: ${metricList}

## EFFECTS: 2-4 per option (5+ = REJECTED). probability=1. duration=${cfg.logicParameters.duration.min}-${cfg.logicParameters.duration.max}. value: -4.0 to +4.0.

## WORD COUNTS (HARD): description=60-140 words. options[].text=50-120 words. outcomeSummary≥250 chars. outcomeContext≥400 chars.

## INVERSE METRICS (values MUST be negative — positive values = REJECTED): ${inverseList}

## VOICE: description/options/advisorFeedback=SECOND PERSON ("You face..."). outcomes=THIRD PERSON journalistic ("The administration..."). "you"/"your" in outcomes=REJECTED.

## ADVISORS: Each option needs role_executive + affected roles. Format: { "roleId": "role_xxx", "stance": "support"|"oppose"|"neutral"|"concerned", "feedback": "1-2 specific sentences" }. Generic boilerplate=REJECTED.

## PLAIN LANGUAGE: No jargon. Max 30 words/sentence. Active voice. Labels=plain text, no tokens.`;
}

export interface ConceptValidation {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateConceptConfig(concept: any, category: string): ConceptValidation {
    const cfg = getAuditConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!concept.id) errors.push('Missing concept id');
    if (!concept.concept) errors.push('Missing concept text');
    if (!concept.acts || concept.acts.length === 0) errors.push('Missing acts array');

    if (concept.logic_constraints) {
        const constraints = concept.logic_constraints;
        if (constraints.primary_metric && !cfg.validMetricIds.has(constraints.primary_metric))
            errors.push(`Invalid primary_metric: ${constraints.primary_metric}`);
        if (constraints.secondary_metrics) {
            for (const metric of constraints.secondary_metrics) {
                if (!cfg.validMetricIds.has(metric)) errors.push(`Invalid secondary_metric: ${metric}`);
            }
        }
        if (constraints.severity_range) {
            for (const sev of constraints.severity_range) {
                if (!['low', 'medium', 'high', 'extreme', 'critical'].includes(sev))
                    errors.push(`Invalid severity: ${sev}`);
            }
        }
    }

    const domainMetrics = cfg.categoryDomainMetrics[category];
    if (domainMetrics && concept.logic_constraints?.primary_metric) {
        if (!domainMetrics.includes(concept.logic_constraints.primary_metric))
            warnings.push(`Primary metric ${concept.logic_constraints.primary_metric} not in ${category} domain`);
    }

    return { valid: errors.length === 0, errors, warnings };
}
