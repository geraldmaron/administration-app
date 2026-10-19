import type { Person, RoleId } from "@admin/world";
import type { Campaign, LobbyApproach } from "./state.js";
import type { HillMember } from "./hill.js";
import type { Term } from "./willingness.js";
/**
 * Whose Secretary carries a bill, by the Senate committee that marks it up.
 *
 * Commerce, Science, and Transportation and Environment and Public Works both
 * write the highway and transit titles, which the Secretary of Transportation
 * testifies for. Banking and Finance are both the Treasury's: the money a bill
 * raises or a market it steadies is the Secretary of the Treasury's to defend.
 */
export declare const ACT_ADVOCATE: Readonly<Record<string, RoleId>>;
export type LobbyAdvocate = {
    readonly role: RoleId;
    readonly billId: string;
    /** Who makes the case: the Secretary, or the acting officer. Absent when the chair is empty. */
    readonly person?: Person;
    /** Whether the member and the advocate sit in the same party. */
    readonly sameParty: boolean;
    /** The term the member weighs. */
    readonly value: number;
};
/**
 * Who makes the case for this bill to this member, and what it is worth. Only
 * for a private ask: a public appeal goes over the member's head to their
 * voters, where no Secretary is in the room.
 */
export declare function lobbyAdvocate(campaign: Campaign, member: HillMember, approach: LobbyApproach, billId: string | undefined): LobbyAdvocate | undefined;
/** The advocate as the member weighs it: one term, or none where no Secretary carries the bill. */
export declare function advocateTerms(campaign: Campaign, member: HillMember, approach: LobbyApproach, billId: string | undefined): readonly Term[];
