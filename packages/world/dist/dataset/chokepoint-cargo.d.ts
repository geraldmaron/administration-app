export type ChokepointCargoRow = {
    readonly chokepoint: string;
    readonly commodity: string;
    /** A NationId, or a bucket the source does not split by country. */
    readonly destination: string;
    /** Million barrels a day. */
    readonly mbd: number;
    readonly period: string;
    readonly source: string;
    readonly opened: string;
};
/** The destinations the source names only as a region or a remainder. */
export declare const CARGO_BUCKETS: readonly string[];
export declare const CHOKEPOINT_CARGO: readonly ChokepointCargoRow[];
