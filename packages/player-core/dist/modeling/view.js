import { COHORT_MOTIVATION, OPINION_DRIVERS, PROJECTION_HEADLINE_METRICS, addDays, } from "@admin/engine";
import { COHORT_IDS } from "@admin/world";
import { METRIC_LABELS, OPINION_DRIVER_LABELS, formatDate } from "../format/figures";
import { formatMoney } from "../format/money";
import { approvalDrivers } from "../desk/opinion-causes";
/** Half a point: below it a group's move is noise in the reading, not a group the act lands on. */
export const GROUP_MOVE_FLOOR = 0.005;
/** A twentieth of a point: below it a paired difference counts as none. */
const SAME = 0.0005;
const GROUP_LIMIT = 4;
const MOVER_LIMIT = 3;
const HEADLINE_LABELS = { ...METRIC_LABELS, removalPressure: "Removal pressure" };
function metricMeta(metric) {
    if (metric.startsWith("judgment:"))
        return { label: OPINION_DRIVER_LABELS[metric.slice(9)], group: "judgment", unit: "points", better: "higher" };
    if (metric.startsWith("cohort:"))
        return { label: COHORT_MOTIVATION[metric.slice(7)].name, group: "cohort", unit: "points", better: "higher" };
    const key = metric;
    return { label: HEADLINE_LABELS[key], group: "headline", unit: key === "treasury" ? "money" : "points", better: key === "removalPressure" ? "lower" : "higher" };
}
export function ensembleBand(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    return { median, low: sorted[0], high: sorted[sorted.length - 1] };
}
/** A signed difference; one that rounds to nothing prints unsigned, so "−0.0" never suggests a direction. */
export function modelingFigure(value, unit) {
    const text = unit === "money" ? formatMoney(Math.abs(value)) : `${Math.abs(value * 100).toFixed(1)} pts`;
    const zero = unit === "money" ? text === formatMoney(0) : text === "0.0 pts";
    return zero ? text : `${value > 0 ? "+" : "−"}${text}`;
}
/** A run's readings to the horizon; a run that ended holds its last reading, since nothing after the ending moves. */
function padded(run, weeks) {
    const last = run.readings[run.readings.length - 1];
    return Array.from({ length: weeks + 1 }, (_, week) => run.readings[week] ?? last);
}
function agreementOf(diffs) {
    if (diffs.every((diff) => Math.abs(diff) < SAME))
        return "same";
    if (diffs.every((diff) => diff > -SAME))
        return "higher";
    if (diffs.every((diff) => diff < SAME))
        return "lower";
    return "mixed";
}
/**
 * Differences run for run, on the members both sides have finished. A
 * difference against a member the baseline has not run yet would compare two
 * different draws of the world, so a partial ensemble pairs only what it has.
 */
