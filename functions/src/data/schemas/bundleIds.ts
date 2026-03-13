/**
 * Canonical Bundle ID Definitions
 * 
 * From logic.md Section 5.4: Scenario Bundles (14)
 * 
 * This is the single source of truth for all bundle identifiers.
 * All other files must import from here to ensure consistency.
 */

export const BUNDLE_IDS = {
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
} as const;

export type BundleId = (typeof BUNDLE_IDS)[keyof typeof BUNDLE_IDS];

/**
 * All valid bundle IDs as an array (14 total per logic.md)
 */
export const ALL_BUNDLE_IDS: readonly BundleId[] = Object.values(BUNDLE_IDS);

/**
 * Bundle descriptions from logic.md Section 5.4
 */
export const BUNDLE_DESCRIPTIONS: Record<BundleId, string> = {
    [BUNDLE_IDS.ECONOMY]: 'Supply chains, debt, inflation, fiscal crises',
    [BUNDLE_IDS.POLITICS]: 'Elections, scandals, constitutional crises',
    [BUNDLE_IDS.MILITARY]: 'Wars, nuclear threats, coups, peacekeeping',
    [BUNDLE_IDS.TECH]: 'AI, cybersecurity, space, digital infrastructure',
    [BUNDLE_IDS.ENVIRONMENT]: 'Climate, pollution, natural disasters',
    [BUNDLE_IDS.SOCIAL]: 'Inequality, education, healthcare, strikes',
    [BUNDLE_IDS.HEALTH]: 'Pandemics, epidemics, healthcare collapse',
    [BUNDLE_IDS.DIPLOMACY]: 'Trade wars, sanctions, alliances, hostages',
    [BUNDLE_IDS.JUSTICE]: 'Crime waves, corruption, judicial independence',
    [BUNDLE_IDS.CORRUPTION]: 'Government corruption, bribery, fraud',
    [BUNDLE_IDS.CULTURE]: 'Cultural conflicts, media, censorship',
    [BUNDLE_IDS.INFRASTRUCTURE]: 'Transportation, utilities, communications',
    [BUNDLE_IDS.RESOURCES]: 'Energy crises, water scarcity, mining',
    [BUNDLE_IDS.DICK_MODE]: 'Authoritarian and morally dark options',
};

/**
 * Bundles that are available in standard gameplay (excluding dick_mode)
 */
export const STANDARD_BUNDLE_IDS: readonly BundleId[] = ALL_BUNDLE_IDS.filter(
    id => id !== BUNDLE_IDS.DICK_MODE
);

/**
 * Bundles requiring special mode activation
 */
export const SPECIAL_BUNDLE_IDS: readonly BundleId[] = [BUNDLE_IDS.DICK_MODE];

/**
 * Check if a string is a valid bundle ID
 */
export function isValidBundleId(id: string): id is BundleId {
    return Object.values(BUNDLE_IDS).includes(id as BundleId);
}

/**
 * Normalize bundle ID (handle legacy aliases)
 */
export function normalizeBundleId(bundleName: string): BundleId | null {
    const normalized = bundleName.toLowerCase().trim();
    
    // Direct match
    if (isValidBundleId(normalized)) {
        return normalized;
    }
    
    // Handle legacy aliases
    const aliasMap: Record<string, BundleId> = {
        'technology': BUNDLE_IDS.TECH,
        'science': BUNDLE_IDS.TECH,
        'dickmode': BUNDLE_IDS.DICK_MODE,
        'dick-mode': BUNDLE_IDS.DICK_MODE,
        'authoritarian': BUNDLE_IDS.DICK_MODE,
    };
    
    return aliasMap[normalized] || null;
}
