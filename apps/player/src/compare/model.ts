import { COMPARE_METRICS, COMPARE_METRIC_IDS, subjectKey, type CompareMetricId, type CompareSnapshot, type Subject } from "@admin/player-core";
import { MAX_SUBJECTS, withSelf } from "./subjects";

/** Adds a subject, or takes it away if it is already compared; the President's own line is never removed. */
export function toggleSubject(subjects: readonly Subject[], subject: Subject): readonly Subject[] {
  if (subject.kind === "self") return withSelf(subjects);
  const key = subjectKey(subject);
  const present = subjects.some((entry) => subjectKey(entry) === key);
  if (present) return withSelf(subjects.filter((entry) => subjectKey(entry) !== key));
  return subjects.length >= MAX_SUBJECTS ? withSelf(subjects) : withSelf([...subjects, subject]);
}

export const hasSubject = (subjects: readonly Subject[], subject: Subject): boolean => subjects.some((entry) => subjectKey(entry) === subjectKey(subject));

/** How many readings a matrix sets side by side: enough to judge, few enough for a phone to scroll. */
export const MATRIX_WIDTH = 6;

/**
 * The readings the matrix shows: the chosen one first, then the others that
 * can be read for at least one kind of subject being compared, so a column
 * is never a wall of refusals by construction.
 */
export function matrixMetricIds(metric: CompareMetricId, subjects: readonly Subject[]): readonly CompareMetricId[] {
  const others = subjects.filter((subject) => subject.kind !== "self").map((subject) => subject.kind);
  // Other governments and the states decide the columns when they are present; the President's own past fits almost every reading.
  const entities = others.filter((kind) => kind === "nation" || kind === "state");
  const kinds = new Set<string>(entities.length > 0 ? entities : others);
  const fits = (id: CompareMetricId) => kinds.size === 0 || COMPARE_METRICS[id].subjects.some((kind) => kinds.has(kind));
  return [metric, ...COMPARE_METRIC_IDS.filter((id) => id !== metric && fits(id))].slice(0, MATRIX_WIDTH);
}

export type CellRefusal = { readonly row: string; readonly metric: string; readonly reason: string };

/** Every empty cell of a snapshot with the engine's reason, so the matrix's "No data" is always explained in words. */
export function snapshotRefusals(snapshot: CompareSnapshot): readonly CellRefusal[] {
  const labels = new Map(snapshot.metrics.map((metric) => [metric.id, metric.label]));
  return snapshot.rows.flatMap((row) =>
    Object.entries(row.reasons).flatMap(([id, reason]) => (reason ? [{ row: row.label, metric: labels.get(id as CompareMetricId) ?? id, reason }] : [])),
  );
}

/** Past weeks of the President's own record worth a press: the oath, a month ago, a quarter ago. */
export function ownRecordTurns(turn: number): readonly { readonly turn: number; readonly label: string }[] {
  const options = [
    { turn: 1, label: "Your first week" },
    { turn: turn - 4, label: "Four weeks ago" },
    { turn: turn - 13, label: "Three months ago" },
  ];
  return options.filter((option, index) => option.turn >= 1 && option.turn < turn && options.findIndex((other) => other.turn === option.turn) === index);
}
