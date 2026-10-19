import { type CycleState } from "./business-cycle.js";
import type { Campaign, NationRuntime } from "./state.js";
export type MacroBaseline = {
    readonly growth: number;
    readonly inflation: number;
    readonly unemployment: number;
};
/**
 * Where an economy sits when nothing is happening to it, plus where the
 * business cycle currently pulls its growth.
 *
 * The nation's own authored rates, which the dataset holds to a published
 * figure for each (`MACRO_ANCHORS`), moved by how far its order has slipped
 * from where it was found and, on growth only, by the cycle. At the order the
 * country was authored with, the rest is the authored figure exactly, so a
 * campaign opens on an economy already at rest and nothing drifts that nobody
 * moved. The cycle reaches jobs and prices only through the gap it opens.
 *
 * `cycle` is a required argument, not a default, because a caller wanting the
 * true rest state — no crisis, no cyclical swing — has to say so: pass
 * `NO_CYCLE` rather than relying on an implicit zero that a later change could
 * quietly stop being zero.
 */
export declare function macroBaseline(runtime: NationRuntime, cycle: CycleState): MacroBaseline;
/**
 * Where `security.crimeIndex` rests: the figure the country was authored with,
 * moved by how far hardship and the state's grip have moved since the oath.
 * Reads this turn's STARTING unemployment and cost of living — the values
 * before this same turn's `nextEconomy` moves them — which is what gives the
 * crime edge its lag: a week's joblessness or price pressure shows up in next
 * week's reading, never the same week's.
 *
 * Anchored the way `macroBaseline` is, and for the same reason. Built from the
 * formula alone, every country's crime walked to what the formula thought a
 * country of its wealth should have, with nobody governing: a country the
 * dataset authored as safe drifted up and a violent one drifted down, which is
 * news nobody made. Only the change is the formula's to say.
 *
 * Hardship is read against the country's own normal rather than against a
 * fixed line: a country that has always run prices hot is not losing order to
 * them every week.
 *
 * No `macroPressure` term: a standing condition reaches crime only through the
 * unemployment and cost-of-living channels it already has, never a second
 * time as a direct crime pressure.
 */
export declare function crimeBaseline(runtime: NationRuntime, normalPrice?: number): number;
/** Whole weeks the current day belongs to, counted through the week's close. */
export declare function weeksInOffice(campaign: Campaign): number;
/**
 * Where a country's price index would stand after `weeks` at the inflation it
 * was authored with: the path an ordinary year of its own prices takes, which
 * is what every reading of price hardship is measured against.
 */
export declare function normalPriceLevel(runtime: NationRuntime, weeks: number): number;
/**
 * The share of inflation that reaches the shelf: all of it. The index is the
 * price level, so a year at an inflation rate raises it by exactly that rate;
 * a pass-through below one was a second, quieter inflation figure that no
 * reading could name.
 */
export declare const COST_PASSTHROUGH = 1;
/**
 * Where `economy.costOfLiving` rests — the one rate in the lattice whose
 * baseline moves with its own previous value, because an index is cumulative
 * by construction. Compounded exactly, `(1 + inflation)^yearFraction`: a year
 * of weekly steps at a rate lands on that rate, where simple weekly steps
 * compounded past it, and did so by more the hotter prices ran.
 *
 * `inflation` is this turn's own freshly computed reading, so a week's price
 * move reaches the shelf the same week it happens rather than a turn late.
 */
export declare function costBaseline(costOfLiving: number, inflation: number, yearFraction: number): number;
export type PoliticalBaseline = {
    readonly regimeStability: number;
    readonly legitimacy: number;
    readonly protestPressure: number;
};
/**
 * Where a country's politics sit when nothing is happening to it: the figures
 * it was authored with.
 *
 * Not derived from anything, unlike the economy, because there is nothing
 * upstream of them to derive from — a state's ordinary temperature IS the
 * authored record, and a country whose streets run hot runs hot as a fact
 * about that country rather than as a crisis it is having.
 *
 * The three chosen are the three with no restoring force anywhere else in the
 * engine. Every writer of `regimeStability` lowers it and every writer of
 * `protestPressure` that runs weekly raises it, so before this they were
 * ratchets: a two-hundred-turn world arrived at half the order it opened with
 * whatever anybody did, which then lowered `macroBaseline` under it and left
 * the economic rates chasing a target walking away from them.
 */
export declare function politicalBaseline(runtime: NationRuntime): PoliticalBaseline;
/**
 * The same nation with its rates at their resting values.
 *
 * What it is for: a reading that says "this country is in trouble" has to be
 * able to say "and now it is not", and the only honest comparison is against
 * where that country sits normally. An absolute threshold cannot do it: the
 * countries whose published economies run hot, a third of a workforce out of
 * work or prices doubling in a year, would be in a crisis for being themselves
 * and no recovery could ever clear it.
 */
export declare function restingRuntime(runtime: NationRuntime): NationRuntime;
