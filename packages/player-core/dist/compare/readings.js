import { archiveMonth, hasIntelOnNation } from "@admin/engine";
import { recordAverage, resolveHistory } from "./history.js";
import { nationName, selfNation, weekLabel } from "./subjects.js";
const refuse = (reason) => ({ ok: false, reason });
function inapplicable(metric, subject) {
    switch (subject.kind) {
        case "nation":
            return `Other countries don't have ${metric.label.toLowerCase()} in this game. It only measures your presidency.`;
        case "state":
            return `The game doesn't track ${metric.label.toLowerCase()} state by state.`;
        case "self-at":
            return `The game only keeps this week's ${metric.label.toLowerCase()}, not earlier weeks.`;
        case "history":
            return `There's no past record of ${metric.label.toLowerCase()} on this scale to compare with.`;
        case "self":
            return `${metric.label} doesn't apply to your presidency.`;
    }
}
function value(read, missing) {
    return read === undefined || !Number.isFinite(read) ? refuse(missing) : { ok: true, value: read };
}
function nationReading(campaign, metric, id) {
    if (id === selfNation(campaign))
        return value(metric.self(campaign), "Your own figure isn't available.");
    const runtime = campaign.nations[id];
    if (!runtime)
        return refuse("That country isn't in the game.");
    if (!metric.nation)
        return refuse(inapplicable(metric, { kind: "nation", id }));
    if (metric.visibility === "assessed" && !hasIntelOnNation(campaign, id)) {
        return refuse(`Your intelligence agencies have no read on ${nationName(runtime)}'s government, and its ${metric.label.toLowerCase()} is an estimate, not a published number.`);
    }
    return value(metric.nation(runtime), `There's no ${metric.label.toLowerCase()} figure for ${nationName(runtime)}.`);
}
function stateReading(campaign, metric, id) {
    if (!campaign.states[id])
        return refuse("That state isn't in the game.");
    if (!metric.state)
        return refuse(inapplicable(metric, { kind: "state", id }));
    return value(metric.state(campaign, id), `There's no ${metric.label.toLowerCase()} figure for ${campaign.states[id].base.name}.`);
}
/**
 * The course point for a week: the week itself, or, for a week old enough to
 * have left the weekly ring, the closing reading of the month it fell in,
 * which is all the archive keeps of it.
 */
export function pointAt(points, turn) {
    const exact = points.find((point) => point.turn === turn);
    if (exact)
        return exact;
    const month = turn >= 1 ? archiveMonth(turn) : undefined;
    return month === undefined ? undefined : points.find((point) => point.turn > turn && archiveMonth(point.turn) === month);
}
function selfAtReading(campaign, metric, turn) {
    if (!metric.course)
        return refuse(inapplicable(metric, { kind: "self-at", turn }));
    if (turn > campaign.turn)
        return refuse(`${weekLabel(turn)} hasn't happened yet.`);
    const points = metric.course(campaign);
    const found = pointAt(points, turn);
    if (found)
        return { ok: true, value: found.value };
    const first = points[0];
    return refuse(first ? `Records of ${metric.label.toLowerCase()} start at ${weekLabel(first.turn).toLowerCase()}.` : `There's no record of ${metric.label.toLowerCase()} yet.`);
}
function historyReading(metric, benchmarkId) {
    if (!metric.history)
        return refuse(inapplicable(metric, { kind: "history", benchmarkId }));
    const resolved = resolveHistory(metric, benchmarkId);
    if (!resolved.ok)
        return refuse(resolved.reason);
    if (resolved.kind === "landmark")
        return { ok: true, value: resolved.value };
    return value(recordAverage(resolved.periods), `${resolved.label} has no published figure for that time.`);
}
/** A subject's figure this week (a past week for `self-at`; a stretch's average for a published record). */
export function readCurrent(campaign, metric, subject) {
    switch (subject.kind) {
        case "self":
            return value(metric.self(campaign), "Your own figure isn't available.");
        case "self-at":
            return selfAtReading(campaign, metric, subject.turn);
        case "nation":
            return nationReading(campaign, metric, subject.id);
        case "state":
            return stateReading(campaign, metric, subject.id);
        case "history":
            return historyReading(metric, subject.benchmarkId);
    }
}
/** A subject's recorded course, oldest first. Only the President's own figures and the states' keep one. */
export function readCourse(campaign, metric, subject) {
    if (subject.kind === "self" || (subject.kind === "nation" && subject.id === selfNation(campaign))) {
        if (metric.course)
            return { ok: true, points: metric.course(campaign) };
        const now = metric.self(campaign);
        return now === undefined ? refuse("Your own figure isn't available.") : { ok: true, points: [{ turn: campaign.turn, value: now }] };
    }
    if (subject.kind === "state" && metric.stateCourse && campaign.states[subject.id]) {
        return { ok: true, points: metric.stateCourse(campaign, subject.id) };
    }
    const now = readCurrent(campaign, metric, subject);
    return now.ok ? { ok: true, points: [{ turn: campaign.turn, value: now.value }] } : now;
}
