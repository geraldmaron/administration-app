"use strict";
/**
 * Canonical Bundle ID Definitions
 *
 * From logic.md Section 5.4: Scenario Bundles (14)
 *
 * This is the single source of truth for all bundle identifiers.
 * All other files must import from here to ensure consistency.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPECIAL_BUNDLE_IDS = exports.STANDARD_BUNDLE_IDS = exports.BUNDLE_DESCRIPTIONS = exports.ALL_BUNDLE_IDS = exports.BUNDLE_IDS = void 0;
exports.isValidBundleId = isValidBundleId;
exports.normalizeBundleId = normalizeBundleId;
exports.BUNDLE_IDS = {
    ECONOMY: 'economy',
    POLITICS: 'politics',
    MILITARY: 'military',
    TECH: 'tech',
    ENVIRONMENT: 'environment',
    SOCIAL: 'social',
    HEALTH: 'health',
    DIPLOMACY: 'diplomacy',
    JUSTICE: 'justice',
    CORRUPTION: 'corruption',
    CULTURE: 'culture',
    INFRASTRUCTURE: 'infrastructure',
    RESOURCES: 'resources',
    DICK_MODE: 'dick_mode',
};
/**
 * All valid bundle IDs as an array (14 total per logic.md)
 */
exports.ALL_BUNDLE_IDS = Object.values(exports.BUNDLE_IDS);
/**
 * Bundle descriptions from logic.md Section 5.4
 */
exports.BUNDLE_DESCRIPTIONS = {
    [exports.BUNDLE_IDS.ECONOMY]: 'Supply chains, debt, inflation, fiscal crises',
    [exports.BUNDLE_IDS.POLITICS]: 'Elections, scandals, constitutional crises',
    [exports.BUNDLE_IDS.MILITARY]: 'Wars, nuclear threats, coups, peacekeeping',
    [exports.BUNDLE_IDS.TECH]: 'AI, cybersecurity, space, digital infrastructure',
    [exports.BUNDLE_IDS.ENVIRONMENT]: 'Climate, pollution, natural disasters',
    [exports.BUNDLE_IDS.SOCIAL]: 'Inequality, education, healthcare, strikes',
    [exports.BUNDLE_IDS.HEALTH]: 'Pandemics, epidemics, healthcare collapse',
    [exports.BUNDLE_IDS.DIPLOMACY]: 'Trade wars, sanctions, alliances, hostages',
    [exports.BUNDLE_IDS.JUSTICE]: 'Crime waves, corruption, judicial independence',
    [exports.BUNDLE_IDS.CORRUPTION]: 'Government corruption, bribery, fraud',
    [exports.BUNDLE_IDS.CULTURE]: 'Cultural conflicts, media, censorship',
    [exports.BUNDLE_IDS.INFRASTRUCTURE]: 'Transportation, utilities, communications',
    [exports.BUNDLE_IDS.RESOURCES]: 'Energy crises, water scarcity, mining',
    [exports.BUNDLE_IDS.DICK_MODE]: 'Authoritarian and morally dark options',
};
/**
 * Bundles that are available in standard gameplay (excluding dick_mode)
 */
exports.STANDARD_BUNDLE_IDS = exports.ALL_BUNDLE_IDS.filter(id => id !== exports.BUNDLE_IDS.DICK_MODE);
/**
 * Bundles requiring special mode activation
 */
exports.SPECIAL_BUNDLE_IDS = [exports.BUNDLE_IDS.DICK_MODE];
/**
 * Check if a string is a valid bundle ID
 */
function isValidBundleId(id) {
    return Object.values(exports.BUNDLE_IDS).includes(id);
}
/**
 * Normalize bundle ID (handle legacy aliases)
 */
function normalizeBundleId(bundleName) {
    const normalized = bundleName.toLowerCase().trim();
    // Direct match
    if (isValidBundleId(normalized)) {
        return normalized;
    }
    // Handle legacy aliases
    const aliasMap = {
        'technology': exports.BUNDLE_IDS.TECH,
        'science': exports.BUNDLE_IDS.TECH,
        'dickmode': exports.BUNDLE_IDS.DICK_MODE,
        'dick-mode': exports.BUNDLE_IDS.DICK_MODE,
        'authoritarian': exports.BUNDLE_IDS.DICK_MODE,
    };
    return aliasMap[normalized] || null;
}
//# sourceMappingURL=bundleIds.js.map