import { selectActiveConflicts, selectRelationship, selectRelationshipsFrom, sideOf } from "@admin/engine";
export function rankedByField(campaign, field) {
    return [...selectRelationshipsFrom(campaign, campaign.founding.nation)]
        .filter((rel) => rel.to !== campaign.founding.nation)
        .sort((a, b) => b[field] - a[field] || String(a.to).localeCompare(String(b.to)))
        .map((rel) => rel.to);
}
export function bandMatches(campaign, cast) {
    const ids = Object.keys(campaign.nations).filter((id) => {
        if (id === campaign.founding.nation)
            return false;
        const bands = campaign.nations[id]?.base.bands;
        if (!bands)
            return false;
        if (cast.archetype !== undefined && bands.archetype !== cast.archetype)
            return false;
        if (cast.powerTier !== undefined && bands.powerTier !== cast.powerTier)
            return false;
        if (cast.militaryTier !== undefined && bands.militaryTier !== cast.militaryTier)
            return false;
        if (cast.stabilityBand !== undefined && bands.stabilityBand !== cast.stabilityBand)
            return false;
        return true;
    });
    const tensionOf = (id) => selectRelationship(campaign, campaign.founding.nation, id)?.tension ?? 0;
    return ids.sort((a, b) => tensionOf(b) - tensionOf(a) || String(a).localeCompare(String(b)));
}
/** Hottest live wars, split by whether the player joined a side. */
function conflictsByHeat(campaign, mine) {
    const player = campaign.founding.nation;
    return [...selectActiveConflicts(campaign)]
        .filter((conflict) => (sideOf(conflict, player) !== undefined) === mine)
        .sort((a, b) => b.intensity - a.intensity || a.id.localeCompare(b.id));
}
/** The principal opposite the player in their hottest war. */
export function warCounterpart(campaign) {
    const conflict = conflictsByHeat(campaign, true)[0];
    if (!conflict)
        return undefined;
    return sideOf(conflict, campaign.founding.nation) === "aggressor" ? conflict.defender : conflict.aggressor;
}
/** A principal of the hottest war the player is not fighting. */
export function belligerent(campaign, side) {
    const conflict = conflictsByHeat(campaign, false)[0];
    if (!conflict)
        return undefined;
    if (side)
        return conflict[side];
    const tensionOf = (id) => selectRelationship(campaign, campaign.founding.nation, id)?.tension ?? 0;
    return [conflict.aggressor, conflict.defender].sort((a, b) => tensionOf(b) - tensionOf(a) || String(a).localeCompare(String(b)))[0];
}
