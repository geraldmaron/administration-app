import type { LonLat } from "../schemas/zone.js";
export type Ring = readonly LonLat[];
/** Even-odd containment: a point inside an odd number of rings is inside, so holes read as outside. */
export declare function ringsContain(rings: readonly Ring[], point: LonLat): boolean;
export declare function ringContains(ring: Ring, [x, y]: LonLat): boolean;
/** Twice the signed area in square degrees; zero for a degenerate ring. */
export declare function ringSignedArea(ring: Ring): number;
/**
 * Whether two segments cross at a point interior to both. Touching at an end,
 * or running along a shared edge, is not a crossing: two seas that share a
 * boundary meet there without overlapping.
 */
export declare function segmentsCross(a: LonLat, b: LonLat, c: LonLat, d: LonLat): boolean;
/** Every pair of non-adjacent edges that cross, as edge indices. Empty for a simple ring. */
export declare function ringSelfCrossings(ring: Ring): readonly (readonly [number, number])[];
/**
 * Whether two simple rings share interior. An edge crossing proves it; with
 * no crossing, one ring's interior can still hold the other whole, which a
 * vertex test catches. A vertex sitting on the other's boundary is skipped,
 * since shared corners are how neighboring seas meet.
 */
export declare function ringsOverlap(a: Ring, b: Ring): boolean;
/** Kilometers from a point to the nearest edge of a ring, on a local flat-earth approximation. */
export declare function distanceToRingKm(ring: Ring, point: LonLat): number;
/** Kilometers from a point to the nearest edge of any ring. */
export declare function distanceToRingsKm(rings: readonly Ring[], point: LonLat): number;
export type LonLatBounds = {
    readonly west: number;
    readonly south: number;
    readonly east: number;
    readonly north: number;
};
export declare function ringsBounds(rings: readonly Ring[]): LonLatBounds;
