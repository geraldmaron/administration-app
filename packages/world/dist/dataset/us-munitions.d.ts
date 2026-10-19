export type MunitionsProvenance = "sourced" | "planning value";
export type UsMunitionsRow = {
    readonly munitionClass: string;
    readonly systems: readonly string[];
    /** 0..1 on a notional full stock; null where no stock is sourced. */
    readonly openingIndex: number | null;
    readonly productionRate?: string;
    readonly leadTime?: string;
    readonly provenance: MunitionsProvenance;
    readonly source: string;
    readonly opened: string;
};
export declare const US_MUNITIONS: readonly UsMunitionsRow[];
