import { type Nation, type NationId } from "@admin/world";
export type MissileReachRow = {
    readonly nation: string;
    /** The longest operational range, low end, in the source's kilometers. */
    readonly rangeKm: number;
    /** The class of the system that sets it, as the source names the class. */
    readonly longestClass: string;
    readonly source: string;
    readonly opened: string;
};
export declare const MISSILE_REACH: readonly MissileReachRow[];
/** All a reach reading needs of a government: who it is and where its capital stands. */
type Placed = Pick<Nation, "id" | "geo">;
/** The longest operational range a government's missiles hold, or zero where the table records none. */
export declare function missileRangeKm(nation: NationId): number;
/**
 * Whether the actor's missiles reach the target: its capital, or, for the
 * United States, a country hosting American forces. A government that cannot
 * reach Washington can still reach a base in the region, which is where such
 * a government has actually answered the United States.
 */
export declare function withinMissileReach(actor: Placed, target: Placed, hosts?: readonly Placed[]): boolean;
/** The countries hosting United States forces abroad, by the basing table. Empty until the table is filled. */
export declare function usHostIds(): readonly string[];
export {};
