// Named tickets on a charter. A president's ticket is the major nearest on
// beliefs.economicLeftRight. Empty parties is honest — nothing is invented.
export function partiesOf(charter) {
    return charter?.parties ?? [];
}
export function partyById(parties, id) {
    if (id === undefined)
        return undefined;
    return parties.find((party) => party.id === id);
}
function nearest(parties, economicLeftRight) {
    let best;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const party of parties) {
        const dist = Math.abs(party.beliefs.economicLeftRight - economicLeftRight);
        if (dist < bestDist) {
            best = party;
            bestDist = dist;
        }
    }
    return best;
}
/**
 * President never Independent. Tie at center keeps the first authored major
 * (US: Democrat). Empty or one-sided catalogues → none.
 */
export function presidentPartyFromIdeology(parties, economicLeftRight) {
    return nearest(parties.filter((party) => party.kind === "major"), economicLeftRight);
}
export function opposingMajor(parties, ticket) {
    return parties.find((party) => party.kind === "major" && party.id !== ticket?.id);
}
