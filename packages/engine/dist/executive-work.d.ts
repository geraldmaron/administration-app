import type { Campaign } from "./state.js";
import { type InstitutionId } from "./institutions.js";
export type WorkId = string;
export type WorkDependency = {
    readonly kind: "approval" | "support";
    readonly institution: InstitutionId;
    /** The authority the dependent body holds that this edge needs, checked against the catalog. */
    readonly authority: string;
};
export type WorkDef = {
    readonly id: WorkId;
    readonly name: string;
    readonly owner: InstitutionId;
    /** The authority the owner holds for this work, checked against the catalog. */
    readonly authority: string;
    readonly dependencies: readonly WorkDependency[];
};
export type WorkStatus = "delivering" | "delayed" | "blocked";
export type WorkDelivery = {
    readonly work: WorkId;
    readonly owner: InstitutionId;
    /** The owner's own delivery, 0..1, before support or approvals. */
    readonly ownerQuality: number;
    /** What the work actually gets done at, 0..1. */
    readonly capacity: number;
    readonly status: WorkStatus;
    /** The approval holding the work back, when one is. */
    readonly binding?: InstitutionId;
};
export declare const APPROVAL_FLOOR = 0.25;
/** Customs duty is collected by CBP under its customs-collection authority, whatever else is happening in trade. */
export declare const CUSTOMS_COLLECTION: WorkDef;
/** Whether the catalog actually gives each named body the authority the work says it uses. */
export declare function workIsLawful(work: WorkDef): boolean;
/** The approving body clearing its stage most slowly, with its pace; undefined when the work waits on no approval. */
export declare function slowestApproval(campaign: Campaign, work: WorkDef): {
    readonly institution: InstitutionId;
    readonly quality: number;
} | undefined;
/**
 * How well one piece of work is being delivered right now, led by the body
 * the law gives it to and held back by any approval it waits on.
 */
export declare function selectWorkDelivery(campaign: Campaign, work: WorkDef): WorkDelivery;
