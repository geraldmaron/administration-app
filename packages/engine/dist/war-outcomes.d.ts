import { type Campaign, type Conflict } from "./state.js";
import type { Effect } from "./effect-types.js";
/** How a war ended, as far as its aftermath is concerned. */
export type SettlementOptions = {
    /** A collapse or a decisive offensive, as opposed to a side that ran out of will. */
    readonly decisive?: boolean;
};
/**
 * The effects a war's settlement carries: the President's standing where the
 * country fought, each principal's legitimacy at home, the grudges on the
 * edges, and a new government for a loser beaten decisively. The settled war
 * itself stays on the board as the record of the armistice or the victory.
 */
export declare function settlementEffects(campaign: Campaign, conflict: Conflict, options?: SettlementOptions): readonly Effect[];
/**
 * The beats a war's ending and its long middle file. Plain and restrained: no
 * line celebrates a death, and none prints a casualty figure.
 */
export declare const OUTCOME_LINES: {
    readonly armistice: "Both sides are spent; an armistice is signed.";
    readonly withdrawal: "The aggressor can no longer sustain the war and withdraws.";
    readonly collapse: "The defense collapses and terms are dictated.";
    readonly decisiveOffensive: "A decisive offensive breaks the defense.";
    readonly decisiveRepulse: "The invasion is thrown back decisively.";
    readonly frozen: "The front goes quiet. Neither side is trying to move the line, and the war is not over.";
    readonly heldArmistice: "A line that has held for months is written down as an armistice.";
    readonly pastAYear: "The war has run past a year, and neither side is close to ending it.";
};
