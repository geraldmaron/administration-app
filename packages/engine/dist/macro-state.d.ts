import type { NationId } from "@admin/world";
import { type Campaign, type NationRuntime } from "./state.js";
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
export declare const US_NEUTRAL_REAL_RATE = 0.0124;
export declare const WORLD_NEUTRAL_REAL_RATE = 0.01;
/** No central bank in the model takes its rate below zero. */
export declare const POLICY_RATE_FLOOR = 0;
/** The share of the distance to the rule a central bank moves its rate in a week: half way in about eleven weeks. */
export declare const POLICY_RATE_ADJUSTMENT = 0.06;
/** How slowly a public revises what it expects prices to do: half way to the inflation it is living with in two years. */
export declare const EXPECTATIONS_HALF_LIFE_WEEKS = 104;
export declare function neutralRealRate(runtime: NationRuntime, playerNation: NationId): number;
/**
 * Where a central bank would set its rate this week, before the floor: the
 * neutral real rate plus what the public expects prices to do, leaning half a
 * point against every point of inflation above the country's own anchor and
 * every point of output above its potential. A reduced form, not a Fed: it is
 * a reading and the short end of every market rate, and what it does to the
 * economy is decide how fast a gap closes (`gapClosingSpeed`).
 */
export declare function policyRule(runtime: NationRuntime, playerNation: NationId, expectedInflation: number, inflation: number, gap: number): number;
/**
 * How much of an output gap the economy closes in a year. A central bank free
 * to move its rate closes it in about a year; one pinned at the floor can only
 * wait, and closes it at less than half the speed. That is where a slump at
 * zero rates gets its depth and a budget's push its larger bite: there is no
 * separate multiplier switch.
 */
export declare const GAP_CLOSING: {
    readonly free: 1;
    readonly atFloor: 0.4;
};
export declare function gapClosingSpeed(rule: number): number;
/** One nation's record, opened on its economy as it stands: output at potential, expectations at its anchor, the rate at the rule. */
export declare function openingMacroState(runtime: NationRuntime, playerNation: NationId): MacroState;
/**
 * Every nation's macro record, opened on the economy as it stands. Read off the
 * live stats rather than the founding ones, so a save that predates the record
 * opens on the country it has, with no gap and no surprise in its rates.
 */
export declare function openingMacro(campaign: Campaign): Readonly<Record<NationId, MacroState>>;
export declare function selectMacroState(campaign: Campaign, nation: NationId): MacroState | undefined;
/** The gap between output and potential, as the log of their ratio: a fraction of potential, never points. */
export declare function gapBetween(output: number, potential: number): number;
/** How far output sits above (positive) or below its potential, as a fraction of potential. */
export declare function outputGap(campaign: Campaign, nation: NationId): number;
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
export declare function nextMacroState(state: MacroState, step: MacroStateStep): MacroState;
