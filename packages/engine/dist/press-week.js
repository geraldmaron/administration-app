// The President's own week, on the wire the player reads.
//
// Every other actor's acts reach the feed through the phase that runs them.
// The President's did not: a decision answered on the Desk was remembered on
// the ledger and nowhere else, unless its writer happened to author a press
// line for it, so a player could govern for a year and never read a word about
// anything they had done while the wire filled with other countries' weather.
// The press covers what a President does. This is the desks doing it, once a
// week, off the one record that holds every act.
/**
 * How many of the President's acts the desks file in one week. The wire leads
 * with what the government did, but it is still a wire: a week of twelve policy
 * moves is covered as the three that led, not as twelve bulletins.
 */
export const WEEK_FILINGS_CAP = 3;
/**
 * Whether the public would see this act: something the President chose, not a
 * covert rung, not an intelligence or internal read, and not the booking of a
 * press engagement, which files its own story when the room answers.
 */
export function isPublicAct(entry) {
    if (entry.actor !== "player" || entry.background)
        return false;
    const causal = entry.causal;
    if (causal?.origin !== "decision")
        return false;
    if (causal.visibility === "intelligence" || causal.visibility === "internal")
        return false;
    if (entry.commitment?.instrument === "covert")
        return false;
    if ((causal.systems ?? []).includes("press"))
        return false;
    return entry.description.trim().length > 0;
}
function ownItem(campaign, item) {
    return item.kind === "player-action" || item.actor === campaign.founding.nation;
}
/**
 * The week's public acts as the stories the desks file on them.
 *
 * What the act's own producer already put on the wire counts first and against
 * the cap, so an authored press line is never covered twice and never crowded
 * out by the ledger's plainer sentence for the same week. The headline is the
 * sentence the act is remembered by; the piece names no person as its subject,
 * because the subject of a President's act is the act.
 */
export function presidentsWeekItems(campaign, turn) {
    const nation = campaign.founding.nation;
    const wired = campaign.feed.filter((item) => item.turn >= campaign.turn && ownItem(campaign, item));
    const room = Math.max(0, WEEK_FILINGS_CAP - wired.length);
    if (room === 0)
        return [];
    const headlines = new Set(wired.map((item) => item.headline));
    return campaign.ledger
        .filter((entry) => entry.turn === campaign.turn && isPublicAct(entry) && !headlines.has(entry.description))
        .slice(0, room)
        .map((entry) => ({
        turn,
        kind: "player-action",
        visibility: "public",
        headline: entry.description,
        actor: nation,
        ...(entry.commitment && entry.commitment.target !== nation ? { target: entry.commitment.target } : {}),
    }));
}
