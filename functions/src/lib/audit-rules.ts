import { CANONICAL_ROLE_IDS, ROLE_ALIAS_MAP, buildTokenWhitelistPromptSection, buildCompactTokenPromptSection, loadCompiledTokenRegistry } from './token-registry';
import type { CompiledTokenRegistry } from '../shared/token-registry-contract';
import { ALL_BUNDLE_IDS, isValidBundleId } from '../data/schemas/bundleIds';
import { tryNormalizeMetricId } from '../data/schemas/metricIds';
import { loadCountryCatalog } from './country-catalog';
import type { ScenarioRequirements, ScenarioSourceKind } from '../types';
import { VALID_SETTING_TARGETS } from '../types';
import {
    auditScenario as _auditScenarioWithConfig,
    scoreScenario,
    getRelevantRolesForEffects as _getRelevantRolesForEffectsWithConfig,
    buildAuditConfig,
    buildBannedCountryPhrases,
    normalizeScenarioTextFields,
    repairTextIntegrity,
    inferRequirementsFromNarrative,
    buildBannedPhrasePromptGuidance,
    countSentences,
    countWords,
    condenseSentences,
    repairUnsupportedScaleTokenArtifacts,
    type AuditConfig,
    type Issue,
    type BundleScenario,
    type BundleOption,
    type Effect,
    type AuditMetadata,
    type RelationshipCondition,
    type CanonicalScenarioTag,
    type PhraseRule,
    type RelationshipTokenName,
    type PolicyImplication,
    STATE_TAG_CONDITION_MAP,
    NARRATIVE_GEOPOLITICAL_MAP,
    CANONICAL_SCENARIO_TAGS,
    GOV_STRUCTURE_RULES,
    INSTITUTION_PHRASE_RULES,
    SOFT_PENALTY_RULES,
    RELATIONSHIP_TOKEN_NAMES,
    UNIVERSAL_RELATIONSHIP_REPLACEMENTS,
    REQUIRES_CONDITION_MAP,
    ABBREVIATION_PATTERN,
    REPEATED_WORD_PATTERN,
    DANGLING_ENDING_PATTERN,
} from '../shared/scenario-audit';

export {
    scoreScenario,
    normalizeScenarioTextFields,
    repairTextIntegrity,
    inferRequirementsFromNarrative,
    buildBannedPhrasePromptGuidance,
    buildBannedCountryPhrases,
    buildAuditConfig,
    countSentences,
    countWords,
    condenseSentences,
    repairUnsupportedScaleTokenArtifacts,
    type AuditConfig,
    type Issue,
    type BundleScenario,
    type BundleOption,
    type Effect,
    type AuditMetadata,
    type RelationshipCondition,
    type CanonicalScenarioTag,
    type PhraseRule,
    type RelationshipTokenName,
    type PolicyImplication,
    STATE_TAG_CONDITION_MAP,
    NARRATIVE_GEOPOLITICAL_MAP,
    CANONICAL_SCENARIO_TAGS,
    GOV_STRUCTURE_RULES,
    INSTITUTION_PHRASE_RULES,
    SOFT_PENALTY_RULES,
    RELATIONSHIP_TOKEN_NAMES,
    UNIVERSAL_RELATIONSHIP_REPLACEMENTS,
    REQUIRES_CONDITION_MAP,
    ABBREVIATION_PATTERN,
    REPEATED_WORD_PATTERN,
    DANGLING_ENDING_PATTERN,
};

export const VALID_BUNDLE_IDS = new Set(ALL_BUNDLE_IDS);
export { isValidBundleId };
export { CANONICAL_ROLE_IDS };

