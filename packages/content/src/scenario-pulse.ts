// The pulse: gates on the country's own economic and civic readings, and on
// the commodity markets, spoken in bands rather than figures.
//
// Content could see the economy only through `conditionActive` — a recession
// or an inflation shock once it had become a standing condition — so a week
// about prices that are merely high, a labor market that is merely slack, or a
// street that is merely getting more dangerous had nothing to gate on, and a
// writer who wanted one reached for a `turn` floor instead. Bands and not
// bounds, on purpose: the engine owns the arithmetic, and a writer who can type
// `inflation atLeast 0.043` has been handed a precision the prose will then
// claim. A band says what a household would say about it.
//
// Every threshold below is a planning value, labeled as one, except the
// inflation target, which is the Federal Reserve's stated 2 percent objective.
import { COMMODITY_IDS, selectCommodities, selectNation, type Campaign, type CommodityId, type CyclePhase } from "@admin/engine";
import { z } from "zod";

/** Where inflation sits against the 2 percent the Fed targets. */
export const INFLATION_BANDS = ["below-target", "near-target", "elevated", "high"] as const;
export type InflationBand = (typeof INFLATION_BANDS)[number];

/** How much work there is for people who want it. */
export const UNEMPLOYMENT_BANDS = ["tight", "normal", "slack", "severe"] as const;
export type UnemploymentBand = (typeof UNEMPLOYMENT_BANDS)[number];

/** How far the cost of living has moved since the oath. */
export const COST_OF_LIVING_BANDS = ["easing", "steady", "rising", "straining"] as const;
export type CostOfLivingBand = (typeof COST_OF_LIVING_BANDS)[number];

/** Which way crime has moved since the oath. */
export const CRIME_TRENDS = ["falling", "steady", "rising"] as const;
export type CrimeTrend = (typeof CRIME_TRENDS)[number];

/** Mirrors the engine's `CyclePhase`; the test holds the two to one list. */
export const CYCLE_PHASES = ["expansion", "peak", "contraction", "trough"] as const satisfies readonly CyclePhase[];

/**
 * The commodities the market model prices, by the ids its data table uses.
 * Mirrored here rather than imported because the market model is being built
 * beside this vocabulary; the integration test holds the two to one list once
 * it lands (see the content notes).
 */
export type ContentCommodityId = CommodityId;

/** Where a commodity's index sits against its anchor (1.0 is the last full pre-shock period). */
export const COMMODITY_BANDS = ["slumped", "normal", "elevated", "spiking"] as const;
export type CommodityBand = (typeof COMMODITY_BANDS)[number];

const oneOf = <T extends readonly [string, ...string[]]>(values: T) => z.array(z.enum(values)).min(1);

export const PULSE_CONDITIONS = [
  z.object({ kind: z.literal("inflationBand"), in: oneOf(INFLATION_BANDS) }),
  z.object({ kind: z.literal("unemploymentBand"), in: oneOf(UNEMPLOYMENT_BANDS) }),
  z.object({ kind: z.literal("costOfLivingBand"), in: oneOf(COST_OF_LIVING_BANDS) }),
  z.object({ kind: z.literal("crimeTrend"), in: oneOf(CRIME_TRENDS) }),
  z.object({ kind: z.literal("cyclePhase"), in: oneOf(CYCLE_PHASES) }),
  z.object({ kind: z.literal("commodityBand"), commodity: z.enum(COMMODITY_IDS), in: oneOf(COMMODITY_BANDS) }),
] as const;

type PulseCondition = z.infer<(typeof PULSE_CONDITIONS)[number]>;

/** Planning values: under 1 percent, within a point of the target, up to 5, and past it. */
export function inflationBandOf(rate: number): InflationBand {
  if (rate < 0.01) return "below-target";
  if (rate < 0.03) return "near-target";
  if (rate < 0.05) return "elevated";
  return "high";
}

/** Planning values: under 4 percent, to 5.5, to 8, and past it. */
export function unemploymentBandOf(rate: number): UnemploymentBand {
  if (rate < 0.04) return "tight";
  if (rate < 0.055) return "normal";
  if (rate < 0.08) return "slack";
  return "severe";
}

/** Planning values: the index against the oath's, falling at all, within 3 percent, to 8, and past it. */
export function costOfLivingBandOf(now: number, atOath: number): CostOfLivingBand {
  const moved = atOath > 0 ? now / atOath - 1 : 0;
  if (moved < -0.005) return "easing";
  if (moved < 0.03) return "steady";
  if (moved < 0.08) return "rising";
  return "straining";
}

/** Planning value: three points of the crime index either way is a trend; less is noise. */
export function crimeTrendOf(now: number, atOath: number): CrimeTrend {
  if (now - atOath >= 0.03) return "rising";
  if (atOath - now >= 0.03) return "falling";
  return "steady";
}

/** Planning values: under 0.85 of the anchor, within 15 percent of it, to 1.4, and past it. */
export function commodityBandOf(index: number): CommodityBand {
  if (index < 0.85) return "slumped";
  if (index < 1.15) return "normal";
  if (index < 1.4) return "elevated";
  return "spiking";
}

/**
 * The narrow interface the market model is read through: a commodity's index
 * against its anchor; an unmoved market reads the engine's opening level.
 * Structural rather than imported, so this reads the stored markets the moment
 * they exist without this package having to be edited when they land.
 */

export function commodityIndex(campaign: Campaign, commodity: ContentCommodityId): number {
  return selectCommodities(campaign).find((reading) => reading.id === commodity)?.index ?? 1;
}

function includes<T extends string>(bands: readonly T[], band: T): boolean {
  return bands.includes(band);
}

/** Whether a pulse gate holds on this board. The player's own country; a pulse gate never reads the counterpart. */
export function pulseMet(campaign: Campaign, condition: PulseCondition): boolean {
  if (condition.kind === "commodityBand") return includes(condition.in, commodityBandOf(commodityIndex(campaign, condition.commodity)));
  if (condition.kind === "cyclePhase") {
    const phase = campaign.cycles[campaign.founding.nation]?.phase;
    return phase !== undefined && includes(condition.in, phase);
  }
  const home = selectNation(campaign, campaign.founding.nation);
  if (!home) return false;
  const now = home.stats;
  const oath = home.base.stats;
  switch (condition.kind) {
    case "inflationBand":
      return includes(condition.in, inflationBandOf(now.economy.inflation));
    case "unemploymentBand":
      return includes(condition.in, unemploymentBandOf(now.economy.unemployment));
    case "costOfLivingBand":
      return includes(condition.in, costOfLivingBandOf(now.economy.costOfLiving, oath.economy.costOfLiving));
    case "crimeTrend":
      return includes(condition.in, crimeTrendOf(now.security.crimeIndex, oath.security.crimeIndex));
  }
}
