import { TREASURY_REFERENCE, elapsedDays, historicalBenchmarks } from "@admin/engine";
import { ALL_METRIC_DEFINITIONS, checkComparison, monthIndex, periodEnd, periodStart, referenceWindow, valueOf } from "@admin/world";
import { WINDOW_PRESETS, type ComparisonWindow } from "../economy/comparison.js";
import type { EconomyHistoryRate } from "../economy/history.js";
import type { CompareMetric } from "./metrics.js";

// The past a presidency can be held against: the engine's authored landmarks
// (Gallup readings, the real federal outlay scale) and stretches of the
// published United States record. A landmark is one figure and is never drawn
// as a course. A record stretch is lined up by months since it began, never by
// calendar date, for the reason `economy/comparison.ts` gives: the campaign's
// years are its own.

const MONTH_DAYS = 365.25 / 12;

const REFERENCE: Readonly<Record<EconomyHistoryRate, { readonly reference: string; readonly simulated: string }>> = {
  unemployment: { reference: "us.unemployment", simulated: "sim.unemployment" },
  inflation: { reference: "us.inflation", simulated: "sim.inflation" },
  growth: { reference: "us.gdp-growth", simulated: "sim.growth" },
};

/** One published period, as months since the stretch began, valued as a fraction. */
export type RecordPeriod = {
  readonly from: number;
  readonly to: number;
  readonly label: string;
  readonly value: number | undefined;
};

export type ResolvedHistory =
  | { readonly ok: true; readonly kind: "landmark"; readonly id: string; readonly label: string; readonly value: number; readonly note?: string }
  | { readonly ok: true; readonly kind: "record"; readonly id: string; readonly label: string; readonly periods: readonly RecordPeriod[]; readonly note: string }
  | { readonly ok: false; readonly id: string; readonly label: string; readonly reason: string };

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function landmarks(metric: CompareMetric): readonly ResolvedHistory[] {
  if (metric.history !== "approval-landmarks" && metric.history !== "treasury-scale") return [];
  const scale = metric.history === "treasury-scale" ? TREASURY_REFERENCE : 1;
  return historicalBenchmarks(metric.id).map((mark) => ({
    ok: true,
    kind: "landmark",
    id: `${metric.id}:${slug(mark.label)}`,
    label: mark.label,
    value: mark.at * scale,
    ...(mark.note ? { note: mark.note } : {}),
  }));
}

const recordLabel = (window: ComparisonWindow): string => `U.S. record, ${window.first.slice(0, 4)} to ${window.last.slice(0, 4)}`;

function recordStretch(rate: EconomyHistoryRate, window: ComparisonWindow): ResolvedHistory {
  const id = `us-record:${window.id}`;
  const label = recordLabel(window);
  const spec = REFERENCE[rate];
  const verdict = checkComparison(ALL_METRIC_DEFINITIONS[spec.simulated]!, ALL_METRIC_DEFINITIONS[spec.reference]!);
  if (verdict.status === "incompatible") return { ok: false, id, label, reason: verdict.reason };
  const found = referenceWindow(spec.reference, window.first, window.last);
  if (!found.ok) return { ok: false, id, label, reason: found.reason };
  const start = monthIndex(window.first);
  const periods = found.observations.map((observation) => {
    const value = valueOf(observation);
    return {
      from: periodStart(observation.period) - start,
      to: periodEnd(observation.period) - start,
      label: observation.period,
      value: value === undefined ? undefined : value / 100,
    };
  });
  return { ok: true, kind: "record", id, label, periods, note: `${window.label}. Each line starts at its own first month, so they line up by time passed, not by date.` };
}

/** Every past this reading can be set against, the refused ones with their reason. */
export function historyOptions(metric: CompareMetric): readonly ResolvedHistory[] {
  if (metric.history === undefined) return [];
  if (metric.history === "approval-landmarks" || metric.history === "treasury-scale") return landmarks(metric);
  const rate = metric.history;
  return WINDOW_PRESETS.map((window) => recordStretch(rate, window));
}

export function resolveHistory(metric: CompareMetric, benchmarkId: string): ResolvedHistory {
  const found = historyOptions(metric).find((option) => option.id === benchmarkId);
  if (found) return found;
  return { ok: false, id: benchmarkId, label: benchmarkId, reason: `There's no past record of ${metric.label.toLowerCase()} by that name.` };
}

/** The published figure for the month a campaign week falls in, counted from the oath; undefined before the oath or past the stretch. */
export function recordValueAt(periods: readonly RecordPeriod[], turn: number): number | undefined {
  if (turn < 1) return undefined;
  const month = Math.floor(elapsedDays(turn) / MONTH_DAYS);
  return periods.find((period) => period.from <= month && month <= period.to)?.value;
}

/** A stretch's average over the periods it published, or undefined where it published none. */
export function recordAverage(periods: readonly RecordPeriod[]): number | undefined {
  const values = periods.flatMap((period) => (period.value === undefined ? [] : [period.value]));
  return values.length === 0 ? undefined : values.reduce((sum, value) => sum + value, 0) / values.length;
}
