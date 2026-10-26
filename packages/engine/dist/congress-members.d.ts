import { type Person, type PersonId, type StateId } from "@admin/world";
import { type CampaignSeed } from "./rng.js";
import type { TieEffect } from "./ties.js";
import type { Campaign, Congress, Chamber, GameDate, UsParty } from "./state.js";
/**
 * A seat its member left by dying. The roster keeps the late member's id so a
 * roll call still has the seat to count, and counts it as no vote, until the
 * seat is filled on `fillsOn` by the governor's appointee or by the voters.
 */
export type SeatVacancy = {
    readonly since: GameDate;
    readonly path: "appointment" | "special-election";
    readonly fillsOn: GameDate;
};
export type CongressMember = {
    readonly seat: string;
    readonly chamber: Chamber;
    readonly state: StateId;
    readonly person: PersonId;
    readonly party: UsParty;
    readonly seatClass?: 1 | 2 | 3;
    readonly vacancy?: SeatVacancy;
    /** An appointed senator holds the seat until the voters fill it on this day. */
    readonly electionDue?: GameDate;
};
/** The existing cast generator supplies electoral replacements, never a parallel person table. */
export declare function congressionalBench(pool: readonly Person[], seed: CampaignSeed): readonly Person[];
/** One seat writer, after apportionment; same-party incumbents retain their identities and ties. */
export declare function seatCongressMembers(congress: Congress, states: Campaign["states"], people: Campaign["people"], turn?: number): Congress;
/** Runtime offices agree with the post writer; an unmatched committee holder is a vacancy. */
export declare function withCongressMemberOffices(people: Campaign["people"], congress: Congress): Campaign["people"];
/** Prospective migration adds today's members, preserving every stored historical vote. */
export declare function withCongressMembers(campaign: Campaign): Campaign;
/** Unseated people the cast offers a party for a seat in Congress, in a fixed order. */
export declare function memberCandidates(people: Campaign["people"], party: UsParty, taken?: ReadonlySet<string>): readonly PersonId[];
export declare function caucusOf(congress: Congress, party: UsParty): "administration" | "opposition" | "independent";
/** One seat rewritten. A change of party moves the chamber's count with it, so the roster and the count agree. */
export declare function withMember(congress: Congress, seat: string, next: CongressMember): Congress;
/**
 * The posts and panels after a seat changed hands mid-term: a late Speaker or
 * chair is replaced from the chamber, and a Senate that changed majority hands
 * its gavels across, by the same writers an election uses.
 */
export declare function reseatPosts(congress: Congress, people: Campaign["people"], turn: number): {
    readonly congress: Congress;
    readonly ties: readonly TieEffect[];
};
