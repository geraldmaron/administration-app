const OATH_TURN = 1;
export const RECORD_STARTS_AT_LOAD = "The record starts from the day you opened this save. Earlier weeks weren't kept.";
/** Read off the record's opening turn: a campaign past the oath with no record is an older save not yet closed a week. */
export function recordStart(campaign, since) {
    const fromOath = since === undefined ? campaign.turn <= OATH_TURN : since <= OATH_TURN;
    return { ...(since === undefined ? {} : { since }), fromOath, ...(fromOath ? {} : { note: RECORD_STARTS_AT_LOAD }) };
}
/** The last point less the last one filed at least `weeks` before it. */
export function changeOver(points, weeks) {
    const last = points[points.length - 1];
    if (!last)
        return undefined;
    const before = points.filter((point) => point.turn <= last.turn - weeks).at(-1);
    return before === undefined ? undefined : Math.round((last.value - before.value) * 1000) / 1000;
}
export function trendOf(points) {
    const change4 = changeOver(points, 4);
    const change13 = changeOver(points, 13);
    return { points, ...(change4 === undefined ? {} : { change4 }), ...(change13 === undefined ? {} : { change13 }) };
}
