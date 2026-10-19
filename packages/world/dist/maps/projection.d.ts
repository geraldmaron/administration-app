/**
 * Natural Earth I projection and plate coordinates. No renderer.
 * Shared by bake scripts, the registration gate, and the web World map.
 */
export type ProjectedPoint = {
    readonly x: number;
    readonly y: number;
};
/**
 * Longitude and latitude in degrees to Natural Earth I units, x east and y
 * north, origin at the intersection of the equator and the prime meridian.
 */
export declare function naturalEarth(lon: number, lat: number): ProjectedPoint;
/**
 * The plate the projection is drawn onto: width 1000, height whatever the
 * projection's own aspect asks for, rather than a rectangle chosen first and
 * the world squeezed into it.
 */
export declare const MAP_WIDTH = 1000;
export declare const MAP_HEIGHT: number;
/** The same point in viewBox coordinates, y down, origin at the top left. */
export declare function projectToPlate(lon: number, lat: number): ProjectedPoint;
/**
 * Plate coordinates back to longitude and latitude, in degrees. Natural Earth
 * I's y depends on latitude alone, so latitude is solved first by Newton's
 * method on the y polynomial and longitude then falls out of x by division.
 * Exact to well under the tenth of a plate unit the baked outlines keep.
 */
export declare function unprojectFromPlate(x: number, y: number): {
    readonly lon: number;
    readonly lat: number;
};
