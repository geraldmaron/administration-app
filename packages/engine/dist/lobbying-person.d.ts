import type { PersonId, StateId } from "@admin/world";
import type { Campaign, HillFigure, HillPostId, LobbyApproach } from "./state.js";
import type { Effect } from "./effects.js";
import { type HillMember } from "./hill.js";
import { type TieEffect } from "./ties.js";
/**
 * How far back a second call with nothing asked still reads as a second call.
 *
 * Three weeks: inside a month a member's office remembers the last time the
 * White House rang, and a call that asks for nothing reads as the President
 * checking up rather than asking. Authored in days so it means the same at any
 * pace; turned into turns where it is checked.
 */
export declare const REPEAT_CALL_WINDOW_DAYS = 21;
/** What a call repeated for nothing costs with the member. */
export declare const REPEAT_CALL_RAPPORT = -0.03;
/** Why it cost that, on the member's tie. */
export declare const REPEAT_CALL_CAUSE = "It was another call inside three weeks with nothing to ask.";
/** What the President's caucus leaders think of a budget deal cut with the other side. */
export declare const ACROSS_THE_AISLE_TRADE_RESENTMENT = -0.02;
/** What the President's caucus leaders think of credit handed to someone who is not them. */
export declare const SHARED_CREDIT_RESENTMENT = -0.03;
/** What the other side's leaders think of the President campaigning for one of the President's own in their member's state. */
export declare const CAMPAIGN_RESENTMENT = -0.02;
/** The weight of the grudge a member keeps after a public appeal against them failed. */
export declare const PUBLIC_MISS_GRUDGE = 0.25;
/**
 * The lowest standing in a member's home state at which a public appeal is
 * open: the state has to lean the administration's way at all, or the voters
 * being asked to lean on the member are not the President's to ask.
 */
export declare const PUBLIC_APPEAL_MIN_STANDING = 0;
/** How far campaigning beside a member moves their state toward the member's party. */
export declare const CAMPAIGN_LEAN = 0.01;
/** What campaigning beside them does to their trust, if they answer and if they do not. */
export declare const CAMPAIGN_TRUST: {
    readonly landed: 0.06;
    readonly missed: 0.03;
};
/**
 * Whether the member sits across the aisle from the President.
 *
 * Read the way the party words read it: a leader in the administration caucus
 * is of the President's party, or of the caucus an independent President sits
 * nearest, and neither is "the other party". Only the opposition caucus is.
 */
export declare function acrossTheAisle(figure: HillFigure): boolean;
export type Resentment = {
    readonly person: PersonId;
    readonly post: HillPostId;
    readonly name: string;
    readonly delta: number;
    readonly cause: string;
};
/**
 * Who holds this play against the President, by how much, and why. For a
 * budget negotiation it is charged only if the member takes the deal; for
 * shared credit and a campaign stop it is charged when the President acts.
 */
export declare function resentmentsFor(campaign: Campaign, member: HillMember, approach: LobbyApproach, title: string, matterTitle: string | undefined): readonly Resentment[];
export declare function resentmentEffects(resentments: readonly Resentment[]): readonly TieEffect[];
/** The people table with the resentments landed: for a projection, never a write. */
export declare function peopleResenting(people: Campaign["people"], resentments: readonly Resentment[]): Campaign["people"];
/**
 * What a call costs the member when it asks for nothing and they were called
 * inside the window: zero otherwise. A call with live business behind it is
 * never "for nothing", however often it is made.
 */
export declare function repeatCallPenalty(campaign: Campaign, post: HillPostId, asking: boolean, asOfTurn: number): number;
export declare function homeStateOf(member: HillMember): StateId | undefined;
/** How the administration stands in the member's home state, −1..1; undefined when their state is not on the record. */
export declare function homeAlignment(campaign: Campaign, member: HillMember): number | undefined;
/**
 * Why a public appeal is closed, when the member's own voters lean against the
 * administration. A member whose home state is not on the record is not
 * refused: there is no reading to refuse on.
 */
export declare function publicAppealRefusal(campaign: Campaign, member: HillMember): string | undefined;
export type CreditMatter = {
    readonly billId: string;
    readonly title: string;
};
/** The first live bill whose law would move opinion for the President and whose credit is still the President's to give. */
export declare function creditMatter(campaign: Campaign): CreditMatter | undefined;
export declare const NO_CREDIT_TO_SHARE = "No bill on the floor would move the country toward the President, so there is no credit to share.";
/** The bill, rewritten with the credit filed on it, so the enactment reads what was given away. */
export declare function creditFiling(campaign: Campaign, member: HillMember, matter: CreditMatter): Effect | undefined;
export type CampaignCharge = {
    readonly state: StateId;
    readonly stateName: string;
    readonly leanAfter: number;
    /** The administration's standing there, before and after the stop. */
    readonly standingBefore: number;
    readonly standingAfter: number;
    readonly effects: readonly Effect[];
};
export declare const NO_HOME_STATE = "Their home state is not on the record, so there is nowhere to campaign beside them.";
/** What a campaign stop beside the member charges, built from the state it is shown on. Undefined with no home state. */
export declare function campaignCharge(campaign: Campaign, member: HillMember, title: string): CampaignCharge | undefined;
/** Shared daily attention accounting for authorized Hill and ordinary-member outreach. */
export declare function outreachAttentionSpent(campaign: Campaign): number;
export declare const OUTREACH_DAILY_LIMIT = 2;
