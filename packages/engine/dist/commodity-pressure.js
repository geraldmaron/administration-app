import { blockadeCutOn } from "./blockades.js";
import { laggedIndex, marketQuote } from "./commodities.js";
import { commoditiesIn, COMMODITY_DEFS, supplierShare } from "./commodity-registry.js";
import { cargoDependence, chokepointDependence, contestedRoutes, originDependence, warLossFraction } from "./commodity-shocks.js";
import { COERCION_BITE, newlyStoppedShare, worldExportShare } from "./external-pressure.js";
import { CPI_WEIGHTS, GROCERY_GRAINS, GROCERY_LAG, HOME_ENERGY_LAG, PUMP_LAG, groceryIndex, homeEnergyIndex, pumpPrice, } from "./household-prices.js";
import { selectActiveConflicts, selectNation } from "./state.js";
const NONE = { growth: 0, inflation: 0 };
/** Planning values: abroad, the share of the price level in motor fuel, and crude's share of what fuel costs at retail. */
const ABROAD_FUEL_WEIGHT = 0.03;
const ABROAD_CRUDE_IN_FUEL = 0.5;
/** Planning values: abroad, the share of the price level in food at home, by wealth tier; poorer households spend more of it on food. */
const ABROAD_FOOD_WEIGHT = { 1: 0.35, 2: 0.25, 3: 0.18, 4: 0.12, 5: 0.08 };
/** Planning values: abroad, how much of a grain price reaches the shelf, by wealth tier; less is processed where incomes are lower. */
const ABROAD_FARM_PASS = { 1: 0.5, 2: 0.4, 3: 0.3, 4: 0.2, 5: 0.07 };
/** Planning value: abroad, the heating and power bill's share of the price level, and the part of it gas moves. */
const ABROAD_HOME_ENERGY = { weight: 0.03, gasShare: 0.6 };
/** Planning values: growth per unit of an energy price change, for a full importer and a full exporter. */
export const ENERGY_TRADE = { importBill: 0.02, exportRent: 0.06 };
/** Planning values: growth per unit of a grain price change: an exporter gains by its share of world exports, an importer pays by tier. */
const FOOD_TRADE = { exportGain: 0.05, importBill: { 1: 0.01, 2: 0.008, 3: 0.005, 4: 0.003, 5: 0.002 } };
/** Planning values: metals and minerals, a supplier's gain by its share and a user's input cost. */
const INPUT_TRADE = { supplierGain: 0.02, userCost: 0.003 };
/** A market's lagged index against where buyers expect it, as a fraction: 0.2 is a fifth above normal. */
function feltChange(campaign, id, lag) {
    const norm = marketQuote(campaign, id).norm;
    return laggedIndex(campaign, id, lag.from, lag.to) / norm - 1;
}
function meanChange(campaign, ids, lag) {
    return ids.length === 0 ? 0 : ids.reduce((sum, id) => sum + feltChange(campaign, id, lag), 0) / ids.length;
}
function meanNorm(campaign, ids) {
    return ids.reduce((sum, id) => sum + marketQuote(campaign, id).norm, 0) / ids.length;
}
function meanLagged(campaign, ids, lag) {
    return ids.reduce((sum, id) => sum + laggedIndex(campaign, id, lag.from, lag.to), 0) / ids.length;
}
const GAS = ["natural-gas", "lng"];
/** The United States' households, on the published CPI weights: the pump, the grocery shelf and the heating and power bills. */
function usInflation(campaign) {
    const crudeNorm = marketQuote(campaign, "crude").norm;
    const pump = pumpPrice(laggedIndex(campaign, "crude", PUMP_LAG.from, PUMP_LAG.to)) / pumpPrice(crudeNorm) - 1;
    const grocery = groceryIndex(meanLagged(campaign, GROCERY_GRAINS, GROCERY_LAG)) / groceryIndex(meanNorm(campaign, GROCERY_GRAINS)) - 1;
    const home = homeEnergyIndex(meanLagged(campaign, GAS, HOME_ENERGY_LAG)) / homeEnergyIndex(meanNorm(campaign, GAS)) - 1;
    return CPI_WEIGHTS.gasoline * pump + CPI_WEIGHTS.foodAtHome * grocery + (CPI_WEIGHTS.pipedGas + CPI_WEIGHTS.electricity) * home;
}
function abroadInflation(campaign, runtime) {
    const tier = runtime.base.bands.wealthTier;
    const fuel = ABROAD_FUEL_WEIGHT * ABROAD_CRUDE_IN_FUEL * feltChange(campaign, "crude", PUMP_LAG);
    const food = (ABROAD_FOOD_WEIGHT[tier] ?? 0.18) * (ABROAD_FARM_PASS[tier] ?? 0.3) * meanChange(campaign, GROCERY_GRAINS, GROCERY_LAG);
    const home = ABROAD_HOME_ENERGY.weight * ABROAD_HOME_ENERGY.gasShare * meanChange(campaign, GAS, HOME_ENERGY_LAG);
    return fuel + food + home;
}
/** Planning value: growth lost per unit of an economy's energy supply that does not arrive, beyond the price it pays for the rest. */
export const SHORTFALL_COST = 0.1;
/** The two fuels an energy balance carries, each with the market that prices it and the one whose straits carry its cargo. */
const FUELS = [
    { sector: "energy-oil", price: ["crude"], cargo: "crude" },
    { sector: "energy-gas", price: GAS, cargo: "lng" },
];
/**
 * The share of one exporter's sales of a fuel the national books already
 * charge elsewhere this week: its wars' lost output, a blockade on station
 * and the share of its sales the measures have stopped since its baseline vintage (`external-pressure.ts#newlyStoppedShare`).
 */
