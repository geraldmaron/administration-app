import type { SectorId } from "@admin/world";

// The trade taxonomy: 28 strategic sectors, not HTS codes and not NAICS.
//
// The test for a slot is whether a US president in the modern record has had
// to make a *distinct* decision about it, with a distinct constituency, a
// distinct instrument and a distinct foreign counterpart. Two candidates that
// always move together on all four are one sector.
//
// Every entry rolls up into the dataset's existing closed `SectorId`, so this
// is a refinement of the twenty-three the world already models rather than a
// second sector system beside it. Anything that reads employment or mix keeps
// reading `SectorId`; only trade reads this.
//
// Calibration and sources: docs/research/TRADE-CALIBRATION.md. Every number in
// this file traces to a row of that document's calibration table, except the
// household shares at the foot, which cite the BLS table they were read from.

export type TradeSectorId = string;

/**
 * How a tariff on this sector behaves, which is the whole reason the taxonomy
 * exists at a finer grain than the dataset's own.
 */
export type TradeSectorDef = {
  readonly id: TradeSectorId;
  readonly name: string;
  /** The dataset sector this rolls into, so employment and mix stay one system. */
  readonly rollup: SectorId;
  /**
   * Share of a statutory rate that lands in the duty-inclusive border price.
   *
   * The literature is close to complete pass-through at the border for the
   * United States, and the deviations are real: commodities and undifferentiated
   * goods are where foreign exporters actually absorb part of a tariff, because
   * the US is a large enough buyer to move a world price. Differentiated
   * manufactures do not absorb. This ordering is specific to the United States
   * as the importer and must not be generalized to the other nations.
   */
  readonly borderPassThrough: number;
  /**
   * Share of the border price rise that reaches a US shelf price within a year.
   *
   * A completely different quantity from the border figure, and conflating the
   * two is the most common available modeling error. Retail margins, sourcing
   * shifts and untariffed complements absorb most of it in most sectors; the
   * exceptions are the sectors where a domestic substitute raises its own price
   * under the tariff umbrella.
   */
  readonly shelfPassThrough: number;
  /** How readily buyers move to another source. Higher means a tariff cuts volume rather than raising price. */
  readonly substitutability: number;
  /** How far a price move here travels into other sectors' input costs. */
  readonly inputIntensity: number;
  /** How likely this sector is to be picked as a retaliation target. */
  readonly retaliationSalience: number;
  /**
   * Whether a tariff is even the instrument. Some of these are licensed rather
   * than taxed, and the taxonomy carries them precisely so the game learns
   * which ones a tariff cannot touch.
   */
  readonly instrument: "tariff" | "export-control" | "licensing" | "sanctions";
  /** Which institution owns the authority, by catalog id. */
  readonly authority: string;
  readonly strategic: boolean;
};

// Border pass-through: 0.95 central, with commodity and undifferentiated goods
// lower because the US moves their world price, and steel lowest of all as the
// one sector where foreign exporters demonstrably cut their own price.
const DIFFERENTIATED = 0.96;
const COMMODITY = 0.82;
const STEEL = 0.75;

