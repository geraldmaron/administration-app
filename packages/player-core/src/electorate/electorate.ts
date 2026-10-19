import { COHORT_AXES, cohortsOfAxis, type CohortAxisId, type CohortId, type StateId } from "@admin/world";
import {
  COHORT_MOTIVATION,
  nationalCohortShares,
  selectCohorts,
  selectMetricSeries,
  selectOpinionCauses,
  selectOpinionReading,
  heaviestCause,
  OPINION_CAUSE_LABELS,
  OPINION_DRIVER_MEANINGS,
  stateApprovals,
  type Campaign,
} from "@admin/engine";
import { STATE_IDS } from "@admin/world";
import { blocTopline, type BlocTopline } from "./blocs";
import { OPINION_DRIVER_LABELS } from "../format/figures";
import { COHORT_AXIS_LABELS, crosstabs, rankedProblems, type CrosstabGroup, type MostImportantProblem } from "../polling/crosstabs";
import { opinionTrends, type OpinionTrends } from "../polling/opinion-trends";
import { pollReading, type PollReading } from "../polling/polls";
import { isInheritedRow } from "../record/inheritance";
import { readingBand, type Stance } from "../reading";

// The electorate, read as a pollster's book: the topline, the six judgments
// behind it, every cut of the country, what each group remembers, the problem
// ranking and the map. Every figure is an engine selector read through; the
// only arithmetic here is a difference between two figures the engine already
// published, and nothing is a series the campaign does not keep.

const percent = (value: number) => `${Math.round(value * 100)}%`;

export type JudgmentRow = {
  readonly driver: string;
  readonly label: string;
  readonly meaning: string;
  /** How well the country judges the administration on this, 0..1. */
  readonly value: number;
  readonly figure: string;
  readonly stance: Stance;
  readonly word: string;
  /** How much the week weighs this judgment, 0..1. */
  readonly weight: number;
  /** Whether the week itself has made it matter more. */
  readonly salient: boolean;
  /** The heaviest thing doing it, named. */
  readonly cause?: string;
  readonly causeDetail?: string;
};

export type ToplineView = {
  readonly poll: PollReading;
  /** Approval week by week, oldest first, ending now: the settled series the engine keeps. */
  readonly series: readonly number[];
  /** How many leading points are the predecessor's quarter. */
  readonly inherited: number;
  /** Points since the oath on the same series; undefined with no governed week closed. */
  readonly sinceOath?: number;
  readonly judgments: readonly JudgmentRow[];
};

function toplineView(campaign: Campaign): ToplineView {
  const causes = selectOpinionCauses(campaign);
  const judgments = selectOpinionReading(campaign).map((reading): JudgmentRow => {
    const band = readingBand("standing", reading.value);
    const top = causes.find((entry) => entry.driver === reading.driver);
    const cause = top ? heaviestCause(top) : undefined;
    return {
      driver: reading.driver,
      label: OPINION_DRIVER_LABELS[reading.driver],
      meaning: OPINION_DRIVER_MEANINGS[reading.driver],
      value: reading.value,
      figure: percent(reading.value),
      stance: band?.stance ?? "neutral",
      word: band?.word ?? "",
      weight: reading.weight,
      salient: reading.salient,
      ...(cause === undefined ? {} : { cause: OPINION_CAUSE_LABELS[cause.key], causeDetail: cause.detail }),
    };
  });
  const series = selectMetricSeries(campaign, "approval");
  const history = campaign.player.metricHistory;
  const inherited = history.filter((_, index) => isInheritedRow(campaign, index)).length;
  const first = series[inherited];
  const last = series[series.length - 1];
  return {
    poll: pollReading(campaign),
    series,
    inherited,
    ...(first !== undefined && last !== undefined && series.length - inherited > 1 ? { sinceOath: last - first } : {}),
    judgments,
  };
}

export type CohortMemoryRow = {
  readonly cohort: CohortId;
  readonly axis: CohortAxisId;
  readonly axisLabel: string;
  readonly name: string;
  readonly share: number;
  /** Signed live memory; negative is harm not yet forgiven. */
  readonly strain: number;
  /** The part of its memory that is about this group rather than the country, signed. */
  readonly displacement: number;
  readonly reading: string;
};

