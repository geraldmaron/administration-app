import { type Person, type PersonId, type RoleId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import type { EffectPacket } from "./effects.js";
import { type InstitutionDef, type InstitutionId, type InstitutionRuntime, type OfficeDef } from "./institutions.js";
/** The seat every one of them is drawn for. */
export declare const CAREER_INCUMBENT_ROLE: RoleId;
export type CareerOffice = {
    readonly institution: InstitutionDef;
    readonly office: OfficeDef;
};
/**
 * Every leadership office the president fills that no cabinet secretary holds,
 * in catalog order.
 *
 * Catalog order rather than sorted, because it is the order the assignment is
 * keyed on: it is stable across builds by construction (the catalog is a
 * literal), so a save reopened on a later build finds the same person in the
 * same chair. A body appended to the catalog therefore takes the next unused
 * incumbent rather than displacing anybody already seated.
 */
export declare function careerOffices(): readonly CareerOffice[];
export type CareerSeating = {
    readonly people: Readonly<Record<string, PersonRuntime>>;
    readonly institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>;
};
/**
 * Seat an incumbent in every non-cabinet office that nobody is in.
 *
 * Pure over the two records and idempotent: an office that already has a
 * leader, an acting officer, or a person seated in it by an earlier pass is
 * left exactly as it is. That is what lets founding and the save migration
 * share one rule rather than two implementations of it that agree today.
 *
 * `implementationQuality` is re-derived for the bodies this seats, because that
 * is what the confirmation writer does for a leader the Senate confirms. A
 * seated office whose delivery still carried a vacancy drag would be the two
 * records disagreeing again, one turn before the tick corrected it.
 */
export declare function withCareerIncumbents(people: Readonly<Record<string, PersonRuntime>>, institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>): CareerSeating;
/**
 * The bodies below the cabinet whose heads are the President's own political
 * appointees rather than the next career official on the bench: the budget
 * office, the trade representative, the environmental regulator and the CIA.
 * An incoming President does not keep the last administration's people in
 * these chairs, and does not seat the other party's in them either.
 */
export declare const POLITICAL_OFFICE_INSTITUTIONS: readonly InstitutionId[];
/**
 * Open the political offices under a career acting.
 *
 * The heads of these four bodies leave with the administration that appointed
 * them, and the new President's picks wait on the Senate: in 2021 the EPA
 * Administrator was confirmed on March 10 and the Trade Representative on March
 * 17, and the budget office was still run by an acting on March 23, when the
 * Senate confirmed only its deputy (Senate roll call votes, 117th Congress, 1st
 * session). So each opens vacant with its senior career official acting on the
 * office's Vacancies Act clock, and filling it is the President's to do. Run
 * before the career sweep, which passes over a chair with an acting in it.
 */
export declare function withPoliticalActings(people: Readonly<Record<string, PersonRuntime>>, institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>): CareerSeating;
/** The acting records the political offices open with, keyed the way `selectActing` reads them. */
export declare function foundingActings(institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>): Readonly<Record<string, PersonId>>;
/**
 * The bench a campaign founded before this branch existed never drew.
 *
 * A save carries the seed it was founded on, and the pool is a pure function of
 * that seed keyed per role, so the incumbents a migrated campaign gets are
 * exactly the incumbents a campaign founded today on the same seed gets. The
 * role is generated last in the pool for precisely this reason: nobody already
 * in the save's cast moves, and nothing already seated is re-rolled.
 *
 * Takes the pool rather than the seed so that this module does not have to
 * reach back into founding, which reaches into it.
 */
export declare function withCareerBench(people: Readonly<Record<string, PersonRuntime>>, pool: readonly Person[]): Readonly<Record<string, PersonRuntime>>;
/** Which body this person runs, where they run one. */
export declare function selectInstitutionLedBy(campaign: Campaign, person: PersonId): InstitutionDef | undefined;
/** How far a for-cause removal bends the body, on the same 0..1 politicization reading the institution file uses. */
export declare const FOR_CAUSE_POLITICIZATION = 0.15;
/** A stated cause is not one act. Malfeasance bends the office harder than inefficiency. */
export declare const REMOVAL_POLITICIZATION: Readonly<Record<string, number>>;
/** What this removal writes onto politicization. An at-will departure writes nothing. */
export declare function removalPoliticization(forCause: boolean, cause?: string): number;
export type OfficerResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Remove the officer running a body below the cabinet.
 *
 * The counterpart to `dismissMinister`, and separate from it because these are
 * not cabinet chairs: there is no charter seat to empty, only an office and the
 * person in it. The chair is left open rather than refilled, so the vacancy and
 * the drag it accumulates are the price of the removal — exactly the price a
 * president pays for firing a Director in January and confirming a successor in
 * June.
 *
 * What the office may be removed *for* is the catalog's, not this function's:
 * an at-will office goes on the president's word, a for-cause office needs a
 * stated cause, and a term-protected one cannot be emptied at all. That is why
 * relieving a Chair of the Federal Reserve is a different kind of act from
 * replacing the Administrator of FEMA, and the difference is read off the same
 * table the confirmation path reads.
 */
export declare function removeOfficer(campaign: Campaign, id: InstitutionId, cause?: string): OfficerResult;
