import type { Charter } from "@admin/world";
import { type CaucusVote } from "./congress-votes.js";
import type { Campaign, RemovalArc } from "./state.js";
/**
 * Where the President's own identifiers' approval has to fall before their
 * party's officers will move against them: seven in ten still approving is
 * deeper than any President's own party has gone in Gallup's series outside
 * Nixon's last months. At the 2020s stock that is a headline in the mid
 * twenties. Design judgment, labeled.
 */
export declare const INABILITY_OWN_LINE = 0.7;
/** How long below that line before the declaration comes: a full season, so one bad quarter is not an inability. Design judgment, labeled. */
export declare const INABILITY_SUSTAIN_DAYS = 91;
/** How long after a failed declaration before another can be made: half a year. Design judgment, labeled. */
export declare const INABILITY_RETRY_DAYS = 182;
export type InabilityState = {
    /** The turn the President's own identifiers went below the line, while they stay there. */
    readonly belowSince?: number;
    /** The turn the last declaration failed in Congress. */
    readonly failedTurn?: number;
};
export type InabilityCount = {
    readonly ownIdentifiers: number;
    readonly breaking: number;
    readonly house: CaucusVote;
    readonly senate: CaucusVote;
    readonly passed: boolean;
};
/** The week's update of the inability watch: when the President's own side went under the line, if it has. */
export declare function nextInabilityState(campaign: Campaign, ownIdentifiers: number): InabilityState;
/** Whether a declaration is due this week. */
export declare function inabilityDeclarationDue(campaign: Campaign, state: InabilityState): boolean;
/** Two thirds of each chamber, with the President's own caucus breaking by their identifiers. */
export declare function countInability(campaign: Campaign, ownIdentifiers: number): InabilityCount;
export declare const INABILITY_ENDING = "The Vice President and a majority of the cabinet declared the President unable to discharge the office, and two thirds of each chamber upheld them. No charge was brought; the President's own party had given up.";
/**
 * The inability path's week: the watch updated, and, when a declaration is due
 * on a charter that removes by impeachment, the count and its outcome. Returns
 * the arc as it stands after the week.
 */
export declare function advanceInability(campaign: Campaign, charter: Charter, arc: RemovalArc): {
    readonly arc: RemovalArc;
    readonly count?: InabilityCount;
};
