import { US_BASING, US_ID, organizationById } from "@admin/world";
import { distanceKm } from "./geography.js";
import { selectNation } from "./state.js";
// Where a government can mount force from besides its own capital, read off
// data the board already carries: the installations on the basing table, and
// the territory of every government it shares a mutual-defense body with.
// Nothing here names a country; a target becomes reachable because a base or
// an ally stands near it.
function membershipsOf(campaign, nation) {
    const runtime = selectNation(campaign, nation);
    return runtime ? (runtime.memberships ?? runtime.base.memberships) : [];
}
function defenseBodies(campaign, nation) {
    return new Set(membershipsOf(campaign, nation).filter((id) => organizationById.get(id)?.kind === "defense").map((id) => id));
}
/**
 * The governments that sit in a mutual-defense body with this one. A treaty
 * ally's ports and airfields are open to its partner in the way a neutral's are
 * not, which is what made the Gulf War and both Iraq wars possible at all.
 */
export function defenseAllies(campaign, nation) {
    const own = defenseBodies(campaign, nation);
    if (own.size === 0)
        return [];
    return Object.keys(campaign.nations).filter((other) => other !== nation && membershipsOf(campaign, other).some((id) => own.has(id)));
}
/**
 * The United States' installations abroad, by the basing table, which records
 * no other government's. A row with a sourced point stands there; a country
 * total or a rotation stands at its host's capital, the same place the map
 * draws it.
 */
function installations(campaign, nation) {
    if (nation !== US_ID)
        return [];
    return US_BASING.flatMap((row) => {
        if (row.lat !== undefined && row.lon !== undefined)
            return [{ lat: row.lat, lon: row.lon, leadInKm: 0 }];
        const host = selectNation(campaign, row.country);
        return host ? [{ lat: host.base.geo.lat, lon: host.base.geo.lon, leadInKm: 0 }] : [];
    });
}
/**
 * Every place this government can mount force against the target from, beyond
 * its own capital. The target's own territory is never an ally's staging
 * ground against itself; an installation inside it still stands, because the
 * forces are already there.
 */
export function stagingPoints(campaign, nation, target) {
    const home = selectNation(campaign, nation)?.base.geo;
    if (!home)
        return [];
    const allies = defenseAllies(campaign, nation)
        .filter((ally) => ally !== target)
        .flatMap((ally) => {
        const geo = selectNation(campaign, ally)?.base.geo;
        return geo ? [{ lat: geo.lat, lon: geo.lon, leadInKm: distanceKm(home, geo) }] : [];
    });
    return [...installations(campaign, nation), ...allies];
}
