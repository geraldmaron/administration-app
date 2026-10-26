import { FORCE_COST_ANCHORS, US_ID, type ForceAssetId, type Nation, type NationId, type NationStats } from "@admin/world";
import { specForRung, type ForcePackage } from "./force-packages.js";
import type { RungLevel } from "./instrument-ids.js";
import { selectNation, type Campaign } from "./state.js";

// What a force act costs, priced from what the United States has paid for
// operations of its kind (`FORCE_COST_ANCHORS`), in the world's own dollars.
//
// A force act used to cost a share of the acting government's output times a
// rung weight, which put a limited strike on Venezuela at about $35 billion,
// over a hundred times what the strike's sorties cost at the last count. The
// sorties, the hulls and the brigades are what the money buys, so they are what
// the price counts.

/** The year the world is set in, whose dollars every price is stated in. */
const WORLD_YEAR = 2026;

/** One anchor's figure, in the table's own unit and dollar year. */
function figure(anchor: string): number {
  const row = FORCE_COST_ANCHORS.find((entry) => entry.anchor === anchor);
  if (!row) throw new Error(`force-costs: no anchor "${anchor}" in FORCE_COST_ANCHORS`);
  return row.value;
}

/** An anchor in the world's dollars, carried forward by the consumer price index. */
function inWorldDollars(anchor: string): number {
  const row = FORCE_COST_ANCHORS.find((entry) => entry.anchor === anchor);
  if (row?.dollarYear === undefined) throw new Error(`force-costs: anchor "${anchor}" carries no dollar year`);
  return row.value * (figure(`cpi-${WORLD_YEAR}`) / figure(`cpi-${row.dollarYear}`));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const DAYS_PER_YEAR = 365;
const DAYS_PER_WEEK = 7;
const WEEKS_PER_YEAR = 52;

/**
 * The United States' price of one unit of each rung, USD millions: what the
 * act costs up front, and what it costs each week the unit stays out.
 *
 * An exercise is priced whole. A carrier group and a blockading destroyer pay
 * their passage to station up front, then their days on it. A strike sortie is
 * priced all-in from a short air campaign's bill, tankers and munitions with
 * it, so the airframes it holds afterward bill nothing more. A brigade pays the
 * shipping of its equipment, then its share of a war's cost in theater.
 */
export type RungPrice = { readonly upFront: number; readonly weekly: number };

function usRungPrices(): Readonly<Record<RungLevel, RungPrice>> {
  const destroyerDay = inWorldDollars("destroyer-year-direct") / DAYS_PER_YEAR;
  const groupDay =
    (inWorldDollars("carrier-year-direct") + inWorldDollars("air-wing-year-direct")) / DAYS_PER_YEAR +
    destroyerDay * figure("strike-group-escorts");
  const strikeSortie = inWorldDollars("odyssey-dawn-cost") / figure("odyssey-dawn-strike-sorties");
  return {
    1: { upFront: inWorldDollars("exercise-cost"), weekly: 0 },
    2: { upFront: groupDay * figure("transit-days"), weekly: groupDay * DAYS_PER_WEEK },
    3: { upFront: destroyerDay * figure("transit-days"), weekly: destroyerDay * DAYS_PER_WEEK },
    4: { upFront: strikeSortie * figure("strike-sorties-per-aircraft"), weekly: 0 },
    5: { upFront: inWorldDollars("brigade-shipping"), weekly: inWorldDollars("brigade-year-in-theater") / WEEKS_PER_YEAR },
  };
}

export const US_FORCE_PRICES: Readonly<Record<RungLevel, RungPrice>> = usRungPrices();

/** The mean Gregorian month, which is how CBO's monthly Guard figure becomes a week. */
const DAYS_PER_MONTH = 365.25 / 12;

/** USD millions a week for one Guard call-up deployed in a US state, at CBO's per-thousand monthly rate. */
export function domesticGuardWeek(): number {
  return round2((figure("guard-call-up") / 1000) * inWorldDollars("guard-domestic-thousand-month") * (DAYS_PER_WEEK / DAYS_PER_MONTH));
}

/** USD millions a week for active-duty troops deployed at home, at the 2018 border deployment's average rate. */
export function domesticBrigadeWeek(): number {
  return round2(inWorldDollars("active-border-deployment-cost") / figure("active-border-deployment-weeks"));
}

/**
 * What a unit of force costs this government against what it costs the United
 * States: its military spending per active service member over the US figure.
 *
 * Derived, not measured. Spending per service member carries pay, equipment
 * and upkeep together, which is what an operation draws on; the price level
 * of a conscript army is not the price level of an all-volunteer one. A
 * government with no standing force has no figure of its own and buys at the
 * only price sourced, the US one.
 */
export function militaryCostIndex(actor: NationStats, us: NationStats): number {
  const own = spendPerServiceMember(actor);
  const theirs = spendPerServiceMember(us);
  return own === undefined || theirs === undefined ? 1 : own / theirs;
}

function spendPerServiceMember(stats: NationStats): number | undefined {
  const { budget, activeHeadcount } = stats.military;
  return budget > 0 && activeHeadcount > 0 ? budget / activeHeadcount : undefined;
}

/**
 * The index read off the authored figures rather than the live ones, so a
 * government's price of force does not drift with a budget the campaign moves
 * and the yardstick, the US figure, stays where it was sourced.
 */
export function campaignCostIndex(campaign: Campaign, actor: NationId): number {
  if (actor === US_ID) return 1;
  const own = selectNation(campaign, actor)?.base.stats;
  const us = selectNation(campaign, US_ID)?.base.stats;
  return own && us ? militaryCostIndex(own, us) : 1;
}

/** The price of a force act, laid out the way a desk would state its basis. */
export type ForceCostBasis = {
  readonly rung: RungLevel;
  /** What is sent: a unit type, or none for an exercise. */
  readonly unitType?: ForceAssetId;
  readonly units: number;
  /** USD millions up front per unit, at US prices. */
  readonly perUnit: number;
  /** The acting government's price of force against the United States' (1 for the US). */
  readonly costIndex: number;
  /** The distance factor on the up-front price: 1 across a shared border. */
  readonly reach: number;
  /** USD millions charged when the act is taken. */
  readonly upFront: number;
  /** USD millions charged each week the force stays committed; 0 where nothing recurs. */
  readonly weekly: number;
};

export function forceCostBasis(
  rung: RungLevel,
  units: number,
  costIndex: number,
  reach: number,
  unitType?: ForceAssetId,
): ForceCostBasis {
  const price = US_FORCE_PRICES[rung];
  return {
    rung,
    ...(unitType ? { unitType } : {}),
    units,
    perUnit: price.upFront,
    costIndex,
    reach,
    upFront: round2(price.upFront * units * costIndex * reach),
    weekly: round2(price.weekly * units * costIndex),
  };
}

/**
 * The basis for a military rung as ordered: the package's own count, or with
 * none named the count the rung's package is drawn at (its preferred size,
 * the size an unscaled order commits). An exercise sends no package.
 */
export function forceActBasis(campaign: Campaign, actor: Nation, rung: RungLevel, force: ForcePackage | undefined, reach: number): ForceCostBasis {
  const spec = rung === 1 ? undefined : specForRung(rung);
  const units = spec ? force?.count ?? spec.preferred : 1;
  return forceCostBasis(rung, units, campaignCostIndex(campaign, actor.id), reach, spec ? force?.unitType ?? spec.unitType : undefined);
}
