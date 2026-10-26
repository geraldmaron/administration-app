import { US_GOODS_TRADE, type NationId } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
import { selectActiveConflicts, selectNation, selectRelationship } from "./state.js";
import { selectSector } from "./sectors.js";
import { TRADE_SECTORS, tradeSector, type TradeSectorDef, type TradeSectorId } from "./trade-sectors.js";
import type { TradeMeasure, TradeMeasureKind } from "./trade.js";
import { isTradeMeasureEffective } from "./order-authority.js";
import { compareDates, daysBetween } from "./clock.js";
import { retained } from "./relationships.js";
import { worldExportShare } from "./external-pressure.js";

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

/**
 * Export demand response: how sharply a foreign buyer turns away from American
 * goods a tariff of its own makes dearer, when the same goods sell at the world
 * price from other origins. Fitted, not a measured elasticity: USDA ERS (Amber
 * Waves, 2022-03-07, opened 2026-10-25) reports that China's retaliatory
 * tariffs, 5 to 25 percent, reduced the value of US agricultural exports to
 * China by 76 percent from mid-2018 through 2019; a 25 percent answer on row
 * crops falls by about that at this figure.
 */
export const RETALIATION_RESPONSE = 6.2;

/**
 * The half-life, in days, of a tariffed partner's lost sales turning toward
 * other suppliers. Fitted, not measured: Census goods trade (opened
 * 2026-10-25) has US imports from China falling $89.4 billion from 2018 to
 * 2019 while all US imports fell $44.4 billion, so about half the lost Chinese
 * flow was bought elsewhere within the year. With buyers replacing at most a
 * sector's `substitutability`, 91 days brings the replaced share over the
 * year after a tariff near that half. The record is all goods and mixes the
 * tariffs with 2019's other causes, so the fit is a planning value.
 */
export const DIVERSION_HALF_LIFE_DAYS = 91;

/** The share of an American export flow a partner's answering tariff removes. */
export function retaliationFall(def: TradeSectorDef, rate: number): number {
  const borderPriceRise = round3(rate * def.borderPassThrough);
  return round3(Math.min(0.95, borderPriceRise * RETALIATION_RESPONSE * def.substitutability));
}

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

/**
 * What the partner's standing answers leave of American sales in one sector:
 * each retaliatory tariff takes its fall of what the others left, as rates on
 * the same goods compound. The one figure both this book and the economy's
 * export loss (`external-pressure.ts`) read.
 */
export function retaliationLeft(campaign: Campaign, partner: NationId, def: TradeSectorDef): number {
  return Object.values(campaign.trade.measures)
    .filter((measure) => measure.origin === "retaliation" && measure.liftedTurn === undefined && measure.target === partner && measure.sector === def.id)
    .reduce((left, measure) => left * (1 - retaliationFall(def, measure.rate)), 1);
}

/**
 * What the measures in force leave of each direction of one sector's flow, as
 * fractions. Tariffs are rates and compound; restrictions are prohibitions on
 * the same goods, so the heaviest stands for all of them and repeating one
 * cuts nothing more. A list-based program or a blocked account names holders,
 * not goods, and leaves the flow alone.
 */
function measuresLeave(campaign: Campaign, partner: NationId, def: TradeSectorDef): Totals {
  const live = Object.values(campaign.trade.measures).filter(
    (measure: TradeMeasure) => measure.liftedTurn === undefined && measure.target === partner && measure.origin === "us" && measure.scope !== "listed"
      && isTradeMeasureEffective(campaign, measure.id),
  );
  const here = live.filter((measure) => measure.sector === def.id);
  const tariffs = here.filter((measure) => measure.kind === "tariff").reduce((left, measure) => left * (1 - volumeFall(def, measure.rate)), 1);
  const heaviest = (kinds: readonly TradeMeasureKind[]) =>
    Math.max(0, ...here.filter((measure) => kinds.includes(measure.kind)).map((measure) => volumeFall(def, COERCION_AS_RATE[measure.kind as Exclude<TradeMeasureKind, "tariff">])));
  const embargoed = live.filter((measure) => measure.kind === "embargo");
  return {
    imports: embargoed.length > 0 ? 0 : tariffs * (1 - heaviest(["sanctions", "asset-restriction"])),
    exports: embargoed.some((measure) => measure.direction !== "imports") ? 0 : retaliationLeft(campaign, partner, def) * (1 - heaviest(["export-control"])),
  };
}

/**
 * The trade sector a government's leading export to the world falls in: the
 * first of its listed exports (`trade.topExports`, ranked by value) that a
 * trade sector covers, and within it the one it sells the United States most,
 * the taxonomy's own order breaking a tie.
 */
export function leadingExportOf(topExports: readonly string[], soldToUs: Readonly<Record<string, number>>): TradeSectorId | undefined {
  return exportGoodsOf(topExports, soldToUs)[0];
}

/** Every trade sector a government's listed exports fall in, leading first, as `leadingExportOf` orders them. */
export function exportGoodsOf(topExports: readonly string[], soldToUs: Readonly<Record<string, number>>): readonly TradeSectorId[] {
  return topExports.flatMap((sector) => TRADE_SECTORS.filter((def) => def.rollup === sector).sort((a, b) => (soldToUs[b.id] ?? 0) - (soldToUs[a.id] ?? 0)).map((def) => def.id));
}

export function leadingExportSector(campaign: Campaign, nation: NationId): TradeSectorId | undefined {
  return leadingExportOf(selectNation(campaign, nation)?.base.stats.trade.topExports ?? [], US_GOODS_TRADE[nation as string]?.imports ?? {});
}

