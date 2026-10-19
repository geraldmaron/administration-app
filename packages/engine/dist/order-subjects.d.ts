import { type NationId, type StateId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type AcuteCondition } from "./condition-kinds.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
export { energyLeasingOrderSubjects, regulatoryReviewOrderSubjects, leasePlanningArea, LEASE_PLANNING_AREAS } from "./order-authority-subjects.js";
/** §2808(c)(2): this catalogue offers domestic emergency projects only (USD millions). */
export declare const DOMESTIC_EMERGENCY_CONSTRUCTION_CAP = 100;
export declare function constructionTransferAmount(campaign: Campaign, sourceId: string, declarationId: string): number;
/** The Defense Secretary's dated notice precedes the first destination contract. */
export declare function constructionNotice(campaign: Campaign, sourceId: string, declarationId: string, amount: number, contractId: string): NonNullable<ExecutiveOrderRecord["constructionNotice"]>;
/** A legal predicate selected for this signature, never inferred from ambient events. */
export type OrderSubject = {
    readonly kind: "ports-of-entry";
    readonly scope: "all-federal-ports";
} | {
    readonly kind: "foreign";
    readonly nation: NationId;
} | {
    readonly kind: "entry-class";
    readonly nation: NationId;
    readonly pursuitId: string;
} | {
    readonly kind: "rule-review";
    readonly ruleId: string;
} | {
    readonly kind: "lease-planning";
    readonly areaId: string;
} | {
    readonly kind: "federal-site";
    readonly institutionId: string;
} | {
    readonly kind: "state";
    readonly state: StateId;
    readonly cause: AcuteCondition;
    readonly declarationId: string;
    readonly billId: string;
} | {
    readonly kind: "grant";
    readonly billId: string;
} | {
    readonly kind: "construction";
    readonly sourceId: string;
    readonly declarationId: string;
};
/** A grant condition administers the program terms Congress enacted. */
export declare function grantOrderSubjects(campaign: Campaign): readonly Extract<OrderSubject, {
    kind: "grant";
}>[];
export declare function constructionOrderSubjects(campaign: Campaign): readonly Extract<OrderSubject, {
    kind: "construction";
}>[];
/** §1315 reaches a sourced federal building or grounds, not a nearby street or state capitol. */
export declare function federalSiteOrderSubjects(campaign: Campaign): readonly Extract<OrderSubject, {
    kind: "federal-site";
}>[];
/** A §1182(f) class is tied to a recent, overt security campaign and reaches first entry only. */
export declare function entryClassOrderSubjects(campaign: Campaign): readonly Extract<OrderSubject, {
    kind: "entry-class";
}>[];
/** Unallocated statutory relief authority, in the same USD millions as GDP. */
export declare function reliefAllocation(campaign: Campaign, billId: string): number;
/** Declared disasters with a current appropriation and unallocated authority. */
export declare function reliefOrderSubjects(campaign: Campaign): readonly Extract<OrderSubject, {
    kind: "state";
}>[];
/** Catalogue status asks whether any legal subject exists; signing still requires the chosen one. */
export declare function firstOrderSubject(campaign: Campaign, orderId: string): OrderSubject | undefined;
/** The direct resolver and the desk use the same target-specific refusals. */
export declare function orderSubjectRefusal(campaign: Campaign, orderId: string, subject?: OrderSubject): string | undefined;
export declare function inEmergency(campaign: Campaign): boolean;
