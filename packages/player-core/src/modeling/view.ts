import {
  COHORT_MOTIVATION,
  OPINION_DRIVERS,
  PROJECTION_HEADLINE_METRICS,
  addDays,
  type Campaign,
  type ProjectionMetric,
  type ProjectionReading,
  type ProjectionRun,
} from "@admin/engine";
import { COHORT_IDS, type CohortId } from "@admin/world";
import { METRIC_LABELS, OPINION_DRIVER_LABELS, formatDate } from "../format/figures";
import { formatMoney } from "../format/money";
import { approvalDrivers, type DriverBar } from "../desk/opinion-causes";
import type { ModelingChoice } from "./choices";

// The workbench's reading of an ensemble. Every alternative is compared with
// not acting run by run, on the same seed, so a difference is the choice and
// not the luck of one run against another; the median of those paired
// differences is the headline and their range is how sure it is.

export type ModelingUnit = "points" | "money";
export type ModelingGroup = "headline" | "judgment" | "cohort";

/** Median and range across the ensemble at one week. */
export type ModelingBand = { readonly median: number; readonly low: number; readonly high: number };

export type ModelingLine = { readonly alternative: string; readonly points: readonly ModelingBand[] };

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

export type ModelingGroupMove = ModelingBand & { readonly cohort: CohortId; readonly name: string; readonly text: string };

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

export type ModelingMover = ModelingDelta & { readonly alternative: string };

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
export const GROUP_MOVE_FLOOR = 0.005;
/** A twentieth of a point: below it a paired difference counts as none. */
const SAME = 0.0005;
const GROUP_LIMIT = 4;
const MOVER_LIMIT = 3;

const HEADLINE_LABELS: Readonly<Record<(typeof PROJECTION_HEADLINE_METRICS)[number], string>> = { ...METRIC_LABELS, removalPressure: "Removal pressure" };

function metricMeta(metric: ProjectionMetric): Pick<ModelingMetricView, "label" | "group" | "unit" | "better"> {
  if (metric.startsWith("judgment:")) return { label: OPINION_DRIVER_LABELS[metric.slice(9) as (typeof OPINION_DRIVERS)[number]], group: "judgment", unit: "points", better: "higher" };
  if (metric.startsWith("cohort:")) return { label: COHORT_MOTIVATION[metric.slice(7) as CohortId].name, group: "cohort", unit: "points", better: "higher" };
  const key = metric as (typeof PROJECTION_HEADLINE_METRICS)[number];
  return { label: HEADLINE_LABELS[key], group: "headline", unit: key === "treasury" ? "money" : "points", better: key === "removalPressure" ? "lower" : "higher" };
}

export function ensembleBand(values: readonly number[]): ModelingBand {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return { median, low: sorted[0]!, high: sorted[sorted.length - 1]! };
}

/** A signed difference; one that rounds to nothing prints unsigned, so "−0.0" never suggests a direction. */
export function modelingFigure(value: number, unit: ModelingUnit): string {
  const text = unit === "money" ? formatMoney(Math.abs(value)) : `${Math.abs(value * 100).toFixed(1)} pts`;
  const zero = unit === "money" ? text === formatMoney(0) : text === "0.0 pts";
  return zero ? text : `${value > 0 ? "+" : "−"}${text}`;
}

/** A run's readings to the horizon; a run that ended holds its last reading, since nothing after the ending moves. */
function padded(run: ProjectionRun, weeks: number): readonly ProjectionReading[] {
  const last = run.readings[run.readings.length - 1]!;
  return Array.from({ length: weeks + 1 }, (_, week) => run.readings[week] ?? last);
}

function agreementOf(diffs: readonly number[]): ModelingAgreement {
  if (diffs.every((diff) => Math.abs(diff) < SAME)) return "same";
  if (diffs.every((diff) => diff > -SAME)) return "higher";
  if (diffs.every((diff) => diff < SAME)) return "lower";
  return "mixed";
}