/** The partners whose American sales in one sector a measure now cuts, each with those measures, earliest first. */
function cutSuppliers(campaign: Campaign, def: TradeSectorDef): ReadonlyMap<NationId, readonly TradeMeasure[]> {
  const cut = new Map<NationId, TradeMeasure[]>();
  for (const measure of Object.values(campaign.trade.measures)) {
    const cuts = measure.origin === "us" && measure.liftedTurn === undefined && measure.scope !== "listed" && measure.kind !== "export-control"
      && (measure.sector === def.id || measure.kind === "embargo") && isTradeMeasureEffective(campaign, measure.id);
    if (cuts) cut.set(measure.target, [...(cut.get(measure.target) ?? []), measure]);
  }
  for (const measures of cut.values()) measures.sort((a, b) => compareDates(a.imposedDate, b.imposedDate) || a.id.localeCompare(b.id));
  return cut;
}

/**
 * The share of one supplier's sales a sector's measures cut, increment by
 * increment: what the measures in force by each one's date take, less what the
 * earlier ones already took, each dated by the measure that added it. Buyers
 * start turning to other suppliers when a cut is made, so an old small
 * restriction cannot age a large new one.
 */
function lostIncrements(campaign: Campaign, supplier: NationId, def: TradeSectorDef, measures: readonly TradeMeasure[]): readonly { readonly since: GameDate; readonly share: number }[] {
  let before = 0;
  return measures.flatMap((measure, index) => {
    const upTo = measures.slice(0, index + 1);
    const later = measures[index + 1];
    if (later && compareDates(later.imposedDate, measure.imposedDate) === 0) return [];
    const others = Object.fromEntries(Object.entries(campaign.trade.measures).filter(([, m]) => m.target !== supplier || upTo.includes(m)));
    const lost = 1 - measuresLeave({ ...campaign, trade: { ...campaign.trade, measures: others } }, supplier, def).imports;
    const share = Math.max(0, lost - before);
    before = Math.max(before, lost);
    return share > 0 ? [{ since: measure.imposedDate, share }] : [];
  });
}

/**
 * The imports one untouched supplier gains in a sector from buyers turning
 * away from the partners a measure cuts: each cut partner's lost sales, the
 * share buyers can replace (`substitutability`), each increment built up since
 * the measure that cut it took hold, shared among the untouched suppliers by what each sold the United
 * States, and never more than the supplier exports of those goods to the world
 * beyond what it already sells here.
 */
function divertedTo(campaign: Campaign, partner: NationId, def: TradeSectorDef): number {
  const { cut, pool, eligible } = diversionPool(campaign, def);
  const weight = recordedTrade(campaign, partner)?.imports[def.id] ?? 0;
  if (pool <= 0 || cut.has(partner) || weight <= 0 || eligible <= 0) return 0;
  return Math.min(pool * (weight / eligible), supplierHeadroom(campaign, partner, def));
}

type DiversionPool = { readonly cut: ReadonlyMap<NationId, readonly TradeMeasure[]>; readonly pool: number; readonly eligible: number };

const poolsBySnapshot = new WeakMap<Campaign, Map<TradeSectorId, DiversionPool>>();

/** One sector's diverted pool this week, and the recorded sales of the suppliers it can go to: read once per campaign state. */
function diversionPool(campaign: Campaign, def: TradeSectorDef): DiversionPool {
  let bySector = poolsBySnapshot.get(campaign);
  if (!bySector) {
    bySector = new Map();
    poolsBySnapshot.set(campaign, bySector);
  }
  const known = bySector.get(def.id);
  if (known) return known;
  const cut = cutSuppliers(campaign, def);
  const recorded = (id: string) => recordedTrade(campaign, id as NationId)?.imports[def.id] ?? 0;
  const eligible = cut.size === 0 ? 0 : Object.keys(US_GOODS_TRADE).filter((id) => !cut.has(id as NationId)).reduce((sum, id) => sum + recorded(id), 0);
  const pool = [...cut].reduce((sum, [supplier, measures]) => {
    const base = sectorBase(campaign, supplier, def.id);
    if (!base) return sum;
    const built = lostIncrements(campaign, supplier, def, measures)
      .reduce((total, { since, share }) => total + share * (1 - retained(daysBetween(since, campaign.calendar), DIVERSION_HALF_LIFE_DAYS)), 0);
    return sum + base.imports * def.substitutability * built;
  }, 0);
  const result = { cut, pool, eligible };
  bySector.set(def.id, result);
  return result;
}

/**
 * What a supplier exports of a sector's goods to the world beyond what it
 * already sells the United States, USD millions a year, from the founding
 * figures: its listed exports in the sector where the dataset lists them, and
 * otherwise its sales to everyone else split the way its sales here are.
 */
function supplierHeadroom(campaign: Campaign, partner: NationId, def: TradeSectorDef): number {
  const base = selectNation(campaign, partner)?.base.stats;
  const recorded = recordedTrade(campaign, partner)?.imports ?? {};
  if (!base) return 0;
  const here = (filter: (id: string) => boolean) => Object.entries(recorded).reduce((sum, [id, value]) => (filter(id) ? sum + value : sum), 0);
  const inSector = here((id) => tradeSector(id)?.rollup === def.rollup);
  const listed = worldExportShare(campaign, partner, def.rollup) * base.economy.gdp;
  if (listed > 0) return Math.max(0, listed - inSector);
  const total = here(() => true);
  return total > 0 ? Math.max(0, base.trade.exports - total) * ((recorded[def.id] ?? 0) / total) : 0;
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
    imports: round2((base.imports * left.imports + divertedTo(campaign, partner, def)) * war),
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
