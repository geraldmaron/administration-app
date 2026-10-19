import type { Campaign } from "@admin/engine";
import { formatMoney } from "../format/money.js";
import { compareBenchmarks } from "./benchmarks.js";
import { COMPARE_METRICS, type CompareMetric, type CompareMetricId } from "./metrics.js";
import { weekLabel } from "./subjects.js";
import type { Better, CompareBenchmarkKind, CoursePoint, FormatKind } from "./types.js";

// The President against their own past and against every defined line, as a
// gap and a sentence: "8 points below Typical honeymoon". A gap with no
// reading on one side is not a gap, and says why instead.

export type SelfComparisonKind = "inauguration" | "four-weeks-ago" | CompareBenchmarkKind;

export type SelfComparison = {
  readonly id: string;
  readonly label: string;
  readonly kind: SelfComparisonKind;
  /** The figure compared against, on the reading's own scale. */
  readonly value?: number;
  /** Now less the figure; positive is higher. */
  readonly gap?: number;
  /** Whether the gap favors the President, under the reading's own better direction. */
  readonly standing?: "better" | "worse" | "level";
  /** The gap in words, or why there is none. */
  readonly sentence: string;
};

export type SelfVersus = {
  readonly metricId: CompareMetricId;
  readonly label: string;
  readonly format: FormatKind;
  readonly better: Better;
  readonly now?: number;
  /** Why there is no figure this week, where there is not. */
  readonly unavailable?: string;
  readonly comparisons: readonly SelfComparison[];
};

const FOUR_WEEKS = 4;

/** The gap's size in the reading's own words, or undefined where it rounds to nothing. */
function amount(format: FormatKind, gap: number): string | undefined {
  const size = Math.abs(gap);
  if (format === "usd-millions") return Math.round(size) === 0 ? undefined : formatMoney(size);
  const decimals = format === "percent" ? 1 : 0;
  const points = Number((size * 100).toFixed(decimals));
  if (points === 0) return undefined;
  return `${points.toFixed(decimals)} ${points === 1 ? "point" : "points"}`;
}

function judged(metric: CompareMetric, id: string, label: string, kind: SelfComparisonKind, now: number, value: number, against: string): SelfComparison {
  const gap = now - value;
  const size = amount(metric.format, gap);
  if (size === undefined) return { id, label, kind, value, gap, standing: "level", sentence: `Same as ${against}` };
  const favors = metric.better === "up" ? gap > 0 : gap < 0;
  return { id, label, kind, value, gap, standing: favors ? "better" : "worse", sentence: `${size} ${gap > 0 ? "above" : "below"} ${against}` };
}

function inauguration(metric: CompareMetric, campaign: Campaign, now: number, course: readonly CoursePoint[]): SelfComparison {
  const base = { id: "inauguration", label: "At the oath", kind: "inauguration" as const };
  if (campaign.turn <= 1) return { ...base, sentence: "This is your first week, so there's nothing to compare yet." };
  const oath = course.find((point) => point.turn === 1);
  if (oath) return judged(metric, base.id, base.label, base.kind, now, oath.value, "where it was when you took office");
  const first = course.find((point) => point.turn > 1 && point.turn < campaign.turn);
  if (!first) return { ...base, sentence: `Records of ${metric.label.toLowerCase()} don't go back to when you took office.` };
  // The economy's record opens at the close of the first week, so its first sample is the nearest reading the record holds.
  if (first.turn > 1 + FOUR_WEEKS) return { ...base, sentence: `Records of ${metric.label.toLowerCase()} don't go back to when you took office.` };
  return judged(metric, base.id, `${weekLabel(first.turn)}, the first on record`, base.kind, now, first.value, `${weekLabel(first.turn).toLowerCase()}, the first on record`);
}

function fourWeeksAgo(metric: CompareMetric, campaign: Campaign, now: number, course: readonly CoursePoint[]): SelfComparison {
  const base = { id: "four-weeks-ago", label: "Four weeks ago", kind: "four-weeks-ago" as const };
  const then = course.find((point) => point.turn === campaign.turn - FOUR_WEEKS);
  if (!then) return { ...base, sentence: `There's no ${metric.label.toLowerCase()} figure from four weeks ago.` };
  return judged(metric, base.id, base.label, base.kind, now, then.value, "four weeks ago");
}

/** This presidency now against the oath, four weeks ago, and every defined line for the reading. */
export function selfVersus(campaign: Campaign, metricId: CompareMetricId): SelfVersus {
  const metric = COMPARE_METRICS[metricId];
  const head = { metricId, label: metric.label, format: metric.format, better: metric.better };
  const now = metric.self(campaign);
  if (now === undefined) return { ...head, unavailable: "Your own figure isn't available.", comparisons: [] };
  const course = metric.course?.(campaign);
  const own = course
    ? [inauguration(metric, campaign, now, course), fourWeeksAgo(metric, campaign, now, course)]
    : [{ id: "own-record", label: "Earlier weeks", kind: "inauguration" as const, sentence: `The game doesn't keep a weekly record of ${metric.label.toLowerCase()}, so you can't compare it with earlier weeks.` }];
  const lines = compareBenchmarks(campaign, metric).flatMap((mark): readonly SelfComparison[] =>
    mark.value === undefined ? [] : [judged(metric, mark.id, mark.label, mark.kind, now, mark.value, mark.label)],
  );
  return { ...head, now, comparisons: [...own, ...lines] };
}