/** Groups that remember something of this administration, the most aggrieved first. */
function cohortMemory(campaign: Campaign): readonly CohortMemoryRow[] {
  return selectCohorts(campaign)
    .flatMap((standing): CohortMemoryRow[] =>
      standing.reading === undefined
        ? []
        : [
            {
              cohort: standing.cohort,
              axis: standing.axis,
              axisLabel: COHORT_AXIS_LABELS[standing.axis],
              name: standing.name,
              share: standing.share,
              strain: standing.strain,
              displacement: standing.displacement,
              reading: standing.reading,
            },
          ],
    )
    .sort((a, b) => a.displacement - b.displacement || a.cohort.localeCompare(b.cohort));
}

export type StateApprovalCell = {
  readonly state: StateId;
  readonly name: string;
  readonly approval: number;
  readonly figure: string;
  readonly stance: Stance;
  readonly word: string;
  /** Against the previous weekly sample; undefined when there is no earlier sample. */
  readonly change?: number;
  /** Weekly record from the oath, oldest first. */
  readonly history: readonly number[];
};

function stateCells(campaign: Campaign): readonly StateApprovalCell[] {
  const approvals = stateApprovals(campaign);
  const samples = campaign.stateApprovalHistory ?? [];
  return STATE_IDS.flatMap((id): StateApprovalCell[] => {
    const approval = approvals[id];
    const runtime = campaign.states[id];
    if (approval === undefined || !runtime) return [];
    const band = readingBand("standing", approval);
    const history = samples.flatMap((sample) => {
      const value = sample.approval[id];
      return value === undefined ? [] : [value];
    });
    const earlier = history[history.length - 1];
    return [
      {
        state: id,
        name: runtime.base.name,
        approval,
        figure: percent(approval),
        stance: band?.stance ?? "neutral",
        word: band?.word ?? "",
        ...(earlier === undefined ? {} : { change: approval - earlier }),
        history,
      },
    ];
  });
}

export type ElectorateView = {
  readonly topline: ToplineView;
  readonly problems: readonly MostImportantProblem[];
  readonly cuts: readonly CrosstabGroup[];
  /**
   * Where the country stands across the ten cuts: each cut's share-weighted
   * support, averaged. The line every cut's gap is read against, because the
   * tracking poll carries its own sampling error and a group's reading does not.
   */
  readonly cutsAverage: number;
  /** The country as the three blocs a player is shown, and what moved each. */
  readonly blocs: BlocTopline;
  readonly memory: readonly CohortMemoryRow[];
  readonly states: readonly StateApprovalCell[];
  /** The judgments, cells and blocs as observed week by week, and where that record starts. */
  readonly trends: OpinionTrends;
};

function cutsAverage(cuts: readonly CrosstabGroup[]): number {
  const means = cuts.flatMap((cut) => {
    const total = cut.rows.reduce((sum, row) => sum + (row.share ?? 0), 0);
    return total > 0 ? [cut.rows.reduce((sum, row) => sum + row.support * (row.share ?? 0), 0) / total] : [];
  });
  return means.length === 0 ? 0 : means.reduce((sum, mean) => sum + mean, 0) / means.length;
}

/** The whole book on the electorate this week. */
export function electorateView(campaign: Campaign): ElectorateView {
  const cuts = crosstabs(campaign);
  return {
    topline: toplineView(campaign),
    problems: rankedProblems(campaign),
    cuts,
    cutsAverage: cutsAverage(cuts),
    blocs: blocTopline(campaign),
    memory: cohortMemory(campaign),
    states: stateCells(campaign),
    trends: opinionTrends(campaign),
  };
}

export type DemographicCell = {
  readonly cohort: CohortId;
  readonly name: string;
  readonly state: number;
  readonly nation: number;
  /** State share less national share, in share units. */
  readonly gap: number;
};

export type DemographicAxis = {
  readonly axis: CohortAxisId;
  readonly name: string;
  readonly cells: readonly DemographicCell[];
};

/**
 * A state's composition on each of the ten axes against the country's
 * population-weighted figure. Undefined for a state the campaign does not carry
 * or whose dataset has no cohort mix.
 */
export function stateDemographics(campaign: Campaign, id: StateId): readonly DemographicAxis[] | undefined {
  const mix = campaign.states[id]?.base.character.cohorts;
  if (!mix) return undefined;
  const nation = nationalCohortShares(campaign);
  return COHORT_AXES.map((axis) => {
    const shares = mix[axis] as Readonly<Record<string, number>>;
    return {
      axis,
      name: COHORT_AXIS_LABELS[axis],
      cells: cohortsOfAxis(axis).map((cohort) => {
        const state = shares[cohort] ?? 0;
        return { cohort, name: COHORT_MOTIVATION[cohort].name, state, nation: nation[cohort], gap: state - nation[cohort] };
      }),
    };
  });
}
