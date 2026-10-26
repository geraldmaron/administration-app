export type ChokepointOriginRow = {
    readonly chokepoint: string;
    readonly commodity: string;
    /** A NationId, or "other" for the remainder the source does not split. */
    readonly origin: string;
    /** Million barrels a day. */
    readonly mbd: number;
    readonly period: string;
    readonly source: string;
    readonly opened: string;
};
export declare const CHOKEPOINT_ORIGINS: readonly ChokepointOriginRow[];
