import type { PersonId, RoleId } from "@admin/world";
import type { CaucusReadings } from "./caucus-count.js";
import { type CaucusVote, type VoteQuestion } from "./congress-votes.js";
import { type Campaign } from "./state.js";
import type { Effect } from "./effect-types.js";
/**
 * How far clear of the majority a pick has to be to be confirmed on the first
 * day rather than sent to the calendar. Five votes, because inside five a
 * single committee finding or a bad hearing is the whole margin.
 */
export declare const CONSENSUS_MARGIN = 5;
/**
 * What a President's own Secretaries give up in loyalty when a chair goes to
 * the other party: two points each, about one overruling's worth, because it
 * is read as a judgment about them.
 */
export declare const CROSSING_LOYALTY_COST = -0.02;
/** Whether this nominee sits across the aisle from the President. A nominee of no party does not. */
export declare function nomineeCrossesTheAisle(campaign: Campaign, nominee: PersonId): boolean;
/** Each caucus's reading of this nominee, or none for a nominee from the President's own side. */
export declare function nomineeReadings(campaign: Campaign, nominee: PersonId): CaucusReadings | undefined;
/** The question a confirmation puts to the Senate. */
export declare function confirmationQuestion(campaign: Campaign, nominee: PersonId): VoteQuestion;
/** The Senate's count on this nominee today, tallied by caucus. */
export declare function confirmationVote(campaign: Campaign, nominee: PersonId): CaucusVote;
/**
 * The House's count on a nominee it must also confirm: the Vice President
 * under the Twenty-fifth Amendment, section 2, "by a majority vote of both
 * Houses". The same question as the Senate's, put to the House and counted
 * over its seated members.
 */
export declare function houseConfirmationVote(campaign: Campaign, nominee: PersonId): CaucusVote;
/** Whether a count clears the majority comfortably enough to need no fight. */
export declare function isConsensus(vote: Pick<CaucusVote, "yeas" | "required">): boolean;
/**
 * What seating a nominee from across the aisle costs inside the cabinet: every
 * seated Secretary of the President's own side takes it a little personally.
 * Empty for a nominee from the President's own side.
 */
export declare function crossingLoyaltyEffects(campaign: Campaign, nominee: PersonId, role?: RoleId): readonly Effect[];
