import { daysBetween, selectClosedFamilies, selectDateOfTurn, selectNation, selectOpenFamilies, } from "@admin/engine";
/** How long without a close before the Record says so. A reporting threshold, not a mechanic. */
export const ARC_QUIET_DAYS = 84;
/** The words the Record prints for each ending, at one weight: a lost arc is not a smaller line than a held one. */
export const ARC_DISPOSITION_WORDS = {
    held: "Held",
    lost: "Lost",
    lapsed: "Lapsed",
};
function counterpartName(campaign, run) {
    return selectNation(campaign, run.counterpart)?.base.identity.name ?? String(run.counterpart);
}
function rowOf(campaign, run) {
    const openedDate = selectDateOfTurn(campaign, run.openedTurn);
    const closedDate = run.closedTurn === undefined ? undefined : selectDateOfTurn(campaign, run.closedTurn);
    const counterpart = counterpartName(campaign, run);
    return {
        family: run.family,
        title: run.title ?? `The situation with ${counterpart}`,
        counterpart,
        openedDate,
        ...(closedDate ? { closedDate } : {}),
        ...(run.disposition ? { disposition: run.disposition } : {}),
        weeks: Math.max(1, Math.round(daysBetween(openedDate, closedDate ?? campaign.calendar) / 7)),
        chapters: run.beats.length,
    };
}
/** Every arc the administration has opened, finished first (newest close first), then what is still running. */
export function selectArcReading(campaign) {
    const finished = selectClosedFamilies(campaign).map((run) => rowOf(campaign, run));
    const running = selectOpenFamilies(campaign).map((run) => rowOf(campaign, run));
    const newest = finished[0]?.closedDate;
    const quiet = newest !== undefined && daysBetween(newest, campaign.calendar) > ARC_QUIET_DAYS;
    return { finished, running, ...(quiet ? { quietSince: newest } : {}) };
}
/**
 * Arcs that ended between two readings of the same campaign, newest first:
 * the one line a stop brief owes the player when a story closed while the
 * world was running, whether it was answered or lapsed.
 */
export function arcsClosedBetween(before, after) {
    const wasClosed = new Set(selectClosedFamilies(before).map((run) => run.family));
    return selectClosedFamilies(after)
        .filter((run) => !wasClosed.has(run.family))
        .map((run) => rowOf(after, run));
}
