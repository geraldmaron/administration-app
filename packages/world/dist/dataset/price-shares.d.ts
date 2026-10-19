export type PriceShareRow = {
    readonly reading: string;
    readonly component: string;
    /** 0..1 of the reading. */
    readonly share: number;
    readonly series: string;
    readonly period: string;
    readonly source: string;
    readonly opened: string;
};
export declare const PRICE_SHARES: readonly PriceShareRow[];