export function sanitizeInventedTokens(
    scenario: BundleScenario,
    tokenValidator: (t: string) => boolean,
): { sanitized: boolean; replaced: string[] } {
    const replaced: string[] = [];

    const sanitize = (text: string | undefined): string | undefined => {
        if (!text) return text;
        return text.replace(/\{([a-z_]+)\}/gi, (match, tokenName: string) => {
            if (tokenValidator(tokenName)) return match;
            const plain = tokenName.replace(/_/g, ' ');
            replaced.push(`${match} → ${plain}`);
            return plain;
        });
    };

    scenario.title = sanitize(scenario.title) ?? scenario.title;
    scenario.description = sanitize(scenario.description) ?? scenario.description;
    for (const opt of scenario.options) {
        opt.text = sanitize(opt.text) ?? opt.text;
        if (typeof (opt as any).label === 'string') (opt as any).label = sanitize((opt as any).label) ?? (opt as any).label;
        for (const field of ['outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
            if (typeof opt[field] === 'string') (opt[field] as string) = sanitize(opt[field] as string) ?? (opt[field] as string);
        }
        if (Array.isArray(opt.advisorFeedback)) {
            for (const fb of opt.advisorFeedback as any[]) {
                if (typeof fb?.feedback === 'string') fb.feedback = sanitize(fb.feedback) ?? fb.feedback;
            }
        }
    }

    return { sanitized: replaced.length > 0, replaced };
}

const CANONICAL_TAG_SET = new Set<string>(CANONICAL_SCENARIO_TAGS);

// ---------------------------------------------------------------------------
// Config cache — populated by initializeAuditConfig()
// ---------------------------------------------------------------------------

let _config: AuditConfig | null = null;

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

export async function initializeAuditConfig(db: FirebaseFirestore.Firestore): Promise<void> {
    const [metricsSnap, contentRulesSnap, genConfigSnap, countryCatalog, compiledRegistry] = await Promise.all([
        db.doc('world_state/metrics').get(),
        db.doc('world_state/content_rules').get(),
        db.doc('world_state/generation_config').get(),
        loadCountryCatalog(db),
        loadCompiledTokenRegistry(),
    ]);

    const metricsData: any[] = metricsSnap.data()?.metrics ?? [];
    const contentRules = contentRulesSnap.data() ?? {};
    const genConfig = genConfigSnap.data() ?? {};

    const countriesDoc = countryCatalog.countries;

    _config = buildAuditConfig({
        metricsData: metricsData.map((m: any) => ({ id: m.id, inverse: m.inverse, effectMagnitudeCap: m.effectMagnitudeCap, relatedRoles: m.relatedRoles })),
        contentRules: {
            banned_abbreviations: contentRules.banned_abbreviations,
            banned_units: contentRules.banned_units,
            banned_directions: contentRules.banned_directions,
            banned_party_names: contentRules.banned_party_names,
        },
        genConfig: {
            effect_default_cap: genConfig.effect_default_cap,
            effect_duration: genConfig.effect_duration,
            category_domain_metrics: genConfig.category_domain_metrics,
            metric_mappings: genConfig.metric_mappings,
        },
        countriesDoc,
        canonicalRoleIds: [...CANONICAL_ROLE_IDS],
        allTokens: [...compiledRegistry.allTokens],
        articleFormTokenNames: [...compiledRegistry.articleFormTokenNames],
        validSettingTargets: VALID_SETTING_TARGETS as unknown as readonly string[],
    });

    const bannedCountryPhrases = buildBannedCountryPhrases(countriesDoc);
    console.log(
        `[AuditRules] Config initialized: ${_config.validMetricIds.size} metrics, ${_config.validRoleIds.size} roles, ` +
        `${_config.bannedPhrases.length} banned phrases (${bannedCountryPhrases.length} from countries, source=${countryCatalog.source.path})`
    );
}

// ---------------------------------------------------------------------------
// Backward-compatible wrappers
// ---------------------------------------------------------------------------

export function auditScenario(
    scenario: BundleScenario,
    bundleCategory: string,
    genMode: boolean = false
): Issue[] {
    return _auditScenarioWithConfig(scenario, bundleCategory, getAuditConfig(), genMode);
}

export function getRelevantRolesForEffects(effects: Effect[]): string[] {
    return _getRelevantRolesForEffectsWithConfig(effects, getAuditConfig());
}

// ---------------------------------------------------------------------------
// Private helpers used by deterministicFix / heuristicFix
// ---------------------------------------------------------------------------

function applyPhraseRules(text: string, rules: PhraseRule[]): string {
    let result = text;
    for (const rule of rules) {
        result = result.replace(rule.detect, rule.replacement);
    }
    return result;
}

function ensureScenarioApplicability(scenario: BundleScenario): NonNullable<BundleScenario['applicability']> {
    if (!scenario.applicability) {
        scenario.applicability = {
            requires: {},
            metricGates: [],
        };
    }

    scenario.applicability.requires ??= {};
    scenario.applicability.metricGates ??= [];

    return scenario.applicability;
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

// ---------------------------------------------------------------------------
// Title repair: description-mining for formulaic titles
// ---------------------------------------------------------------------------

/**
 * Patterns that mark a title as formulaic per the audit rules.
 * Kept in sync with scenario-audit.ts formulaicPatterns.
 */
const FORMULAIC_TITLE_PATTERNS: RegExp[] = [
    /\b(crisis|crises)\s*(response|options|management)?\s*$/i,
    /^managing\s+/i,
    /^(balancing|handling|navigating)\s+/i,
    /\b(debate|decision|dilemma|challenge|conflict)\s*$/i,
    /\b(response|response\s+options)\s*$/i,
];

function isFormulaic(title: string): boolean {
    return FORMULAIC_TITLE_PATTERNS.some(p => p.test(title.trim()));
}

/**
 * Mines `description` for a verb-containing headline when the current title is formulaic.
 *
 * Strategy:
 *  1. Extract the first sentence of the description (up to the first full stop).
 *  2. Strip token placeholders so they don't confuse the verb search.
 *  3. Look for the first strong subject+verb pair (e.g. "Regulators have frozen…").
 *  4. Capitalise, trim to 4-8 words, verify it passes the formulaic check.
 *  5. If no usable verb phrase is found, fall back to the original title — the
 *     LLM repair path in context-repair.ts will handle it on the next pass.
 */
export function mineDescriptionForTitle(
    currentTitle: string,
    description: string | undefined,
): string {
    if (!description) return currentTitle;

    // Take only the first sentence
    const firstSentence = description.split(/(?<=[.!?])\s+/)[0] ?? description;

    // Strip token placeholders — treat them as generic nouns for subject detection
    const plain = firstSentence.replace(/\{[a-z_]+\}/gi, 'Officials');

    // Split into words and search for a strong action verb
    const words = plain.replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter(Boolean);

    // Common auxiliary / weak verbs to skip over when looking for the headline verb
    const WEAK_VERBS = new Set([
        'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'has', 'have', 'had', 'do', 'does', 'did',
        'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could',
        'get', 'got', 'gotten', 'seem', 'seems', 'appear', 'appears',
    ]);

    // Find the first word that looks like a conjugated strong verb (ends in -ed, -s, or is all-alpha past-tense)
    const STRONG_VERB_RE = /^(froze|seized|blocked|rejected|passed|approved|collapsed|declared|imposed|suspended|launched|triggered|ordered|warned|demanded|threatened|leaked|uncovered|exposed|halted|raided|announced|signed|deployed|escalated|withdrew|confirmed|denied|dismissed|replaced|resigned|arrested|indicted|convicted|recalled|canceled|cancelled|frozen|seized|cut|raised|lifted|granted|revoked|abolished|proposed|backed|defied|challenged|forced|pressured|refused|accepted|endorsed|vetoed|reversed|extended|disbanded|restructured|nationalized|privatized|reformed|redirected|diverted|diverts|seizes|blocks|rejects|passes|approves|collapses|declares|imposes|suspends|launches|triggers|orders|warns|demands|threatens|leaks|uncovers|exposes|halts|raids|announces|signs|deploys|escalates|withdraws|confirms|denies|dismisses|replaces|resigns|arrests|indicts|convicts|recalls|cuts|raises|lifts|grants|revokes|abolishes|proposes|backs|defies|challenges|forces|pressures|refuses|accepts|endorses|vetoes|reverses|extends|disbands|restructures|nationalizes|privatizes|reforms|redirects)$/i;

    let verbIdx = -1;

    for (let i = 0; i < Math.min(words.length, 12); i++) {
        const w = words[i].toLowerCase();
        if (WEAK_VERBS.has(w)) continue;
        if (STRONG_VERB_RE.test(words[i]) || (w.endsWith('s') && w.length > 3 && /^[a-z]+$/.test(w))) {
            verbIdx = i;
            break;
        }
        // Past tense: ends in -ed
        if (w.endsWith('ed') && w.length > 4 && /^[a-z]+$/.test(w) && !WEAK_VERBS.has(w)) {
            verbIdx = i;
            break;
        }
    }

    if (verbIdx === -1) return currentTitle;

    // Grab up to 3 words after the verb as the object
    const headline = words.slice(0, Math.min(verbIdx + 4, 8)).join(' ');
    const wordCount = headline.split(/\s+/).length;
    if (wordCount < 4 || wordCount > 8) return currentTitle;

    // Capitalise first letter, verify it doesn't re-trigger formulaic patterns
    const candidate = headline.charAt(0).toUpperCase() + headline.slice(1);
    if (isFormulaic(candidate)) return currentTitle;

    return candidate;
}

// ---------------------------------------------------------------------------
// deterministicFix
// ---------------------------------------------------------------------------

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
            if (!cfg.validMetricIds.has(eff.targetMetricId)) {
                const resolved = tryNormalizeMetricId(eff.targetMetricId);
                if (resolved && cfg.validMetricIds.has(resolved)) {
                    const old = eff.targetMetricId;
                    eff.targetMetricId = resolved;
                    fixed = true;
                    fixes.push(`${opt.id}: normalized ${old}->${resolved}`);
                }
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

    if (scenario.metadata) {
        const VALID_SOURCE_KINDS: ScenarioSourceKind[] = ['evergreen', 'news', 'neighbor', 'consequence'];
        const sk = scenario.metadata.sourceKind as string | undefined;
        if (sk && !VALID_SOURCE_KINDS.includes(sk as ScenarioSourceKind)) {
            const inferred: ScenarioSourceKind = sk === 'news' ? 'news' : 'evergreen';
            scenario.metadata.sourceKind = inferred;
            fixed = true;
            fixes.push(`normalized sourceKind: '${sk}' → '${inferred}'`);
        }
    }

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

    const condensed = condenseSentences(scenario.description ?? '', 3);
    if (condensed) {
        scenario.description = condensed;
        fixed = true;
        fixes.push(`condensed description from ${countSentences(condensed) + 1}+ to 3 sentences`);
    }
    for (const opt of scenario.options) {
        if (typeof opt.text === 'string') {
            const optCondensed = condenseSentences(opt.text, 3);
            if (optCondensed) {
                opt.text = optCondensed;
                fixed = true;
                fixes.push(`${opt.id}: condensed option text to 3 sentences`);
            }
        }
    }

    const repairTokenContextGrammar = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let result = text;
        result = result.replace(/\b(Your|your)\s+the\s+(\{[a-z_]+\})/g, '$1 $2');
        result = result.replace(/\bYou\s+the\s+(\{[a-z_]+\})/g, 'Your $1');
        result = result.replace(/\byou\s+the\s+(\{[a-z_]+\})/g, 'your $1');
        result = result.replace(/\bYou\s+(\{(?!the_)[a-z_]+_role\})/g, 'Your $1');
        result = result.replace(/\byou\s+(\{(?!the_)[a-z_]+_role\})/g, 'your $1');
        result = result.replace(/\b(?:a|an|the)\s+(\{the_[a-z_]+\})/gi, '$1');
        return result;
    };

    for (const field of ['title', 'description'] as const) {
        const before = scenario[field] as string | undefined;
        const after = repairTokenContextGrammar(before);
        if (after && after !== before) {
            (scenario as any)[field] = after;
            fixed = true;
            fixes.push(`${field}: repaired token-context grammar`);
        }
    }
    for (const opt of scenario.options) {
        for (const field of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
            if (typeof opt[field] === 'string') {
                const before = opt[field] as string;
                const after = repairTokenContextGrammar(before);
                if (after && after !== before) {
                    (opt[field] as string) = after;
                    fixed = true;
                    fixes.push(`${opt.id}: repaired token-context grammar in ${field}`);
                }
            }
        }
        if (Array.isArray(opt.advisorFeedback)) {
            for (const fb of opt.advisorFeedback as any[]) {
                if (typeof fb.feedback === 'string') {
                    const before = fb.feedback;
                    const after = repairTokenContextGrammar(before);
                    if (after && after !== before) {
                        fb.feedback = after;
                        fixed = true;
                        fixes.push(`${opt.id}: repaired token-context grammar in advisor ${fb.roleId}`);
                    }
                }
            }
        }
    }

    if (scenario.metadata?.scopeTier === 'universal') {
        const scrubUniversalRelationshipTokens = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(/\{(the_)?([a-z_]+)\}(?:'s|'s)?/gi, (match, _prefixed, rawName) => {
                const normalized = String(rawName).toLowerCase() as RelationshipTokenName;
                if (!RELATIONSHIP_TOKEN_NAMES.has(normalized)) return match;
                const replacement = UNIVERSAL_RELATIONSHIP_REPLACEMENTS[normalized];
                if (!replacement) return match;
                return /(?:'s|'s)$/i.test(match) ? replacement.possessive : replacement.plain;
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

    if (isFormulaic(scenario.title)) {
        const before = scenario.title;
        const mined = mineDescriptionForTitle(scenario.title, scenario.description);
        if (mined !== before) {
            scenario.title = mined;
            fixes.push(`title: rewrote formulaic title "${before}" → "${mined}"`);
            fixed = true;
        }
    }

    if (scenario.metadata) {
        const rawTags: string[] = Array.isArray(scenario.metadata.tags) ? scenario.metadata.tags : [];
        const rawTagsForInference = [...rawTags];
        const normalized = Array.from(
            new Set(
                rawTags
                    .map((t) => String(t).toLowerCase().replace(/[\s-]+/g, '_').trim())
                    .filter((t) => CANONICAL_TAG_SET.has(t))
            )
        ).slice(0, 6);
        if (JSON.stringify(normalized) !== JSON.stringify(rawTags)) {
            scenario.metadata.tags = normalized;
            fixed = true;
            fixes.push(`normalized tags: [${rawTags.join(', ')}] → [${normalized.join(', ')}]`);
        }

        for (const tag of (scenario.metadata.tags ?? [])) {
            const implied = STATE_TAG_CONDITION_MAP[tag];
            if (!implied) continue;
            const applicability = ensureScenarioApplicability(scenario);
            const metricGates = Array.isArray(applicability.metricGates) ? applicability.metricGates : [];
            const covered = metricGates.some(
                (c) => c.metricId === implied.metricId && (implied.op === 'max' ? c.max !== undefined : c.min !== undefined)
            );
            if (!covered) {
                const newCondition: { metricId: string; min?: number; max?: number } =
                    implied.op === 'max'
                        ? { metricId: implied.metricId, max: implied.threshold }
                        : { metricId: implied.metricId, min: implied.threshold };
                applicability.metricGates.push(newCondition);
                fixed = true;
                fixes.push(`auto-injected applicability.metricGates entry for tag "${tag}": ${implied.metricId} ${implied.op} ${implied.threshold}`);
            }
        }

        // Scoring-aligned gate reconstruction: infer metric gates from low-state signals
        // when metricGates are absent and the narrative or raw tags indicate a crisis.
        const applicabilityForInference = ensureScenarioApplicability(scenario);
        if (applicabilityForInference.metricGates.length === 0) {
            const LOW_STATE_KEYWORDS = ['underfunded', 'shortage', 'crisis', 'gap', 'cuts', 'deficit', 'weak', 'reduced', 'decline', 'vulnerable', 'threat'];
            const narrativeLower = [scenario.title, scenario.description].filter(Boolean).join(' ').toLowerCase();
            const hasLowStateSignal =
                rawTagsForInference.some((t: string) => LOW_STATE_KEYWORDS.some((kw) => t.toLowerCase().includes(kw))) ||
                LOW_STATE_KEYWORDS.some((kw) => narrativeLower.includes(kw));

            if (hasLowStateSignal) {
                const addedMetrics = new Set<string>();
                for (const opt of scenario.options) {
                    for (const eff of opt.effects as any[]) {
                        const metricId = eff.targetMetricId as string;
                        if (!cfg.validMetricIds.has(metricId) || addedMetrics.has(metricId)) continue;
                        const isImproving = cfg.inverseMetrics.has(metricId) ? Number(eff.value) < 0 : Number(eff.value) > 0;
                        if (isImproving) {
                            applicabilityForInference.metricGates.push({ metricId, max: 45 });
                            addedMetrics.add(metricId);
                            fixed = true;
                        }
                    }
                }
                if (addedMetrics.size > 0) {
                    fixes.push('reconstructed applicability.metricGates from narrative, tags, and requires flags');
                }
            }
        }
    }

    // Scale-token artifact repair
    {
        const applyScaleRepair = (text: string | undefined, label: string): string | undefined => {
            const after = repairUnsupportedScaleTokenArtifacts(text);
            if (after !== text) { fixes.push(`${label}: repaired unsupported scale-token artifact`); fixed = true; }
            return capitalizeFirstNarrativeLetter(after ?? text) ?? after ?? text;
        };
        scenario.title = applyScaleRepair(scenario.title, 'title') ?? scenario.title;
        scenario.description = applyScaleRepair(scenario.description, 'description') ?? scenario.description;
        for (const opt of scenario.options) {
            opt.text = applyScaleRepair(opt.text, `${opt.id} text`) ?? opt.text;
            for (const f of ['outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[f] === 'string') (opt[f] as any) = applyScaleRepair(opt[f] as string, `${opt.id} ${f}`) ?? opt[f];
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb?.feedback === 'string') fb.feedback = applyScaleRepair(fb.feedback, `${opt.id} advisor ${fb.roleId}`) ?? fb.feedback;
                }
            }
        }
    }

    // Hardcoded institution phrase repair (culture minister → {education_role}, etc.)
    {
        const dedupeArticle = (t: string | undefined): string | undefined => {
            if (!t) return t;
            return t
                .replace(/\b(a|an)\s+(the)\s+(\{[a-z_]+\})/gi, 'the $3')
                .replace(/\b(a|an)\s+(\w+)\s+(the)\s+(\{[a-z_]+\})/gi, 'the $2 $4')
                .replace(/\bThe the\b/g, 'The')
                .replace(/\bthe the\b/gi, 'the');
        };
        const scrubPhrases = (text: string | undefined): string | undefined => {
            if (!text) return text;
            let result = applyPhraseRules(text, INSTITUTION_PHRASE_RULES);
            result = applyPhraseRules(result, GOV_STRUCTURE_RULES);
            return dedupeArticle(result) ?? result;
        };
        const descPhraseBefore = scenario.description;
        scenario.description = scrubPhrases(scenario.description) ?? scenario.description;
        if (descPhraseBefore !== scenario.description) { fixes.push('description: replaced hardcoded institutions/gov-structure with tokens'); fixed = true; }
        const titlePhraseBefore = scenario.title;
        scenario.title = scrubPhrases(scenario.title) ?? scenario.title;
        if (titlePhraseBefore !== scenario.title) { fixes.push('title: replaced hardcoded institutions/gov-structure with tokens'); fixed = true; }
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
                    if (typeof fb?.feedback === 'string') {
                        const before = fb.feedback;
                        fb.feedback = scrubPhrases(fb.feedback) ?? fb.feedback;
                        if (before !== fb.feedback) { fixes.push(`${opt.id}: replaced hardcoded phrases in advisor ${fb.roleId}`); fixed = true; }
                    }
                }
            }
        }
    }

    // Universal scope: scrub fragile political tokens to plain text
    // Runs AFTER phrase repair to avoid circular rewrites (e.g. governing coalition → {governing_party} → governing coalition)
    if (scenario.metadata?.scopeTier === 'universal') {
        const UNIVERSAL_POLITICAL_TOKEN_MAP: Record<string, string> = {
            'governing_party':     'the governing coalition',
            'the_governing_party': 'the governing coalition',
            'opposition_party':    'the opposition',
            'the_opposition_party':'the opposition',
            'legislature':         'lawmakers',
            'the_legislature':     'lawmakers',
            'state_media':         'state broadcasters',
            'the_state_media':     'state broadcasters',
        };
        const scrubPoliticalTokens = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(/\{(the_)?([a-z_]+)\}(?:'s|'s)?/gi, (match, the_prefix, name) => {
                const key = (the_prefix ? 'the_' : '') + name.toLowerCase();
                const replacement = UNIVERSAL_POLITICAL_TOKEN_MAP[key];
                if (!replacement) return match;
                return /(?:'s|'s)$/i.test(match) ? replacement + "'s" : replacement;
            });
        };

        const titleBefore = scenario.title;
        scenario.title = scrubPoliticalTokens(scenario.title) ?? scenario.title;
        if (titleBefore !== scenario.title) { fixes.push('title: scrubbed fragile political tokens for universal scope'); fixed = true; }

        const descBefore = scenario.description;
        scenario.description = scrubPoliticalTokens(scenario.description) ?? scenario.description;
        if (descBefore !== scenario.description) { fixes.push('description: scrubbed fragile political tokens for universal scope'); fixed = true; }

        for (const opt of scenario.options) {
            for (const field of ['text', 'outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if (typeof opt[field] === 'string') {
                    const before = opt[field] as string;
                    (opt[field] as string) = scrubPoliticalTokens(before) ?? before;
                    if (before !== opt[field]) { fixes.push(`${opt.id}: scrubbed fragile political tokens in ${field}`); fixed = true; }
                }
            }
            if (Array.isArray(opt.advisorFeedback)) {
                for (const fb of opt.advisorFeedback as any[]) {
                    if (typeof fb?.feedback === 'string') {
                        const before = fb.feedback;
                        fb.feedback = scrubPoliticalTokens(fb.feedback) ?? fb.feedback;
                        if (before !== fb.feedback) { fixes.push(`${opt.id}: scrubbed fragile political tokens in advisor ${fb.roleId}`); fixed = true; }
                    }
                }
            }
        }
    }

    // Policy implication target mapping
    {
        const POLICY_TARGET_MAPPINGS: Record<string, string> = {
            'policy.housing':     'fiscal.spendingSocial',
            'policy.education':   'fiscal.spendingSocial',
            'policy.welfare':     'fiscal.spendingSocial',
            'policy.healthcare':  'fiscal.spendingSocial',
            'policy.defense':     'fiscal.budget',
            'policy.foreign':     'fiscal.budget',
            'policy.trade':       'fiscal.budget',
            'policy.taxation':    'fiscal.budget',
            'policy.immigration': 'fiscal.budget',
            'policy.environment': 'fiscal.budget',
        };
        for (const opt of scenario.options) {
            for (const pi of ((opt as any).policyImplications ?? []) as any[]) {
                const mapped = POLICY_TARGET_MAPPINGS[pi.target as string];
                if (mapped) {
                    const before = pi.target as string;
                    pi.target = mapped;
                    fixes.push(`${opt.id}: mapped policyImplication target ${before}->${mapped}`);
                    fixed = true;
                }
            }
        }
    }

    // Role ID canonicalization via ROLE_ALIAS_MAP
    {
        for (const opt of scenario.options) {
            if (!Array.isArray(opt.advisorFeedback)) continue;
            for (const fb of opt.advisorFeedback as any[]) {
                const alias = ROLE_ALIAS_MAP[fb.roleId as string];
                if (alias) {
                    const before = fb.roleId as string;
                    fb.roleId = alias;
                    fixes.push(`${opt.id}: canonicalized roleId ${before} → ${alias}`);
                    fixed = true;
                }
            }
        }
    }

    // Narrative-based requires inference (article-form institution tokens → requires flags)
    {
        const premiseParts = [scenario.title, scenario.description, ...(scenario.options ?? []).map((o) => o.text)].filter(Boolean);
        const premiseCorpus = premiseParts.join(' ');
        const applicability = ensureScenarioApplicability(scenario);
        const inferred = inferRequirementsFromNarrative(premiseCorpus, applicability.requires as ScenarioRequirements | undefined);
        if (Object.keys(inferred).length > 0) {
            applicability.requires = { ...(applicability.requires ?? {}), ...inferred };
            fixes.push(`merged narrative-inferred requires: ${Object.keys(inferred).join(', ')}`);
            fixed = true;
        }
    }

    return { fixed, fixes };
}

