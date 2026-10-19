import { COHORT_AXES, cohortsOfAxis, type CohortAxisId } from "@admin/world";
import {
  COHORT_MOTIVATION,
  DISPLAY_BLOCS,
  OPINION_DRIVERS,
  opinionCourse,
  type Campaign,
  type OpinionDriver,
  type OpinionSample,
} from "@admin/engine";
import { OPINION_DRIVER_LABELS } from "../format/figures";
import { BLOC_NAMES } from "../electorate/bloc-names";
import { crosstabs } from "./crosstabs";
import { recordStart, trendOf, type RecordStart, type TrendChange, type TrendPoint } from "./record-trend";

// The public's readings as a course rather than a week: each judgment, each
// cell of the country and each coalition, read off what the engine observed at
// every closed week. A series here is never the current figure recomputed into
// the past; the current figure is the live reading, and this is the record.

export type TrendSeries = TrendChange & {
  readonly id: string;
  readonly name: string;
};

export type CohortTrend = TrendSeries & { readonly axis: CohortAxisId };

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

function seriesOf(course: readonly OpinionSample[], id: string, name: string, read: (sample: OpinionSample) => number | undefined): TrendSeries {
  const points = course.flatMap((sample): TrendPoint[] => {
    const value = read(sample);
    return value === undefined ? [] : [{ turn: sample.turn, value }];
  });
  return { id, name, ...trendOf(points) };
}

function cohortTrendsOf(course: readonly OpinionSample[]): readonly CohortTrend[] {
  return COHORT_AXES.flatMap((axis) =>
    cohortsOfAxis(axis).map((cohort) => ({
      axis,
      ...seriesOf(course, cohort, COHORT_MOTIVATION[cohort].name, (sample) => sample.cohorts[cohort]),
    })),
  );
}

/** Every observed series of the public, and where the record starts. */
export function opinionTrends(campaign: Campaign): OpinionTrends {
  const course = opinionCourse(campaign);
  const judgment = (driver: OpinionDriver) =>
    seriesOf(course, driver, OPINION_DRIVER_LABELS[driver], (sample) => sample.judgments[driver]);
  return {
    start: recordStart(campaign, campaign.opinionRecord?.since),
    judgments: OPINION_DRIVERS.map(judgment),
    polarization: seriesOf(course, "polarization", "Polarization", (sample) => sample.polarization),
    cohorts: cohortTrendsOf(course),
    blocs: DISPLAY_BLOCS.map((bloc) => seriesOf(course, bloc, BLOC_NAMES[bloc], (sample) => sample.blocs[bloc])),
  };
}

export type CrosstabTrendGroup = {
  readonly id: string;
  readonly name: string;
  readonly rows: readonly TrendSeries[];
};

/**
 * The crosstab cuts as courses, in the order and grouping `crosstabs` draws
 * them this week, so a row and its course are found under the same id.
 */
export function crosstabTrends(campaign: Campaign): readonly CrosstabTrendGroup[] {
  const trends = opinionTrends(campaign);
  const byId = new Map<string, TrendSeries>(trends.cohorts.map((series) => [series.id, series]));
  return crosstabs(campaign).map((group) => ({
    id: group.id,
    name: group.name,
    rows: group.rows.flatMap((row) => {
      const series = byId.get(row.id);
      return series ? [series] : [];
    }),
  }));
}
