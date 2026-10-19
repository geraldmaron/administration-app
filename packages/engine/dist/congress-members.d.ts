import { type Person, type PersonId, type StateId } from "@admin/world";
import { type CampaignSeed } from "./rng.js";
import type { Campaign, Congress, Chamber, UsParty } from "./state.js";
export type CongressMember = {
    readonly seat: string;
    readonly chamber: Chamber;
    readonly state: StateId;
    readonly person: PersonId;
    readonly party: UsParty;
    readonly seatClass?: 1 | 2 | 3;
};
/** The existing cast generator supplies electoral replacements, never a parallel person table. */
export declare function congressionalBench(pool: readonly Person[], seed: CampaignSeed): readonly Person[];
/** One seat writer, after apportionment; same-party incumbents retain their identities and ties. */
export declare function seatCongressMembers(congress: Congress, states: Campaign["states"], people: Campaign["people"], turn?: number): Congress;
/** Runtime offices agree with the post writer; an unmatched committee holder is a vacancy. */
export declare function withCongressMemberOffices(people: Campaign["people"], congress: Congress): Campaign["people"];
/** Prospective migration adds today's members, preserving every stored historical vote. */
export declare function withCongressMembers(campaign: Campaign): Campaign;