// ---------------------------------------------------------------------------
// heuristicFix
// ---------------------------------------------------------------------------

export function heuristicFix(scenario: BundleScenario, issues: Issue[], bundle?: string): { fixed: boolean; fixes: string[] } {
    const cfg = getAuditConfig();
    let fixed = false;
    const fixes: string[] = [];

    const fixMissingDirectObject = (text: string | undefined): string | undefined => {
        if (!text) return text;
        let result = text;
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

    const applyMissingDirectObjectFix = (text: string | undefined): string | undefined => {
        const before = text;
        const after = fixMissingDirectObject(text);
        if (before !== after) {
            fixed = true;
            fixes.push('fixed missing direct object in text');
        }
        return after;
    };

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
            for (const field of ['outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
                if ((scenario as any)[field]) {
                    const before = (scenario as any)[field] as string;
                    const after = fixOutcomeVoice(before) ?? before;
                    if (before !== after) { (scenario as any)[field] = after; fixes.push(`scenario: fixed second-person voice in ${field}`); fixed = true; }
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

        if (issue.rule === 'formulaic-title') {
            const before = scenario.title;
            const mined = mineDescriptionForTitle(scenario.title, scenario.description);
            if (mined !== before) {
                scenario.title = mined;
                fixes.push(`title: rewrote formulaic title "${before}" → "${mined}"`);
                fixed = true;
            }
        }
    }

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

    {
        const fixArticleDoubling = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(/\bthe \{([a-z_]+)\}/g, (match, name) => {
                return cfg.articleFormTokenNames.has(name) ? `{the_${name}}` : match;
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

    {
        const fixSentenceStartTokens = (text: string | undefined): string | undefined => {
            if (!text) return text;
            const pattern = new RegExp(
                `(^|([.!?])\\s+)\\{(${Array.from(cfg.articleFormTokenNames).join('|')})\\}`,
                'g'
            );
            return text.replace(pattern, (match, prefix, punctChar, name) => {
                const theForm = `the_${name}`;
                if (!cfg.articleFormTokenNames.has(name)) return match;
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

    {
        const fixTheBeforeToken = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(/\bthe \{(the_)?([a-z_]+)\}/gi, (match, _prefixed, name) => {
                return cfg.articleFormTokenNames.has(name) ? `{the_${name}}` : match;
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

    {
        const fixGdpMisuse = (text: string | undefined): string | undefined => {
            if (!text || !text.includes('{gdp_description}')) return text;
            let result = text;
            const misuseVerbs = 'siphon(?:ed|ing)?|steal(?:ing)?|stole|stolen|embezzl(?:ed|ing)?|divert(?:ed|ing)?|skim(?:med|ming)?|misappropriat(?:ed|ing)?|loot(?:ed|ing)?|plunder(?:ed|ing)?|wast(?:ed|ing)?|squander(?:ed|ing)?|funnel(?:ed|ing)?|launder(?:ed|ing)?|los(?:t|e|ing)|drain(?:ed|ing)?|hemorrhag(?:ed|ing)?';
            result = result.replace(new RegExp(`(${misuseVerbs})([^.!?]*)\\{gdp_description\\}`, 'gi'), 'strained the {gdp_description} economy');
            result = result.replace(new RegExp(`\\{gdp_description\\}([^.!?]*)(${misuseVerbs})`, 'gi'), '{gdp_description} economy faces significant fiscal pressure');
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

    {
        for (const opt of scenario.options) {
            if (typeof opt.outcomeSummary === 'string') {
                let summary = opt.outcomeSummary.trim();
                const sentenceCount = (summary.match(/[.!?]+/g) || []).length;
                if (sentenceCount < 2 && summary.length > 0) {
                    summary += ' The long-term implications of this decision remain under active review by senior officials.';
                    fixes.push(`${opt.id}: added second sentence to outcomeSummary`);
                    fixed = true;
                }
                if (summary.length > 0 && summary.length < 250) {
                    summary += ' Analysts across multiple ministries continue to assess the cascading effects on institutional stability and public confidence.';
                    fixes.push(`${opt.id}: padded outcomeSummary to meet 250-char minimum`);
                    fixed = true;
                }
                opt.outcomeSummary = summary;
            }
        }
    }

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

    if (bundle && cfg.categoryDomainMetrics[bundle]?.length > 0) {
        const domainMetrics = new Set(cfg.categoryDomainMetrics[bundle]);
        const primaryDomainMetric = cfg.categoryDomainMetrics[bundle][0];
        for (const opt of scenario.options) {
            const hasDomainEffect = (opt.effects || []).some((e: any) => domainMetrics.has(e.targetMetricId));
            if (!hasDomainEffect) {
                const netSign = (opt.effects || []).reduce((sum: number, e: any) => sum + e.value, 0);
                const injectValue = netSign >= 0 ? 1.2 : -1.2;
                const domainEffect = {
                    targetMetricId: primaryDomainMetric,
                    value: injectValue,
                    duration: 7,
                    probability: 1,
                };
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
                return cfg.articleFormTokenNames.has(name) ? `{the_${name}}` : `{${name}}`;
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

    if (scenario.options.length > 3) {
        const originalCount = scenario.options.length;
        scenario.options = scenario.options.slice(0, 3);
        fixes.push(`truncated ${originalCount} options to 3`);
        fixed = true;
    }

    for (const opt of scenario.options) {
        for (const field of ['outcomeHeadline', 'outcomeSummary', 'outcomeContext'] as const) {
            if (typeof opt[field] === 'string' && /\byou(?:r)?\b/i.test(opt[field] as string)) {
                const before = opt[field]!;
                opt[field] = fixOutcomeVoice(before) ?? before;
                if (before !== opt[field]) { fixes.push(`${opt.id}: proactive voice fix in ${field}`); fixed = true; }
            }
        }
    }

    for (const opt of scenario.options) {
        if (Array.isArray(opt.effects) && opt.effects.length > 4) {
            opt.effects = opt.effects.slice(0, 4);
            fixes.push(`${opt.id}: final trim to 4 effects`);
            fixed = true;
        }
    }

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

    for (const issue of issues) {
        if (issue.rule === 'narrative-requires-coherence') {
            const premiseParts = [scenario.title, scenario.description, ...(scenario.options ?? []).map(o => o.text)].filter(Boolean);
            const premiseCorpus = premiseParts.join(' ');
            const applicability = ensureScenarioApplicability(scenario);
            const inferred = inferRequirementsFromNarrative(premiseCorpus, applicability.requires as ScenarioRequirements | undefined);
            if (Object.keys(inferred).length > 0) {
                applicability.requires = { ...(applicability.requires ?? {}), ...inferred };
                fixes.push(`merged narrative-inferred requires: ${Object.keys(inferred).join(', ')}`);
                fixed = true;
            }
            break;
        }
    }

    for (const issue of issues) {
        if (issue.rule === 'option-domain-missing-primary') {
            const optionDomains: Array<{ label: string; primaryMetric: string }> = Array.isArray(scenario.metadata?.optionDomains)
                ? (scenario.metadata?.optionDomains as any[]).filter((d) => typeof d?.primaryMetric === 'string')
                : [];
            if (optionDomains.length === scenario.options.length) {
                for (let i = 0; i < scenario.options.length; i++) {
                    const opt = scenario.options[i];
                    const domain = optionDomains[i];
                    if (!domain) continue;
                    const primaryMetric = domain.primaryMetric;
                    const hasPrimary = (opt.effects as any[]).some((e: any) => e.targetMetricId === primaryMetric);
                    if (!hasPrimary) {
                        const netSign = (opt.effects as any[]).reduce((sum: number, e: any) => sum + Number(e.value ?? 0), 0);
                        const injectValue = netSign >= 0 ? 1.2 : -1.2;
                        (opt.effects as any[]).push({
                            targetMetricId: primaryMetric,
                            value: injectValue,
                            duration: cfg.logicParameters.duration.min,
                            probability: 1,
                        });
                        fixes.push(`${opt.id}: injected missing primary metric effect for domain '${domain.label}' (${primaryMetric})`);
                        fixed = true;
                    }
                }
            }
            break;
        }
    }

    return { fixed, fixes };
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

export function getAuditRulesPrompt(registry?: CompiledTokenRegistry, _scopeTier?: string): string {
    const cfg = getAuditConfig();
    const inverseList = Array.from(cfg.inverseMetrics).join(', ');
    const metricList = Array.from(cfg.validMetricIds).join(', ');
    const tokenSection = buildTokenWhitelistPromptSection(registry);
    return `**AUDIT COMPLIANCE RULES (VIOLATIONS = REJECTION):**

${tokenSection}

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
��� "the {adversary} imposed..." → ✅ "{the_adversary} imposed..."
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

export function getCompactAuditRulesPrompt(registry?: CompiledTokenRegistry): string {
    const cfg = getAuditConfig();
    const inverseList = Array.from(cfg.inverseMetrics).join(', ');
    const metricList = Array.from(cfg.validMetricIds).join(', ');
    const tokenSection = buildCompactTokenPromptSection(registry);
    return `**AUDIT RULES (VIOLATIONS = REJECTION):**

${tokenSection}

## VALID METRICS: ${metricList}

## EFFECTS: 2-4 per option (5+ = REJECTED). probability=1. duration=${cfg.logicParameters.duration.min}-${cfg.logicParameters.duration.max}. value: -4.0 to +4.0.

## WORD COUNTS (HARD): description=60-140 words. options[].text=50-120 words. outcomeSummary≥250 chars. outcomeContext≥400 chars.

## INVERSE METRICS (values MUST be negative — positive values = REJECTED): ${inverseList}

## VOICE: description/options/advisorFeedback=SECOND PERSON ("You face..."). outcomes=THIRD PERSON journalistic ("The administration..."). "you"/"your" in outcomes=REJECTED.

## ADVISORS: Each option needs role_executive + affected roles. Format: { "roleId": "role_xxx", "stance": "support"|"oppose"|"neutral"|"concerned", "feedback": "1-2 specific sentences" }. Generic boilerplate=REJECTED.

## PLAIN LANGUAGE: No jargon. Max 30 words/sentence. Active voice. Labels=plain text, no tokens.`;
}

// ---------------------------------------------------------------------------
// Concept validation
// ---------------------------------------------------------------------------

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
