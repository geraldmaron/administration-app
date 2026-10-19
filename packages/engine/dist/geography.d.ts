import type { Chokepoint, Cradle, Nation, NationGeography, Organization } from "@admin/world";
export declare function distanceKm(a: {
    lat: number;
    lon: number;
}, b: {
    lat: number;
    lon: number;
}): number;
/**
 * Somewhere a government can mount force from besides its own capital: an
 * installation it already holds abroad, or an ally's territory it may use.
 * `leadInKm` is the distance its forces still have to be carried to get there
 * first: zero for an installation, where they already stand, and the trip from
 * home for an ally's soil.
 */
export type StagingPoint = {
    readonly lat: number;
    readonly lon: number;
    readonly leadInKm: number;
};
export declare function forceProjectionCost(from: Nation, to: Nation, staging?: readonly StagingPoint[]): {
    multiplier: number;
    distanceKm: number;
    stagedKm: number;
};
export declare function projectionOdds(from: Nation, to: Nation, baseOdds: number, staging?: readonly StagingPoint[]): number;
export declare function tradeVulnerability(geography: NationGeography, closed: readonly string[]): number;
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
export declare function chokepointExposure(nation: Nation, catalog?: readonly Chokepoint[]): number;
export type OrgEligibility = {
    org: Organization;
    eligible: boolean;
    reason?: string;
};
export declare function orgEligibility(organizations: readonly Organization[], cradle: Cradle, alreadyJoined: readonly string[]): OrgEligibility[];
export declare function eligibleOrgs(organizations: readonly Organization[], cradle: Cradle, alreadyJoined?: readonly string[]): Organization[];
export declare function cradleThreatMix(cradle: Cradle, nations: readonly Nation[]): {
    pressure: number;
    neighbors: number;
};
export declare function globalClosureSeverity(chokepoints: readonly Chokepoint[], closed: readonly string[]): number;