function billedLoss(campaign, nation, sector, good) {
    const sanctioned = Math.max(0, newlyStoppedShare(campaign, nation, sector, good));
    const kept = (1 - warLossFraction(nation, selectActiveConflicts(campaign))) * (1 - Math.min(1, blockadeCutOn(campaign, nation))) * (1 - sanctioned);
    return 1 - Math.max(0, kept);
}
/**
 * The share of one exporter's sales of a fuel stranded behind a contested
 * strait this week: the share of what it sells abroad that loads there (the
 * origin table over EIA's figures, or its authored dependence on the strait
 * where the source names no origin), the part no pipeline
 * carries, what the war closes and the share of the strait's cargo bound for
 * flags the closing governments stop. A government closing the strait is
 * not stranded by its own closure, and what the books already charge is not
 * stranded again.
 */
function strandedShare(campaign, nation, cargo, billed) {
    const stranded = contestedRoutes(campaign, cargo)
        .filter((contested) => !contested.passage.deniers.includes(nation))
        .reduce((sum, { route, passage, closure }) => {
        const loads = originDependence(nation, route.chokepoint, cargo) ?? chokepointDependence(campaign, nation, route.chokepoint);
        return sum + loads * (1 - route.bypass) * closure * passage.stoppedShare;
    }, 0);
    return Math.min(1, stranded) * (1 - billed);
}
/**
 * The share of one importer's supply of a fuel that does not arrive: for each
 * contested strait whose closing governments stop its flag, the share of its
 * consumption the strait's cargo bound for it carries (the cargo table over
 * EIA's consumption, or its authored dependence where the source names no
 * cargo or no consumption), net of the pipelines and of what the producers behind it had
 * already lost. A flag let through gets its cargo and pays only the price.
 */
function shortfallShare(campaign, nation, cargo) {
    const short = contestedRoutes(campaign, cargo)
        .filter((contested) => !contested.passage.passing.includes(nation) && !contested.passage.deniers.includes(nation))
        .reduce((sum, { route, closure, upstreamLost }) => {
        const bound = cargoDependence(nation, route.chokepoint, cargo) ?? chokepointDependence(campaign, nation, route.chokepoint);
        return sum + bound * (1 - route.bypass) * closure * (1 - upstreamLost);
    }, 0);
    return Math.min(1, short);
}
function fuelChange(campaign, price) {
    return price.length === 1 ? feltChange(campaign, price[0], PUMP_LAG) : meanChange(campaign, price, HOME_ENERGY_LAG);
}
/**
 * Energy's terms of trade and its flows, on the founding energy balance (EIA's
 * production and consumption, as the dataset carries them). A net importer
 * pays in proportion to how much it buys in, and goes short where its cargo is
 * stopped. A net exporter's receipts are what it delivers times the price: it
 * gains on the price only for what it still sells, and loses what a strait
 * strands at the price it would have fetched, at the growth cost every lost
 * sale carries (`COERCION_BITE`).
 */
function energyGrowth(campaign, nation, runtime) {
    const { production, consumption, mix } = runtime.base.stats.energy;
    if (consumption >= production) {
        const imported = consumption > 0 ? (consumption - production) / consumption : 0;
        return FUELS.reduce((sum, fuel) => {
            const share = mix[fuel.sector] ?? 0;
            return sum - ENERGY_TRADE.importBill * imported * share * fuelChange(campaign, fuel.price) - SHORTFALL_COST * share * shortfallShare(campaign, nation, fuel.cargo);
        }, 0);
    }
    const exported = production > 0 ? (production - consumption) / production : 0;
    return FUELS.reduce((sum, fuel) => {
        const billed = billedLoss(campaign, nation, fuel.sector);
        const stranded = strandedShare(campaign, nation, fuel.cargo, billed);
        const rent = ENERGY_TRADE.exportRent * exported * (mix[fuel.sector] ?? 0) * fuelChange(campaign, fuel.price) * (1 - billed - stranded);
        return sum + rent - COERCION_BITE * worldExportShare(campaign, nation, fuel.sector) * stranded;
    }, 0);
}
/** A supplier gains on the price only for what it still delivers; what the books already charge as lost earns it nothing. */
function familyGrowth(campaign, nation, tier, family) {
    const ids = commoditiesIn(family);
    return ids.reduce((sum, id) => {
        const change = feltChange(campaign, id, GROCERY_LAG);
        const share = supplierShare(id, nation);
        const delivered = share > 0 ? 1 - billedLoss(campaign, nation, COMMODITY_DEFS[id].sector, COMMODITY_DEFS[id].good) : 1;
        if (family === "grains")
            return sum + (share > 0 ? FOOD_TRADE.exportGain * share * delivered : -(FOOD_TRADE.importBill[tier] ?? 0.005) / ids.length) * change;
        return sum + (share > 0 ? INPUT_TRADE.supplierGain * share * delivered : -INPUT_TRADE.userCost / ids.length) * change;
    }, 0);
}
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000 + 0;
/** What the world's commodity prices are doing to one economy's targets this week. */
export function commodityMacroPressure(campaign, nation) {
    if (!campaign.markets)
        return NONE;
    const runtime = selectNation(campaign, nation);
    if (!runtime)
        return NONE;
    const tier = runtime.base.bands.wealthTier;
    const inflation = nation === campaign.founding.nation ? usInflation(campaign) : abroadInflation(campaign, runtime);
    const growth = energyGrowth(campaign, nation, runtime) +
        familyGrowth(campaign, nation, tier, "grains") +
        familyGrowth(campaign, nation, tier, "metals") +
        familyGrowth(campaign, nation, tier, "minerals");
    return { growth: round6(growth), inflation: round6(inflation) };
}
