import type { CompareSeriesView } from "@admin/player-core";
import type { Benchmark, ChartSeries } from "@admin/ui";
import { formatterFor, unitWords } from "./format";

/** A subject the comparison could not draw, and why, said in place of a line. */
export type Refusal = { readonly id: string; readonly label: string; readonly reason: string };

export type ChartModel = {
  readonly title: string;
  readonly unit: string;
  readonly x: readonly string[];
  readonly series: readonly ChartSeries[];
  readonly benchmarks: readonly Benchmark[];
  readonly format: (value: number) => string;
  readonly domain?: readonly [number, number];
  readonly better: "up" | "down";
  readonly refusals: readonly Refusal[];
  /** What a drawn line does and does not hold, or where a benchmark's figure comes from. */
  readonly notes: readonly { readonly id: string; readonly label: string; readonly note: string }[];
};

/**
 * A comparison course as the benchmark chart draws it. A subject with no
 * reading is never drawn as a line of nothing: it becomes a refusal in words.
 */
export function chartModel(view: CompareSeriesView): ChartModel {
  const drawn = view.series.filter((line) => line.available);
  const refused = view.series.filter((line) => !line.available);
  return {
    title: view.title,
    unit: unitWords(view.format, view.unit),
    x: view.x,
    series: drawn.map((line) => ({ id: line.id, label: line.label, values: line.values, kind: line.kind })),
    benchmarks: view.benchmarks.map((mark) => ({
      id: mark.id,
      label: mark.label,
      kind: mark.kind,
      ...(mark.value !== undefined ? { value: mark.value } : {}),
      ...(mark.band ? { band: mark.band } : {}),
    })),
    format: formatterFor(view.format),
    ...(view.domain ? { domain: view.domain } : {}),
    better: view.better,
    refusals: refused.map((line) => ({ id: line.id, label: line.label, reason: line.reason ?? "There's no number for this." })),
    notes: [
      ...drawn.flatMap((line) => (line.note ? [{ id: line.id, label: line.label, note: line.note }] : [])),
      ...view.benchmarks.flatMap((mark) => (mark.note ? [{ id: mark.id, label: mark.label, note: mark.note }] : [])),
    ],
  };
}
