/**
 * Natural Earth I projection and plate coordinates. No renderer.
 * Shared by bake scripts, the registration gate, and the web World map.
 */

//
// Equirectangular, which puts longitude and latitude straight onto x and y, is
// the projection you get for free, and it is the one that reads as a
// spreadsheet of the world: Greenland the size of Africa, Russia smeared across
// the top of the frame, every landmass stretched wider the further it sits from
// the equator, and the whole plate a hard 2:1 rectangle with the poles as much
// screen as the tropics.
//
// This is Natural Earth I (Šavrič, Jenny, Patterson, Jenny), the projection
// drawn for exactly this job: a small world reference map meant to be looked
// at rather than measured off. Meridians curve, the poles are lines rather
// than the whole top edge, and the high latitudes stop eating the frame.
//
// It lives here, once, because the baked country outlines and the pins dropped
// on top of them have to agree about where a place is. Two implementations of
// this formula is a marker floating in the sea next to its own country.

/** The projected half-width at the equator, in projection units. */
const EQUATOR_HALF_WIDTH = Math.PI * 0.8707;

export type ProjectedPoint = { readonly x: number; readonly y: number };

/**
 * Longitude and latitude in degrees to Natural Earth I units, x east and y
 * north, origin at the intersection of the equator and the prime meridian.
 */
export function naturalEarth(lon: number, lat: number): ProjectedPoint {
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const phi2 = phi * phi;
  const phi4 = phi2 * phi2;
  return {
    x: lambda * (0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4))),
    y: phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4))),
  };
}

/**
 * The plate the projection is drawn onto: width 1000, height whatever the
 * projection's own aspect asks for, rather than a rectangle chosen first and
 * the world squeezed into it.
 */
export const MAP_WIDTH = 1000;
const SCALE = MAP_WIDTH / (2 * EQUATOR_HALF_WIDTH);
const HALF_HEIGHT = naturalEarth(0, 90).y * SCALE;
export const MAP_HEIGHT = Math.round(HALF_HEIGHT * 2 * 100) / 100;

/** The same point in viewBox coordinates, y down, origin at the top left. */
export function projectToPlate(lon: number, lat: number): ProjectedPoint {
  const point = naturalEarth(lon, lat);
  return {
    x: MAP_WIDTH / 2 + point.x * SCALE,
    y: MAP_HEIGHT / 2 - point.y * SCALE,
  };
}

const NEWTON_EPSILON = 1e-9;
const NEWTON_STEPS = 25;

/**
 * Plate coordinates back to longitude and latitude, in degrees. Natural Earth
 * I's y depends on latitude alone, so latitude is solved first by Newton's
 * method on the y polynomial and longitude then falls out of x by division.
 * Exact to well under the tenth of a plate unit the baked outlines keep.
 */
export function unprojectFromPlate(x: number, y: number): { readonly lon: number; readonly lat: number } {
  const ny = (MAP_HEIGHT / 2 - y) / SCALE;
  const nx = (x - MAP_WIDTH / 2) / SCALE;
  let phi = ny;
  for (let step = 0; step < NEWTON_STEPS; step++) {
    const phi2 = phi * phi;
    const phi4 = phi2 * phi2;
    const value = phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4))) - ny;
    const slope = 1.007226 + phi2 * (3 * 0.015085 + phi4 * (7 * -0.044475 + 9 * 0.028874 * phi2 - 11 * 0.005916 * phi4));
    const delta = value / slope;
    phi -= delta;
    if (Math.abs(delta) < NEWTON_EPSILON) break;
  }
  const phi2 = phi * phi;
  const phi4 = phi2 * phi2;
  const stretch = 0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4));
  return { lon: ((nx / stretch) * 180) / Math.PI, lat: (phi * 180) / Math.PI };
}
