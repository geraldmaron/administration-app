import type { Nation, NationId } from "@admin/world";
import { type ContestDials } from "./contest-dials.js";
import { nuclearReading } from "./forces.js";
import type { InstrumentId, RungLevel } from "./instruments.js";
/** One side of one layer: a number the model uses, and the evidence a player reads. */
export type ContestSide = {
    readonly score: number;
    /** The evidence in one short phrase — a count, a share, a graded word. */
    readonly figure: string;
    /** What that side is bringing, named. */
    readonly caption: string;
};
export type ContestLayer = {
    readonly id: string;
    readonly label: string;
    /** What this layer decides, in a sentence. */
    readonly question: string;
    readonly weight: number;
    readonly yours: ContestSide;
    readonly theirs: ContestSide;
    /** −1..1. Positive is yours. */
    readonly edge: number;
};
export type Contest = {
    readonly instrument: InstrumentId;
    readonly actor: NationId;
    readonly target: NationId;
    readonly layers: readonly ContestLayer[];
    /** −1..1, the weighted sum of every layer's edge, after habituation. */
    readonly edge: number;
    /** 0..1 before any rung, minister or arsenal is applied. */
    readonly baseChance: number;
};
export type ContestInput = {
    readonly actor: Nation;
    readonly target: Nation;
    readonly instrument: InstrumentId;
    /** The relationship's own temperature, 0..1. */
    readonly tension: number;
    /** What repetition has taught the target, 0..1. */
    readonly habituation?: number;
    /** Geography's price on anything that has to physically arrive. 1 when adjacent. */
    readonly distanceMultiplier?: number;
    /** The rung contemplated, where the act changes which arm decides it. Absent for a matchup with no act proposed. */
    readonly rung?: number;
    readonly dials?: ContestDials;
};
/**
 * The contest, and the odds it implies before rung, minister or arsenal.
 *
 * Habituation is taken off the edge rather than added to one side: repetition
 * does not make a target's navy bigger, it makes this particular move less
 * surprising, and that is a fact about the pair rather than about either of
 * them.
 */
export declare function assessContest(input: ContestInput): Contest;
/** What a rung does to a contest's own odds — the difficulty of the act, separate from the matchup. */
export declare function rungReliability(rung: RungLevel, dials?: ContestDials): number;
export { nuclearReading };
