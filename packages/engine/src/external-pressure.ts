import { US_GOODS_TRADE, type NationId } from "@admin/world";
import { blockadeCutOn } from "./blockades.js";
import { NO_CYCLE } from "./business-cycle.js";
import { restingProgram } from "./governance.js";
import { macroBaseline } from "./macro-baseline.js";
import { projectTariffPrices } from "./tariff-prices.js";
import { shockPressure } from "./external-shocks.js";
import { commodityMacroPressure, type CommodityMacroPressure } from "./commodity-pressure.js";
import type { CoerciveMeasureKind, TradeMeasure } from "./trade.js";
import { COERCION_AS_RATE } from "./trade-volume.js";
import { selectActiveConflicts, selectNation, type Campaign, type Conflict } from "./state.js";

// What the rest of the world does to one economy: the wars it fights, the
// measures taken against it or by it, and its partners' own years. A target
// shift on the rates, never a level written onto them: the drift phase moves
// where growth and prices are headed, and the gap correction turns a shift
// held for a year into a lost level of output rather than a rate that falls
// forever. When the war ends or the measure is lifted the shift is gone that
// week, and the economy climbs back on its own.

/** Annual shifts as fractions: growth and inflation targets, and outlays as a share of output. */
export type ExternalMacroPressure = {
  readonly growth: number;
  readonly inflation: number;
  readonly outlays: number;
  /** The part of `growth` and `inflation` the world's commodity prices set, already inside both totals. */
  readonly commodities?: CommodityMacroPressure;
};

const NO_PRESSURE: ExternalMacroPressure = { growth: 0, inflation: 0, outlays: 0 };

type WarRole = "defender" | "aggressor" | "joiner";

/**
 * What a war costs a belligerent per unit of intensity, by where it is fought.
 * A defender fights on its own ground, so it loses output and pays in prices; an
 * aggressor fights abroad and pays mostly in money; a joiner sends forces and
 * little else. Stated net: what a war's spending adds to demand is already
 * inside these figures, which is why war outlays never enter the budget's push.
 *
 * The growth figures are set on what a year of war does to the whole economy,
 * not on the target alone: the gap correction and the week-to-week lag take
 * about half of a target shift back inside a year, so a defender's target moves
 * ten points at full intensity for it to lose three or four over the year.
 *
 * What a war does to the world's energy and food prices is not in these
 * figures: a war among producers reaches every economy, the belligerents
 * included, through the commodity markets (`commodity-pressure.ts`), so the
 * same barrel is never charged twice.
 */
export const WAR_PRESSURE: Readonly<Record<WarRole, ExternalMacroPressure>> = {
  defender: { growth: -0.1, inflation: 0.03, outlays: 0.03 },
  aggressor: { growth: -0.01, inflation: 0.005, outlays: 0.02 },
  joiner: { growth: -0.003, inflation: 0, outlays: 0.005 },
};

/** A measure's growth cost per unit of the trade it cuts, as a share of output. */
export const COERCION_BITE = 0.5;

/** The most every measure in force together can take off an economy's growth. */
export const COERCION_CAP = 0.08;

/** How much of a partner's swing reaches United States growth, per unit of US exports to it as a share of US output. */
export const PARTNER_ELASTICITY = 1.5;

function warRole(conflict: Conflict, nation: NationId): WarRole | undefined {
  if (conflict.defender === nation) return "defender";
  if (conflict.aggressor === nation) return "aggressor";
  if (conflict.joined.aggressor.includes(nation) || conflict.joined.defender.includes(nation)) return "joiner";
  return undefined;
}

function warPressure(campaign: Campaign, nation: NationId): ExternalMacroPressure {
  let growth = 0;
  let inflation = 0;
  let outlays = 0;
  for (const conflict of selectActiveConflicts(campaign)) {
    const role = warRole(conflict, nation);
    if (!role) continue;
    const cost = WAR_PRESSURE[role];
    growth += cost.growth * conflict.intensity;
    inflation += cost.inflation * conflict.intensity;
    outlays += cost.outlays * conflict.intensity;
  }
  return { growth, inflation, outlays };
}

/** One of the administration's own measures that cuts trade rather than pricing it, still standing. */
function isCoercionInForce(measure: TradeMeasure): measure is TradeMeasure & { readonly kind: CoerciveMeasureKind } {
  return measure.liftedTurn === undefined && measure.origin === "us" && measure.kind !== "tariff";
}

