import { US_BASING } from "@admin/world";
import { capitalDistanceKm } from "./relationship-graph.js";
const CSIS = (country) => `https://missilethreat.csis.org/country/${country}/`;
export const MISSILE_REACH = [
    { nation: "CHN", rangeKm: 12_000, longestClass: "ICBM", source: CSIS("china"), opened: "2026-09-28" },
    { nation: "IND", rangeKm: 3_000, longestClass: "IRBM", source: CSIS("india"), opened: "2026-09-28" },
    { nation: "IRN", rangeKm: 2_000, longestClass: "MRBM", source: CSIS("iran"), opened: "2026-09-28" },
    { nation: "ISR", rangeKm: 4_800, longestClass: "IRBM", source: CSIS("israel"), opened: "2026-09-28" },
    { nation: "PAK", rangeKm: 1_500, longestClass: "MRBM", source: CSIS("pakistan"), opened: "2026-09-28" },
    { nation: "PRK", rangeKm: 15_000, longestClass: "ICBM", source: CSIS("dprk"), opened: "2026-09-28" },
    { nation: "RUS", rangeKm: 11_000, longestClass: "ICBM", source: CSIS("russia"), opened: "2026-09-28" },
];
const reachById = new Map(MISSILE_REACH.map((row) => [row.nation, row.rangeKm]));
/** The longest operational range a government's missiles hold, or zero where the table records none. */
export function missileRangeKm(nation) {
    return reachById.get(nation) ?? 0;
}
/**
 * Whether the actor's missiles reach the target: its capital, or, for the
 * United States, a country hosting American forces. A government that cannot
 * reach Washington can still reach a base in the region, which is where such
 * a government has actually answered the United States.
 */
export function withinMissileReach(actor, target, hosts = []) {
    const range = missileRangeKm(actor.id);
    if (range <= 0)
        return false;
    if (capitalDistanceKm(actor, target) <= range)
        return true;
    return hosts.some((host) => capitalDistanceKm(actor, host) <= range);
}
/** The countries hosting United States forces abroad, by the basing table. Empty until the table is filled. */
export function usHostIds() {
    return [...new Set(US_BASING.map((row) => row.country))];
}
