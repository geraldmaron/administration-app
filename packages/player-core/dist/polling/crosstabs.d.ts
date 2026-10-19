import { type CohortAxisId } from "@admin/world";
import { type Campaign, type OpinionDriver } from "@admin/engine";
import { type Stance } from "../reading";
export type CrosstabRow = {
    readonly id: string;
    readonly name: string;
    /** Where this cut of the country stands, 0..1. */
    readonly support: number;
    readonly figure: string;
    readonly word: string;
    readonly stance: Stance;
    /** How much of the country this row is, where the cut has a share. */
    readonly share?: number;
    /** What this row remembers of the administration, in its own words. */
    readonly reading?: string;
};
export type CrosstabGroup = {
    readonly id: string;
    readonly name: string;
    readonly rows: readonly CrosstabRow[];
};
/** What each of the ten cuts is called above its strip. */
export declare const COHORT_AXIS_LABELS: Readonly<Record<CohortAxisId, string>>;
/** Every cut of the country, one strip per axis. */
export declare function crosstabs(campaign: Campaign): readonly CrosstabGroup[];
export type MostImportantProblem = {
    readonly driver: OpinionDriver;
    readonly label: string;
    /** What the public means by it, in the model's own words. */
    readonly meaning: string;
    /** The share of the week's dissatisfaction this judgment carries, 0..1. */
    readonly share: number;
    readonly figure: string;
    /** Whether the week itself is what put this judgment at the top. */
    readonly salient: boolean;
    /** What is doing it, named — the heaviest term behind that judgment. */
    readonly cause?: string;
    readonly causeDetail?: string;
};
/**
 * Every judgment ranked as the most-important-problem question ranks them:
 * the largest weighted shortfall first, each with its share of the week's
 * dissatisfaction. Empty when the country is missing nothing.
 */
export declare function rankedProblems(campaign: Campaign): readonly MostImportantProblem[];
/**
 * The most important problem facing the country, which is the oldest question in
 * polling and the one a president is actually answerable for.
 *
 * Read as the largest weighted shortfall: how much of a judgment the country is
 * missing, priced at what the week weighs that judgment at. Not simply the
 * lowest judgment — a reading nobody is thinking about this week is not the
 * country's problem — and not simply the loudest, because a loud judgment the
 * administration is delivering on is not a problem either.
 */
export declare function mostImportantProblem(campaign: Campaign): MostImportantProblem | undefined;
