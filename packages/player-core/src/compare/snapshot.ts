import type { Campaign } from "@admin/engine";
import { resolveHistory } from "./history.js";
import { COMPARE_METRICS, type CompareMetricId } from "./metrics.js";
import { readCurrent } from "./readings.js";
import { entityLabel, isSelfSubject, normalizeSubject, subjectKey } from "./subjects.js";
import type { Better, FormatKind, Subject } from "./types.js";

// Several readings across several subjects, shaped for a comparison matrix.
// The President's own row and the governments and states beside it are
// ranked; a past (a landmark, a published stretch, the President's own earlier
// week) is a reference row, shown but never ranked against the living.

/** A row's place in one column: 1 is best. */
export type CellRank = { readonly rank: number; readonly of: number; readonly percentile: number };

export type SnapshotMetric = {
  readonly id: CompareMetricId;
  readonly label: string;
  readonly unit: string;
  readonly format: FormatKind;
  readonly better: Better;
  /** The median of the compared governments or states, where at least two carry the reading. */
  readonly benchmark?: { readonly label: string; readonly value: number };
};

export type SnapshotRow = {
  readonly id: string;
  readonly subject: Subject;
  readonly label: string;
  readonly values: Readonly<Record<string, number | null>>;
  /** Why a cell is empty, keyed by metric. */
  readonly reasons: Readonly<Partial<Record<CompareMetricId, string>>>;
  readonly ranks: Readonly<Partial<Record<CompareMetricId, CellRank>>>;
  readonly self?: true;
  readonly reference?: true;
};

export type CompareSnapshot = {
  readonly metrics: readonly SnapshotMetric[];
  readonly rows: readonly SnapshotRow[];
};

/**
 * Ranks one column by which direction is better. Ties share the better rank;
 * the percentile is the share of ranked rows this one beats or equals, so the
 * best is 1 and a lone row is 1.
 */
export function rankColumn(values: readonly (number | null)[], better: Better): readonly (CellRank | undefined)[] {
  const present = values.flatMap((value, index) => (value === null || !Number.isFinite(value) ? [] : [{ value, index }]));
  const sorted = [...present].sort((a, b) => (better === "up" ? b.value - a.value : a.value - b.value));
  return values.map((_, index) => {
    const position = sorted.findIndex((entry) => entry.index === index);
    if (position === -1) return undefined;
    const rank = sorted.findIndex((entry) => entry.value === sorted[position]!.value) + 1;
    return { rank, of: sorted.length, percentile: sorted.length <= 1 ? 1 : (sorted.length - rank + 1) / sorted.length };
  });
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function rowLabel(campaign: Campaign, subject: Subject, metricIds: readonly CompareMetricId[]): string {
  if (subject.kind !== "history") return entityLabel(campaign, subject);
  for (const id of metricIds) {
    const resolved = resolveHistory(COMPARE_METRICS[id], subject.benchmarkId);
    if (resolved.ok) return resolved.kind === "record" ? `${resolved.label} (average)` : resolved.label;
  }
  return subject.benchmarkId;
}

type Draft = Omit<SnapshotRow, "ranks">;

function draftRow(campaign: Campaign, subject: Subject, metricIds: readonly CompareMetricId[]): Draft {
  const readings = metricIds.map((id) => [id, readCurrent(campaign, COMPARE_METRICS[id], subject)] as const);
  const reference = subject.kind === "history" || subject.kind === "self-at";
  return {
    id: subjectKey(subject),
    subject,
    label: rowLabel(campaign, subject, metricIds),
    values: Object.fromEntries(readings.map(([id, reading]) => [id, reading.ok ? reading.value : null])),
    reasons: Object.fromEntries(readings.flatMap(([id, reading]) => (reading.ok ? [] : [[id, reading.reason]]))),
    ...(isSelfSubject(campaign, subject) ? { self: true as const } : {}),
    ...(reference ? { reference: true as const } : {}),
  };
}

function column(metricId: CompareMetricId, drafts: readonly Draft[]): { readonly metric: SnapshotMetric; readonly ranks: readonly (CellRank | undefined)[] } {
  const metric = COMPARE_METRICS[metricId];
  const ranked = drafts.map((row) => (row.reference ? null : (row.values[metricId] ?? null)));
  const peers = drafts.flatMap((row) => {
    const value = row.values[metricId];
    return row.reference || row.self || value === null || value === undefined ? [] : [value];
  });
  const benchmark = peers.length >= 2 ? { label: `Middle value of the ${peers.length} compared`, value: median(peers) } : undefined;
  return {
    metric: { id: metricId, label: metric.label, unit: metric.unit, format: metric.format, better: metric.better, ...(benchmark ? { benchmark } : {}) },
    ranks: rankColumn(ranked, metric.better),
  };
}

/** Every subject's figure on every reading this week, ranked within each column, with each column's median. */
export function compareSnapshot(campaign: Campaign, metricIds: readonly CompareMetricId[], subjects: readonly Subject[]): CompareSnapshot {
  const normalized = subjects.map((subject) => normalizeSubject(campaign, subject));
  const unique = [...new Map(normalized.map((subject) => [subjectKey(subject), subject])).values()];
  const drafts = unique.map((subject) => draftRow(campaign, subject, metricIds));
  const columns = metricIds.map((id) => column(id, drafts));
  const rows = drafts.map((row, index): SnapshotRow => ({
    ...row,
    ranks: Object.fromEntries(metricIds.flatMap((id, at) => {
      const rank = columns[at]!.ranks[index];
      return rank ? [[id, rank]] : [];
    })),
  }));
  return { metrics: columns.map((entry) => entry.metric), rows };
}
