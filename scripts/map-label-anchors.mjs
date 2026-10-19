// Where the map writes a region's name, and the place a congressional district
// is known by. Imported by bake-map-lod.mjs; kept apart so the bake stays
// about geometry and this file stays about naming.
//
// A centroid can fall outside its own region (Florida's, Michigan's, a
// crescent district's), so a name is anchored at the pole of inaccessibility:
// the interior point farthest from every edge, found by the Mapbox polylabel
// method on a plane where a degree of longitude is scaled by cos(latitude).

import { readFileSync } from "node:fs";
import path from "node:path";
import { geoArea, geoContains, geoDistance } from "d3-geo";

const EARTH_KM = 6371;
/** A district with no place of its own takes the nearest metro this close, as "<metro> area"; farther, it is "near" the nearest place. */
const AREA_REACH_KM = 80;

function ringDistance(x, y, ring) {
  let inside = false;
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    let dx = bx - ax;
    let dy = by - ay;
    let px = ax;
    let py = ay;
    if (dx !== 0 || dy !== 0) {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      px = ax + dx * t;
      py = ay + dy * t;
    }
    dx = x - px;
    dy = y - py;
    best = Math.min(best, dx * dx + dy * dy);
  }
  return { inside, distance: Math.sqrt(best) };
}

/** Signed distance from a point to a polygon's edges: positive inside, negative outside or in a hole. */
function polygonDistance(x, y, rings) {
  let inside = false;
  let best = Infinity;
  for (const ring of rings) {
    const result = ringDistance(x, y, ring);
    if (result.inside) inside = !inside;
    best = Math.min(best, result.distance);
  }
  return inside ? best : -best;
}

/** The pole of inaccessibility of one polygon's rings, to `precision` in plane units. */
function polylabel(rings, precision) {
  const outer = rings[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of outer) [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)];
  const size = Math.min(maxX - minX, maxY - minY);
  const cell = (x, y, h) => {
    const d = polygonDistance(x, y, rings);
    return { x, y, h, d, max: d + h * Math.SQRT2 };
  };
  let best = cell((minX + maxX) / 2, (minY + maxY) / 2, 0);
  if (size === 0) return [best.x, best.y];
  const queue = [];
  for (let x = minX; x < maxX; x += size) for (let y = minY; y < maxY; y += size) queue.push(cell(x + size / 2, y + size / 2, size / 2));
  while (queue.length > 0) {
    queue.sort((a, b) => a.max - b.max);
    const next = queue.pop();
    if (next.d > best.d) best = next;
    if (next.max - best.d <= precision) continue;
    const h = next.h / 2;
    queue.push(cell(next.x - h, next.y - h, h), cell(next.x + h, next.y - h, h), cell(next.x - h, next.y + h, h), cell(next.x + h, next.y + h, h));
  }
  return [best.x, best.y];
}

/** The label anchor of a polygon in lon/lat: polylabel on a plane squashed by the polygon's own latitude. */
export function labelAnchor(polygon) {
  const lats = polygon.coordinates[0].map((point) => point[1]);
  const mid = (Math.min(...lats) + Math.max(...lats)) / 2;
  const squash = Math.cos((mid * Math.PI) / 180) || 1;
  const rings = polygon.coordinates.map((ring) => ring.map(([lon, lat]) => [lon * squash, lat]));
  const [x, y] = polylabel(rings, 0.01);
  return [x / squash, y];
}

/** A region's land area in square kilometers, which ranks whose name the map writes first. */
export function areaKm2(geometry) {
  return Math.round(geoArea(geometry) * EARTH_KM * EARTH_KM);
}

/** Every place a district could be named for: the gazetteer's metros and Natural Earth's towns, deduplicated by name and state. */
export function districtPlaceCandidates(root, worldCities, stateIdByName) {
  const metros = worldCities.filter((city) => city.nation === "USA" && city.state).map((city) => ({ name: city.name, state: city.state, lon: city.lon, lat: city.lat, population: city.population, metro: true }));
  const towns = readFileSync(path.join(root, "scripts/vendor/ne-us-places.tsv"), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("name\t"))
    .map((line) => line.split("\t"))
    .map(([name, state, lat, lon, population]) => ({ name, state: stateIdByName.get(state), lon: Number(lon), lat: Number(lat), population: Number(population), metro: false }));
  const seen = new Set(metros.map((place) => `${place.name}|${place.state}`));
  return [...metros, ...towns.filter((place) => place.state && !seen.has(`${place.name}|${place.state}`))];
}

/**
 * The place a district is known by: the most populous place inside it; or,
 * for a seat with none (a suburb, a borough), the nearest metro within reach
 * as "<metro> area"; or the nearest place of any size, as "near <place>".
 */
export function districtPlace(feature, anchor, candidates) {
  const state = String(feature.id).slice(0, 2);
  const inState = candidates.filter((place) => place.state === state);
  const inside = inState.filter((place) => geoContains(feature, [place.lon, place.lat])).sort((a, b) => b.population - a.population)[0];
  if (inside) return { name: inside.name, how: "in" };
  const km = (place) => geoDistance(anchor, [place.lon, place.lat]) * EARTH_KM;
  const metro = inState.filter((place) => place.metro).sort((a, b) => km(a) - km(b))[0];
  if (metro && km(metro) <= AREA_REACH_KM) return { name: metro.name, how: "area" };
  const nearest = inState.sort((a, b) => km(a) - km(b))[0];
  return nearest ? { name: nearest.name, how: "near" } : null;
}