/**
 * A measure in force between two governments, and how much of their trade it
 * cuts. `stopsImposerSales` is false for a ban on the target's goods alone: the
 * imposer's own exports stay legally open, so they neither shrink nor leave the
 * world market.
 */
export type Coercion = {
  readonly imposer: NationId;
  readonly target: NationId;
  readonly severity: number;
  readonly stopsImposerSales: boolean;
};

const coercionsBySnapshot = new WeakMap<Campaign, readonly Coercion[]>();

/**
 * Whether one of the administration's measures withholds American sales, read
 * the way the trade book reads the same measure (`trade-volume.ts`): an export
 * control denies what we license them, an embargo ends both directions unless
 * it bans only their goods, and sanctions and asset restrictions bite on what
 * they sell us. None of the inherited programs restricts what the country
 * sells the world: their export prohibitions are narrow (luxury goods and
 * banknotes for Russia) with farm and medical trade licensed, and the recorded
 * opening already carries what they left of trade with the target.
 */
function stopsOurSales(measure: TradeMeasure & { readonly kind: CoerciveMeasureKind }): boolean {
  if (measure.kind === "export-control") return true;
  if (measure.kind === "embargo") return measure.direction !== "imports";
  return false;
}

/**
 * Every economic measure in force, whoever imposed it: the administration's own
 * register (tariffs are a price step, not a cut in trade, and are not here) and
 * every standing embargo a government has declared, the United States included
 * as a target. An embargo the administration declared is in both, and counted
 * once, from the register.
 */
export function coercionsInForce(campaign: Campaign): readonly Coercion[] {
  const known = coercionsBySnapshot.get(campaign);
  if (known) return known;
  const us = campaign.founding.nation;
  const fromRegister = Object.values(campaign.trade.measures)
    .filter(isCoercionInForce)
    .map((measure) => ({ imposer: us, target: measure.target, severity: COERCION_AS_RATE[measure.kind], stopsImposerSales: stopsOurSales(measure) }));
  const fromEmbargoes = Object.entries(campaign.player.flags)
    .filter(([flag, standing]) => standing && flag.startsWith("embargo:"))
    .map(([flag]) => flag.split(":") as [string, NationId, NationId])
    .filter(([, imposer, target]) => imposer !== us && imposer !== undefined && target !== undefined)
    .map(([, imposer, target]) => ({ imposer, target, severity: COERCION_AS_RATE.embargo, stopsImposerSales: true }));
  const coercions = [...fromRegister, ...fromEmbargoes];
  coercionsBySnapshot.set(campaign, coercions);
  return coercions;
}

// One table of export shares per founding, filled as pairs are read: the
// shares are read against the dataset's founding figures, so they never change
// inside a campaign, and the United States' partner sum reads two hundred of
// them every week.
const sharesByFounding = new WeakMap<Campaign["founding"], Map<string, number>>();

/**
 * The share of one government's output that is goods sold to another. Where
 * the United States is on either side, what the two countries actually traded
 * (`US_GOODS_TRADE`); between two other capitals, what the seller exports in
 * all, split by how much of its trade runs to that buyer. Read against the
 * dataset's founding figures, so a measure that has already cut the trade does
 * not also shrink its own cost.
 */
export function exportShare(campaign: Campaign, seller: NationId, buyer: NationId): number {
  let shares = sharesByFounding.get(campaign.founding);
  if (!shares) {
    shares = new Map();
    sharesByFounding.set(campaign.founding, shares);
  }
  const key = `${seller as string}>${buyer as string}`;
  const known = shares.get(key);
  if (known !== undefined) return known;
  const share = foundingExportShare(campaign, seller, buyer);
  shares.set(key, share);
  return share;
}

function foundingExportShare(campaign: Campaign, seller: NationId, buyer: NationId): number {
  const from = selectNation(campaign, seller)?.base.stats;
  if (!from || from.economy.gdp <= 0) return 0;
  const us = campaign.founding.nation;
  const recorded = seller === us ? US_GOODS_TRADE[buyer as string]?.exports : buyer === us ? US_GOODS_TRADE[seller as string]?.imports : undefined;
  if (recorded) return Math.min(1, sumOf(recorded) / from.economy.gdp);
  const dependence = from.trade.tradeDependence[buyer] ?? 0;
  return Math.min(1, (from.trade.exports / from.economy.gdp) * dependence);
}

