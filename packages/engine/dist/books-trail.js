import { debtToGdp } from "@admin/world";
import { selectNation } from "./state.js";
/** The most readings a trail keeps: this week and the 52 before it. */
export const BOOKS_TRAIL_LENGTH = 53;
/**
 * The trail a week of the books leaves, the new reading last and the oldest
 * dropped past a year. The opening share is written only on the week the books
 * were opened, so a trail begun on a save that predates it never claims to
 * know what the oath opened on.
 */
export function extendTrail(trail, reading, openingInterestShare) {
    const readings = [...(trail?.readings ?? []), reading].slice(-BOOKS_TRAIL_LENGTH);
    const opening = trail ? trail.openingInterestShare : openingInterestShare;
    return { readings, ...(opening !== undefined ? { openingInterestShare: opening } : {}) };
}
function usBooks(campaign) {
    return campaign.books?.[campaign.founding.nation];
}
/** How the books moved over the last `weeks`, or `undefined` while the trail does not reach back that far. */
export function selectBooksChange(campaign, weeks) {
    const readings = usBooks(campaign)?.trail?.readings ?? [];
    const to = readings.at(-1);
    if (!to || weeks < 1)
        return undefined;
    const from = readings.find((reading) => reading.turn === to.turn - weeks);
    if (!from)
        return undefined;
    return {
        fromTurn: from.turn,
        toTurn: to.turn,
        debtToGdp: { from: from.debtToGdp, to: to.debtToGdp },
        market: { from: from.market, to: to.market },
    };
}
/** What the United States' books opened on at the oath, or `undefined` before they were anchored. */
export function selectBooksOpening(campaign) {
    const books = usBooks(campaign);
    const anchor = books?.anchor;
    const runtime = selectNation(campaign, campaign.founding.nation);
    if (!anchor || !runtime)
        return undefined;
    const interestShare = books.trail?.openingInterestShare;
    return {
        turn: anchor.openedTurn,
        score: anchor.score,
        debtToGdp: debtToGdp(runtime.base.stats),
        ...(interestShare !== undefined ? { interestShare } : {}),
    };
}
