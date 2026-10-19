import { resolveHistory } from "./history.js";
import { COMPARE_METRICS } from "./metrics.js";
import { readCurrent } from "./readings.js";
import { entityLabel, isSelfSubject, normalizeSubject, subjectKey } from "./subjects.js";
/**
 * Ranks one column by which direction is better. Ties share the better rank;
 * the percentile is the share of ranked rows this one beats or equals, so the
 * best is 1 and a lone row is 1.
 */
export function rankColumn(values, better) {
    const present = values.flatMap((value, index) => (value === null || !Number.isFinite(value) ? [] : [{ value, index }]));
    const sorted = [...present].sort((a, b) => (better === "up" ? b.value - a.value : a.value - b.value));
    return values.map((_, index) => {
        const position = sorted.findIndex((entry) => entry.index === index);
        if (position === -1)
            return undefined;
        const rank = sorted.findIndex((entry) => entry.value === sorted[position].value) + 1;
        return { rank, of: sorted.length, percentile: sorted.length <= 1 ? 1 : (sorted.length - rank + 1) / sorted.length };
    });
}
function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function rowLabel(campaign, subject, metricIds) {
    if (subject.kind !== "history")
        return entityLabel(campaign, subject);
    for (const id of metricIds) {
        const resolved = resolveHistory(COMPARE_METRICS[id], subject.benchmarkId);
        if (resolved.ok)
            return resolved.kind === "record" ? `${resolved.label} (average)` : resolved.label;
    }
    return subject.benchmarkId;
}
function draftRow(campaign, subject, metricIds) {
    const readings = metricIds.map((id) => [id, readCurrent(campaign, COMPARE_METRICS[id], subject)]);
    const reference = subject.kind === "history" || subject.kind === "self-at";
    return {
        id: subjectKey(subject),
        subject,
        label: rowLabel(campaign, subject, metricIds),
        values: Object.fromEntries(readings.map(([id, reading]) => [id, reading.ok ? reading.value : null])),
        reasons: Object.fromEntries(readings.flatMap(([id, reading]) => (reading.ok ? [] : [[id, reading.reason]]))),
        ...(isSelfSubject(campaign, subject) ? { self: true } : {}),
        ...(reference ? { reference: true } : {}),
    };
}
function column(metricId, drafts) {
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
export function compareSnapshot(campaign, metricIds, subjects) {
    const normalized = subjects.map((subject) => normalizeSubject(campaign, subject));
    const unique = [...new Map(normalized.map((subject) => [subjectKey(subject), subject])).values()];
    const drafts = unique.map((subject) => draftRow(campaign, subject, metricIds));
    const columns = metricIds.map((id) => column(id, drafts));
    const rows = drafts.map((row, index) => ({
        ...row,
        ranks: Object.fromEntries(metricIds.flatMap((id, at) => {
            const rank = columns[at].ranks[index];
            return rank ? [[id, rank]] : [];
        })),
    }));
    return { metrics: columns.map((entry) => entry.metric), rows };
}
