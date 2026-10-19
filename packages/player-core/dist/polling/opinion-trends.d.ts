import { type CohortAxisId } from "@admin/world";
import { type Campaign } from "@admin/engine";
import { type RecordStart, type TrendChange } from "./record-trend";
export type TrendSeries = TrendChange & {
    readonly id: string;
    readonly name: string;
};
export type CohortTrend = TrendSeries & {
    readonly axis: CohortAxisId;
};
export type OpinionTrends = {
    readonly start: RecordStart;
    /** The six judgments, in the order the engine declares them. */
    readonly judgments: readonly TrendSeries[];
    /** How divided the country is: a property of the public, not a judgment of the government. */
    readonly polarization: TrendSeries;
    /** Every cohort cell, axis by axis in declaration order. */
    readonly cohorts: readonly CohortTrend[];
    /** The three blocs a player is shown: the President's party, the independents, the other party. */
    readonly blocs: readonly TrendSeries[];
};
/** Every observed series of the public, and where the record starts. */
export declare function opinionTrends(campaign: Campaign): OpinionTrends;
export type CrosstabTrendGroup = {
    readonly id: string;
    readonly name: string;
    readonly rows: readonly TrendSeries[];
};
/**
 * The crosstab cuts as courses, in the order and grouping `crosstabs` draws
 * them this week, so a row and its course are found under the same id.
 */
export declare function crosstabTrends(campaign: Campaign): readonly CrosstabTrendGroup[];
