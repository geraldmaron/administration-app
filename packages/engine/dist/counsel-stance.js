// What a chair said on the record, read back off the ledger's counsel stamps.
//
// A leaf on purpose: a minister's own decisions read how often they have been
// overruled, and the weekly loyalty phase that also reads it sits beside the
// cabinet week, which reaches the diplomacy and ladder modules. Reading the
// count must not pull those in.
/**
 * The stance this chair actually took on one decision, or nothing.
 *
 * The whole meeting is on the record, so the whole meeting is read. Scoring
 * only the primary chair charged the president for overruling the one seat the
 * subject routed to and let every other objection in the room cost nothing —
 * a Secretary of Defense who argued against a course and watched it signed
 * anyway had no grievance, because the decision had been filed under State.
 * The primary fields are the fallback for an entry with no room stamped, which
 * is where they are the only stance the record kept.
 */
export function stanceOf(counsel, role) {
    const seat = counsel.room?.find((voice) => voice.role === role);
    if (seat)
        return seat.stance;
    return counsel.role === role ? counsel.stance : undefined;
}
/**
 * How many times the President went against this chair's stated advice from
 * `sinceTurn` on. The count a minister deciding whether to stay, speak or go
 * carries in with them, read off the same stamps the weekly shift is.
 */
export function timesOverruled(campaign, role, sinceTurn) {
    return campaign.ledger.reduce((count, entry) => {
        if (entry.turn < sinceTurn || entry.actor !== "player" || !entry.counsel)
            return count;
        return stanceOf(entry.counsel, role) === "against" ? count + 1 : count;
    }, 0);
}
