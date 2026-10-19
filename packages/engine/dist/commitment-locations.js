import { BASING_SPLIT_FROM, nationZone, zoneForTheater } from "@admin/world";
import { BASING_LINES, baseCommitmentId } from "./basing.js";
// Where a commitment's forces stand, written when it is opened, and the load
// step that brings an older save's locations onto the same terms.
/**
 * The zone a deployment stands in. A deployment to a government stands in its
 * territory. A deployment to a war stands on the defender's ground, where an
 * invasion is fought whichever side the forces came to help; the defender
 * itself, committing to its own war, faces the aggressor's. Only deployments
 * are placed here: aid, arms and money have no position, and a base carries
 * its own installation.
 */
export function deploymentLocation(campaign, kind, actor, target) {
    if (kind !== "deployment")
        return undefined;
    if (target.kind === "nation")
        return campaign.nations[target.id] ? { theater: nationZone(target.id) } : undefined;
    if (target.kind !== "conflict")
        return undefined;
    const conflict = campaign.conflicts[target.id];
    if (!conflict)
        return undefined;
    return { theater: nationZone(actor === conflict.defender ? conflict.aggressor : conflict.defender) };
}
/**
 * A stored location in this build's terms. A free-text theater an earlier
 * build wrote reads through the zone table; one no table names is replaced by
 * where the deployment would be placed today, or dropped, so no string the
 * type does not describe stays on the campaign. A deployment saved with no
 * location gains the one it would have been given when it was committed.
 */
function typedLocation(campaign, commitment) {
    const stored = commitment.location;
    const mapped = stored?.theater === undefined ? undefined : zoneForTheater(stored.theater);
    if (stored && (stored.theater === undefined || mapped === stored.theater))
        return commitment;
    const theater = mapped ?? deploymentLocation(campaign, commitment.kind, commitment.actor, commitment.target)?.theater;
    const base = stored?.base;
    const { location: _stored, ...rest } = commitment;
    if (base === undefined && theater === undefined)
        return rest;
    return { ...rest, location: { ...(base !== undefined ? { base } : {}), ...(theater !== undefined ? { theater } : {}) } };
}
/**
 * A base saved under a composite label is the same forces as the installations
 * the label was split into. The stored commitment keeps its id and takes the
 * first installation, so anything that names it still finds it; each further
 * installation is a commitment of its own under the id the board gives it,
 * unless the campaign already holds one there.
 */
function splitComposite(commitment, held) {
    const label = commitment.location?.base;
    const parts = commitment.kind === "basing" && label !== undefined ? BASING_SPLIT_FROM[label] : undefined;
    if (!parts || parts.length === 0)
        return [commitment];
    const [first, ...rest] = parts;
    const renamed = commitment.rationale === BASING_LINES.stationed(label) ? BASING_LINES.stationed(first) : commitment.rationale;
    const kept = { ...commitment, location: { base: first }, rationale: renamed };
    const added = rest
        .map((part) => ({ ...commitment, id: baseCommitmentId("basing", commitment.target.id, part), location: { base: part }, rationale: BASING_LINES.stationed(part) }))
        .filter((part) => !held.has(part.id));
    return [kept, ...added];
}
function needsWork(campaign, commitment) {
    const { base, theater } = commitment.location ?? {};
    if (base !== undefined && commitment.kind === "basing" && BASING_SPLIT_FROM[base] !== undefined)
        return true;
    if (theater !== undefined)
        return zoneForTheater(theater) !== theater;
    return commitment.location === undefined && deploymentLocation(campaign, commitment.kind, commitment.actor, commitment.target) !== undefined;
}
/** The load step for v56: typed theaters, split composite bases, and a location on every placeable deployment. Idempotent. */
export function withTypedLocations(campaign) {
    const stale = Object.values(campaign.commitments).filter((commitment) => needsWork(campaign, commitment));
    if (stale.length === 0)
        return campaign;
    const held = new Set(Object.keys(campaign.commitments));
    const rewritten = stale.flatMap((commitment) => splitComposite(typedLocation(campaign, commitment), held));
    return { ...campaign, commitments: { ...campaign.commitments, ...Object.fromEntries(rewritten.map((commitment) => [commitment.id, commitment])) } };
}
