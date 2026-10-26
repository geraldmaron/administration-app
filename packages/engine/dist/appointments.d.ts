import type { PersonId, RoleId } from "@admin/world";
import { type Campaign, type PersonRuntime } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { MetricCost, RiskBranch } from "./resolution.js";
import { type CabinetDeparture } from "./cabinet.js";
import { type InstitutionDef, type OfficeId } from "./institutions.js";
import { type NominationStage } from "./nomination-stages.js";
import type { Nomination } from "./nomination.js";
import { type FitPresident } from "./cast-fit.js";
export type AppointmentResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** The President as every shortlist reads them: their party, and where their politics sit. */
export declare function presidentFit(campaign: Campaign): FitPresident;
/**
 * Who the player could actually seat in a chair right now: their own nationals,
 * alive, eligible for that seat, not already holding another one, not acting
 * in another, and not before the Senate for one — ranked the way the founding
 * shortlist is, by fit to this President rather than by competence alone, so a
 * Treasury bench mid-term leads with the President's own side just as the one
 * on the first morning did.
 *
 * The pool is the campaign's own cast rather than a fresh draw, so the people
 * passed over at founding are exactly the people still available later. A
 * campaign cannot conjure a better candidate by waiting.
 */
export declare function selectAppointableFor(campaign: Campaign, role: RoleId, includeNominees?: boolean): readonly PersonRuntime[];
/**
 * What an act on a chair moves the week it lands, and what follows from it.
 *
 * Shaped for the terms row a screen already draws for every other priced act:
 * `cost` is every reading the packet moves, summed the way apply() will sum
 * it, and `risks` are the consequences past the week. A risk here is the
 * rule's own verdict rather than a roll, so it is stated as certain.
 */
export type AppointmentPrice = {
    readonly cost: MetricCost;
    readonly risks: readonly RiskBranch[];
};
export type DismissalProjection = ({
    readonly ok: true;
    readonly holder: PersonRuntime;
    readonly resentful: boolean;
} & AppointmentPrice) | {
    readonly ok: false;
    readonly reason: string;
};
/** The price of emptying a chair, which `dismissMinister` spends as it stands. */
export declare function projectDismissal(campaign: Campaign, role: RoleId): DismissalProjection;
/**
 * Remove the minister holding a chair. The chair is left empty: filling it is a
 * second decision with its own price, so a reshuffle is never a single costless
 * motion.
 */
export declare function dismissMinister(campaign: Campaign, role: RoleId): AppointmentResult;
/**
 * A confirmed officer holds the office on the record: their `currentRole`
 * names the chair, the same as a secretary seated at the founding. The
 * nomination pipeline once seated a confirmed nominee without writing it, and a
 * campaign that confirmed somebody then still holds an officer the rest of the
 * engine reads as unemployed and offers for every other job. Loading derives
 * the missing roles.
 *
 * Only from a confirmation: a nomination the Senate confirmed, for the office
 * a body's leader holds, whose body that same person still leads. An acting
 * officer was never confirmed and a removed one no longer leads, so neither is
 * touched. Nobody whose role is already set is touched either, which keeps the
 * Vice President and the White House staff exactly where the founding put them,
 * and a cabinet role another person already holds on the record is never
 * handed out a second time. Idempotent, so it is safe on every load.
 */
export declare function deriveConfirmedRoles(campaign: Campaign): Campaign;
/**
 * Who 5 U.S.C. 3345(a) lets act in a vacant Senate-confirmed office.
 *
 * The first assistant, a person already confirmed to another Senate-confirmed
 * office, or a senior employee of the same agency. The bench is the engine's
 * record of the agency's own senior people; its first name is the first
 * assistant, taken to have served the 90 days the nominee exception asks
 * about because a first assistant is a holdover the transition inherits.
 */
export type ActingClass = "first-assistant" | "confirmed-officer" | "senior-employee";
export declare function actingClassOf(campaign: Campaign, def: InstitutionDef, person: PersonRuntime): ActingClass | undefined;
/**
 * What submitting a nomination does to the nominee's own acting service.
 * 5 U.S.C. 3345(b)(1) bars a nominee from acting unless they were the first
 * assistant, and the bar applies from the day the nomination is submitted, so
 * an acting named first and nominated afterward stops acting that day and
 * leaves the office with nobody signing.
 */
