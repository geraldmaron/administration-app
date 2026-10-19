import type { NationId } from "@admin/world";
import { laggedIndex, marketQuote, type CommodityId } from "./commodities.js";
import { commoditiesIn, supplierShare, type CommodityFamily } from "./commodity-registry.js";
import {
  CPI_WEIGHTS,
  GROCERY_GRAINS,
  GROCERY_LAG,
  HOME_ENERGY_LAG,
  PUMP_LAG,
  groceryIndex,
  homeEnergyIndex,
  pumpPrice,
} from "./household-prices.js";
import { selectNation, type Campaign, type NationRuntime } from "./state.js";

// What the world's prices do to one economy: a shift in where its inflation
// and growth are headed, never a write to either. Importers pay and exporters
// gain; a household pays the pump whatever its country exports.
//
// This is the only path by which a commodity price reaches an economy. A war
// among producers reaches the United States' prices here, through crude and
// grain, and not through the war term in `external-pressure.ts`, which charges
// only the belligerents' own-ground and war-finance costs: one path per shock.
//
// Every price change is measured against where buyers have come to expect the
// price (the market's slow norm), so a price that rises and stays up is felt as
// inflation for about a year and then as the new normal, which is what a level
// shift in prices is.

export type CommodityMacroPressure = { readonly growth: number; readonly inflation: number };

const NONE: CommodityMacroPressure = { growth: 0, inflation: 0 };

/** Planning values: abroad, the share of the price level in motor fuel, and crude's share of what fuel costs at retail. */
const ABROAD_FUEL_WEIGHT = 0.03;
const ABROAD_CRUDE_IN_FUEL = 0.5;

/** Planning values: abroad, the share of the price level in food at home, by wealth tier; poorer households spend more of it on food. */
const ABROAD_FOOD_WEIGHT: Readonly<Record<number, number>> = { 1: 0.35, 2: 0.25, 3: 0.18, 4: 0.12, 5: 0.08 };

/** Planning values: abroad, how much of a grain price reaches the shelf, by wealth tier; less is processed where incomes are lower. */
const ABROAD_FARM_PASS: Readonly<Record<number, number>> = { 1: 0.5, 2: 0.4, 3: 0.3, 4: 0.2, 5: 0.07 };

/** Planning value: abroad, the heating and power bill's share of the price level, and the part of it gas moves. */
const ABROAD_HOME_ENERGY = { weight: 0.03, gasShare: 0.6 } as const;

/** Planning values: growth per unit of an energy price change, for a full importer and a full exporter. */
export const ENERGY_TRADE = { importBill: 0.02, exportRent: 0.06 } as const;

/** Planning values: growth per unit of a grain price change: an exporter gains by its share of world exports, an importer pays by tier. */
const FOOD_TRADE = { exportGain: 0.05, importBill: { 1: 0.01, 2: 0.008, 3: 0.005, 4: 0.003, 5: 0.002 } as Readonly<Record<number, number>> } as const;

/** Planning values: metals and minerals, a supplier's gain by its share and a user's input cost. */
const INPUT_TRADE = { supplierGain: 0.02, userCost: 0.003 } as const;

/** A market's lagged index against where buyers expect it, as a fraction: 0.2 is a fifth above normal. */
function feltChange(campaign: Campaign, id: CommodityId, lag: { readonly from: number; readonly to: number }): number {
  const norm = marketQuote(campaign, id).norm;
  return laggedIndex(campaign, id, lag.from, lag.to) / norm - 1;
}

function meanChange(campaign: Campaign, ids: readonly CommodityId[], lag: { readonly from: number; readonly to: number }): number {
  return ids.length === 0 ? 0 : ids.reduce((sum, id) => sum + feltChange(campaign, id, lag), 0) / ids.length;
}

function meanNorm(campaign: Campaign, ids: readonly CommodityId[]): number {
  return ids.reduce((sum, id) => sum + marketQuote(campaign, id).norm, 0) / ids.length;
}

function meanLagged(campaign: Campaign, ids: readonly CommodityId[], lag: { readonly from: number; readonly to: number }): number {
  return ids.reduce((sum, id) => sum + laggedIndex(campaign, id, lag.from, lag.to), 0) / ids.length;
}

