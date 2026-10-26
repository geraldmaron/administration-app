// Political opposition is a standing condition, not evidence of a filed lawsuit.
// A state sues through its attorney general, and only for an injury a court
// will hear, so the plaintiffs below are read off who holds that office and
// what the act does to the state, not off the governor's party.
//
// The opposition signal is read off the seated governors. At most one state: the first id in sorted
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
const AG_SELECTION = {
    AK: "governor", HI: "governor", NH: "governor", NJ: "governor", WY: "governor",
    ME: "legislature", TN: "state-court",
};
export function attorneyGeneralSelection(state) {
    return AG_SELECTION[state] ?? "elected";
}
/** How sharply a state's partisan lean decides who wins its statewide offices. */
const LEAN_SHARPNESS = 12;
/**
 * The chance the state's attorney general belongs to the party opposite the
 * President's. A governor's appointee follows the governor; an elected officer
 * follows the state's own lean, because attorneys general are elected
 * separately and often differ from the governor. Expected, not drawn, so the
 * projection a President reads stays seed-independent.
 */
export function opposingAttorneyGeneral(campaign, state) {
    const runtime = campaign.states[state];
    const bench = benchParty(campaign.congress.administrationParty, readAnchor(campaign));
    if (!runtime || !bench)
        return 0;
    if (attorneyGeneralSelection(state) === "governor") {
        const party = runtime.governor?.party;
        return isMajorParty(party) && party !== bench ? 1 : 0;
    }
    const republican = 1 / (1 + Math.exp(-runtime.lean * LEAN_SHARPNESS));
    return Math.round((bench === "democrat" ? republican : 1 - republican) * 1000) / 1000;
}
/** What a court lets a state claim: its own money in full, its residents' harm much less. */
export const STATE_STANDING_WEIGHT = {
    proprietary: 1,
    residents: 0.45,
    none: 0,
};
/** Below this a state is not a plausible named plaintiff. */
export const STATE_PLAINTIFF_FLOOR = 0.1;
const COMMONWEALTHS = new Set(["KY", "MA", "PA", "VA"]);
export function statePartyName(state, name) {
    if (state === "DC")
        return "District of Columbia, by its Attorney General";
    return `${COMMONWEALTHS.has(state) ? "Commonwealth" : "State"} of ${name}, by its Attorney General`;
}
/**
 * The states that would sue, strongest first: injury the state can claim,
 * times the chance its attorney general opposes the administration, times how
 * loud the act is. Injuries are relative, 0..1 per state.
 */
export function statePlaintiffs(campaign, injuries, basis, loudness) {
    const standing = STATE_STANDING_WEIGHT[basis];
    if (standing === 0)
        return [];
    return Object.entries(injuries)
        .map(([stateId, injury]) => ({ stateId, name: campaign.states[stateId]?.base.name ?? stateId,
        weight: Math.round(injury * standing * opposingAttorneyGeneral(campaign, stateId) * loudness * 1000) / 1000 }))
        .filter((entry) => entry.weight >= STATE_PLAINTIFF_FLOOR)
        .sort((a, b) => b.weight - a.weight || (a.stateId < b.stateId ? -1 : a.stateId > b.stateId ? 1 : 0));
}
