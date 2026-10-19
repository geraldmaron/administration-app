import { type Campaign, type InstitutionId } from "@admin/engine";
import { type Staffing } from "./executive-tree.js";
export type BuiltKey = "staffing" | "morale" | "budget" | "capacity" | "leader";
export type LostKey = "vacancy" | "backlog" | "politicization" | "leader";
export type DeliveryPart<K extends string> = {
    readonly key: K;
    readonly label: string;
    readonly value: number;
};
export type DeliveryRow = {
    readonly institution: InstitutionId;
    readonly name: string;
    readonly href: string;
    readonly emblem: string;
    readonly staffing: Staffing;
    /** What the body delivers, 0..1: the built parts less the lost ones. */
    readonly quality: number;
    /** What the body could deliver, in the order a bar stacks them. */
    readonly built: readonly DeliveryPart<BuiltKey>[];
    /** What is coming off it, largest first. Empty when nothing is. */
    readonly lost: readonly DeliveryPart<LostKey>[];
    /** Why it sits where it does, in one line. */
    readonly reason: string;
};
export type BranchDelivery = {
    /** The branch's delivery, weighted by staff the way the engine weighs it. */
    readonly quality: number;
    /** What the branch is losing, weighted the same way, largest first. Only causes worth a point or more. */
    readonly lost: readonly DeliveryPart<LostKey>[];
    readonly sentence: string;
    /** Every top-level body the branch figure counts, weakest first. */
    readonly rows: readonly DeliveryRow[];
};
export declare const BUILT_LABELS: Readonly<Record<BuiltKey, string>>;
export declare const LOST_LABELS: Readonly<Record<LostKey, string>>;
/** Why one body delivers what it does, in the same line its delivery row prints. */
export declare function institutionReason(campaign: Campaign, institution: InstitutionId): string;
export declare function branchDelivery(campaign: Campaign): BranchDelivery;
