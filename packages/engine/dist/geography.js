import { chokepoints as CHOKEPOINTS } from "@admin/world";
// The mechanical half of geography. Nothing here is flavour: each function is
// something the resolver has to ask before pricing an action.
const EARTH_RADIUS_KM = 6371;
const toRadians = (deg) => (deg * Math.PI) / 180;
export function distanceKm(a, b) {
    const dLat = toRadians(b.lat - a.lat);
    const dLon = toRadians(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h))));
}
// Projecting force far from home costs more and works less well. Distance is
// the dominant term, but lift capacity is what separates a power that can act
// at range from one that can only threaten its neighbors — so a nation with
// no airlift or sealift pays close to the full distance penalty, and one with
// both pays a fraction of it.
//
// The distance is measured from the nearest place the force can be mounted
// from, not only from the capital. The United States did not fight Iraq from
// Washington: it fought from Kuwait, Saudi Arabia and the Gulf, and a model
// that measured every expedition from the capital refused Iraq while allowing
// Venezuela. An ally's soil still has to be reached, so the trip to it counts
// at the share the actor's lift cannot cover.
export function forceProjectionCost(from, to, staging = []) {
    const km = distanceKm(from.geo, to.geo);
    const shared = from.geo.neighbors.some((n) => n === to.id);
    // A shared border removes the projection problem almost entirely: the force
    // is already there.
    if (shared)
        return { multiplier: 1, distanceKm: km, stagedKm: 0 };
    const lift = (from.stats.military.airliftCapacity + from.stats.military.sealiftCapacity) / 2;
    const stagedKm = staging.reduce((nearest, point) => Math.min(nearest, distanceKm(point, to.geo) + (1 - lift) * point.leadInKm), km);
    // Doubles roughly every 8000 km before lift is applied.
    const raw = 1 + stagedKm / 8000;
    const multiplier = 1 + (raw - 1) * (1 - 0.7 * lift);
    return { multiplier: Math.round(multiplier * 100) / 100, distanceKm: km, stagedKm: Math.round(stagedKm) };
}
// Odds fall off with the same geography that raises the cost, but never to
// zero: a distant power with real lift can still act, it just pays for it.
export function projectionOdds(from, to, baseOdds, staging = []) {
    const { multiplier } = forceProjectionCost(from, to, staging);
    return Math.round(Math.max(0.02, baseOdds / multiplier) * 1000) / 1000;
}
// How exposed a nation's trade is if a set of chokepoints closes. The weights
// are per-nation, so the same closure is a shrug for one country and an
// emergency for another.
export function tradeVulnerability(geography, closed) {
    const closedSet = new Set(closed);
    const hit = geography.chokepointDependence.filter((d) => closedSet.has(d.chokepoint));
    // Compounding rather than additive: two closures that each take out most of
    // a nation's routes leave a fraction of a fraction open, not a tidy sum that
    // can run past total ruin.
    const surviving = hit.reduce((acc, d) => acc * (1 - d.weight), 1);
    return Math.round((1 - surviving) * 1000) / 1000;
}
/**
 * How much of a nation's seaborne trade runs through a strait one government
 * can shut, 0..1.
 *
 * Read off the dependence weights assembly carries onto the nation
 * (`Nation.geo.chokepointDependence`) and compounded the way
 * `tradeVulnerability` compounds them: Iran, which leans on Hormuz at 0.9,
 * reads 0.9 rather than the strait's share of world tonnage. Only straits
 * `closableByOneState` count, because a strait a single government can shut is
 * leverage and the Cape route is only ever a detour. A record that has not been
 * through assembly carries no weights and reads 0.
 *
 * This is what makes a blockade of Japan or Singapore a different act from a
 * blockade of Brazil.
 */
export function chokepointExposure(nation, catalog = CHOKEPOINTS) {
    const closable = new Set(catalog.filter((point) => point.closableByOneState).map((point) => point.id));
    const lanes = (nation.geo.chokepointDependence ?? []).filter((lane) => closable.has(lane.chokepoint));
    const surviving = lanes.reduce((open, lane) => open * (1 - lane.weight), 1);
    return Math.round((1 - surviving) * 1000) / 1000;
}
// Founding enforcement: which compacts a cradle can reach, and what a choice
// already made rules out. This is the mechanism behind a placement closing
// doors rather than merely coloring the map.
export function orgEligibility(organizations, cradle, alreadyJoined) {
    const joined = new Set(alreadyJoined);
    const conflicted = new Set(organizations.filter((o) => joined.has(o.id)).flatMap((o) => o.conflictsWith.map((c) => c)));
    return organizations.map((org) => {
        const id = org.id;
        if (joined.has(id))
            return { org, eligible: true };
        if (org.requiresCradle && !org.requiresCradle.some((c) => c === cradle.id)) {
            return { org, eligible: false, reason: `requires a different cradle` };
        }
        if (conflicted.has(id)) {
            return { org, eligible: false, reason: `conflicts with a compact already joined` };
        }
        const conflictsBack = org.conflictsWith.some((c) => joined.has(c));
        if (conflictsBack)
            return { org, eligible: false, reason: `conflicts with a compact already joined` };
        return { org, eligible: true };
    });
}
export function eligibleOrgs(organizations, cradle, alreadyJoined = []) {
    return orgEligibility(organizations, cradle, alreadyJoined)
        .filter((e) => e.eligible)
        .map((e) => e.org);
}
// The threat a cradle wakes up next to: who is adjacent, how strong they are,
// and how much of that strength is pointed outward.
export function cradleThreatMix(cradle, nations) {
    const byId = new Map(nations.map((n) => [n.id, n]));
    const neighbors = cradle.startingNeighbors.map((id) => byId.get(id)).filter((n) => !!n);
    const pressure = neighbors.reduce((sum, n) => {
        const posture = n.doctrine.posture === "expansionist" ? 1 : n.doctrine.posture === "assertive" ? 0.7 : 0.35;
        return sum + n.bands.militaryTier * posture * n.traits.aggression;
    }, 0);
    return { pressure: Math.round(pressure * 100) / 100, neighbors: neighbors.length };
}
export function globalClosureSeverity(chokepoints, closed) {
    const closedSet = new Set(closed);
    return Math.round(chokepoints.filter((c) => closedSet.has(c.id)).reduce((sum, c) => sum + c.globalTrafficShare, 0) * 1000) / 1000;
}
