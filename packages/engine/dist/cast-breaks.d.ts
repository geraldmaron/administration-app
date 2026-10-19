import type { Charter } from "@admin/world";
import type { CabinetOutcome } from "./cabinet.js";
import type { Campaign } from "./state.js";
import type { TurnPhases } from "./turn-loop.js";
export type CabinetTally = Record<CabinetOutcome, number>;
/**
 * The campaign's own turn phases, with the cabinet's weekly sweep counted as
 * it runs. Counting what the phase actually returns, rather than re-deriving
 * its roll here, keeps the tally honest to whatever the phase decides.
 * `observe` sees the state each phase plans against, which is how the harness
 * tells what each phase moved.
 */
export declare function countedPhases(charter: Charter, tally: CabinetTally, observe?: (id: string, state: Campaign) => void, layout?: boolean): TurnPhases;
export declare function mean(values: readonly number[]): number;
/** What one campaign counted: its breaks and how long it ran. */
export type BreakCount = {
    readonly cabinetBreaks: Readonly<Record<CabinetOutcome, number>>;
    readonly turnsPlayed: number;
};
/**
 * Breaks per campaign, scaled to a four-year term so a one-year run and a
 * two-term run read on one scale. The mean rather than the median, because
 * most campaigns count a handful of each and a median of small integers hides
 * the rate.
 */
export declare function cabinetPerTerm(outcomes: readonly BreakCount[]): Readonly<Record<CabinetOutcome, number>>;
