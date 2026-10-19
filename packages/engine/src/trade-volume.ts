import { US_GOODS_TRADE, type NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import { selectActiveConflicts, selectNation, selectRelationship } from "./state.js";
import { selectSector } from "./sectors.js";
import { TRADE_SECTORS, tradeSector, type TradeSectorDef, type TradeSectorId } from "./trade-sectors.js";
import type { TradeMeasure, TradeMeasureKind } from "./trade.js";
import { isTradeMeasureEffective } from "./order-authority.js";

// How much the United States buys from and sells to one partner, sector by
// sector, in dollars a year.
//
// The opening is what the two countries actually traded in goods, by sector,
// from the Census Bureau's end-use tables (`US_GOODS_TRADE`). From there the
// figure is simulated rather than recorded: it grows and shrinks with the two
// economies, as goods trade does, and every measure in force takes out the
// share of the flow its rate destroys, by the same demand response a tariff's
// incidence is priced with. An embargo ends it; a war between the two all but
// ends it.
//
// Only the founding nation's edges have a recorded opening. A campaign founded
// anywhere else falls back to the gravity shape the model used before: a few
// percent of the smaller economy, scaled by the relationship's recorded
// dependence and split by the partner's own sector mix.

/** Import demand response: a price rise destroys volume in proportion to how easily the buyer goes elsewhere. */
export const DEMAND_RESPONSE = 1.6;

/**
 * How hard a measure that is not a rate lands, on the scale a tariff rate is
 * read on. The retaliation model prices an answer off the rate of the thing
 * that provoked it, and the volume model cuts a flow by it; none of these has a
 * rate. An embargo is not a hundred percent of anything, it is the end of the
 * trade.
 */
export const COERCION_AS_RATE: Readonly<Record<Exclude<TradeMeasureKind, "tariff">, number>> = {
  sanctions: 0.3,
  "export-control": 0.4,
  "asset-restriction": 0.55,
  embargo: 1,
};

// What is left of trade between two countries at war with each other: some
// humanitarian and third-country flow, nothing like the peacetime book.
const AT_WAR = 0.05;

// The gravity fallback: goods trade runs a few percent of the smaller economy
// in a typical bilateral pair, scaled by the recorded dependence.
const BILATERAL_SHARE = 0.04;

/** The share of a flow a rate removes: the border price rise, times how readily buyers switch. */
export function volumeFall(def: TradeSectorDef, rate: number): number {
  const borderPriceRise = round3(rate * def.borderPassThrough);
  return round3(Math.min(0.95, borderPriceRise * DEMAND_RESPONSE * def.substitutability));
}

type Totals = { readonly imports: number; readonly exports: number };

function recordedTrade(campaign: Campaign, partner: NationId) {
  return (campaign.founding.nation as string) === "USA" ? US_GOODS_TRADE[partner as string] : undefined;
}

/** How far the two economies have carried the book since the opening: gravity scales trade with their product. */
function growthSinceOpening(campaign: Campaign, partner: NationId): number | undefined {
  const partnerNation = selectNation(campaign, partner);
  const homeNation = selectNation(campaign, campaign.founding.nation);
  if (!partnerNation || !homeNation) return undefined;
  return (
    (partnerNation.stats.economy.gdp / Math.max(1, partnerNation.base.stats.economy.gdp)) *
    (homeNation.stats.economy.gdp / Math.max(1, homeNation.base.stats.economy.gdp))
  );
}

/** Each sector's share of what a country sells abroad, from its own sector mix: the fallback's split. */
function sectorShares(campaign: Campaign, nation: NationId): ReadonlyMap<TradeSectorId, number> {
  const weights = TRADE_SECTORS.map((def) => [def.id, selectSector(campaign, nation, def.rollup)?.mix ?? 0] as const);
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  return new Map(weights.map(([id, weight]) => [id, total > 0 ? weight / total : 0]));
}

/** One sector's two directions before any measure: the recorded opening grown, or the gravity fallback. */
function sectorBase(campaign: Campaign, partner: NationId, sectorId: TradeSectorId): Totals | undefined {
  const growth = growthSinceOpening(campaign, partner);
  if (growth === undefined) return undefined;
  const recorded = recordedTrade(campaign, partner);
  if (recorded) {
    return { imports: (recorded.imports[sectorId] ?? 0) * growth, exports: (recorded.exports[sectorId] ?? 0) * growth };
  }
  const home = campaign.founding.nation;
  const dependence = selectRelationship(campaign, home, partner)?.tradeDependence ?? 0;
  if (dependence <= 0) return undefined;
  const partnerGdp = selectNation(campaign, partner)!.stats.economy.gdp;
  const homeGdp = selectNation(campaign, home)!.stats.economy.gdp;
  const scale = Math.min(partnerGdp, homeGdp) * BILATERAL_SHARE * dependence;
  return {
    imports: scale * (sectorShares(campaign, partner).get(sectorId) ?? 0),
    exports: scale * (sectorShares(campaign, home).get(sectorId) ?? 0),
  };
}

function atWar(campaign: Campaign, a: NationId, b: NationId): boolean {
  return selectActiveConflicts(campaign).some((conflict) => {
    const side = (id: NationId) =>
      conflict.aggressor === id || conflict.joined.aggressor.includes(id)
        ? "aggressor"
        : conflict.defender === id || conflict.joined.defender.includes(id)
          ? "defender"
          : undefined;
    const sa = side(a);
    const sb = side(b);
    return sa !== undefined && sb !== undefined && sa !== sb;
  });
}

/** What the measures in force leave of each direction of one sector's flow, as fractions. */
function measuresLeave(campaign: Campaign, partner: NationId, def: TradeSectorDef): Totals {
  let imports = 1;
  let exports = 1;
  const live = Object.values(campaign.trade.measures).filter(
    (measure: TradeMeasure) => measure.liftedTurn === undefined && measure.target === partner
      && isTradeMeasureEffective(campaign, measure.id),
  );
  for (const measure of live) {
    if (measure.kind === "embargo") {
      imports = 0;
      if (measure.direction !== "imports") exports = 0;
      continue;
    }
    if (measure.sector !== def.id) continue;
    // A partner's answer is a tariff on what we sell them.
    if (measure.origin === "retaliation") {
      exports *= 1 - volumeFall(def, measure.rate);
    } else if (measure.kind === "tariff") {
      imports *= 1 - volumeFall(def, measure.rate);
    } else if (measure.kind === "export-control") {
      exports *= 1 - volumeFall(def, COERCION_AS_RATE[measure.kind]);
    } else {
      imports *= 1 - volumeFall(def, COERCION_AS_RATE[measure.kind]);
    }
  }
  return { imports, exports };
}

/** One partner's flow in one sector, USD millions a year, before the reliance reading. */
export function sectorFlow(campaign: Campaign, partner: NationId, sectorId: TradeSectorId): Totals | undefined {
  const def = tradeSector(sectorId);
  if (!def || partner === campaign.founding.nation) return undefined;
  const base = sectorBase(campaign, partner, sectorId);
  if (!base || (base.imports <= 0 && base.exports <= 0)) return undefined;
  const left = measuresLeave(campaign, partner, def);
  const war = atWar(campaign, campaign.founding.nation, partner) ? AT_WAR : 1;
  return {
    imports: round2(base.imports * left.imports * war),
    exports: round2(base.exports * left.exports * war),
  };
}

/**
 * Everything the two countries trade in goods, USD millions a year: every
 * sector as the measures leave it, and the goods no trade sector covers (gold,
 * furniture, toys), which move with the economies and stop for an embargo or
 * a war but carry no sector's tariff.
 */
export function bilateralGoods(campaign: Campaign, partner: NationId): Totals {
  const sectors = TRADE_SECTORS.map((def) => sectorFlow(campaign, partner, def.id)).reduce<Totals>(
    (sum, flow) => ({ imports: sum.imports + (flow?.imports ?? 0), exports: sum.exports + (flow?.exports ?? 0) }),
    { imports: 0, exports: 0 },
  );
  const recorded = recordedTrade(campaign, partner);
  const growth = growthSinceOpening(campaign, partner) ?? 0;
  const embargoes = Object.values(campaign.trade.measures).filter(
    (measure: TradeMeasure) => measure.liftedTurn === undefined && measure.target === partner && measure.kind === "embargo",
  );
  const war = atWar(campaign, campaign.founding.nation, partner) ? AT_WAR : 1;
  const other = recorded ? growth * war : 0;
  const importOther = embargoes.length ? 0 : other;
  const exportOther = embargoes.some((measure) => measure.direction !== "imports") ? 0 : other;
  return {
    imports: round2(sectors.imports + (recorded?.imports.other ?? 0) * importOther),
    exports: round2(sectors.exports + (recorded?.exports.other ?? 0) * exportOther),
  };
}

// The sum across every partner of what the United States imports in each
// sector, kept per campaign object (never mutated), because reading how much
// the country relies on one supplier walks all of them.
const sectorImportsBySnapshot = new WeakMap<Campaign, Map<TradeSectorId, number>>();

/** What the United States imports of one sector from everyone, USD millions a year. */
export function sectorImports(campaign: Campaign, sectorId: TradeSectorId): number {
  let bySector = sectorImportsBySnapshot.get(campaign);
  if (!bySector) {
    bySector = new Map();
    sectorImportsBySnapshot.set(campaign, bySector);
  }
  const known = bySector.get(sectorId);
  if (known !== undefined) return known;
  const total = Object.keys(campaign.nations).reduce(
    (sum, nation) => sum + (sectorFlow(campaign, nation as NationId, sectorId)?.imports ?? 0),
    0,
  );
  bySector.set(sectorId, total);
  return total;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
