import { compareBenchmarks } from "./benchmarks.js";
import { recordValueAt, resolveHistory } from "./history.js";
import { COMPARE_METRICS } from "./metrics.js";
import { readCourse, readCurrent } from "./readings.js";
import { entityLabel, isSelfSubject, normalizeSubject, subjectKey, weekLabel } from "./subjects.js";
const CURRENT_ONLY = "The game only keeps this week's figure for this country, not earlier ones.";
function lineKind(campaign, subject) {
    if (isSelfSubject(campaign, subject))
        return "self";
    return subject.kind === "history" ? "history" : "peer";
}
function windowTurns(campaign, window, earliest) {
    const first = window === "term" ? 1 : Math.max(campaign.turn - Math.max(1, Math.floor(window)) + 1, Math.min(1, earliest));
    return Array.from({ length: campaign.turn - first + 1 }, (_, index) => first + index);
}
function courseLine(campaign, metric, subject, turns) {
    const base = { id: subjectKey(subject), subject, kind: lineKind(campaign, subject) };
    const label = entityLabel(campaign, subject);
    const course = readCourse(campaign, metric, subject);
    if (!course.ok)
        return { ...base, label, values: turns.map(() => null), available: false, reason: course.reason };
    const byTurn = new Map(course.points.map((point) => [point.turn, point.value]));
    const values = turns.map((turn) => byTurn.get(turn) ?? null);
    const single = subject.kind === "nation" && !isSelfSubject(campaign, subject);
    return { ...base, label, values, available: values.some((value) => value !== null), ...(single ? { note: CURRENT_ONLY } : {}) };
}
function historyLine(metric, subject, turns) {
    const resolved = resolveHistory(metric, subject.benchmarkId);
    const base = { id: subjectKey(subject), subject, kind: "history", label: resolved.label };
    if (!resolved.ok)
        return { ...base, values: turns.map(() => null), available: false, reason: resolved.reason };
    if (resolved.kind === "landmark") {
        return { id: subjectKey(subject), label: resolved.label, value: resolved.value, kind: "historical", ...(resolved.note ? { note: resolved.note } : {}) };
    }
    const values = turns.map((turn) => recordValueAt(resolved.periods, turn) ?? null);
    return { ...base, values, available: values.some((value) => value !== null), note: resolved.note };
}
function selfAtBenchmark(campaign, metric, subject) {
    const reading = readCurrent(campaign, metric, subject);
    const label = entityLabel(campaign, subject);
    if (!reading.ok) {
        return { id: subjectKey(subject), subject, label, kind: "self", values: [], available: false, reason: reading.reason };
    }
    return { id: subjectKey(subject), label, value: reading.value, kind: "historical", note: `Your own figure in ${weekLabel(subject.turn).toLowerCase()}.` };
}
const isLine = (entry) => "values" in entry;
function earliestTurn(campaign, metric, subjects) {
    const firsts = subjects.flatMap((subject) => {
        if (subject.kind === "history" || subject.kind === "self-at")
            return [];
        const course = readCourse(campaign, metric, subject);
        const first = course.ok ? course.points[0] : undefined;
        return first ? [first.turn] : [];
    });
    return Math.min(1, ...firsts);
}
function placeSubject(campaign, metric, subject, turns) {
    if (subject.kind === "history")
        return historyLine(metric, subject, turns);
    if (subject.kind === "self-at")
        return selfAtBenchmark(campaign, metric, subject);
    return courseLine(campaign, metric, subject, turns);
}
/** Merge subject lines into the defined set, dropping a line that restates one already there. */
function mergeBenchmarks(defined, added) {
    const fresh = added.filter((mark) => !defined.some((other) => other.label === mark.label && other.value === mark.value));
    return [...defined, ...fresh];
}
/** One reading's course for each subject over the same weeks, with the lines it is judged against. */
export function compareSeries(campaign, metricId, subjects, window) {
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
        benchmarks: mergeBenchmarks(compareBenchmarks(campaign, metric), placed.filter((entry) => !isLine(entry))),
    };
}
