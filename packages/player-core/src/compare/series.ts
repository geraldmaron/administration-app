import type { Campaign } from "@admin/engine";
import { compareBenchmarks } from "./benchmarks.js";
import { recordValueAt, resolveHistory } from "./history.js";
import { COMPARE_METRICS, type CompareMetric, type CompareMetricId } from "./metrics.js";
import { readCourse, readCurrent } from "./readings.js";
import { entityLabel, isSelfSubject, normalizeSubject, subjectKey, weekLabel } from "./subjects.js";
import type { Better, CompareBenchmark, CompareWindow, CoursePoint, FormatKind, Subject } from "./types.js";

// Courses over the same weeks, shaped for a benchmark chart. A subject with a
// recorded course is a line; a single past figure (a landmark, the
// President's own reading in a named week) is a benchmark line rather than a
// flat course nobody recorded; a government whose past nobody keeps shows this
// week's figure alone, and says so.

export type SeriesKind = "self" | "peer" | "history";

export type CompareLine = {
  readonly id: string;
  readonly subject: Subject;
  readonly label: string;
  readonly kind: SeriesKind;
  /** One value per x position; null where the subject has no reading that week. */
  readonly values: readonly (number | null)[];
  readonly available: boolean;
  /** Why the line is empty, where it is. */
  readonly reason?: string;
  /** What the line does and does not hold, where that is not obvious from it. */
  readonly note?: string;
};

export type CompareSeriesView = {
  readonly metricId: CompareMetricId;
  readonly title: string;
  readonly unit: string;
  readonly format: FormatKind;
  readonly better: Better;
  readonly domain?: readonly [number, number];
  /** The campaign week each x position stands for. */
  readonly turns: readonly number[];
  readonly x: readonly string[];
  readonly series: readonly CompareLine[];
  readonly benchmarks: readonly CompareBenchmark[];
};

const CURRENT_ONLY = "The game only keeps this week's figure for this country, not earlier ones.";

function lineKind(campaign: Campaign, subject: Subject): SeriesKind {
  if (isSelfSubject(campaign, subject)) return "self";
  return subject.kind === "history" ? "history" : "peer";
}

function windowTurns(campaign: Campaign, window: CompareWindow, earliest: number): readonly number[] {
  const first = window === "term" ? 1 : Math.max(campaign.turn - Math.max(1, Math.floor(window)) + 1, Math.min(1, earliest));
  return Array.from({ length: campaign.turn - first + 1 }, (_, index) => first + index);
}

function courseLine(campaign: Campaign, metric: CompareMetric, subject: Exclude<Subject, { kind: "history" | "self-at" }>, turns: readonly number[]): CompareLine {
  const base = { id: subjectKey(subject), subject, kind: lineKind(campaign, subject) };
  const label = entityLabel(campaign, subject);
  const course = readCourse(campaign, metric, subject);
  if (!course.ok) return { ...base, label, values: turns.map(() => null), available: false, reason: course.reason };
  const byTurn = new Map(course.points.map((point) => [point.turn, point.value]));
  const values = turns.map((turn) => byTurn.get(turn) ?? null);
  const single = subject.kind === "nation" && !isSelfSubject(campaign, subject);
  return { ...base, label, values, available: values.some((value) => value !== null), ...(single ? { note: CURRENT_ONLY } : {}) };
}

function historyLine(metric: CompareMetric, subject: Extract<Subject, { kind: "history" }>, turns: readonly number[]): CompareLine | CompareBenchmark {
  const resolved = resolveHistory(metric, subject.benchmarkId);
  const base = { id: subjectKey(subject), subject, kind: "history" as const, label: resolved.label };
  if (!resolved.ok) return { ...base, values: turns.map(() => null), available: false, reason: resolved.reason };
  if (resolved.kind === "landmark") {
    return { id: subjectKey(subject), label: resolved.label, value: resolved.value, kind: "historical", ...(resolved.note ? { note: resolved.note } : {}) };
  }
  const values = turns.map((turn) => recordValueAt(resolved.periods, turn) ?? null);
  return { ...base, values, available: values.some((value) => value !== null), note: resolved.note };
}

function selfAtBenchmark(campaign: Campaign, metric: CompareMetric, subject: Extract<Subject, { kind: "self-at" }>): CompareLine | CompareBenchmark {
  const reading = readCurrent(campaign, metric, subject);
  const label = entityLabel(campaign, subject);
  if (!reading.ok) {
    return { id: subjectKey(subject), subject, label, kind: "self", values: [], available: false, reason: reading.reason };
  }
  return { id: subjectKey(subject), label, value: reading.value, kind: "historical", note: `Your own figure in ${weekLabel(subject.turn).toLowerCase()}.` };
}

const isLine = (entry: CompareLine | CompareBenchmark): entry is CompareLine => "values" in entry;

function earliestTurn(campaign: Campaign, metric: CompareMetric, subjects: readonly Subject[]): number {
  const firsts = subjects.flatMap((subject): readonly number[] => {
    if (subject.kind === "history" || subject.kind === "self-at") return [];
    const course = readCourse(campaign, metric, subject);
    const first: CoursePoint | undefined = course.ok ? course.points[0] : undefined;
    return first ? [first.turn] : [];
  });
  return Math.min(1, ...firsts);
}

function placeSubject(campaign: Campaign, metric: CompareMetric, subject: Subject, turns: readonly number[]): CompareLine | CompareBenchmark {
  if (subject.kind === "history") return historyLine(metric, subject, turns);
  if (subject.kind === "self-at") return selfAtBenchmark(campaign, metric, subject);
  return courseLine(campaign, metric, subject, turns);
}

/** Merge subject lines into the defined set, dropping a line that restates one already there. */
function mergeBenchmarks(defined: readonly CompareBenchmark[], added: readonly CompareBenchmark[]): readonly CompareBenchmark[] {
  const fresh = added.filter((mark) => !defined.some((other) => other.label === mark.label && other.value === mark.value));
  return [...defined, ...fresh];
}

/** One reading's course for each subject over the same weeks, with the lines it is judged against. */
export function compareSeries(campaign: Campaign, metricId: CompareMetricId, subjects: readonly Subject[], window: CompareWindow): CompareSeriesView {
  const metric = COMPARE_METRICS[metricId];
  const normalized = [...new Map(subjects.map((subject) => normalizeSubject(campaign, subject)).map((subject) => [subjectKey(subject), subject])).values()];
  const turns = windowTurns(campaign, window, earliestTurn(campaign, metric, normalized));
  const placed = normalized.map((subject) => placeSubject(campaign, metric, subject, turns));
  // A refused self-at reading is built before the window is known to it.
  const series = placed.filter(isLine).map((line) => (line.values.length === turns.length ? line : { ...line, values: turns.map(() => null) }));
  return {
    metricId,
    title: metric.label,
    unit: metric.unit,
    format: metric.format,
    better: metric.better,
    ...(metric.domain ? { domain: metric.domain } : {}),
    turns,
    x: turns.map(weekLabel),
    series,
    benchmarks: mergeBenchmarks(compareBenchmarks(campaign, metric), placed.filter((entry): entry is CompareBenchmark => !isLine(entry))),
  };
}
