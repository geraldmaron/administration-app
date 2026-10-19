import type { NationId, RoleId } from "@admin/world";
import type { TurnPhase } from "./turn-loop.js";
import { type InstitutionId } from "./institutions.js";
import { type WorkDef, type WorkDelivery } from "./executive-work.js";
import { SERVICES } from "./service-catalog.js";
export type ServiceId = "consular-visas" | "tax-returns" | "arms-transfers" | "disability-claims" | "federal-cases" | "farm-payments" | "export-licenses" | "wage-complaints" | "drug-applications" | "fair-housing-complaints" | "student-aid" | "disaster-assistance" | "drilling-permits";
/**
 * How a building cuts a late backlog when whoever runs the portfolio lets
 * the pressure decide: by refusing claims it has not weighed, or, where the
 * cases are prosecutions, by pushing defendants into pleas. `refusal` also
 * carries the share an ordinary week refuses on the merits.
 */
export type ServiceShortcut = {
    readonly kind: "refusal";
    readonly share: number;
} | {
    readonly kind: "plea";
};
/**
 * Cases waiting, by whole weeks waited: index 0 arrived this week, index `n`
 * has waited `n` weeks, and the last index holds everything that has waited
 * that long or longer. Kept by the week rather than in wide age bands so that
 * deciding the oldest first leaves exactly the right cases behind: a band that
 * assumed its cases were spread evenly across it would age a quarter of a
 * young queue past a month every week whether anyone had waited that long or
 * not.
 */
export type Cohorts = readonly number[];
/** The oldest week kept separately; anything older waits in the last cohort. */
export declare const OLDEST_COHORT = 26;
/** Where each display band ends, in weeks: under 4, 4 to 13, 13 to 26, 26 and over. */
export declare const AGE_BUCKET_EDGES: readonly [4, 13, 26];
export type ServiceDefinition = {
    readonly id: ServiceId;
    readonly name: string;
    /** What one case is, in prose: "applications", "claims". */
    readonly unit: string;
    /** The Secretary who answers for it. */
    readonly portfolio: RoleId;
    readonly work: WorkDef;
    /** A case that has waited this many weeks is late. One of the band edges, so a band is wholly late or wholly not. */
    readonly standardWeeks: 4 | 13 | 26;
    /**
     * The corner a late backlog tempts the building to cut. Only a service with
     * one reads its Secretary: their integrity decides whether the backlog is
     * cleared by deciding cases or by the shortcut. A service without one is
     * run by its owner alone, whose head is already in the owner's delivery.
     */
    readonly shortcut?: ServiceShortcut;
};
export type ServiceWeek = {
    readonly arrivals: number;
    /** Cases decided wrongly weeks ago, back again. */
    readonly rework: number;
    readonly decided: number;
    /** Of `decided`, those cleared by the service's shortcut under backlog pressure rather than on the merits. */
    readonly pressured: number;
    readonly refused: number;
    readonly errors: number;
    readonly withdrawn: number;
};
export type ServiceRuntime = {
    readonly id: ServiceId;
    /** The week tracking began. Earlier weeks are not on the record. */
    readonly openedTurn: number;
    readonly pending: Cohorts;
    /** Errors on their way back as rework; index 0 returns next week. */
    readonly returning: readonly number[];
    readonly last?: ServiceWeek;
    /** A decision from the visa queue, kept so review rests on an application rather than an abstract proclamation. */
    readonly entryRefusals?: readonly {
        readonly id: string;
        readonly orderRecordId: string;
        readonly decidedTurn: number;
        readonly application: "family-visa";
        readonly nation: NationId;
        readonly ground: "entry-suspension";
    }[];
    /** One dated complaint in the aggregate HUD queue, selected before any court filing. */
    readonly housingComplaint?: {
        readonly id: string;
        readonly filedTurn: number;
        readonly originalDeadlineTurn: number;
        readonly applicationDeadlineTurn: number;
        readonly allegedPractice: "race-based-rental-denial";
        readonly respondent: "housing-provider";
        readonly writtenCriterion: "race" | "neutral-capacity";
        readonly status: "pending" | "interim-protected" | "reconsideration-ordered" | "reconsidered" | "unprotected";
        readonly reconsideredTurn?: number;
    };
    /** One investigated payroll record, kept separate from the aggregate complaint queue. */
    readonly wageComplaint?: {
        readonly id: string;
        readonly discoveredTurn: number;
        readonly employer: "covered-private-employer";
        readonly worker: "hourly-worker";
        readonly hours: number;
        readonly hourlyRate: number;
        readonly paid: number;
        readonly requiredPay: number;
        readonly goodFaithEvidence: "none-substantiated";
        readonly employerResponse: "pending" | "paid" | "refused";
        readonly responseTurn?: number;
        readonly status: "investigating" | "settled" | "litigating" | "recovery-ordered" | "recovered";
        readonly recoveredTurn?: number;
    };
};
export declare const WEEKLY_INTAKE = 100;
/** A cohort array with the given weeks filled, for an opening or a test. */
export declare function cohorts(filled: Readonly<Record<number, number>>): Cohorts;
export declare function pendingTotal(runtime: ServiceRuntime): number;
/** Cases waiting by display band: under 4 weeks, 4 to 13, 13 to 26, 26 and over. */
export declare function ageBands(runtime: ServiceRuntime): readonly [number, number, number, number];
/** Cases that have waited the service's standard or longer. */
export declare function lateCases(runtime: ServiceRuntime, def: ServiceDefinition): number;
export declare function lateShare(runtime: ServiceRuntime, def: ServiceDefinition): number;
/** How hard a late backlog presses on whoever answers for it, 0..1. */
export declare function backlogPressure(runtime: ServiceRuntime, def: ServiceDefinition): number;
export declare function openingService(def: ServiceDefinition, turn: number): ServiceRuntime;
/**
 * The integrity of whoever runs the portfolio, where the service has a shortcut
 * and somebody is in the chair. A chair nobody holds pushes nobody.
 */
export type ServiceLeadership = {
    readonly integrity: number;
} | undefined;
/**
 * One week of a service, as the runtime it leaves.
 *
 * Every case is counted once: what was waiting, plus what arrived and what
 * came back, less what was decided and what was withdrawn, is what waits
 * next week.
 */
export declare function serviceTick(runtime: ServiceRuntime, def: ServiceDefinition, delivery: WorkDelivery, leadership: ServiceLeadership): ServiceRuntime;
export { SERVICES };
export declare function serviceDefinition(id: ServiceId): ServiceDefinition | undefined;
/** The department a service rolls up to: its owner if the owner is one, else the owner's parent. */
export declare function serviceDepartment(def: ServiceDefinition): InstitutionId;
/**
 * The week of every service. A save from before services were tracked has
 * none; each opens this week on the same assumption a new campaign makes and
 * records from here, so no earlier week is invented.
 */
export declare const servicePhase: TurnPhase;