/** Each alternative's finished runs, keyed by ensemble member. */
type Paths = ReadonlyMap<string, ReadonlyMap<number, readonly ProjectionReading[]>>;

/**
 * Differences run for run, on the members both sides have finished. A
 * difference against a member the baseline has not run yet would compare two
 * different draws of the world, so a partial ensemble pairs only what it has.
 */
function pairedDiffs(paths: Paths, alternative: string, baseline: string, metric: ProjectionMetric, week: number): readonly number[] {
  const theirs = paths.get(baseline);
  return [...(paths.get(alternative) ?? new Map<number, readonly ProjectionReading[]>())].flatMap(([member, run]) => {
    const other = theirs?.get(member);
    return other ? [run[week]![metric] - other[week]![metric]] : [];
  });
}

function pairedCount(paths: Paths, alternative: string, baseline: string): number {
  const theirs = paths.get(baseline);
  return [...(paths.get(alternative)?.keys() ?? [])].filter((member) => theirs?.has(member)).length;
}

function deltaOf(paths: Paths, alternative: string, baseline: string, metric: ProjectionMetric, week: number): ModelingDelta {
  const diffs = pairedDiffs(paths, alternative, baseline, metric, week);
  const meta = metricMeta(metric);
  const spread = ensembleBand(diffs);
  return { metric, label: meta.label, unit: meta.unit, better: meta.better, ...spread, agreement: agreementOf(diffs), text: modelingFigure(spread.median, meta.unit) };
}

function groupMoves(paths: Paths, alternative: string, baseline: string, week: number): readonly ModelingGroupMove[] {
  return COHORT_IDS.map((cohort): ModelingGroupMove => {
    const spread = ensembleBand(pairedDiffs(paths, alternative, baseline, `cohort:${cohort}`, week));
    return { cohort, name: COHORT_MOTIVATION[cohort].name, ...spread, text: modelingFigure(spread.median, "points") };
  }).filter((move) => Math.abs(move.median) >= GROUP_MOVE_FLOOR);
}

function surenessOf(delta: ModelingDelta, against: string, runs: number, weeks: number): string {
  const [low, high] = [modelingFigure(delta.low, "points"), modelingFigure(delta.high, "points")];
  const range = low === high ? low : `${low} to ${high}`;
  if (delta.agreement === "same") return `None of the test runs moves approval even a twentieth of a point compared with ${against} by week ${weeks}.`;
  if (delta.agreement === "mixed") return `The test runs disagree about approval by week ${weeks}. Compared with ${against}, they range from ${range}, so it could go either way.`;
  if (runs === 1) return `The one test run so far puts approval ${delta.agreement} than ${against} by week ${weeks}, by ${range}.`;
  return `All ${runs} test runs put approval ${delta.agreement} than ${against} by week ${weeks}, by ${range}.`;
}

const DELTA_METRICS: readonly ProjectionMetric[] = [...PROJECTION_HEADLINE_METRICS, ...OPINION_DRIVERS.map((driver) => `judgment:${driver}` as const)];

function alternativeView(choice: ModelingChoice, paths: Paths, runs: readonly ProjectionRun[], id: string, weeks: number): ModelingAlternativeView {
  const alternative = choice.alternatives.find((entry) => entry.id === id)!;
  const baseline = choice.alternatives.find((entry) => entry.baseline)!;
  const mine = runs.filter((run) => run.alternative === id);
  const refused = mine.find((run) => run.refused !== undefined)?.refused;
  const paired = alternative.baseline ? 0 : pairedCount(paths, id, baseline.id);
  const head = { id, label: alternative.label, baseline: alternative.baseline, endedRuns: mine.filter((run) => run.endedWeek !== undefined && run.endedWeek <= weeks).length, paired };
  if (refused !== undefined) return { ...head, refused, deltas: [], helped: [], hurt: [] };
  if (alternative.baseline || paired === 0) return { ...head, deltas: [], helped: [], hurt: [] };
  const deltas = DELTA_METRICS.map((metric) => deltaOf(paths, id, baseline.id, metric, weeks));
  const moves = groupMoves(paths, id, baseline.id, weeks);
  return {
    ...head,
    deltas,
    helped: moves.filter((move) => move.median > 0).sort((a, b) => b.median - a.median).slice(0, GROUP_LIMIT),
    hurt: moves.filter((move) => move.median < 0).sort((a, b) => a.median - b.median).slice(0, GROUP_LIMIT),
    sureness: surenessOf(deltas[0]!, choice.against, paired, weeks),
  };
}

