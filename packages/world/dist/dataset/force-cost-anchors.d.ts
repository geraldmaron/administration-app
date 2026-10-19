export type ForceCostProvenance = "sourced" | "planning value";
export type ForceCostAnchorRow = {
    readonly anchor: string;
    readonly value: number;
    readonly unit: string;
    /** The dollars a money row is stated in; absent on a count or an index. */
    readonly dollarYear?: number;
    readonly provenance: ForceCostProvenance;
    readonly covers: string;
    readonly source: string;
    readonly opened: string;
};
export declare const FORCE_COST_ANCHORS: readonly ForceCostAnchorRow[];
