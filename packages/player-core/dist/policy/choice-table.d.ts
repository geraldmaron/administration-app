import type { AlignmentVector, MetricSet } from "@admin/engine";
export type ChoiceTone = "favorable" | "adverse" | "neutral";
/**
 * One signed movement inside a cell, kept as a number beside its words so a
 * screen can draw it against the same movement in every other column.
 * Movements that share a label on a row are on the same scale.
 */
export type ChoiceMove = {
    readonly label?: string;
    readonly value: number;
    readonly text: string;
    readonly tone: ChoiceTone;
};
export type ChoiceCell = {
    readonly text: string;
    readonly tone: ChoiceTone;
    readonly moves?: readonly ChoiceMove[];
};
export type ChoiceColumn = {
    readonly id: string;
    readonly label: string;
    /** Why it cannot be authorized today, in the engine's words. */
    readonly locked?: string;
};
export type ChoiceRow = {
    readonly id: string;
    readonly label: string;
    /** `lead` is what the column is, in its own words: read before any reading. */
    readonly kind?: "lead";
    /** One cell per column, in column order. */
    readonly cells: readonly ChoiceCell[];
};
export type ChoiceTable = {
    readonly columns: readonly ChoiceColumn[];
    readonly rows: readonly ChoiceRow[];
    /** What happens on its own if nothing is approved, where that has a clock: said beside the options, never as one. */
    readonly waiting?: string;
};
export declare const cell: (text: string, tone?: ChoiceTone, moves?: readonly ChoiceMove[]) => ChoiceCell;
/**
 * A set of metric movements as one cell: each movement in words, the cell's
 * tone the sign of the heaviest one. `none` is what an empty set reads, so a
 * column with nothing to say on a row says so rather than leaving a blank.
 */
export declare function metricCell(deltas: Partial<MetricSet>, none: string): ChoiceCell;
/**
 * Where an act moves the President's politics, in the words a voter would use.
 * The engine's axes run negative to positive as left, libertarian and globalist
 * to right, authoritarian and nationalist.
 */
export declare function alignmentShiftWords(pull: Partial<AlignmentVector>): string;
/**
 * Where an act moves the President's politics as a cell: the words a voter
 * would use, and each pull as a movement whose side is the side it pulls to.
 * A lean is neither good nor bad, so every movement is neutral.
 */
export declare function alignmentCell(pull: Partial<AlignmentVector>): ChoiceCell;
/** A signed share of output as points: growth, inflation and jobs move in these. */
export declare function ratePoints(delta: number): string;
/** Weeks, said the way a calendar says them. */
export declare function weeksWords(weeks: number): string;
