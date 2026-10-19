import { type Campaign, type ProjectionMetric, type ProjectionRun } from "@admin/engine";
import { type CohortId } from "@admin/world";
import { type DriverBar } from "../desk/opinion-causes";
import type { ModelingChoice } from "./choices";
export type ModelingUnit = "points" | "money";
export type ModelingGroup = "headline" | "judgment" | "cohort";
/** Median and range across the ensemble at one week. */
export type ModelingBand = {
    readonly median: number;
    readonly low: number;
    readonly high: number;
};
export type ModelingLine = {
    readonly alternative: string;
    readonly points: readonly ModelingBand[];
};
export type ModelingMetricView = {
    readonly metric: ProjectionMetric;
    readonly label: string;
    readonly group: ModelingGroup;
    readonly unit: ModelingUnit;
    /** Removal pressure is the one reading where up is bad for the President. */
    readonly better: "higher" | "lower";
    readonly lines: readonly ModelingLine[];
};
export type ModelingAgreement = "higher" | "lower" | "mixed" | "same";
/** One reading at the horizon against not acting, paired run by run. */
export type ModelingDelta = ModelingBand & {
    readonly metric: ProjectionMetric;
    readonly label: string;
    readonly unit: ModelingUnit;
    readonly better: "higher" | "lower";
    readonly agreement: ModelingAgreement;
    readonly text: string;
};
export type ModelingGroupMove = ModelingBand & {
    readonly cohort: CohortId;
    readonly name: string;
    readonly text: string;
};
export type ModelingAlternativeView = {
    readonly id: string;
    readonly label: string;
    readonly baseline: boolean;
    /** Why the act cannot be committed today; nothing else is drawn for it. */
    readonly refused?: string;
    /** Runs in which the presidency ended before the horizon. */
    readonly endedRuns: number;
    /** Runs compared with not acting: the ensemble members both have finished. Zero until the first pair is in. */
    readonly paired: number;
    readonly deltas: readonly ModelingDelta[];
    readonly helped: readonly ModelingGroupMove[];
    readonly hurt: readonly ModelingGroupMove[];
    /** How sure, in a sentence: whether the runs agree on approval's direction. */
    readonly sureness?: string;
};
export type ModelingMover = ModelingDelta & {
    readonly alternative: string;
};
export type ModelingView = {
    readonly title: string;
    readonly baselineMeaning: string;
    /** Current observed drivers, distinct from the forecast differences. */
    readonly currentJudgments: readonly DriverBar[];
    readonly weeks: number;
    /** Members every alternative has finished; the ensemble is complete when this is the ensemble size. */
    readonly members: number;
    /** The date each index of a line stands for: index 0 is today. */
    readonly weekDates: readonly string[];
    readonly alternatives: readonly ModelingAlternativeView[];
    readonly metrics: readonly ModelingMetricView[];
    /** The readings each alternative moves most against not acting, largest first. */
    readonly movers: readonly ModelingMover[];
};
/** Half a point: below it a group's move is noise in the reading, not a group the act lands on. */
export declare const GROUP_MOVE_FLOOR = 0.005;
export declare function ensembleBand(values: readonly number[]): ModelingBand;
/** A signed difference; one that rounds to nothing prints unsigned, so "−0.0" never suggests a direction. */
export declare function modelingFigure(value: number, unit: ModelingUnit): string;
/** Every alternative's runs to date, finished or partial, in any order; each row pairs with not acting on the members both have run. */
export declare function modelingView(campaign: Campaign, choice: ModelingChoice, runs: readonly ProjectionRun[], weeks: number): ModelingView;
