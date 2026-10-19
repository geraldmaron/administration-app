import type { NationId } from "@admin/world";
import { type MacroState } from "./macro-state.js";
import type { ProgramRestingOffset } from "./policy-stats.js";
import { type Campaign, type NationRuntime } from "./state.js";
export type MacroRate = "growth" | "inflation" | "unemployment";
/**
 * `rest` is where the country's own economy sits (on inflation, together with
 * what the public expects prices to do); `cycle` the business cycle; `program`
 * the standing program; `impulse` the budget's push on demand; `conditions`
 * what the country is living through; `world` wars, measures and partners;
 * `commodities` the world's prices for energy, food and materials, the part of
 * the external channel that is prices; `gap` the pull back toward potential
 * output.
 */
export type MacroDriverSource = "rest" | "cycle" | "program" | "impulse" | "conditions" | "world" | "commodities" | "gap";
/** One part of a rate's target, as an annual fraction. */
export type MacroDriver = {
    readonly source: MacroDriverSource;
    readonly amount: number;
};
export type MacroDrivers = Readonly<Record<MacroRate, readonly MacroDriver[]>>;
/**
 * How much of an inflation target is what the public already expects, the
 * rest being the country's own anchor. At a half, a price shock that lasts
 * long enough to be believed lasts longer than the shock.
 */
export declare const INFLATION_EXPECTATIONS_WEIGHT = 0.5;
/** Points of inflation per unit of output gap: a flat curve, the post-2000 reading. */
export declare const PHILLIPS_SLOPE = 0.03;
/**
 * How far unemployment moves against a unit of output gap. The United
 * States' is the published estimate; other rich economies run a little
 * flatter and poorer ones, with large informal sectors, much flatter.
 */
export declare const OKUN: {
    readonly unitedStates: 0.45;
    readonly rich: 0.4;
    readonly other: 0.25;
};
/** The span a budget's push is spent over, in years: a push of F delivers F of output across it. */
export declare const IMPULSE_SPAN_YEARS: number;
export declare function okunCoefficient(runtime: NationRuntime, playerNation: NationId): number;
/** Everything the week's targets were set against, beside the targets themselves. */
export type MacroStep = {
    readonly drivers: MacroDrivers;
    readonly gap: number;
    readonly impulse: number;
    readonly rule: number;
    /** The share of the distance to `rule` this economy's rate closes this week. */
    readonly rateAdjustment: number;
    /** Where potential compounds this week: the country's rest plus the program's supply. */
    readonly trendGrowth: number;
    readonly state: MacroState;
};
/**
 * One nation's targets for the week, and why. `program` is passed in because
 * the drift phase reads it for the politics too; everyone else reaches this
 * through `selectMacroDrivers`.
 */
export declare function macroStep(campaign: Campaign, runtime: NationRuntime, nation: NationId, program: ProgramRestingOffset): MacroStep;
/** The target a rate reverts toward this week: the sum of its drivers. */
export declare function driversTarget(drivers: readonly MacroDriver[]): number;
/** What is setting each of a nation's three rates this week. */
export declare function selectMacroDrivers(campaign: Campaign, nation: NationId): MacroDrivers;
