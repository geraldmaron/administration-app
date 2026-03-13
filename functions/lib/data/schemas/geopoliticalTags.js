"use strict";
/**
 * Canonical geopolitical tag definitions for country profiling and scenario targeting.
 *
 * These tags are intentionally coarse-grained and composable so that:
 * - Every one of the 50 playable countries can be described by a small set of tags
 * - Scenario authors can express applicability in terms of capabilities and blocs
 * - The NeighborEventEngine can match scenarios based on neighbor attributes
 *
 * Tags are grouped into six dimensions:
 * - power tier
 * - capability
 * - economic
 * - alliance / bloc
 * - geography
 * - status
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_TAGS = exports.GEOGRAPHY_TAGS = exports.ALLIANCE_BLOC_TAGS = exports.ECONOMIC_TAGS = exports.CAPABILITY_TAGS = exports.POWER_TIER_TAGS = exports.GEO_TAGS = void 0;
exports.GEO_TAGS = {
    // Power tier
    SUPERPOWER: 'superpower',
    GREAT_POWER: 'great_power',
    REGIONAL_POWER: 'regional_power',
    MIDDLE_POWER: 'middle_power',
    SMALL_STATE: 'small_state',
    // Capability
    NUCLEAR_STATE: 'nuclear_state',
    CYBER_POWER: 'cyber_power',
    NAVAL_POWER: 'naval_power',
    SPACE_CAPABLE: 'space_capable',
    MAJOR_ARMS_EXPORTER: 'major_arms_exporter',
    // Economic
    G7: 'g7',
    G20: 'g20',
    BRICS: 'brics',
    OPEC: 'opec',
    OPEC_PLUS: 'opec_plus',
    DEVELOPED_ECONOMY: 'developed_economy',
    EMERGING_MARKET: 'emerging_market',
    OIL_EXPORTER: 'oil_exporter',
    GAS_EXPORTER: 'gas_exporter',
    FINANCIAL_CENTER: 'financial_center',
    MANUFACTURING_HUB: 'manufacturing_hub',
    // Alliance / Bloc
    NATO: 'nato',
    EU: 'eu',
    EU_CANDIDATE: 'eu_candidate',
    ASEAN: 'asean',
    AFRICAN_UNION: 'african_union',
    CIS: 'cis',
    SCO: 'sco',
    QUAD: 'quad',
    AUKUS: 'aukus',
    FIVE_EYES: 'five_eyes',
    CSTO: 'csto',
    // Geography
    ISLAND_NATION: 'island_nation',
    LANDLOCKED: 'landlocked',
    COASTAL: 'coastal',
    ARCTIC_STATE: 'arctic_state',
    ARCHIPELAGO: 'archipelago',
    // Status / governance context
    SANCTIONED: 'sanctioned',
    CONFLICT_ZONE: 'conflict_zone',
    POST_CONFLICT: 'post_conflict',
    FAILED_STATE_RISK: 'failed_state_risk',
    RELIGIOUS_STATE: 'religious_state',
    SECULAR_STATE: 'secular_state',
};
/**
 * Convenience grouped lists for prompt assembly and validation.
 */
exports.POWER_TIER_TAGS = [
    exports.GEO_TAGS.SUPERPOWER,
    exports.GEO_TAGS.GREAT_POWER,
    exports.GEO_TAGS.REGIONAL_POWER,
    exports.GEO_TAGS.MIDDLE_POWER,
    exports.GEO_TAGS.SMALL_STATE,
];
exports.CAPABILITY_TAGS = [
    exports.GEO_TAGS.NUCLEAR_STATE,
    exports.GEO_TAGS.CYBER_POWER,
    exports.GEO_TAGS.NAVAL_POWER,
    exports.GEO_TAGS.SPACE_CAPABLE,
    exports.GEO_TAGS.MAJOR_ARMS_EXPORTER,
];
exports.ECONOMIC_TAGS = [
    exports.GEO_TAGS.G7,
    exports.GEO_TAGS.G20,
    exports.GEO_TAGS.BRICS,
    exports.GEO_TAGS.OPEC,
    exports.GEO_TAGS.OPEC_PLUS,
    exports.GEO_TAGS.DEVELOPED_ECONOMY,
    exports.GEO_TAGS.EMERGING_MARKET,
    exports.GEO_TAGS.OIL_EXPORTER,
    exports.GEO_TAGS.GAS_EXPORTER,
    exports.GEO_TAGS.FINANCIAL_CENTER,
    exports.GEO_TAGS.MANUFACTURING_HUB,
];
exports.ALLIANCE_BLOC_TAGS = [
    exports.GEO_TAGS.NATO,
    exports.GEO_TAGS.EU,
    exports.GEO_TAGS.EU_CANDIDATE,
    exports.GEO_TAGS.ASEAN,
    exports.GEO_TAGS.AFRICAN_UNION,
    exports.GEO_TAGS.CIS,
    exports.GEO_TAGS.SCO,
    exports.GEO_TAGS.QUAD,
    exports.GEO_TAGS.AUKUS,
    exports.GEO_TAGS.FIVE_EYES,
    exports.GEO_TAGS.CSTO,
];
exports.GEOGRAPHY_TAGS = [
    exports.GEO_TAGS.ISLAND_NATION,
    exports.GEO_TAGS.LANDLOCKED,
    exports.GEO_TAGS.COASTAL,
    exports.GEO_TAGS.ARCTIC_STATE,
    exports.GEO_TAGS.ARCHIPELAGO,
];
exports.STATUS_TAGS = [
    exports.GEO_TAGS.SANCTIONED,
    exports.GEO_TAGS.CONFLICT_ZONE,
    exports.GEO_TAGS.POST_CONFLICT,
    exports.GEO_TAGS.FAILED_STATE_RISK,
    exports.GEO_TAGS.RELIGIOUS_STATE,
    exports.GEO_TAGS.SECULAR_STATE,
];
//# sourceMappingURL=geopoliticalTags.js.map