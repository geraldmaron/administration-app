import { INHERITED_WEEKS } from "./inheritance.js";
import { TREASURY_REFERENCE, treasuryHealth } from "./metrics.js";
import { REMOVAL_METRIC_FLOOR } from "./removal.js";
import { selectMetricSeries } from "./state-selectors.js";
import { METRIC_HISTORY_WINDOW } from "./turn-loop.js";
/**
 * Gallup presidential job approval landmarks.
 *
 * Every figure here is a published Gallup reading, converted to the 0..1 scale
 * by dividing the percentage by one hundred and nothing else. Gallup has asked
 * the same question — "Do you approve or disapprove of the way [name] is
 * handling his job as president?" — since 1938, which is why this is the one
 * metric in the game with an honest external scale.
 */
const APPROVAL_LANDMARKS = [
    {
        // Gallup, February 9-14 1952: the lowest presidential job approval ever
        // recorded, in Truman's last winter, with Korea stalemated.
        at: 0.22,
        label: "Truman, February 1952",
        kind: "historical",
        note: "Twenty-two percent, the lowest reading Gallup has ever recorded for a sitting president.",
    },
    {
        // Gallup, August 2-5 1974: Nixon's final reading, taken days before he
        // resigned on August 9.
        at: 0.24,
        label: "Nixon, August 1974",
        kind: "historical",
        note: "Twenty-four percent in the last poll before he resigned — the number a presidency does not survive.",
    },
    {
        // The polarized-era ceiling. Since 2001, outside a rally, no president has
        // held much above the middle fifties: Obama's second-term high was 57
        // percent in December 2016, and Trump's first-term high in Gallup was 49.
        at: 0.55,
        label: "Modern ceiling",
        kind: "historical",
        note: "In the polarized era a president who is doing well sits in the middle fifties, not the seventies.",
    },
    {
        // Gallup's first reading of a new term has averaged around the high fifties
        // for presidents since 1953 — the honeymoon, before anything has been spent.
        at: 0.58,
        label: "Typical honeymoon",
        kind: "historical",
        note: "About where a new president's first Gallup reading has landed since the 1950s, before any of it is spent.",
    },
    {
        // Gallup, September 21-22 2001: 90 percent, the highest ever recorded, ten
        // days after the September 11 attacks.
        at: 0.9,
        label: "Post-9/11 peak",
        kind: "historical",
        note: "Ninety percent, the highest ever recorded, and it took the worst attack on the country to get there.",
    },
];
/**
 * What the treasury scale means in real money.
 *
 * The game's money unit is USD millions throughout the dataset, and treasury
 * health is cash divided by `TREASURY_REFERENCE` — so a real federal spending
 * figure lands on this scale by arithmetic, with no judgment in between. Real
 * federal outlays run near seven trillion dollars a year, which is about twice
 * the top of this scale: a full year of the government's own spending does not
 * fit, and that is the fact worth teaching. What fits is a week and a month of
 * it, and those are the two marks below.
 *
 * These are annotations of what the axis means, not targets. They are the only
 * non-approval "historical" entries in the layer.
 */