const sumOf = (flows: Readonly<Record<string, number>>) => Object.values(flows).reduce((sum, value) => sum + value, 0);

/**
 * What a blockade on station stops of an economy's sales abroad, as a share of
 * its output: everything it ships by sea to anyone, not only to the imposer,
 * because the hulls stop the ships rather than a buyer. Read against the
 * founding figures like `exportShare`, and gone the week the blockade lifts.
 */
function blockadeBite(campaign: Campaign, nation: NationId): number {
  const cut = blockadeCutOn(campaign, nation);
  const base = selectNation(campaign, nation)?.base.stats;
  if (cut <= 0 || !base || base.economy.gdp <= 0) return 0;
  return Math.min(1, base.trade.exports / base.economy.gdp) * cut;
}

/**
 * What the measures in force take off one economy's growth: a measure costs its
 * target the trade it cuts from what the target sells the imposer, and costs
 * the imposer the mirror image, from what it sells the target. Both sides of
 * every measure, so an embargo is never free for the government that declares
 * it and one declared against the United States reaches the United States. A
 * blockade on the economy is one more measure under the same cap, so sanctions
 * and a blockade on one country together take no more than the cap allows.
 */
function coercionPressure(campaign: Campaign, nation: NationId): number {
  let bite = blockadeBite(campaign, nation);
  for (const coercion of coercionsInForce(campaign)) {
    if (coercion.target === nation) bite += exportShare(campaign, nation, coercion.imposer) * coercion.severity;
    else if (coercion.imposer === nation && coercion.stopsImposerSales) bite += exportShare(campaign, nation, coercion.target) * coercion.severity;
  }
  return -Math.min(COERCION_CAP, COERCION_BITE * bite);
}

/** Partners the United States no longer sells to: an embargo either way ends the exposure with the trade, unless ours bans only their goods. */
function cutOff(campaign: Campaign, partner: NationId): boolean {
  const us = campaign.founding.nation;
  return coercionsInForce(campaign).some(
    (coercion) =>
      coercion.severity >= COERCION_AS_RATE.embargo &&
      ((coercion.imposer === us && coercion.target === partner && coercion.stopsImposerSales) || (coercion.imposer === partner && coercion.target === us)),
  );
}

/**
 * The United States as the hub it is: when a partner runs above or below its
 * own trend, what the United States sells it moves with it. Weighted by US
 * exports to each partner as a share of US output, from the founding's own
 * trade table. The world's other economies feeding each other is a later
 * model's; this is the United States' own exposure.
 */
function partnerExposure(campaign: Campaign): number {
  const us = campaign.founding.nation;
  let exposure = 0;
  for (const partner of Object.keys(US_GOODS_TRADE) as NationId[]) {
    const runtime = selectNation(campaign, partner);
    if (!runtime || partner === us || cutOff(campaign, partner)) continue;
    const weight = exportShare(campaign, us, partner);
    if (weight <= 0) continue;
    const trend = macroBaseline(runtime, NO_CYCLE).growth + restingProgram(campaign, partner)["economy.growth"];
    exposure += weight * PARTNER_ELASTICITY * (runtime.stats.economy.growth - trend);
  }
  return exposure;
}

const round6 = (value: number) => Math.round(value * 1_000_000) / 1_000_000 + 0;

/** What the rest of the world is doing to this economy's targets this week, and what its wars cost it. */
export function externalMacroPressure(campaign: Campaign, nation: NationId): ExternalMacroPressure {
  if (!selectNation(campaign, nation)) return NO_PRESSURE;
  const war = warPressure(campaign, nation);
  const coercion = coercionPressure(campaign, nation);
  const home = nation === campaign.founding.nation;
  const partners = home ? partnerExposure(campaign) : 0;
  const tariff = home ? projectTariffPrices(campaign).thisWeek : 0;
  const shocks = shockPressure(campaign, nation).growth;
  const prices = commodityMacroPressure(campaign, nation);
  return {
    growth: round6(war.growth + coercion + partners + shocks + prices.growth),
    inflation: round6(war.inflation + tariff + prices.inflation),
    outlays: round6(war.outlays),
    ...(prices.growth !== 0 || prices.inflation !== 0 ? { commodities: prices } : {}),
  };
}

