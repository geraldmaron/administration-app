export type CarriedConflictKind = "interstate" | "civil" | "non-state" | "tension" | "deployment" | "sanctions";
export type CarriedConflictRow = {
    readonly kind: CarriedConflictKind;
    /** Nation ids, aggressor first where the kind has one. */
    readonly parties: readonly string[];
    readonly since: string;
    readonly status: string;
    readonly mappedState: string;
    readonly mappingRule: string;
    readonly source: string;
    readonly opened: string;
};
export declare const CARRIED_CONFLICTS: readonly CarriedConflictRow[];
