// Political opposition is a standing condition, not evidence of a filed lawsuit.
//
// Read off the seated governors. At most one state: the first id in sorted
// order whose governor is a major party other than the President's. An
// independent president is compared with the caucus anchor when that field is
// present. Without it there is no opposition to name, so the week stays quiet.
// Nothing is written: no packet, no flag, no metric.
const OPPOSITION_TITLE = "An opposition governor is in office";
function isMajorParty(party) {
    return party === "democrat" || party === "republican";
}
/** The party a governor has to differ from. Null when an independent has no anchor. */
function benchParty(president, caucusAnchor) {
    if (president === "democrat" || president === "republican")
        return president;
    if (caucusAnchor === "democrat" || caucusAnchor === "republican")
        return caucusAnchor;
    return null;
}
function oppositionReason(name) {
    return `${name} has a governor from the other major party. Review their willingness to cooperate with federal action.`;
}
function byStateId(a, b) {
    if (a.id < b.id)
        return -1;
    if (a.id > b.id)
        return 1;
    return 0;
}
/**
 * The first opposition governor among these seats, if any.
 *
 * `caucusAnchor` is read only when the president is independent. A missing
 * anchor is not filled in.
 */
export function pickStateOpposition(seats, president, caucusAnchor) {
    const bench = benchParty(president, caucusAnchor);
    if (!bench)
        return null;
    const chosen = [...seats].sort(byStateId).find((seat) => isMajorParty(seat.party) && seat.party !== bench);
    if (!chosen)
        return null;
    return { stateId: chosen.id, title: OPPOSITION_TITLE, reason: oppositionReason(chosen.name) };
}
function readAnchor(campaign) {
    if (!Object.hasOwn(campaign.congress, "caucusAnchor"))
        return undefined;
    const anchor = campaign.congress.caucusAnchor;
    return isMajorParty(anchor) ? anchor : undefined;
}
function seatsOf(campaign) {
    return Object.values(campaign.states).map((runtime) => ({
        id: runtime.base.id,
        name: runtime.base.name,
        party: runtime.governor?.party,
    }));
}
/** A standing opposition signal, or null when no state qualifies. */
export function stateOppositionThisWeek(campaign) {
    return pickStateOpposition(seatsOf(campaign), campaign.congress.administrationParty, readAnchor(campaign));
}
