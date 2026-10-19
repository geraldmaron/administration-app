import { type Campaign } from "@admin/engine";
export type ServiceDossier = {
    readonly id: string;
    readonly name: string;
    readonly abbreviation: string;
    readonly kind: string;
    readonly tier: 0 | 1 | 2 | 3;
    readonly mandate: string;
    readonly capacity?: number;
    readonly vacancy?: boolean;
    readonly backlog?: number;
    readonly readiness?: number;
};
export declare function assembleServiceDossier(campaign: Campaign, id: string): ServiceDossier | undefined;
/**
 * Military readiness across the stored weeks, oldest first, with how many of
 * them are the predecessor's. Which rows those are is the shared inheritance
 * predicate's answer, dated against the oath; counting the oldest rows by
 * position would go wrong the week they scroll out.
 */
export type ReadinessCourse = {
    readonly values: readonly number[];
    readonly inherited: number;
};
export declare function militaryReadinessCourse(campaign: Campaign): ReadinessCourse;
