import type { NationId, Person, PersonId, StateId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type CandidateFit, type FitPresident } from "./cast-fit.js";
/** The seats a running mate is drawn from. */
export declare const RUNNING_MATE_BENCH_ROLES: readonly string[];
/** As deep as a cabinet chair's shortlist, for the same reason: a real choice, still skimmable. */
export declare const RUNNING_MATE_SHORTLIST = 5;
/** The President as a ticket reads them. */
export type TicketPresident = FitPresident & {
    readonly age: number;
    /** Absent, the region term reads as neutral rather than as a match. */
    readonly homeState?: StateId;
};
export type RunningMateCandidate = CandidateFit & {
    /** 0..1: how much the pairing adds to the ticket. */
    readonly balance: number;
    readonly homeState?: StateId;
};
/**
 * Whether this person can run on the President's ticket. A party President's
 * running mate is of that party. An Independent has no party to share, so the
 * ticket takes a fellow independent or a member of the caucus they sit nearest.
 */
export declare function isOnTheTicket(person: Pick<Person, "party">, president: FitPresident): boolean;
/** How much this person adds to the President's ticket, 0..1. */
export declare function ticketBalance(president: TicketPresident, person: Person): number;
/** Whether this person comes from the part of the cast a running mate is drawn from. */
export declare function onRunningMateBench(person: Person, nation: NationId): boolean;
/** Everyone who could share the ticket, before any ranking. */
export declare function runningMateBench(pool: readonly Person[], nation: NationId, president: FitPresident): readonly Person[];
/** The shortlist, best-balanced first, leaving out anyone the founding has already placed elsewhere. */
export declare function runningMateCandidates(pool: readonly Person[], nation: NationId, president: TicketPresident, placed?: ReadonlySet<string>): readonly RunningMateCandidate[];
/**
 * How far the Vice President moves the Senate as its presiding officer.
 *
 * Presiding over the Senate is the office's one constitutional job beyond
 * waiting, and it is worth something in the room: a President of the Senate who
 * served there and whose politics sit near its majority knows the members and
 * is heard by them, and one who did neither is a gavel. Bounded where it is read
 * (`senateLiaison`), and signed, because a Vice President the majority does not
 * trust costs the administration a little in the room they preside over.
 */
export declare function vicePresidentLiaison(campaign: Campaign, person: PersonId): number;
/**
 * The vice presidency filled: the record of who holds it and the Senate's
 * presiding officer move together, so a Vice President confirmed under the
 * Twenty-fifth Amendment presides and breaks ties as an elected one does.
 */
export declare function withVicePresident(campaign: Campaign, person: PersonId): Campaign;
/** The vice presidency emptied: nobody presides, nobody breaks a tie, and the Speaker stands next in line. */
export declare function withoutVicePresident(campaign: Campaign): Campaign;
