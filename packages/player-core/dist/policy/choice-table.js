import { METRIC_LABELS, formatSignedPoints } from "../format/figures";
import { formatMoney } from "../format/money";
export const cell = (text, tone = "neutral", moves) => (moves && moves.length > 0 ? { text, tone, moves } : { text, tone });
/** Every player metric is better higher, money included. */
function metricTone(delta) {
    if (delta === 0)
        return "neutral";
    return delta > 0 ? "favorable" : "adverse";
}
function metricMove(key, delta) {
    if (key === "treasury")
        return { label: "Treasury", value: delta, text: `${delta < 0 ? "−" : "+"}${formatMoney(Math.abs(delta))}`, tone: metricTone(delta) };
    return { label: METRIC_LABELS[key], value: delta, text: `${formatSignedPoints(delta)} pts`, tone: metricTone(delta) };
}
function metricPhrase(key, delta) {
    if (key === "treasury")
        return delta < 0 ? `${formatMoney(-delta)} spent` : `${formatMoney(delta)} raised`;
    return `${METRIC_LABELS[key]} ${formatSignedPoints(delta)} pts`;
}
/**
 * A set of metric movements as one cell: each movement in words, the cell's
 * tone the sign of the heaviest one. `none` is what an empty set reads, so a
 * column with nothing to say on a row says so rather than leaving a blank.
 */
export function metricCell(deltas, none) {
    const moved = Object.entries(deltas).filter(([, delta]) => delta !== undefined && delta !== 0);
    if (moved.length === 0)
        return cell(none);
    const words = moved.map(([key, delta]) => metricPhrase(key, delta)).join("; ");
    const negatives = moved.filter(([, delta]) => delta < 0).length;
    const tone = negatives === moved.length ? "adverse" : negatives === 0 ? "favorable" : metricTone(moved[0][1]);
    return cell(words, tone, moved.map(([key, delta]) => metricMove(key, delta)));
}
const AXIS_WORDS = {
    economicLeftRight: ["left on the economy", "right on the economy"],
    authLibertarian: ["toward personal liberty", "toward state authority"],
    nationalistGlobalist: ["toward the world", "toward the nation first"],
};
/** Below this an alignment pull is a rounding, not a reputation. */
const ALIGNMENT_FLOOR = 0.01;
/** At or past this, the pull is one the press will name. */
const ALIGNMENT_SHARP = 0.2;
/**
 * Where an act moves the President's politics, in the words a voter would use.
 * The engine's axes run negative to positive as left, libertarian and globalist
 * to right, authoritarian and nationalist.
 */
export function alignmentShiftWords(pull) {
    const moves = Object.entries(pull)
        .filter(([, value]) => Math.abs(value) >= ALIGNMENT_FLOOR)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([axis, value]) => `${Math.abs(value) >= ALIGNMENT_SHARP ? "sharply " : ""}${AXIS_WORDS[axis][value < 0 ? 0 : 1]}`);
    if (moves.length === 0)
        return "No change to where you stand";
    return `Pulls you ${moves.join(", and ")}`;
}
const AXIS_NAMES = {
    economicLeftRight: "On the economy",
    authLibertarian: "Liberty or authority",
    nationalistGlobalist: "World or nation first",
};
const AXIS_ENDS = {
    economicLeftRight: ["left", "right"],
    authLibertarian: ["toward liberty", "toward authority"],
    nationalistGlobalist: ["toward the world", "toward the nation"],
};
/**
 * Where an act moves the President's politics as a cell: the words a voter
 * would use, and each pull as a movement whose side is the side it pulls to.
 * A lean is neither good nor bad, so every movement is neutral.
 */
export function alignmentCell(pull) {
    const moves = Object.entries(pull)
        .filter(([, value]) => Math.abs(value) >= ALIGNMENT_FLOOR)
        .map(([axis, value]) => ({ label: AXIS_NAMES[axis], value, text: `${Math.abs(value) >= ALIGNMENT_SHARP ? "Sharply " : ""}${AXIS_ENDS[axis][value < 0 ? 0 : 1]}`, tone: "neutral" }));
    return cell(alignmentShiftWords(pull), "neutral", moves);
}
/** A signed share of output as points: growth, inflation and jobs move in these. */
export function ratePoints(delta) {
    return `${formatSignedPoints(delta)} pts`;
}
/** Weeks, said the way a calendar says them. */
export function weeksWords(weeks) {
    return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}
