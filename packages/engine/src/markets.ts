/**
 * An equity index, the week's step of it, and the crash reading.
 *
 * The index is a level against the market's own trend, 1 at the oath. Each
 * week it closes part of the distance to where the economy, the cycle, the
 * country's uncertainty and the price of crude put it, with a seeded wobble;
 * a one-week fall past the crash line is a market shock, and a market shock
 * stops the clock.
 */
import { cycleOffset, NO_CYCLE } from "./business-cycle.js";
import type { CommodityId } from "./commodities.js";
import { selectDebtLimit } from "./debt-limit.js";
import { inShutdown } from "./funding.js";
import { restingProgram } from "./governance.js";
import { macroBaseline } from "./macro-baseline.js";
import { createRngStreams } from "./rng.js";
import { EQUITY_SERIES_WINDOW } from "./state-world.js";
import { selectNation, type Campaign, type CommodityQuote, type EquityState, type MarketsState } from "./state.js";
import { atWarAsParty } from "./war-party.js";

export type EquityInputs = {
  readonly growthSurprise: number;
  readonly cycleDrag: number;
  readonly uncertainty: number;
  readonly commodityShock: number;
};

/**
 * Starting weights, labeled here, not sourced:
 * 1 + 0.5 * growthSurprise - 0.25 * cycleDrag - 0.15 * uncertainty
 * - 0.1 * commodityShock.
 */
const GROWTH_SURPRISE_WEIGHT = 0.5;
const CYCLE_DRAG_WEIGHT = 0.25;
const UNCERTAINTY_WEIGHT = 0.15;
const COMMODITY_SHOCK_WEIGHT = 0.1;

/** The index does not fall below this floor. */
const EQUITY_FLOOR = 0.2;

export function equityIndex(inputs: EquityInputs): number {
  const raw =
    1 +
    GROWTH_SURPRISE_WEIGHT * inputs.growthSurprise -
    CYCLE_DRAG_WEIGHT * inputs.cycleDrag -
    UNCERTAINTY_WEIGHT * inputs.uncertainty -
    COMMODITY_SHOCK_WEIGHT * inputs.commodityShock;
  return Math.max(EQUITY_FLOOR, raw);
}

/** Starting threshold, labeled here, not sourced. An 8 percent drop. */
export const CRASH_DROP = 0.08;

export function marketCrash(previous: number, next: number): boolean {
  return previous > 0 && next <= previous * (1 - CRASH_DROP);
}

/** Planning value: the share of the distance to the fair level the index closes in a week. */
export const EQUITY_SPEED = 0.3;

/** Planning value: half-width of the seeded weekly wobble on the level. */
export const EQUITY_WOBBLE = 0.015;

/** Planning value: growth off trend as the index reads it; four points under trend is a fifth of full surprise. */
const GROWTH_SURPRISE_SCALE = 5;

/** Planning value: a contraction pulling two points off growth reads as a fifth of full drag. */
const CYCLE_DRAG_SCALE = 10;

/** Planning values: how much each standing uncertainty adds, together capped at 1. */
export const UNCERTAINTY_WEIGHTS = { war: 0.3, shutdown: 0.3, debtLimit: 0.5 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** How unsettled the country is this week: a war it is party to, a shutdown, a binding debt limit. */
export function policyUncertainty(campaign: Campaign): number {
  const war = atWarAsParty(campaign) ? UNCERTAINTY_WEIGHTS.war : 0;
  const shutdown = inShutdown(campaign) ? UNCERTAINTY_WEIGHTS.shutdown : 0;
  const limit = selectDebtLimit(campaign).binding ? UNCERTAINTY_WEIGHTS.debtLimit : 0;
  return Math.min(1, war + shutdown + limit);
}

/** What the index is answering this week, read off the United States' own economy and the price of crude. */
export function equityInputs(campaign: Campaign, crude: CommodityQuote | undefined): EquityInputs {
  const us = campaign.founding.nation;
  const runtime = selectNation(campaign, us);
  if (!runtime) return { growthSurprise: 0, cycleDrag: 0, uncertainty: 0, commodityShock: 0 };
  const trend = macroBaseline(runtime, NO_CYCLE).growth + restingProgram(campaign, us)["economy.growth"];
  const offset = cycleOffset(campaign.cycles[us] ?? NO_CYCLE);
  const norm = crude?.norm ?? crude?.index ?? 1;
  return {
    growthSurprise: clamp((runtime.stats.economy.growth - trend) * GROWTH_SURPRISE_SCALE, -1, 1),
    cycleDrag: clamp(-offset * CYCLE_DRAG_SCALE, 0, 1),
    uncertainty: policyUncertainty(campaign),
    commodityShock: Math.max(0, Math.log((crude?.index ?? norm) / norm)),
  };
}

/** The equity record after this week, given the commodity quotes the same week set. */
export function nextEquity(campaign: Campaign, commodities: Readonly<Partial<Record<CommodityId, CommodityQuote>>>): EquityState {
  const level = selectEquityLevel(campaign);
  const fair = equityIndex(equityInputs(campaign, commodities.crude));
  const draw = createRngStreams(campaign.seed).stream("equity", campaign.turn).next();
  const next = Math.max(EQUITY_FLOOR, level + EQUITY_SPEED * (fair - level) + EQUITY_WOBBLE * (2 * draw - 1));
  const rounded = Math.round(next * 1_000_000) / 1_000_000;
  const series = [...(campaign.markets?.equity.series ?? []), rounded].slice(-EQUITY_SERIES_WINDOW);
  return { level: rounded, series };
}

export { applyMarkets, type MarketsEffect } from "./world-effects.js";

/**
 * The equity level this week, 1 at the oath. A campaign whose markets have
 * never moved reads the founding level rather than nothing, because a level
 * of 1 is what an unmoved index is.
 */
export function selectEquityLevel(campaign: Campaign): number {
  return campaign.markets?.equity.level ?? 1;
}

/** The weekly equity levels, oldest first, beginning with the oath's 1. */
export function selectEquitySeries(campaign: Campaign): readonly number[] {
  return [1, ...(campaign.markets?.equity.series ?? [])].slice(-EQUITY_SERIES_WINDOW);
}

/** A crash the week it happened: last week's level, this week's, and the fall between them. */
export type MarketShock = { readonly from: number; readonly to: number; readonly drop: number };

/** This week's crash, if the index's last step fell past the crash line; nothing in any other week. */
export function selectMarketShock(campaign: Campaign): MarketShock | undefined {
  const series = selectEquitySeries(campaign);
  const to = series.at(-1);
  const from = series.at(-2);
  if (to === undefined || from === undefined || !marketCrash(from, to)) return undefined;
  return { from, to, drop: 1 - to / from };
}

/** A blank markets record: every commodity at its opening level, the index at 1. */
export function emptyMarkets(): MarketsState {
  return { commodities: {}, equity: { level: 1, series: [] } };
}
