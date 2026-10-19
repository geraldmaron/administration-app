export type PriceAnchorKind = "historical" | "estimate" | "forecast" | "projection";
export type PriceAnchorRow = {
    readonly commodity: string;
    readonly series: string;
    readonly period: string;
    readonly value: number;
    readonly unit: string;
    readonly kind: PriceAnchorKind;
    readonly source: string;
    readonly opened: string;
};
export declare const PRICE_ANCHORS: readonly PriceAnchorRow[];
