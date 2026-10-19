import { type Campaign, type FamilyDisposition, type GameDate } from "@admin/engine";
/** One story as the Record lists it: running, or finished and how. */
export type ArcRow = {
    readonly family: string;
    /** The opener's subject as the President first read it. */
    readonly title: string;
    /** The country the arc was about, by name. */
    readonly counterpart: string;
    readonly openedDate: GameDate;
    readonly closedDate?: GameDate;
    readonly disposition?: FamilyDisposition;
    /** Weeks from the opener to the close, or to today for a story still running. Computed, never typed. */
    readonly weeks: number;
    /** How many decisions the arc put in front of the President. */
    readonly chapters: number;
};
export type ArcReading = {
    readonly finished: readonly ArcRow[];
    readonly running: readonly ArcRow[];
    /**
     * The newest close, when the stretch since it is longer than `ARC_QUIET_DAYS`:
     * a term that has not finished anything in a quarter is a thing the Record
     * says rather than leaves the player to notice.
     */
    readonly quietSince?: GameDate;
};
/** How long without a close before the Record says so. A reporting threshold, not a mechanic. */
export declare const ARC_QUIET_DAYS = 84;
/** The words the Record prints for each ending, at one weight: a lost arc is not a smaller line than a held one. */
export declare const ARC_DISPOSITION_WORDS: Readonly<Record<FamilyDisposition, string>>;
/** Every arc the administration has opened, finished first (newest close first), then what is still running. */
export declare function selectArcReading(campaign: Campaign): ArcReading;
/**
 * Arcs that ended between two readings of the same campaign, newest first:
 * the one line a stop brief owes the player when a story closed while the
 * world was running, whether it was answered or lapsed.
 */
export declare function arcsClosedBetween(before: Campaign, after: Campaign): readonly ArcRow[];