function pairedDiffs(paths, alternative, baseline, metric, week) {
    const theirs = paths.get(baseline);
    return [...(paths.get(alternative) ?? new Map())].flatMap(([member, run]) => {
        const other = theirs?.get(member);
        return other ? [run[week][metric] - other[week][metric]] : [];
    });
}
function pairedCount(paths, alternative, baseline) {
    const theirs = paths.get(baseline);
    return [...(paths.get(alternative)?.keys() ?? [])].filter((member) => theirs?.has(member)).length;
}
function deltaOf(paths, alternative, baseline, metric, week) {
    const diffs = pairedDiffs(paths, alternative, baseline, metric, week);
    const meta = metricMeta(metric);
    const spread = ensembleBand(diffs);
    return { metric, label: meta.label, unit: meta.unit, better: meta.better, ...spread, agreement: agreementOf(diffs), text: modelingFigure(spread.median, meta.unit) };
}
function groupMoves(paths, alternative, baseline, week) {
    return COHORT_IDS.map((cohort) => {
        const spread = ensembleBand(pairedDiffs(paths, alternative, baseline, `cohort:${cohort}`, week));
        return { cohort, name: COHORT_MOTIVATION[cohort].name, ...spread, text: modelingFigure(spread.median, "points") };
    }).filter((move) => Math.abs(move.median) >= GROUP_MOVE_FLOOR);
}
function surenessOf(delta, against, runs, weeks) {
    const [low, high] = [modelingFigure(delta.low, "points"), modelingFigure(delta.high, "points")];
    const range = low === high ? low : `${low} to ${high}`;
    if (delta.agreement === "same")
        return `None of the test runs moves approval even a twentieth of a point compared with ${against} by week ${weeks}.`;
    if (delta.agreement === "mixed")
        return `The test runs disagree about approval by week ${weeks}. Compared with ${against}, they range from ${range}, so it could go either way.`;
    if (runs === 1)
        return `The one test run so far puts approval ${delta.agreement} than ${against} by week ${weeks}, by ${range}.`;
    return `All ${runs} test runs put approval ${delta.agreement} than ${against} by week ${weeks}, by ${range}.`;
}
const DELTA_METRICS = [...PROJECTION_HEADLINE_METRICS, ...OPINION_DRIVERS.map((driver) => `judgment:${driver}`)];
function alternativeView(choice, paths, runs, id, weeks) {
    const alternative = choice.alternatives.find((entry) => entry.id === id);
    const baseline = choice.alternatives.find((entry) => entry.baseline);
    const mine = runs.filter((run) => run.alternative === id);
    const refused = mine.find((run) => run.refused !== undefined)?.refused;
    const paired = alternative.baseline ? 0 : pairedCount(paths, id, baseline.id);
    const head = { id, label: alternative.label, baseline: alternative.baseline, endedRuns: mine.filter((run) => run.endedWeek !== undefined && run.endedWeek <= weeks).length, paired };
    if (refused !== undefined)
        return { ...head, refused, deltas: [], helped: [], hurt: [] };
    if (alternative.baseline || paired === 0)
        return { ...head, deltas: [], helped: [], hurt: [] };
    const deltas = DELTA_METRICS.map((metric) => deltaOf(paths, id, baseline.id, metric, weeks));
    const moves = groupMoves(paths, id, baseline.id, weeks);
    return {
        ...head,
        deltas,
        helped: moves.filter((move) => move.median > 0).sort((a, b) => b.median - a.median).slice(0, GROUP_LIMIT),
        hurt: moves.filter((move) => move.median < 0).sort((a, b) => a.median - b.median).slice(0, GROUP_LIMIT),
        sureness: surenessOf(deltas[0], choice.against, paired, weeks),
    };
}
function metricView(metric, paths, weeks) {
    const lines = [...paths].map(([alternative, members]) => ({
        alternative,
        points: Array.from({ length: weeks + 1 }, (_, week) => ensembleBand([...members.values()].map((run) => run[week][metric]))),
    }));
    return { metric, ...metricMeta(metric), lines };
}
/** Readings the movers rank on: shares of a whole, so a point means the same on each. Budget authority is in money and is read from the table. */
function moversOf(alternatives, paths, choice, weeks) {
    const baseline = choice.alternatives.find((entry) => entry.baseline);
    return alternatives
        .filter((alternative) => !alternative.baseline && alternative.refused === undefined && alternative.paired > 0)
        .flatMap((alternative) => {
        const candidates = [...DELTA_METRICS.filter((metric) => metric !== "treasury"), ...COHORT_IDS.map((cohort) => `cohort:${cohort}`)];
        return candidates
            .map((metric) => deltaOf(paths, alternative.id, baseline.id, metric, weeks))
            .filter((delta) => Math.abs(delta.median) >= SAME)
            .sort((a, b) => Math.abs(b.median) - Math.abs(a.median))
            .slice(0, MOVER_LIMIT)
            .map((delta) => ({ ...delta, alternative: alternative.id }));
    });
}
/** Members every projectable alternative has finished; an alternative the engine refuses has nothing to wait for. */
function completeMembers(choice, runs, paths) {
    const sizes = choice.alternatives
        .filter((alternative) => !runs.some((run) => run.alternative === alternative.id && run.refused !== undefined))
        .map((alternative) => paths.get(alternative.id)?.size ?? 0);
    return sizes.length === 0 ? 0 : Math.min(...sizes);
}
/** Every alternative's runs to date, finished or partial, in any order; each row pairs with not acting on the members both have run. */
export function modelingView(campaign, choice, runs, weeks) {
    const paths = new Map(choice.alternatives
        .map((alternative) => {
        const finished = runs.filter((run) => run.alternative === alternative.id && run.refused === undefined && run.readings.length > 0);
        return [alternative.id, new Map(finished.map((run) => [run.member, padded(run, weeks)]))];
    })
        .filter(([, members]) => members.size > 0));
    const alternatives = choice.alternatives.map((alternative) => alternativeView(choice, paths, runs, alternative.id, weeks));
    const allMetrics = [...DELTA_METRICS, ...COHORT_IDS.map((cohort) => `cohort:${cohort}`)];
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
