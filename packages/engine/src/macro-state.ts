import type { NationId } from "@admin/world";
import { WEEKLY_YEAR_FRACTION } from "./pace.js";
import { selectNation, type Campaign, type NationRuntime } from "./state.js";

// The part of an economy that has to be remembered from one week to the next:
// where its output could sit, what its people expect prices to do, and where
// its policy rate stands. Growth, inflation and joblessness are read off the
// nation's own stats; these three have no home there.

/** Annual rates as fractions; `potential` in the dataset's output units (USD millions, real). */
export type MacroState = {
  readonly potential: number;
  readonly expectedInflation: number;
  readonly policyRate: number;
};

/**
 * The real rate a policy rule settles at with no gap to close. The United
 * States' is its three-month bill yield (4.19%) less its authored inflation
 * anchor; everyone else's is a plain one percent until the world's own rates
 * are kept.
 */
export const US_NEUTRAL_REAL_RATE = 0.0124;
export const WORLD_NEUTRAL_REAL_RATE = 0.01;

/** No central bank in the model takes its rate below zero. */
export const POLICY_RATE_FLOOR = 0;

/** The share of the distance to the rule a central bank moves its rate in a week: half way in about eleven weeks. */
export const POLICY_RATE_ADJUSTMENT = 0.06;

/** How slowly a public revises what it expects prices to do: half way to the inflation it is living with in two years. */
export const EXPECTATIONS_HALF_LIFE_WEEKS = 104;

const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;
const round6 = (value: number) => Math.round(value * 1_000_000) / 1_000_000 + 0;

export function neutralRealRate(runtime: NationRuntime, playerNation: NationId): number {
  return runtime.base.id === playerNation ? US_NEUTRAL_REAL_RATE : WORLD_NEUTRAL_REAL_RATE;
}

/**
 * Where a central bank would set its rate this week, before the floor: the
 * neutral real rate plus what the public expects prices to do, leaning half a
 * point against every point of inflation above the country's own anchor and
 * every point of output above its potential. A reduced form, not a Fed: it is
 * a reading and the short end of every market rate, and what it does to the
 * economy is decide how fast a gap closes (`gapClosingSpeed`).
 */
export function policyRule(
  runtime: NationRuntime,
  playerNation: NationId,
  expectedInflation: number,
  inflation: number,
  gap: number,
): number {
  const anchor = runtime.base.stats.economy.inflation;
  return neutralRealRate(runtime, playerNation) + expectedInflation + 0.5 * (inflation - anchor) + 0.5 * gap;
}

/**
 * How much of an output gap the economy closes in a year. A central bank free
 * to move its rate closes it in about a year; one pinned at the floor can only
 * wait, and closes it at less than half the speed. That is where a slump at
 * zero rates gets its depth and a budget's push its larger bite: there is no
 * separate multiplier switch.
 */
export const GAP_CLOSING = { free: 1, atFloor: 0.4 } as const;

export function gapClosingSpeed(rule: number): number {
  return rule <= POLICY_RATE_FLOOR ? GAP_CLOSING.atFloor : GAP_CLOSING.free;
}

/** One nation's record, opened on its economy as it stands: output at potential, expectations at its anchor, the rate at the rule. */
export function openingMacroState(runtime: NationRuntime, playerNation: NationId): MacroState {
  const expectedInflation = runtime.base.stats.economy.inflation;
  const rule = policyRule(runtime, playerNation, expectedInflation, runtime.stats.economy.inflation, 0);
  return {
    // Output opens at its potential, so no economy starts with a gap to close.
    potential: runtime.stats.economy.gdp,
    expectedInflation,
    policyRate: round6(Math.max(POLICY_RATE_FLOOR, rule)),
  };
}

/**
 * Every nation's macro record, opened on the economy as it stands. Read off the
 * live stats rather than the founding ones, so a save that predates the record
 * opens on the country it has, with no gap and no surprise in its rates.
 */
export function openingMacro(campaign: Campaign): Readonly<Record<NationId, MacroState>> {
  const states: Record<NationId, MacroState> = {};
  for (const id of (Object.keys(campaign.nations) as NationId[]).sort((a, b) => (a as string).localeCompare(b as string))) {
    const runtime = selectNation(campaign, id);
    if (runtime) states[id] = openingMacroState(runtime, campaign.founding.nation);
  }
  return states;
}

export function selectMacroState(campaign: Campaign, nation: NationId): MacroState | undefined {
  return campaign.macro?.[nation];
}

/** The gap between output and potential, as the log of their ratio: a fraction of potential, never points. */
export function gapBetween(output: number, potential: number): number {
  if (output <= 0 || potential <= 0) return 0;
  return Math.log(output / potential);
}

/** How far output sits above (positive) or below its potential, as a fraction of potential. */
export function outputGap(campaign: Campaign, nation: NationId): number {
  const state = selectMacroState(campaign, nation);
  const runtime = selectNation(campaign, nation);
  if (!state || !runtime) return 0;
  return gapBetween(runtime.stats.economy.gdp, state.potential);
}

export type MacroStateStep = {
  /** This week's trend growth: where potential compounds. */
  readonly trendGrowth: number;
  /** This week's inflation, already settled. */
  readonly inflation: number;
  /** Where the rule would set the rate this week. */
  readonly rule: number;
  /**
   * The share of the distance to the rule the rate closes this week. A central
   * bank whose rule is read every week spends the weekly share; one read on a
   * calendar of decisions spends the share its own cadence is worth, which is
   * the caller's to know. Absent is the weekly share.
   */
  readonly rateAdjustment?: number;
};

/**
 * The record a week on. Potential compounds at trend by the same weekly step
 * output compounds at (`fiscalPhase`), so an economy growing at its trend
 * holds its gap exactly; expectations move toward the inflation the public is
 * living with; the rate moves part way toward the rule.
 */
export function nextMacroState(state: MacroState, step: MacroStateStep): MacroState {
  const expectedInflation =
    state.expectedInflation + (step.inflation - state.expectedInflation) * (Math.LN2 / EXPECTATIONS_HALF_LIFE_WEEKS);
  const policyRate =
    state.policyRate +
    (Math.max(POLICY_RATE_FLOOR, step.rule) - state.policyRate) * (step.rateAdjustment ?? POLICY_RATE_ADJUSTMENT);
  return {
    potential: round3(state.potential * (1 + step.trendGrowth * WEEKLY_YEAR_FRACTION)),
    expectedInflation: round6(expectedInflation),
    policyRate: round6(policyRate),
  };
}
