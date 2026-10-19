import { type Campaign, type ConstitutionalMilestone, type DepartureTransition, type ExecutiveOrderRecord, type InstitutionRuntime, type Nomination, type PendingRule, type ReportObligation } from "@admin/engine";
import type { SummonsDue } from "./types";
/**
 * When the clocks the executive branch runs on its own account come due.
 *
 * The reading half of `clocks-executive.ts`. Several of these are measured in
 * ordinal days rather than turns, because the statute is: a war powers report is
 * owed inside forty-eight hours, and rounding that to a week would misstate the
 * obligation in the direction of comfort. `dueInDays` keeps the day count as the
 * record and derives the turn from it, rather than the other way round.
 */
/**
 * A day count turned into the turn it falls in, for a history line that reads
 * in weeks. Inauguration is day 0 and turn 1, and every day the engine writes
 * is a multiple of the turn length, which is exactly where rounding up would
 * have put a first-week introduction of force in "week 0".
 */
export declare function turnOfDay(day: number): number;
export declare const INSTITUTION_NAMES: ReadonlyMap<string, string>;
export declare function unfiledObligation(campaign: Campaign): ReportObligation | undefined;
export declare function targetName(campaign: Campaign, obligation: ReportObligation): string;
export declare function reportTitle(campaign: Campaign, obligation: ReportObligation): string;
export declare function reportDue(campaign: Campaign): SummonsDue | undefined;
/**
 * The introduction closest to the point where the force must come home, among
 * those the statute actually counts down: a rung below hostilities, an
 * authorized introduction or a force already brought out runs no clock, and a
 * summons over one would tell the President a deadline that does not exist.
 */
export declare function nearestTermination(campaign: Campaign): ReportObligation | undefined;
export declare function terminationTitle(campaign: Campaign, obligation: ReportObligation): string;
export declare function terminationDue(campaign: Campaign): SummonsDue | undefined;
/** Days until a nomination's current stage is up, which is when the next thing has to happen. */
export declare function stageDaysLeft(campaign: Campaign, nomination: Nomination): number;
export declare function nearestNomination(campaign: Campaign): Nomination | undefined;
export declare function nominationTitle(campaign: Campaign, nomination: Nomination): string;
export declare function nominationDue(campaign: Campaign): SummonsDue | undefined;
export declare function nearestRuling(campaign: Campaign): ExecutiveOrderRecord | undefined;
export declare function rulingTitle(order: ExecutiveOrderRecord): string;
export declare function rulingDue(campaign: Campaign): SummonsDue | undefined;
/** The proceeding closest to binding the country, which is the one the week is about. */
export declare function nearestRule(campaign: Campaign): PendingRule | undefined;
export declare function ruleEffectiveTitle(rule: PendingRule): string;
export declare function ruleEffectiveDue(campaign: Campaign): SummonsDue | undefined;
/** Weeks Congress still has to write a resolution of disapproval against a landed rule. */
export declare function disapprovalWeeksLeft(campaign: Campaign, rule: PendingRule): number;
/**
 * The landed rule Congress could still take back, and against which it has not
 * yet moved.
 *
 * Once a resolution of disapproval is actually introduced it is a bill on the
 * desk, and the desk clock owns that fact. This clock is the window before
 * that: a rule of the President's that binds today and might not next month.
 */
export declare function exposedRule(campaign: Campaign): PendingRule | undefined;
/**
 * How long a landed rule is worth a badge.
 *
 * The window runs nine weeks, but Congress moves on the rule that has just
 * landed — the engine picks the newest one — so the exposure is real in the
 * first fortnight and theoretical after it. A badge lit for nine straight
 * weeks is a badge nobody reads.
 */
export declare const DISAPPROVAL_LIVE_TURNS = 2;
export declare function ruleDisapprovalTitle(rule: PendingRule): string;
export declare function ruleDisapprovalDue(campaign: Campaign): SummonsDue | undefined;
/**
 * The announced departure that goes first with nobody sent up to succeed it: a
 * Secretary serving out a transition leaves on this turn and the deputy acts,
 * unless a successor is before the Senate by then. One with a successor
 * pending is the nomination's clock, not this one.
 */
export declare function nearestDeparture(campaign: Campaign): DepartureTransition | undefined;
export declare function departureTitle(campaign: Campaign, transition: DepartureTransition): string;
export declare function departureDue(campaign: Campaign): SummonsDue | undefined;
type ActingSeat = {
    readonly runtime: InstitutionRuntime;
    readonly expiresDay: number;
};
export declare function nearestActing(campaign: Campaign): ActingSeat | undefined;
export declare function institutionName(seat: ActingSeat): string;
export declare function actingTitle(seat: ActingSeat): string;
export declare function actingDue(campaign: Campaign): SummonsDue | undefined;
export declare function nextSeatMilestone(campaign: Campaign): ConstitutionalMilestone | undefined;
export declare function milestoneDue(campaign: Campaign): SummonsDue | undefined;
export declare function nextRung(pressure: number): number | undefined;
export declare const REMOVAL_TITLE = "Pressure to remove you is nearing the next step";
export declare function removalDue(campaign: Campaign): SummonsDue | undefined;
export {};
