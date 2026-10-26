import { type StateId } from "@admin/world";
import type { Campaign, FlagId } from "./state.js";
import type { OrderAuthority } from "./orders.js";
import { type CourtBand } from "./court-procedure.js";
export type CourtOrderKind = "fisa-order" | "title-iii-order" | "injunction-enforcement" | "search-warrant";
export type CourtOrderOutcome = "granted" | "narrowed" | "denied";
export type CourtOrderStatus = "pending" | CourtOrderOutcome | "expired";
export declare const COURT_ORDER_KIND_IDS: readonly CourtOrderKind[];
export type CourtOrderKindDef = {
    readonly kind: CourtOrderKind;
    readonly name: string;
    /** The order as a sentence names it, article included. */
    readonly noun: string;
    readonly court: string;
    readonly authority: OrderAuthority;
    /** How long the court takes to answer, in days, drawn once per application. */
    readonly decisionDays: CourtBand;
    /** How long a granted order runs, in days. */
    readonly termDays: number;
    /** Whether the ruling is public; an ex parte order and its denial are sealed. */
    readonly public: boolean;
};
export declare const COURT_ORDER_KINDS: Readonly<Record<CourtOrderKind, CourtOrderKindDef>>;
/** Weeks after a denial before Justice will file the same kind of application in the same state again. A planning value. */
export declare const DENIAL_COOLDOWN_WEEKS = 4;
/** An order this close to its end may be renewed by a new application. */
export declare const RENEWAL_WINDOW_WEEKS = 2;
export type CourtOrderRecord = {
    readonly id: string;
    readonly kind: CourtOrderKind;
    readonly state: StateId;
    readonly appliedTurn: number;
    /** The week the court answers. */
    readonly decideTurn: number;
    readonly status: CourtOrderStatus;
    /** The court's answer; absent while it has not given one. */
    readonly outcome?: CourtOrderOutcome;
    /** The first week a granted or narrowed order no longer runs. */
    readonly termEndsTurn?: number;
    /** The first week the same application can be filed again after a denial. */
    readonly cooldownEndsTurn?: number;
};
/** The odds a filed application is decided on, as the desk showed them. */
export type CourtApplicationOdds = {
    readonly granted: number;
    readonly narrowed: number;
};
/** The flag an application leaves: its kind, its state and the odds it was filed on, in whole percents, never the answer. */
export declare function courtApplicationFlag(kind: CourtOrderKind, state: StateId, odds: CourtApplicationOdds): FlagId;
/** The court's answer to one application, drawn once on its own stream against the odds it was filed on. */
export declare function courtApplicationOutcome(campaign: Campaign, application: CourtApplication): CourtOrderOutcome;
/** The flag a ruling leaves the week the court gives it, the one content reads. */
export declare function courtRulingFlag(kind: CourtOrderKind, state: StateId, outcome: CourtOrderOutcome): FlagId;
/** The week the court answers an application filed this week, drawn once inside the kind's band. */
export declare function courtOrderDecideTurn(campaign: Campaign, kind: CourtOrderKind, state: StateId, appliedTurn: number): number;
/** A granted order's term in whole weeks, never rounded past the days the law allows. */
export declare function courtOrderTermWeeks(kind: CourtOrderKind): number;
/** One filed application as its flag keeps it, before anything is known of the answer. */
export type CourtApplication = {
    readonly id: string;
    readonly kind: CourtOrderKind;
    readonly state: StateId;
    readonly appliedTurn: number;
    readonly decideTurn: number;
    readonly odds: CourtApplicationOdds;
};
/** Every application filed, newest first, optionally for one state. The ruling phase reads these to give the court's answer. */
export declare function courtApplications(campaign: Campaign, state?: StateId): readonly CourtApplication[];
/** An application with what the court has said of it by this week. */
export declare function courtOrderRecord(campaign: Campaign, application: CourtApplication, outcome: CourtOrderOutcome | undefined): CourtOrderRecord;
/** Every application this administration has filed, newest first, optionally for one state, with the answers the court has given. */
export declare function courtOrderRecords(campaign: Campaign, state?: StateId): readonly CourtOrderRecord[];
/** The newest application of this kind in this state, whatever became of it. */
export declare function courtOrderStatus(campaign: Campaign, state: StateId, kind: CourtOrderKind): CourtOrderRecord | undefined;
/** A granted or narrowed order of one of these kinds now running in this state, the widest first. */
export declare function liveCourtOrder(campaign: Campaign, state: StateId, kinds: readonly CourtOrderKind[]): CourtOrderRecord | undefined;
/** The orders that authorize electronic surveillance (50 U.S.C. §1812). */
export declare const SURVEILLANCE_ORDER_KINDS: readonly CourtOrderKind[];
/**
 * The public losses an application can leave: an injunction denied or
 * narrowed in open court. Sealed orders lose in private and count for nothing
 * here; a leak is charged where the ruling lands.
 */
export declare function courtOrderLosses(campaign: Campaign): number;
/** How long collection under an order counts as evidence for the next application in the same state. */
export declare const SURVEILLANCE_EVIDENCE_WEEKS = 8;
/** The flag collection under a court order leaves on a state. */
export declare function surveilledUnderOrderFlag(state: StateId): FlagId;
/** Whether collection under a court order has run in this state recently enough to support another application. */
export declare function recentlySurveilled(campaign: Campaign, state: StateId): boolean;