function metricView(metric: ProjectionMetric, paths: Paths, weeks: number): ModelingMetricView {
  const lines = [...paths].map(([alternative, members]) => ({
    alternative,
    points: Array.from({ length: weeks + 1 }, (_, week) => ensembleBand([...members.values()].map((run) => run[week]![metric]))),
  }));
  return { metric, ...metricMeta(metric), lines };
}

/** Readings the movers rank on: shares of a whole, so a point means the same on each. Budget authority is in money and is read from the table. */
function moversOf(alternatives: readonly ModelingAlternativeView[], paths: Paths, choice: ModelingChoice, weeks: number): readonly ModelingMover[] {
  const baseline = choice.alternatives.find((entry) => entry.baseline)!;
  return alternatives
    .filter((alternative) => !alternative.baseline && alternative.refused === undefined && alternative.paired > 0)
    .flatMap((alternative) => {
      const candidates = [...DELTA_METRICS.filter((metric) => metric !== "treasury"), ...COHORT_IDS.map((cohort) => `cohort:${cohort}` as const)];
      return candidates
        .map((metric) => deltaOf(paths, alternative.id, baseline.id, metric, weeks))
        .filter((delta) => Math.abs(delta.median) >= SAME)
        .sort((a, b) => Math.abs(b.median) - Math.abs(a.median))
        .slice(0, MOVER_LIMIT)
        .map((delta) => ({ ...delta, alternative: alternative.id }));
    });
}

/** Members every projectable alternative has finished; an alternative the engine refuses has nothing to wait for. */
function completeMembers(choice: ModelingChoice, runs: readonly ProjectionRun[], paths: Paths): number {
  const sizes = choice.alternatives
    .filter((alternative) => !runs.some((run) => run.alternative === alternative.id && run.refused !== undefined))
    .map((alternative) => paths.get(alternative.id)?.size ?? 0);
  return sizes.length === 0 ? 0 : Math.min(...sizes);
}

/** Every alternative's runs to date, finished or partial, in any order; each row pairs with not acting on the members both have run. */
export function modelingView(campaign: Campaign, choice: ModelingChoice, runs: readonly ProjectionRun[], weeks: number): ModelingView {
  const paths: Paths = new Map(
    choice.alternatives
      .map((alternative) => {
        const finished = runs.filter((run) => run.alternative === alternative.id && run.refused === undefined && run.readings.length > 0);
        return [alternative.id, new Map(finished.map((run) => [run.member, padded(run, weeks)] as const))] as const;
      })
      .filter(([, members]) => members.size > 0),
  );
  const alternatives = choice.alternatives.map((alternative) => alternativeView(choice, paths, runs, alternative.id, weeks));
  const allMetrics = [...DELTA_METRICS, ...COHORT_IDS.map((cohort) => `cohort:${cohort}` as const)];
  return {
    title: choice.title,
    baselineMeaning: choice.baselineMeaning,
    currentJudgments: approvalDrivers(campaign),
    weeks,
    members: completeMembers(choice, runs, paths),
    weekDates: Array.from({ length: weeks + 1 }, (_, week) => formatDate(addDays(campaign.calendar, week * 7))),
    alternatives,
    metrics: allMetrics.map((metric) => metricView(metric, paths, weeks)),
    movers: moversOf(alternatives, paths, choice, weeks),
  };
}
