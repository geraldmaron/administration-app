import type { GoverningStyle } from "@admin/engine";
export declare const GOVERNING_STYLE_WORDS: Readonly<Record<GoverningStyle, {
    readonly label: string;
    readonly detail: string;
}>>;
/**
 * How a question is answered. Every format scores to one number from -1 to
 * +1, so the profile reads them all alike:
 * - choice: one of the three, scored -1, 0 or +1.
 * - scale: a place on a seven-step line between the first and the third.
 * - split: ten shares of effort divided between the first and the third.
 * - rank: the three put in order; what comes first and what comes last say
 *   which way, so ranking the middle one first still leans.
 */
export type QuestionFormat = "choice" | "scale" | "split" | "rank";
export type LeadershipQuestion = {
    readonly id: string;
    readonly area: string;
    readonly prompt: string;
    /** In scoring order: -1, 0, +1. The center answer is a substantive trade-off, not a skipped answer. */
    readonly options: readonly [string, string, string];
    readonly format: QuestionFormat;
};
export declare const SCALE_STOPS = 7;
export declare const SPLIT_SHARES = 10;
/** A place on the scale, 0 at the first end, as a score. */
export declare function scaleScore(stop: number): number;
/** The scale stop a score sits at. */
export declare function scaleStop(score: number): number;
/** Shares given to the first side out of ten, as a score: all ten to the first is -1. */
export declare function splitScore(firstShares: number): number;
/** The shares the first side holds under a score. */
export declare function splitShares(score: number): number;
/** An order of the three options, most wanted first, as a score: the first's lean against the last's. */
export declare function rankScore(order: readonly number[]): number;
/** Where each area's questions are drawn from, for the glyph a question carries. */
export declare const QUESTION_AREA_GLYPH: Readonly<Record<string, string>>;
/** Version 1 order is a saved-data contract: four questions per scored dimension. */
export declare const LEADERSHIP_QUESTIONS: readonly LeadershipQuestion[];