export const TRADE_SECTORS: readonly TradeSectorDef[] = [
  { id: "semiconductors", name: "Semiconductors", rollup: "semiconductors", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.12, substitutability: 0.2, inputIntensity: 0.7, retaliationSalience: 0.4, instrument: "tariff", authority: "INST-USTR", strategic: true },
  { id: "semiconductor-equipment", name: "Semiconductor equipment", rollup: "semiconductors", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.02, substitutability: 0.1, inputIntensity: 0.5, retaliationSalience: 0.3, instrument: "export-control", authority: "INST-BIS", strategic: true },
  { id: "consumer-electronics", name: "Consumer electronics", rollup: "telecom-cyber", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.35, substitutability: 0.45, inputIntensity: 0.1, retaliationSalience: 0.5, instrument: "tariff", authority: "INST-USTR", strategic: false },
  { id: "telecom-equipment", name: "Telecommunications equipment", rollup: "telecom-cyber", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.08, substitutability: 0.25, inputIntensity: 0.35, retaliationSalience: 0.3, instrument: "licensing", authority: "INST-BIS", strategic: true },
  { id: "autos-light-vehicles", name: "Light vehicles", rollup: "auto", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.4, substitutability: 0.35, inputIntensity: 0.15, retaliationSalience: 0.8, instrument: "tariff", authority: "INST-COMMERCE", strategic: true },
  { id: "auto-parts", name: "Auto parts", rollup: "auto", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.2, substitutability: 0.3, inputIntensity: 0.75, retaliationSalience: 0.45, instrument: "tariff", authority: "INST-COMMERCE", strategic: true },
  { id: "aerospace-civil", name: "Civil aerospace", rollup: "aerospace", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.05, substitutability: 0.1, inputIntensity: 0.2, retaliationSalience: 0.9, instrument: "tariff", authority: "INST-USTR", strategic: true },
  { id: "defense-articles", name: "Defense articles", rollup: "defense-industrial", borderPassThrough: 1, shelfPassThrough: 0, substitutability: 0.05, inputIntensity: 0.1, retaliationSalience: 0.2, instrument: "licensing", authority: "INST-STATE", strategic: true },
  { id: "shipbuilding-maritime", name: "Shipbuilding and maritime", rollup: "ports-shipping", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.06, substitutability: 0.15, inputIntensity: 0.5, retaliationSalience: 0.3, instrument: "tariff", authority: "INST-USTR", strategic: true },
  { id: "machine-tools", name: "Machine tools and robotics", rollup: "steel-heavy", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.07, substitutability: 0.3, inputIntensity: 0.8, retaliationSalience: 0.35, instrument: "tariff", authority: "INST-COMMERCE", strategic: true },
  { id: "steel", name: "Steel", rollup: "steel-heavy", borderPassThrough: STEEL, shelfPassThrough: 0.1, substitutability: 0.4, inputIntensity: 0.9, retaliationSalience: 0.6, instrument: "tariff", authority: "INST-COMMERCE", strategic: true },
  { id: "aluminum", name: "Aluminum", rollup: "steel-heavy", borderPassThrough: 0.8, shelfPassThrough: 0.1, substitutability: 0.45, inputIntensity: 0.85, retaliationSalience: 0.5, instrument: "tariff", authority: "INST-COMMERCE", strategic: true },
  { id: "critical-minerals", name: "Critical minerals", rollup: "mining", borderPassThrough: COMMODITY, shelfPassThrough: 0.04, substitutability: 0.1, inputIntensity: 0.85, retaliationSalience: 0.7, instrument: "export-control", authority: "INST-BIS", strategic: true },
  { id: "bulk-mining", name: "Bulk mining", rollup: "mining", borderPassThrough: COMMODITY, shelfPassThrough: 0.03, substitutability: 0.55, inputIntensity: 0.7, retaliationSalience: 0.2, instrument: "tariff", authority: "INST-COMMERCE", strategic: false },
  { id: "fertilizer", name: "Fertilizer", rollup: "chemicals", borderPassThrough: COMMODITY, shelfPassThrough: 0.25, substitutability: 0.35, inputIntensity: 0.6, retaliationSalience: 0.4, instrument: "tariff", authority: "INST-COMMERCE", strategic: true },
  { id: "agriculture-row-crops", name: "Row crops", rollup: "agriculture", borderPassThrough: COMMODITY, shelfPassThrough: 0.15, substitutability: 0.6, inputIntensity: 0.4, retaliationSalience: 1, instrument: "tariff", authority: "INST-USDA", strategic: false },
  { id: "agriculture-livestock", name: "Livestock and dairy", rollup: "agriculture", borderPassThrough: COMMODITY, shelfPassThrough: 0.3, substitutability: 0.5, inputIntensity: 0.2, retaliationSalience: 0.75, instrument: "tariff", authority: "INST-USDA", strategic: false },
  { id: "agriculture-specialty", name: "Specialty crops", rollup: "agriculture", borderPassThrough: COMMODITY, shelfPassThrough: 0.35, substitutability: 0.45, inputIntensity: 0.15, retaliationSalience: 0.85, instrument: "tariff", authority: "INST-USDA", strategic: false },
  { id: "food-processing", name: "Processed food and spirits", rollup: "food-processing", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.45, substitutability: 0.55, inputIntensity: 0.2, retaliationSalience: 0.95, instrument: "tariff", authority: "INST-USTR", strategic: false },
  { id: "energy-crude", name: "Crude oil", rollup: "energy-oil", borderPassThrough: COMMODITY, shelfPassThrough: 0.7, substitutability: 0.7, inputIntensity: 0.95, retaliationSalience: 0.3, instrument: "tariff", authority: "INST-DOE", strategic: true },
  { id: "energy-refined", name: "Refined products", rollup: "energy-oil", borderPassThrough: COMMODITY, shelfPassThrough: 0.85, substitutability: 0.5, inputIntensity: 0.9, retaliationSalience: 0.35, instrument: "tariff", authority: "INST-DOE", strategic: true },
  { id: "energy-gas-lng", name: "Natural gas and LNG", rollup: "energy-gas", borderPassThrough: COMMODITY, shelfPassThrough: 0.5, substitutability: 0.25, inputIntensity: 0.8, retaliationSalience: 0.4, instrument: "tariff", authority: "INST-DOE", strategic: true },
  { id: "chemicals", name: "Chemicals and plastics", rollup: "chemicals", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.15, substitutability: 0.4, inputIntensity: 0.95, retaliationSalience: 0.45, instrument: "tariff", authority: "INST-COMMERCE", strategic: false },
  { id: "pharmaceuticals-finished", name: "Finished pharmaceuticals", rollup: "pharma", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.25, substitutability: 0.2, inputIntensity: 0.1, retaliationSalience: 0.5, instrument: "tariff", authority: "INST-HHS", strategic: true },
  { id: "pharmaceutical-ingredients", name: "Active pharmaceutical ingredients", rollup: "pharma", borderPassThrough: COMMODITY, shelfPassThrough: 0.1, substitutability: 0.15, inputIntensity: 0.8, retaliationSalience: 0.3, instrument: "tariff", authority: "INST-FDA", strategic: true },
  { id: "medical-devices", name: "Medical devices", rollup: "healthcare", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.2, substitutability: 0.3, inputIntensity: 0.2, retaliationSalience: 0.3, instrument: "tariff", authority: "INST-FDA", strategic: true },
  { id: "textiles-apparel", name: "Textiles and apparel", rollup: "textiles", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.55, substitutability: 0.7, inputIntensity: 0.1, retaliationSalience: 0.4, instrument: "tariff", authority: "INST-USTR", strategic: false },
  { id: "batteries-solar", name: "Batteries and solar", rollup: "energy-renewables", borderPassThrough: DIFFERENTIATED, shelfPassThrough: 0.3, substitutability: 0.35, inputIntensity: 0.5, retaliationSalience: 0.45, instrument: "tariff", authority: "INST-USTR", strategic: true },
];

