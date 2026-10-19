import { metricBenchmarks, selectMetricSeries } from "@admin/engine";
import { readingBand } from "../reading";
/**
 * What each kind of reference is, spoken.
 *
 * The benchmark layer's whole honesty rule lives in `kind`: a published Gallup
 * reading and a line this game's own rules read are two different claims, and a
 * track that drew them as one hairline would let a player take either for the
 * other. So the word travels with the mark.
 */
const RANGE_MARK_CLAIMS = {
    historical: "a real poll result from the past",
    gate: "a line the game's rules use",
    "own-record": "where you've been this term",
};
const percent = (value) => `${Math.round(value * 100)}%`;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
function signedPoints(value) {
    const points = Math.round(value * 100);
    if (points === 0)
        return "no change since you took office";
    return `${points > 0 ? "+" : "−"}${Math.abs(points)} points since you took office`;
}
/**
 * Approval's range track: the term's span and today's reading on the full
 * scale, with every landmark the benchmark layer has for approval.
 *
 * `undefined` where the campaign has no closed week, because a track with one
 * point on it is a dot and a span drawn from a single reading is invented.
 */
export function approvalRangeTrack(campaign) {
    const series = selectMetricSeries(campaign, "approval");
    if (series.length < 2)
        return undefined;
    const now = series[series.length - 1];
    const opening = series[0];
    const termLow = Math.min(...series);
    const termHigh = Math.max(...series);
    const band = readingBand("standing", now);
    const offset = (value) => clamp01(value);
    return {
        scaleLow: 0,
        scaleHigh: 1,
        termLow,
        termHigh,
        opening,
        now,
        openingOffset: offset(opening),
        nowOffset: offset(now),
        termLowOffset: offset(termLow),
        termHighOffset: offset(termHigh),
        figure: percent(now),
        word: band?.word ?? "",
        stance: band?.stance ?? "neutral",
        sinceOpening: signedPoints(now - opening),
        marks: metricBenchmarks(campaign, "approval").map((mark) => ({
            at: mark.at,
            label: mark.label,
            kind: mark.kind,
            claim: RANGE_MARK_CLAIMS[mark.kind],
            ...(mark.note === undefined ? {} : { note: mark.note }),
            offset: offset(mark.at),
        })),
    };
}
