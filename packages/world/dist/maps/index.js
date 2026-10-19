/**
 * Map projection and baked geometry. Renderer-free; the web player draws it
 * with ordinary SVG.
 */
export { MAP_HEIGHT, MAP_WIDTH, projectToPlate, unprojectFromPlate } from "./projection.js";
export { nationOutline, onLand } from "./outlines.js";
export { distanceToStateKm, kmPerUsPlateUnit, projectToUsPlate, stateContains, stateOutline } from "./state-outlines.js";
export { MAP_VIEWBOX, SPHERE_PATH, GRATICULE_PATHS, COUNTRY_PATHS } from "./world-geometry.js";
export { US_MAP_VIEWBOX, US_STATE_PATHS, US_DISTRICT_PATHS } from "./us-geometry.js";
export { pathBounds, pathComponentBounds } from "./path-bounds.js";
export { TERRITORY_ADMINISTRATOR } from "./territories.js";
