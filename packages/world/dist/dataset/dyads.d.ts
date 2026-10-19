export type DyadKind = "close" | "cool" | "hostile" | "dependent" | "rivalrous";
/**
 * The reading a row sets, in pair order: the first id's trust in the second
 * and the second's in the first, the pair's shared tension, and each side's
 * reading of the other's force. Coded from the source's facts on the research
 * table's bands; a row without them sets its reading by kind and intensity.
 */
export type DyadLevels = {
    readonly trust: readonly [number, number];
    readonly tension: number;
    readonly threat: readonly [number, number];
};
export type DyadRow = {
    /** The two nation ids, the lower first, so a pair is written once. */
    readonly pair: readonly [string, string];
    readonly kind: DyadKind;
    /** How strongly, 0..1. */
    readonly intensity: number;
    readonly since: number;
    readonly source: string;
    readonly opened: string;
    readonly levels?: DyadLevels;
};
export declare const FOUNDING_DYADS: readonly DyadRow[];
