import type { CohortEffect } from "./demos.js";
/** Where the price index would stand on its ordinary path, before and after the week. */
export type NormalPrice = {
    readonly before: number;
    readonly after: number;
};
/**
 * Evaluated once per turn against the nation's own before/after this turn's
 * settled rates — never re-read from `campaign`, so a reading in flight this
 * turn is compared against where it actually started.
 */
export declare function vitalCohortEdges(turn: number, before: {
    readonly costOfLiving: number;
    readonly crimeIndex: number;
}, after: {
    readonly costOfLiving: number;
    readonly crimeIndex: number;
}, normal?: NormalPrice): readonly CohortEffect[];
