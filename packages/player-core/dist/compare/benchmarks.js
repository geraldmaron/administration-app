import { TREASURY_REFERENCE, metricBenchmarks } from "@admin/engine";
import { historyOptions, recordAverage } from "./history.js";
// The defined lines a reading is judged against: the engine's authored
// landmarks and the gates its rules read, the published U.S. averages over the
// stretches the reference pack covers, and the one target a real institution
// states for one of these readings. A reading with none of these gets none.
/**
 * The Federal Open Market Committee's longer-run inflation goal, stated in its
 * January 2012 Statement on Longer-Run Goals and Monetary Policy Strategy and
 * reaffirmed every year since. A published target, not a figure of this game.
 */
const FED_INFLATION_GOAL = 0.02;
function engineMarks(campaign, metric) {
    const scale = metric.format === "usd-millions" ? TREASURY_REFERENCE : 1;
    return metricBenchmarks(campaign, metric.id).flatMap((mark) => {
        // The campaign's own marks are already its drawn line; restating them as
        // benchmarks would label one fact twice.
        if (mark.kind === "own-record")
            return [];
        return [
            {
                id: `${mark.kind}:${mark.label}`,
                label: mark.label,
                value: mark.at * scale,
                kind: mark.kind,
                ...(mark.note ? { note: mark.note } : {}),
            },
        ];
    });
}
function recordAverages(metric) {
    if (metric.history === undefined || metric.history === "approval-landmarks" || metric.history === "treasury-scale")
        return [];
    return historyOptions(metric).flatMap((option) => {
        if (!option.ok || option.kind !== "record")
            return [];
        const average = recordAverage(option.periods);
        return average === undefined
            ? []
            : [{ id: option.id, label: option.label.replace("U.S. record", "U.S. average"), value: average, kind: "historical", note: option.note }];
    });
}
function targets(metric) {
    if (metric.id !== "inflation")
        return [];
    return [
        {
            id: "target:fed-goal",
            label: "Federal Reserve goal",
            value: FED_INFLATION_GOAL,
            kind: "target",
            note: "Since January 2012, the Federal Reserve has said it aims for prices to rise 2% a year over the long run.",
        },
    ];
}
/** Every defined line for a reading, on the reading's own scale, ascending. */
export function compareBenchmarks(campaign, metric) {
    const all = [...engineMarks(campaign, metric), ...recordAverages(metric), ...targets(metric)];
    return [...all].sort((a, b) => (a.value ?? 0) - (b.value ?? 0) || a.label.localeCompare(b.label));
}
