import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
/**
 * What a week of lapsed appropriations costs the country's footing.
 *
 * Ten times the friction of governing on the prior year's numbers, which is
 * the ratio the two facts actually stand in: one is a government that cannot
 * plan, the other is a government that has stopped. Charged on top of that
 * friction rather than instead of it — a shutdown does not suspend the fact
 * that there is still no budget.
 */
export declare const LAPSE_STABILITY_COST = 0.04;
export type ShutdownReading = {
    readonly begunTurn: number;
    /** Full weeks the government has been closed, counted from the first one. */
    readonly weeks: number;
    readonly days: number;
    /** Bodies whose non-excepted work has stopped, largest first. */
    readonly closed: readonly string[];
    /** Bodies riding it at half, because their money is not all appropriated. */
    readonly insulated: number;
};
/**
 * The shutdown as a player reads it: how long, and what has stopped.
 *
 * `undefined` when the government is open, so a surface asks one question
 * rather than reading a status field and then deciding whether to believe it.
 */
export declare function selectShutdown(campaign: Campaign): ShutdownReading | undefined;
/**
 * The week the money is or is not there.
 *
 * Runs after the chamber has voted and the President has had the desk, so a
 * stopgap passed this week has already moved the date this phase reads.
 */
export declare const shutdownPhase: TurnPhase;