export declare function nominationEndsActing(campaign: Campaign, seat: RoleId | OfficeId, nominee: PersonId): readonly Effect[];
/**
 * What a nomination's life does to the acting officer's clock, 5 U.S.C.
 * 3346(a)(2) and (b). Submission of a first or second nomination tolls the 210
 * days for as long as it is pending; its rejection, withdrawal or return
 * restarts them from that day. A third nomination changes nothing. The clock
 * is the one `actingLapseDay` stamps; this rewrites it, and the institution
 * phase's lapse check keeps reading the same field. An office whose acting ran
 * out its 210 days before the nomination was submitted names one again, since
 * 3345(a) still says who may act.
 */
export declare function actingClockEffects(campaign: Campaign, nomination: Nomination, stage: NominationStage, day: number): readonly Effect[];
/**
 * An older save's acting clock was stamped before the office's nominations
 * moved it, so a nomination already pending when it loads would otherwise let
 * the acting lapse. Reads the same rule the live clock does.
 */
export declare function reconcileActingClocks(campaign: Campaign): Campaign;
/**
 * The day an acting officer's authority lapses under 5 U.S.C. 3346(a)(1):
 * 210 days from the day the vacancy occurred, not the day somebody was named.
 * A vacancy open in the 60 days after an inauguration starts its 210 days at
 * the later of 90 days after the inauguration and 90 days after the vacancy
 * (3349a). `actingClockEffects` tolls and restarts it as nominations come and go.
 */
export declare function actingLapseDay(vacancyDay: number, limitDays: number): number;
/**
 * What seating an acting writes, where the seat can take one: the acting record
 * and the body's own acting authority, together. Two records, one change,
 * because the body's authority is what lapses under the Vacancies Act and the
 * acting record is what every screen asks.
 */
export declare function actingEffects(campaign: Campaign, seat: RoleId | OfficeId, person: PersonId, fromDay?: number): {
    readonly ok: true;
    readonly effects: readonly Effect[];
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Seat somebody in a role or an office without a confirmation.
 *
 * Every seat on the board used to be either confirmed or empty, which is not
 * how the executive branch runs: a secretary resigns on a Friday, the deputy
 * runs the department on Monday, and the Senate gets to the nomination months
 * later or never. An acting signs for the office and carries none of its
 * mandate, so the office runs worse than it would under a confirmed officer
 * and far better than it does under nobody.
 */
export declare function appointActing(campaign: Campaign, seat: RoleId | OfficeId, person: PersonId): AppointmentResult;
/**
 * Who is holding a seat in an acting capacity, if anyone.
 *
 * The body's own authority is the one that lapses, so an acting whose body no
 * longer carries them is nobody's acting any more, whatever the acting record
 * still says.
 */
export declare function selectActing(campaign: Campaign, seat: RoleId | OfficeId): PersonId | undefined;
/**
 * Who is running a chair's department this week: the confirmed Secretary, or
 * failing one the acting. The reading a program, a directive or anything else
 * that needs somebody to sign for a department asks, because an acting signs
 * for the office — that is what the arrangement is for.
 */
export declare function selectChairRunner(campaign: Campaign, role: RoleId): PersonRuntime | undefined;
/**
 * Who would act in a chair the moment it empties: the strongest free name on
 * the chair's own bench, the way a department's senior deputy steps up. Never
 * somebody already acting elsewhere, and never the person leaving.
 */
export declare function deputyFor(campaign: Campaign, role: RoleId, leaving?: PersonId): PersonId | undefined;
/**
 * Empty a chair the way the executive branch empties one: the departure on the
 * record, and the chair's senior deputy acting from the same day.
 *
 * The one path a chair leaves by, for a resignation, a dismissal, an accepted
 * offer or a public break alike — and the path an authored card that narrates
 * a resignation has to take, so a card cannot say a Secretary walked out while
 * the Secretary stays seated.
 */
export declare function vacates(campaign: Campaign, role: RoleId, departure: CabinetDeparture, person: PersonId, turn?: number, fromDay?: number): readonly Effect[];
