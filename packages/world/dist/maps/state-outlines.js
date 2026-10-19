import { ringsContain } from "../geo/polygon.js";
import { US_STATE_PATHS } from "./us-geometry.js";
// A state's outline, and where a longitude and latitude falls on it. The state
// shapes are baked already projected (`scripts/bake-district-map.mjs` runs
// d3-geo's default `geoAlbersUsa()`), so a point is taken into the same plane
// rather than the outline back out of it: the projection is closed-form one
// way and iterative the other. Containment is topological, so asking it in the
// plane gives the answer the player sees.
const RADIANS = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;
/** geoAlbersUsa's default scale and translate, the ones the bake used. */
const SCALE = 1070;
const TRANSLATE = [480, 250];
// The three conic equal-area projections geoAlbersUsa composes, with d3's own
// constants: the lower 48, and Alaska and Hawaii moved into insets.
const LOWER_48 = { rotate: 96, center: [-0.6, 38.7], parallels: [29.5, 45.5], scale: SCALE, translate: TRANSLATE };
const ALASKA = {
    rotate: 154,
    center: [-2, 58.5],
    parallels: [55, 65],
    scale: SCALE * 0.35,
    translate: [TRANSLATE[0] - 0.307 * SCALE, TRANSLATE[1] + 0.201 * SCALE],
};
const HAWAII = {
    rotate: 157,
    center: [-3, 19.9],
    parallels: [8, 18],
    scale: SCALE,
    translate: [TRANSLATE[0] - 0.205 * SCALE, TRANSLATE[1] + 0.212 * SCALE],
};
function conicRaw(conic) {
    const sy0 = Math.sin(conic.parallels[0] * RADIANS);
    const n = (sy0 + Math.sin(conic.parallels[1] * RADIANS)) / 2;
    const c = 1 + sy0 * (2 * n - sy0);
    const r0 = Math.sqrt(c) / n;
    return (lambda, phi) => {
        const r = Math.sqrt(c - 2 * n * Math.sin(phi)) / n;
        const x = lambda * n;
        return [r * Math.sin(x), r0 - r * Math.cos(x)];
    };
}
function wrap(lambda) {
    return Math.abs(lambda) > Math.PI ? lambda - Math.round(lambda / (2 * Math.PI)) * 2 * Math.PI : lambda;
}
function projectConic(conic, [lon, lat]) {
    const raw = conicRaw(conic);
    const [cx, cy] = raw(conic.center[0] * RADIANS, conic.center[1] * RADIANS);
    const [x, y] = raw(wrap((lon + conic.rotate) * RADIANS), lat * RADIANS);
    return [conic.translate[0] + conic.scale * (x - cx), conic.translate[1] - conic.scale * (y - cy)];
}
const conicFor = (state) => (state === "AK" ? ALASKA : state === "HI" ? HAWAII : LOWER_48);
/**
 * A longitude and latitude in the US map's plane, through the projection the
 * named state is drawn with. Alaska and Hawaii are insets, so the state picks
 * the inset rather than the point's own extent.
 */
export function projectToUsPlate(state, point) {
    return projectConic(conicFor(state), point);
}
/** Kilometers on the ground per plane unit, at the projection's scale; the inset scale makes Alaska's coarser. */
export function kmPerUsPlateUnit(state) {
    return EARTH_RADIUS_KM / conicFor(state).scale;
}
const NUMBER = /-?\d+(?:\.\d+)?/g;
const cache = new Map();
/** A state's baked outline as rings in the US map's plane. */
export function stateOutline(state) {
    const hit = cache.get(state);
    if (hit)
        return hit;
    const path = US_STATE_PATHS[state] ?? "";
    const rings = path
        .split(/(?=M )/g)
        .map((part) => {
        const numbers = (part.match(NUMBER) ?? []).map(Number);
        const ring = [];
        for (let index = 0; index + 1 < numbers.length; index += 2)
            ring.push([numbers[index], numbers[index + 1]]);
        return ring;
    })
        .filter((ring) => ring.length >= 3);
    cache.set(state, rings);
    return rings;
}
/** Whether a longitude and latitude falls inside the state's drawn outline. */
export function stateContains(state, point) {
    return ringsContain(stateOutline(state), projectToUsPlate(state, point));
}
function segmentDistance([px, py], [ax, ay], [bx, by]) {
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
/** Kilometers from a longitude and latitude to the nearest edge of the state's drawn outline. */
export function distanceToStateKm(state, point) {
    const plane = projectToUsPlate(state, point);
    const units = stateOutline(state).reduce((best, ring) => ring.reduce((inner, vertex, index) => Math.min(inner, segmentDistance(plane, vertex, ring[(index + 1) % ring.length])), best), Number.POSITIVE_INFINITY);
    return units * kmPerUsPlateUnit(state);
}
