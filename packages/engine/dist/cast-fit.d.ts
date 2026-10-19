import type { IdeologyVector, Person } from "@admin/world";
import type { AdministrationParty, UsParty } from "./state-legislature.js";
/** How a fit reads on a card. */
export type FitBand = "strong" | "good" | "fair" | "poor";
/** One person weighed against the President, before the list they are offered on is known. */
export type PersonFit = {
    readonly person: Person;
    /** 0..1, higher fits better: politics beside the President's, and competence. Party is not in it. */
    readonly fit: number;
    /** Of the President's own party. Always false for an Independent President, who has none. */
    readonly coPartisan: boolean;
    /** Of the other party, or of none while the President has one. */
    readonly crossesTheAisle: boolean;
};
/** A person as a shortlist offers them: their fit, banded against the best fit on the same list. */
export type CandidateFit = PersonFit & {
    readonly band: FitBand;
};
/** What a ranking needs to know about the President. */
export type FitPresident = {
    readonly party: AdministrationParty;
    readonly ideology: IdeologyVector;
};
/** The party a person carries on the American ticket, or none. */
export declare function usPartyOfPerson(person: Pick<Person, "party">): UsParty | undefined;
/** 1 for the same politics, 0 for opposite ends on every axis. */
export declare function ideologyCloseness(a: IdeologyVector, b: IdeologyVector): number;
/**
 * Whether seating this person reaches across the aisle. An Independent
 * President sits with the caucus nearest their economics, so the aisle they
 * cross is the one between that caucus and the other.
 */
export declare function crossesTheAisle(person: Pick<Person, "party">, president: FitPresident): boolean;
export declare function candidateFit(person: Person, president: FitPresident): PersonFit;
/** Best fit first: the President's own party, then the closest politics, then the most capable. Unbanded. */
export declare function orderByFit(candidates: readonly Person[], president: FitPresident): readonly PersonFit[];
/**
 * Every candidate on a list banded against the best fit on that same list, so
 * the band says how this name compares with the others offered for the post.
 * Call it on the list as shown: a name filtered off it cannot set the bar.
 */
export declare function bandedAgainstList<T extends PersonFit>(list: readonly T[]): readonly (T & {
    readonly band: FitBand;
})[];
/** The whole list ranked best fit first and banded against itself. */
export declare function rankByFit(candidates: readonly Person[], president: FitPresident): readonly CandidateFit[];
