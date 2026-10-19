export type PathBounds = {
    readonly minX: number;
    readonly minY: number;
    readonly width: number;
    readonly height: number;
};
/** The extent of a baked country path, in projected viewBox units. Memoised: the geometry never changes at runtime. */
export declare function pathBounds(d: string): PathBounds;
/**
 * Bounds for each movable island/mainland component in a baked country path.
 * Countries such as the United States are not one visual rectangle: Alaska,
 * Hawaii, and the mainland all share one ISO path. Situation-scale maps need
 * to reason about the component the player is actually looking at, not the
 * union of every detached part.
 */
export declare function pathComponentBounds(d: string): readonly PathBounds[];
