import type { Campaign } from "./state.js";
export type RuleReviewSubject = {
    readonly kind: "rule-review";
    readonly ruleId: string;
};
export type LeasePlanningSubject = {
    readonly kind: "lease-planning";
    readonly areaId: string;
};
export type LeasePlanningArea = {
    readonly id: string;
    readonly name: string;
    readonly scheduledSale: string;
    readonly programThrough: {
        readonly year: number;
        readonly month: number;
        readonly day: number;
    };
    readonly source: string;
    readonly opened: string;
};
/** A program area is a review subject, not a tract, awarded lease, or drilling permit. */
export declare const LEASE_PLANNING_AREAS: readonly LeasePlanningArea[];
export declare function leasePlanningArea(areaId: string): LeasePlanningArea | undefined;
/** Only an operative, identified rule can be sent back for review. */
export declare function regulatoryReviewOrderSubjects(campaign: Campaign): readonly RuleReviewSubject[];
/** The 2024–29 program supplies a planning area; it does not authorize a sale after it ends. */
export declare function energyLeasingOrderSubjects(campaign: Campaign): readonly LeasePlanningSubject[];
