import { ringsBounds, ringsContain } from "../geo/polygon.js";
import { unprojectFromPlate } from "./projection.js";
import { TERRITORY_ADMINISTRATOR } from "./territories.js";
import { COUNTRY_PATHS } from "./world-geometry.js";
// A government's territory as longitude and latitude rings, read back off the
// same baked outlines the map draws, so a check that a point is inside a
// country agrees with the shape the player sees it inside. Territory a
// government administers (Greenland for Denmark, Guam for the United States)
// is its own: a base there is hosted by the administering government.
const NUMBER = /-?\d+(?:\.\d+)?/g;
function ringsOfPath(d) {
    return d
        .split(/(?=M )/g)
        .map((part) => {
        const numbers = (part.match(NUMBER) ?? []).map(Number);
        const ring = [];
        for (let index = 0; index + 1 < numbers.length; index += 2) {
            const { lon, lat } = unprojectFromPlate(numbers[index], numbers[index + 1]);
            ring.push([lon, lat]);
        }
        return ring;
    })
        .filter((ring) => ring.length >= 3);
}
const cache = new Map();
/** The rings of a government's own shape and every territory it administers; undefined where the map bakes none. */
export function nationOutline(nation) {
    if (cache.has(nation))
        return cache.get(nation);
    const shapes = [nation, ...Object.keys(TERRITORY_ADMINISTRATOR).filter((shape) => TERRITORY_ADMINISTRATOR[shape] === nation)];
    const rings = shapes.flatMap((shape) => {
        const path = COUNTRY_PATHS[shape];
        return path ? ringsOfPath(path) : [];
    });
    const outline = rings.length > 0 ? rings : undefined;
    cache.set(nation, outline);
    return outline;
}
let land;
function landShapes() {
    land ??= Object.values(COUNTRY_PATHS).map((path) => {
        const rings = ringsOfPath(path);
        return { rings, bounds: ringsBounds(rings) };
    });
    return land;
}
/** Whether a point is inside any baked shape, territories included: what open water has to avoid. */
export function onLand([lon, lat]) {
    return landShapes().some(({ rings, bounds }) => lon >= bounds.west && lon <= bounds.east && lat >= bounds.south && lat <= bounds.north && ringsContain(rings, [lon, lat]));
}