const FEDERAL_OUTLAYS_PER_YEAR_USD_MILLIONS = 7_000_000;
function outlaysBenchmark(weeks, label, note) {
    return {
        at: round3(treasuryHealth((FEDERAL_OUTLAYS_PER_YEAR_USD_MILLIONS * weeks) / 52)),
        label,
        kind: "historical",
        note,
    };
}
const TREASURY_SCALE = [
    outlaysBenchmark(1, "A week of federal outlays", "What the real federal government spends in a week, on this same scale — about seven trillion dollars a year."),
    outlaysBenchmark(4, "A month of federal outlays", "Four weeks of real federal spending; a full year of it is roughly twice the top of this scale."),
];
/** The lines the engine itself reads, per metric, on that metric's 0..1 scale. */
const GATES = {
    // Approval has no gate on purpose: removal pressure already reads approval
    // directly, so a second line on the same metric would state one fact twice.
    //
    // Only lines the engine itself reads live here. The four "failing" and
    // "solvency" lines that used to sit beside the collapse lines were the
    // pressure regime's floors, and when that model was deleted nothing read them
    // — their notes described a trouble reading no screen draws and no rule
    // consults. A gate nothing reads is a number the Record would assert against
    // the player with nothing behind it.
    stability: [
        {
            at: REMOVAL_METRIC_FLOOR,
            label: "Collapse line",
            kind: "gate",
            note: "At or under this, the record counts the week as a floor breach and removal pressure rises for it.",
        },
    ],
    standing: [
        {
            at: REMOVAL_METRIC_FLOOR,
            label: "Collapse line",
            kind: "gate",
            note: "At or under this, the record counts the week as a floor breach and removal pressure rises for it.",
        },
    ],
    treasury: [
        {
            at: 1,
            label: "Full reserve",
            kind: "gate",
            note: `The top of the scale — ${TREASURY_REFERENCE.toLocaleString("en-US")} million dollars, above which the solvency reading stops improving.`,
        },
    ],
};
const HISTORICAL = {
    approval: APPROVAL_LANDMARKS,
    treasury: TREASURY_SCALE,
};
const METRIC_KEYS = [
    "approval",
    "treasury",
    "stability",
    "militaryReadiness",
    "standing",
];
function round3(value) {
    return Math.round(value * 1000) / 1000;
}
/** The same 0..1 mapping the dials read: four ratios, and treasury against its reference. */
function fractionOf(metric, raw) {
    return metric === "treasury" ? treasuryHealth(raw) : Math.max(0, Math.min(1, raw));
}
/**
 * How many of the oldest rows in `metricHistory` are the predecessor's.
 *
 * The history opens with `INHERITED_WEEKS` inherited rows and keeps only the
 * newest `METRIC_HISTORY_WINDOW`, so once enough governed weeks close the
 * inherited rows scroll out of the front first. Counting by the turn rather
 * than by index is what keeps a governed week from being read as inherited.
 */
export function inheritedRowCount(campaign) {
    const governedWeeksClosed = Math.max(0, campaign.turn - 1);
    const droppedInherited = Math.max(0, INHERITED_WEEKS + governedWeeksClosed - METRIC_HISTORY_WINDOW);
    return Math.min(INHERITED_WEEKS, campaign.player.metricHistory.length, Math.max(0, INHERITED_WEEKS - droppedInherited));
}
/**
 * Where this administration has already been on this reading.
 *
 * The opening and the term's extremes, read only off the weeks this
 * administration governed: the inherited quarter is the predecessor's, so a
 * low it set is not this term's low. The opening is the oath week, and it is
 * left out once that week has scrolled out of the kept history, because the
 * oldest row still held would then be a different week wearing its label. An
 * extreme equal to the opening is dropped rather than drawn twice.
 */
function ownRecord(campaign, metric) {
    const inherited = inheritedRowCount(campaign);
    const governed = selectMetricSeries(campaign, metric).slice(inherited).map((value) => fractionOf(metric, value));
    if (governed.length < 2)
        return [];
    const oathHeld = Math.max(0, campaign.turn - 1) <= METRIC_HISTORY_WINDOW;
    const opening = round3(governed[0]);
    const low = round3(Math.min(...governed));
    const high = round3(Math.max(...governed));
    const marks = oathHeld
        ? [{ at: opening, label: "Opening", kind: "own-record", note: "Where this reading stood the week the administration took office." }]
        : [];
    if (low !== opening || !oathHeld) {
        marks.push({ at: low, label: "Term low", kind: "own-record", note: "The lowest this reading has been under this administration." });
    }
    if (high !== opening || !oathHeld) {
        marks.push({ at: high, label: "Term high", kind: "own-record", note: "The highest this reading has been under this administration." });
    }
    return marks;
}
const KIND_ORDER = {
    historical: 0,
    gate: 1,
    "own-record": 2,
};
/**
 * The reference marks for one player-facing reading, ascending, all on that
 * reading's own 0..1 scale.
 *
 * Pure and deterministic: the historical and gate marks are authored constants,
 * and the own-record marks are read off the campaign's stored series. An
 * unrecognized metric returns nothing rather than guessing.
 */
export function metricBenchmarks(campaign, metricId) {
    const metric = METRIC_KEYS.find((key) => key === metricId);
    if (metric === undefined)
        return [];
    const marks = [...(HISTORICAL[metric] ?? []), ...(GATES[metric] ?? []), ...ownRecord(campaign, metric)].map((mark) => ({ ...mark, at: round3(Math.max(0, Math.min(1, mark.at))) }));
    return [...marks].sort((a, b) => a.at - b.at || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.label.localeCompare(b.label));
}
/** The authored historical set for a metric, campaign-independent — what the tests hold the layer to. */
export function historicalBenchmarks(metricId) {
    const metric = METRIC_KEYS.find((key) => key === metricId);
    return metric === undefined ? [] : (HISTORICAL[metric] ?? []);
}