const GAS: readonly CommodityId[] = ["natural-gas", "lng"];

/** The United States' households, on the published CPI weights: the pump, the grocery shelf and the heating and power bills. */
function usInflation(campaign: Campaign): number {
  const crudeNorm = marketQuote(campaign, "crude").norm;
  const pump = pumpPrice(laggedIndex(campaign, "crude", PUMP_LAG.from, PUMP_LAG.to)) / pumpPrice(crudeNorm) - 1;
  const grocery = groceryIndex(meanLagged(campaign, GROCERY_GRAINS, GROCERY_LAG)) / groceryIndex(meanNorm(campaign, GROCERY_GRAINS)) - 1;
  const home = homeEnergyIndex(meanLagged(campaign, GAS, HOME_ENERGY_LAG)) / homeEnergyIndex(meanNorm(campaign, GAS)) - 1;
  return CPI_WEIGHTS.gasoline * pump + CPI_WEIGHTS.foodAtHome * grocery + (CPI_WEIGHTS.pipedGas + CPI_WEIGHTS.electricity) * home;
}

function abroadInflation(campaign: Campaign, runtime: NationRuntime): number {
  const tier = runtime.base.bands.wealthTier;
  const fuel = ABROAD_FUEL_WEIGHT * ABROAD_CRUDE_IN_FUEL * feltChange(campaign, "crude", PUMP_LAG);
  const food = (ABROAD_FOOD_WEIGHT[tier] ?? 0.18) * (ABROAD_FARM_PASS[tier] ?? 0.3) * meanChange(campaign, GROCERY_GRAINS, GROCERY_LAG);
  const home = ABROAD_HOME_ENERGY.weight * ABROAD_HOME_ENERGY.gasShare * meanChange(campaign, GAS, HOME_ENERGY_LAG);
  return fuel + food + home;
}

/**
 * Energy's terms of trade, on the founding energy balance (EIA's production
 * and consumption, as the dataset carries them): a net importer pays in
 * proportion to how much it buys in, a net exporter gains in proportion to how
 * much of its output it sells.
 */
function energyGrowth(campaign: Campaign, runtime: NationRuntime): number {
  const { production, consumption, mix } = runtime.base.stats.energy;
  const change = feltChange(campaign, "crude", PUMP_LAG) * (mix["energy-oil"] ?? 0) + meanChange(campaign, GAS, HOME_ENERGY_LAG) * (mix["energy-gas"] ?? 0);
  if (consumption >= production) {
    const imported = consumption > 0 ? (consumption - production) / consumption : 0;
    return -ENERGY_TRADE.importBill * imported * change;
  }
  const exported = production > 0 ? (production - consumption) / production : 0;
  return ENERGY_TRADE.exportRent * exported * change;
}

function familyGrowth(campaign: Campaign, nation: NationId, tier: number, family: CommodityFamily): number {
  const ids = commoditiesIn(family);
  return ids.reduce((sum, id) => {
    const change = feltChange(campaign, id, GROCERY_LAG);
    const share = supplierShare(id, nation);
    if (family === "grains") return sum + (share > 0 ? FOOD_TRADE.exportGain * share : -(FOOD_TRADE.importBill[tier] ?? 0.005) / ids.length) * change;
    return sum + (share > 0 ? INPUT_TRADE.supplierGain * share : -INPUT_TRADE.userCost / ids.length) * change;
  }, 0);
}

const round6 = (value: number) => Math.round(value * 1_000_000) / 1_000_000 + 0;

/** What the world's commodity prices are doing to one economy's targets this week. */
export function commodityMacroPressure(campaign: Campaign, nation: NationId): CommodityMacroPressure {
  if (!campaign.markets) return NONE;
  const runtime = selectNation(campaign, nation);
  if (!runtime) return NONE;
  const tier = runtime.base.bands.wealthTier;
  const inflation = nation === campaign.founding.nation ? usInflation(campaign) : abroadInflation(campaign, runtime);
  const growth =
    energyGrowth(campaign, runtime) +
    familyGrowth(campaign, nation, tier, "grains") +
    familyGrowth(campaign, nation, tier, "metals") +
    familyGrowth(campaign, nation, tier, "minerals");
  return { growth: round6(growth), inflation: round6(inflation) };
}