const BY_ID: ReadonlyMap<TradeSectorId, TradeSectorDef> = new Map(
  TRADE_SECTORS.map((sector) => [sector.id, sector]),
);

export const TRADE_SECTOR_IDS: readonly TradeSectorId[] = TRADE_SECTORS.map((sector) => sector.id);

export function tradeSector(id: TradeSectorId): TradeSectorDef | undefined {
  return BY_ID.get(id);
}

/** Every trade sector that rolls into one dataset sector. */
export function tradeSectorsFor(rollup: SectorId): readonly TradeSectorDef[] {
  return TRADE_SECTORS.filter((sector) => sector.rollup === rollup);
}

/**
 * Sectors a price move in `source` travels into, weighted by how much of an
 * input it is. Deliberately not a full input-output table: what the game needs
 * is that a steel tariff is felt by the people who buy steel, and an
 * input-intensity weight carries that without inventing a matrix nobody sourced.
 */
export function downstreamOf(source: TradeSectorId): readonly TradeSectorDef[] {
  const def = tradeSector(source);
  if (!def || def.inputIntensity < 0.5) return [];
  return TRADE_SECTORS.filter((sector) => sector.id !== source && sector.inputIntensity < def.inputIntensity);
}

/**
 * Each sector's weight in the household basket, as a fraction of all consumer
 * spending: the BLS relative importance of the CPI-U items the sector's goods
 * are sold to households as, December 2025, 2024 weights (Table 1,
 * https://www.bls.gov/cpi/tables/relative-importance/2025.htm, opened
 * 2026-09-28). The items summed for each row are named beside it.
 *
 * A sector absent here sells to firms and governments, not to households: its
 * goods reach a shelf only inside something else, as an input cost, and a
 * direct household weight for it would count that price twice.
 */
const HOUSEHOLD_SHARE: Readonly<Record<TradeSectorId, number>> = {
  // Televisions 0.107, other video equipment 0.017, audio equipment 0.046,
  // computers, peripherals and smart home assistants 0.293, telephone hardware
  // and other consumer information items 0.461, appliances 0.191.
  "consumer-electronics": 0.01115,
  // New vehicles 3.838.
  "autos-light-vehicles": 0.03838,
  // Motor vehicle parts and equipment 0.349.
  "auto-parts": 0.00349,
  // Meats 1.186, poultry 0.363, dairy and related products 0.758.
  "agriculture-livestock": 0.02307,
  // Fresh fruits and vegetables 1.008, wine at home 0.172.
  "agriculture-specialty": 0.0118,
  // Cereals and bakery products 1.035, other food at home 2.273, nonalcoholic
  // beverages and beverage materials 0.995, processed fruits and vegetables
  // 0.262, beer at home 0.135, distilled spirits at home 0.090.
  "food-processing": 0.0479,
  // Motor fuel 2.981, fuel oil and other fuels 0.140: a barrel reaches a
  // household as the pump and the heating-oil price, crude or refined.
  "energy-crude": 0.03121,
  "energy-refined": 0.03121,
  // Utility (piped) gas service 0.773.
  "energy-gas-lng": 0.00773,
  // Medicinal drugs 1.354.
  "pharmaceuticals-finished": 0.01354,
  // Medical equipment and supplies 0.135.
  "medical-devices": 0.00135,
  // Men's and boys' apparel 0.588, women's and girls' apparel 0.928, footwear
  // 0.585, infants' and toddlers' apparel 0.103.
  "textiles-apparel": 0.02204,
};

/** The sector's share of household spending, 0 where households do not buy it directly. */
export function householdShare(id: TradeSectorId): number {
  return HOUSEHOLD_SHARE[id] ?? 0;
}
