import { hasIntelOnRelationship, relationshipKey } from "@admin/engine";
/**
 * D18: whether the President's own services can read the tie between two
 * OTHER governments. Always true for any pair touching the United States —
 * that is lived diplomatic experience, not something spied on — and true for
 * any pair the graph never derived a relationship for, since there is nothing
 * to hide about a tie that does not exist.
 *
 * `standing.ts`'s `standingToward` is the one reader for the United States'
 * own relationships; this is its third-party twin, so a screen never indexes
 * `campaign.relationships` on its own (`standing.test.ts`'s "the one reader").
 */
export function thirdPartyTieReadable(campaign, a, b) {
    if (a === campaign.founding.nation || b === campaign.founding.nation)
        return true;
    const relationship = campaign.relationships[relationshipKey(a, b)];
    return relationship ? hasIntelOnRelationship(campaign, relationship) : true;
}
/**
 * The governments whose tie to `nation` the President's services cannot read,
 * for the blocs mode's hatch on a selected country's partners. Empty for the
 * United States itself, whose own ties are always read.
 */
export function unreadTiesOf(campaign, nation) {
    const home = campaign.founding.nation;
    if (nation === home || campaign.nations[nation] === undefined)
        return [];
    return Object.keys(campaign.nations).filter((other) => other !== nation && other !== home && !thirdPartyTieReadable(campaign, nation, other));
}
