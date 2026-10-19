import { type NationId, type Person, type PersonId, type RoleId, type WhiteHouseStaff } from "@admin/world";
import { type FitPresident } from "./cast-fit.js";
import { type InstitutionId, type InstitutionRuntime } from "./institutions.js";
import type { LeaderDraft } from "./leader.js";
import type { PersonRuntime } from "./state.js";
import { type TicketPresident } from "./vice-president.js";
/** A refusal in the player's terms, keyed by the choice it is about. */
export type CastRejection = {
    readonly subject: string;
    readonly explanation: string;
};
export type FoundingCast = {
    readonly runningMate?: PersonId;
    readonly staff: WhiteHouseStaff;
};
export type CastChoices = {
    readonly cabinet: Readonly<Record<RoleId, PersonId>>;
    readonly runningMate?: PersonId;
    readonly staff?: WhiteHouseStaff;
};
/** The President as the ticket reads them, from the draft and the person it composed. */
export declare function ticketPresident(draft: LeaderDraft, leader: Pick<Person, "birthplace"> | undefined): TicketPresident;
/**
 * The running mate and the staff the seal will seat: each one chosen, or the
 * best fit the founding would have offered first. Filled in a fixed order —
 * the ticket, then the posts in the order they are listed — so the same
 * choices always seat the same people.
 */
export declare function resolveFoundingCast(pool: readonly Person[], nation: NationId, president: TicketPresident, choices: CastChoices): FoundingCast;
export declare function castRejections(pool: readonly Person[], nation: NationId, president: FitPresident, choices: CastChoices): readonly CastRejection[];
/**
 * The runtimes, with the ticket and the staff in their posts. Done before the
 * Hill, the statehouses and the bureaus are seated, so none of those sweeps
 * seats somebody the President has already taken.
 */
export declare function seatFoundingCast(people: Readonly<Record<string, PersonRuntime>>, cast: FoundingCast): Readonly<Record<string, PersonRuntime>>;
export declare function withFoundingCastOffices(institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>, cast: FoundingCast): Readonly<Record<InstitutionId, InstitutionRuntime>>;
