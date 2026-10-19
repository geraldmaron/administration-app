import { type Campaign } from "@admin/engine";
/**
 * How divided the country is, as the engine holds it: the era's level, which
 * the founding public is read at, plus what this administration has added or
 * healed, kept inside the range one term can reach. Division sets how far
 * apart the parties start and how little a President's own identifiers move on
 * the record, so it is read beside what it costs rather than as a score.
 *
 * What the ledger recorded is kept for attribution: every entry that moved the
 * stock, with the actor that ordered it.
 */
export type PolarizationMove = {
    readonly turn: number;
    readonly description: string;
    /** Signed, in stock units: positive divided the country further, negative gave some back. */
    readonly delta: number;
};
export type PolarizationReading = {
    /** The stock now; the era's level is `anchor`. */
    readonly value: number;
    /** The era's level, where a public with nothing added or healed sits. */
    readonly anchor: number;
    /** What this administration has added (positive) or healed (negative), in stock units. */
    readonly drift: number;
    /** The least and most a term can move the stock from the anchor. */
    readonly driftMin: number;
    readonly driftMax: number;
    /** Where the stock sits along the range a term can reach, 0 at its floor and 1 at its ceiling; the anchor sits at `anchorAt`. */
    readonly position: number;
    readonly anchorAt: number;
    /** The stock as a share above (or below) the era's level: 0.04 reads "4 percent more divided". */
    readonly againstEra: number;
    /** How much an identifier of the President's own party moves on the record, against an independent's 1: now, and at the era's level. */
    readonly ownIdentifierMovement: {
        readonly now: number;
        readonly atEra: number;
    };
    /** What the drift is worth to the headline, in share of the country: now against the same week at the era's level. */
    readonly headlineEffect: number;
    /** The stock at every closed week the campaign observed, oldest first. */
    readonly series: readonly number[];
    /** What this administration's own decisions added. Never negative. */
    readonly addedByUs: number;
    /** What the world added without being asked. */
    readonly addedByTheWorld: number;
    /** What was given back. Never negative. */
    readonly healed: number;
    /** The single decision that divided the country most, if any did. */
    readonly heaviest?: PolarizationMove;
};
export declare function polarizationReading(campaign: Campaign): PolarizationReading;
