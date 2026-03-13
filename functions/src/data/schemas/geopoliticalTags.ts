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

export const GEO_TAGS = {
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
} as const;

export type GeopoliticalTag = (typeof GEO_TAGS)[keyof typeof GEO_TAGS];

/**
 * Convenience grouped lists for prompt assembly and validation.
 */
export const POWER_TIER_TAGS: readonly GeopoliticalTag[] = [
  GEO_TAGS.SUPERPOWER,
  GEO_TAGS.GREAT_POWER,
  GEO_TAGS.REGIONAL_POWER,
  GEO_TAGS.MIDDLE_POWER,
  GEO_TAGS.SMALL_STATE,
];

export const CAPABILITY_TAGS: readonly GeopoliticalTag[] = [
  GEO_TAGS.NUCLEAR_STATE,
  GEO_TAGS.CYBER_POWER,
  GEO_TAGS.NAVAL_POWER,
  GEO_TAGS.SPACE_CAPABLE,
  GEO_TAGS.MAJOR_ARMS_EXPORTER,
];

export const ECONOMIC_TAGS: readonly GeopoliticalTag[] = [
  GEO_TAGS.G7,
  GEO_TAGS.G20,
  GEO_TAGS.BRICS,
  GEO_TAGS.OPEC,
  GEO_TAGS.OPEC_PLUS,
  GEO_TAGS.DEVELOPED_ECONOMY,
  GEO_TAGS.EMERGING_MARKET,
  GEO_TAGS.OIL_EXPORTER,
  GEO_TAGS.GAS_EXPORTER,
  GEO_TAGS.FINANCIAL_CENTER,
  GEO_TAGS.MANUFACTURING_HUB,
];

export const ALLIANCE_BLOC_TAGS: readonly GeopoliticalTag[] = [
  GEO_TAGS.NATO,
  GEO_TAGS.EU,
  GEO_TAGS.EU_CANDIDATE,
  GEO_TAGS.ASEAN,
  GEO_TAGS.AFRICAN_UNION,
  GEO_TAGS.CIS,
  GEO_TAGS.SCO,
  GEO_TAGS.QUAD,
  GEO_TAGS.AUKUS,
  GEO_TAGS.FIVE_EYES,
  GEO_TAGS.CSTO,
];

export const GEOGRAPHY_TAGS: readonly GeopoliticalTag[] = [
  GEO_TAGS.ISLAND_NATION,
  GEO_TAGS.LANDLOCKED,
  GEO_TAGS.COASTAL,
  GEO_TAGS.ARCTIC_STATE,
  GEO_TAGS.ARCHIPELAGO,
];

export const STATUS_TAGS: readonly GeopoliticalTag[] = [
  GEO_TAGS.SANCTIONED,
  GEO_TAGS.CONFLICT_ZONE,
  GEO_TAGS.POST_CONFLICT,
  GEO_TAGS.FAILED_STATE_RISK,
  GEO_TAGS.RELIGIOUS_STATE,
  GEO_TAGS.SECULAR_STATE,
];

