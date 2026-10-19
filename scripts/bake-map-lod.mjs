#!/usr/bin/env node
// Bakes the levels of detail the runtime map projects: world nations, US
// states and congressional districts, each as an unprojected TopoJSON
// topology (lon/lat, quantized and delta-encoded) plus one region index.
//
// The map projects at runtime (d3-geo, a Natural Earth / azimuthal blend), so
// nothing here is projected. Simplification runs on the topology's shared
// arcs, never on a feature's rings, so two neighbors simplified together keep
// one border rather than two that drift apart and leave a seam of missing dots.
//
//   world-lo      Natural Earth 110m   up front: world zoom and flight frames
//   world-hi      Natural Earth 50m    lazy: country zoom and deeper
//   states-lo     Census 2023 500k     up front: US zoom and flight frames
//   states-hi     Census 2023 500k     lazy: state zoom
//   districts-lo  Census 118th 500k    lazy: flight frames into a state
//   districts-hi  Census 118th 500k    lazy: state and district zoom
//   regions       centroids, label anchors, areas, bounds and the feature-to-government mapping
//   district-places.generated.ts (packages/world) the place each House seat is known by
//
// Alaska and Hawaii stay where they are on the globe. The US home view frames
// them as inset viewports of the same geometry, never as shapes moved into the
// lower 48's corner, so selecting either flies to the real place.
//
// Run after `pnpm run build` (the roster is read from packages/world/dist):
//   node scripts/bake-map-lod.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea, geoBounds, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import isoCountries from "i18n-iso-countries";
import { worldCities, worldNations, worldStates } from "../packages/world/dist/index.js";
import { areaKm2, districtPlace, districtPlaceCandidates, labelAnchor } from "./map-label-anchors.mjs";
import { TERRITORY_ADMINISTRATOR } from "../packages/world/dist/maps/territories.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(root, "apps/web/src/map/data");

const SOURCES = {
  world110: path.join(root, "node_modules/world-atlas/countries-110m.json"),
  world50: path.join(root, "node_modules/world-atlas/countries-50m.json"),
  states: path.join(root, "scripts/vendor/census-states-2023-500k.topo.json"),
  districts: path.join(root, "scripts/vendor/census-districts-118-2023-500k.topo.json"),
};

// Tolerance in degrees of latitude (longitude is scaled by cos(lat)), and the
// quantization grid the arcs are re-encoded on. A tolerance is chosen against
// the smallest on-screen size a level is ever drawn at: world-lo fills a 390px
// phone at its finest, where 0.2° is under a third of a dot pitch.
const LODS = [
  { name: "world-lo", source: "world110", object: "countries", tolerance: 0.2, quantize: 1e4, minRingArea: 2e-5 },
  { name: "world-hi", source: "world50", object: "countries", tolerance: 0.03, quantize: 1e5, minRingArea: 0 },
  { name: "states-lo", source: "states", object: "states", tolerance: 0.06, quantize: 1e4, minRingArea: 4e-6 },
  { name: "states-hi", source: "states", object: "states", tolerance: 0.01, quantize: 1e5, minRingArea: 0 },
  { name: "districts-lo", source: "districts", object: "districts", tolerance: 0.03, quantize: 1e4, minRingArea: 1e-6 },
  { name: "districts-hi", source: "districts", object: "districts", tolerance: 0.004, quantize: 1e5, minRingArea: 0 },
];

// Natural Earth shapes with no ISO numeric code, read by name. Northern
// Cyprus and Somaliland are drawn as the governments the United Nations seats;
// the Siachen Glacier is disputed and claimed by nobody on the roster alone.
const UNNAMED_FEATURES = {
  Kosovo: "XKX",
  "N. Cyprus": "CYP",
  Somaliland: "SOM",
  "Indian Ocean Ter.": "AUS",
  "Siachen Glacier": null,
};

// The 50m dependencies the shared territory table does not name, read the
// same way: drawn in the reading of the government that administers them.
// The Holy See is sovereign but not on the roster, so it is neutral ground.
const EXTRA_ADMINISTRATOR = {
  ASM: "USA", MNP: "USA", VIR: "USA",
  AIA: "GBR", BMU: "GBR", GGY: "GBR", IOT: "GBR", MSR: "GBR", PCN: "GBR", SHN: "GBR", TCA: "GBR", VGB: "GBR",
  BLM: "FRA", MAF: "FRA", SPM: "FRA", WLF: "FRA",
  ABW: "NLD", SXM: "NLD",
  COK: "NZL", NFK: "AUS", MAC: "CHN", VAT: null,
};

const OMITTED = new Set(["ATA"]);
const ROSTER = new Set(worldNations.map((nation) => nation.id));

/** Resolve a world-atlas feature to `{ region, government }`; government null is neutral ground. */
function worldRegion(geometry) {
  const name = geometry.properties?.name;
  const code = geometry.id === undefined ? undefined : isoCountries.numericToAlpha3(String(geometry.id));
  if (code === undefined) {
    if (!(name in UNNAMED_FEATURES)) throw new Error(`Unmapped unnamed feature "${name}"`);
    const government = UNNAMED_FEATURES[name];
    return { region: government ?? `~${name.replace(/\W+/g, "")}`, government };
  }
  if (OMITTED.has(code)) return null;
  if (ROSTER.has(code)) return { region: code, government: code };
  const administrator = code in TERRITORY_ADMINISTRATOR ? TERRITORY_ADMINISTRATOR[code] : EXTRA_ADMINISTRATOR[code];
  if (administrator === undefined) throw new Error(`Feature ${code} (${name}) is neither a government nor mapped`);
  return { region: administrator ?? `~${code}`, government: administrator };
}

function decodeArcs(topology) {
  const [sx, sy] = topology.transform.scale;
  const [tx, ty] = topology.transform.translate;
  return topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
}

function segmentDistance(p, a, b) {
  const k = Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  const ax = a[0] * k, bx = b[0] * k, px = p[0] * k;
  const dx = bx - ax;
  const dy = b[1] - a[1];
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (p[1] - a[1]) * dy) / length2));
  return Math.hypot(px - (ax + t * dx), p[1] - (a[1] + t * dy));
}

function douglasPeucker(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let index = -1;
    let furthest = tolerance;
    for (let i = first + 1; i < last; i++) {
      const distance = segmentDistance(points[i], points[first], points[last]);
      if (distance > furthest) [furthest, index] = [distance, i];
    }
    if (index < 0) continue;
    keep[index] = 1;
    stack.push([first, index], [index, last]);
  }
  return points.filter((_, i) => keep[i] === 1);
}

// A closed arc (an island drawn by one arc) simplified end to end collapses to
// a line, so it is split at its far point and each half kept apart: a ring
// always leaves with at least three distinct corners.
function simplifyArc(points, tolerance) {
  if (points.length < 3) return points;
  const [x0, y0] = points[0];
  const [xn, yn] = points[points.length - 1];
  if (x0 !== xn || y0 !== yn) return douglasPeucker(points, tolerance);
  let far = 1;
  for (let i = 1; i < points.length - 1; i++) {
    if (Math.hypot(points[i][0] - x0, points[i][1] - y0) > Math.hypot(points[far][0] - x0, points[far][1] - y0)) far = i;
  }
  const head = douglasPeucker(points.slice(0, far + 1), tolerance);
  const tail = douglasPeucker(points.slice(far), tolerance);
  const ring = [...head, ...tail.slice(1)];
  return ring.length >= 4 ? ring : points;
}

function ringArea(topologyArcs, ring) {
  const coordinates = [];
  for (const index of ring) {
    const arc = index < 0 ? [...topologyArcs[~index]].reverse() : topologyArcs[index];
    coordinates.push(...(coordinates.length > 0 ? arc.slice(1) : arc));
  }
  const area = geoArea({ type: "Polygon", coordinates: [coordinates] });
  return Math.min(area, 4 * Math.PI - area);
}

// Drops the small islands a level cannot show, but never a feature's largest
// polygon: a region always keeps at least one shape to carry its dots.
function pruneSmallPolygons(geometry, arcs, minRingArea) {
  if (minRingArea === 0 || geometry.type !== "MultiPolygon") return geometry;
  const scored = geometry.arcs.map((polygon) => ({ polygon, area: ringArea(arcs, polygon[0]) }));
  const largest = scored.reduce((best, next) => (next.area > best.area ? next : best));
  const kept = scored.filter((entry) => entry === largest || entry.area >= minRingArea).map((entry) => entry.polygon);
  return { ...geometry, arcs: kept };
}

function arcIndices(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.arcs] : geometry.arcs;
  return polygons.flat(2).map((index) => (index < 0 ? ~index : index));
}

function quantizeArcs(arcs, quantize) {
  const all = arcs.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const extent = (values) => values.reduce(([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)], [Infinity, -Infinity]);
  const [x0, x1] = extent(xs);
  const [y0, y1] = extent(ys);
  const sx = (x1 - x0) / (quantize - 1) || 1;
  const sy = (y1 - y0) / (quantize - 1) || 1;
  const encoded = arcs.map((arc) => {
    const grid = arc.map(([x, y]) => [Math.round((x - x0) / sx), Math.round((y - y0) / sy)]);
    const deduped = grid.filter((p, i) => i === 0 || i === grid.length - 1 || p[0] !== grid[i - 1][0] || p[1] !== grid[i - 1][1]);
    return deduped.map((p, i) => (i === 0 ? p : [p[0] - deduped[i - 1][0], p[1] - deduped[i - 1][1]]));
  });
  return { transform: { scale: [sx, sy], translate: [x0, y0] }, arcs: encoded };
}

function remapGeometry(geometry, remap) {
  const map = (index) => (index < 0 ? ~remap.get(~index) : remap.get(index));
  const arcs = geometry.type === "Polygon" ? geometry.arcs.map((ring) => ring.map(map)) : geometry.arcs.map((polygon) => polygon.map((ring) => ring.map(map)));
  return { ...geometry, arcs };
}

function readTopology(source) {
  return JSON.parse(readFileSync(SOURCES[source], "utf8"));
}

function regionOf(lod, geometry) {
  if (lod.source.startsWith("world")) return worldRegion(geometry);
  return { region: geometry.properties.id, government: "USA" };
}

/** Bake one level of detail into a TopoJSON topology with region-id geometries. */
function bakeLod(lod) {
  const topology = readTopology(lod.source);
  const decoded = decodeArcs(topology);
  const geometries = [];
  for (const geometry of topology.objects[lod.object].geometries) {
    const resolved = regionOf(lod, geometry);
    if (resolved === null || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) continue;
    geometries.push({ type: geometry.type, id: resolved.region, arcs: pruneSmallPolygons(geometry, decoded, lod.minRingArea).arcs });
  }
  const used = [...new Set(geometries.flatMap(arcIndices))].sort((a, b) => a - b);
  const remap = new Map(used.map((index, position) => [index, position]));
  const simplified = used.map((index) => simplifyArc(decoded[index], lod.tolerance));
  const { transform, arcs } = quantizeArcs(simplified, lod.quantize);
  const points = simplified.reduce((sum, arc) => sum + arc.length, 0);
  return {
    topology: { type: "Topology", transform, objects: { regions: { type: "GeometryCollection", geometries: geometries.map((g) => remapGeometry(g, remap)) } }, arcs },
    points,
  };
}

function largestPolygon(feature) {
  const geometry = feature.geometry;
  if (geometry.type === "Polygon") return geometry;
  const polygons = geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }));
  return polygons.reduce((best, next) => (geoArea(next) > geoArea(best) ? next : best));
}

const round = (value) => Math.round(value * 1000) / 1000;

function partsByRegion(topology) {
  const byRegion = new Map();
  for (const f of feature(topology, topology.objects.regions).features) byRegion.set(f.id, [...(byRegion.get(f.id) ?? []), f]);
  return byRegion;
}

/** Centroid and label anchor of each region's largest polygon, the area of all of it, and its bounds. */
function regionIndex(topology) {
  const regions = {};
  for (const [id, parts] of partsByRegion(topology)) {
    const main = parts.map(largestPolygon).reduce((best, next) => (geoArea(next) > geoArea(best) ? next : best));
    const collection = { type: "FeatureCollection", features: parts };
    const area = parts.reduce((sum, part) => sum + areaKm2(part.geometry), 0);
    regions[id] = { c: geoCentroid(main).map(round), l: labelAnchor(main).map(round), a: area, b: geoBounds(collection).flat().map(round) };
  }
  return regions;
}

/** The place each district is known by, written as a world-package table so the panel and the map name a seat the same way. */
function writeDistrictPlaces(topology, index) {
  const stateIdByName = new Map(worldStates.map((state) => [state.name, state.id]));
  const candidates = districtPlaceCandidates(root, worldCities, stateIdByName);
  const rows = [];
  const tally = { in: 0, area: 0, near: 0 };
  for (const [id, parts] of [...partsByRegion(topology)].sort(([a], [b]) => String(a).localeCompare(String(b)))) {
    const whole = { type: "Feature", id, geometry: { type: "MultiPolygon", coordinates: parts.flatMap((part) => (part.geometry.type === "Polygon" ? [part.geometry.coordinates] : part.geometry.coordinates)) } };
    const place = districtPlace(whole, index[id].l, candidates);
    if (!place) continue;
    tally[place.how]++;
    rows.push(`  ${JSON.stringify(String(id))}: { name: ${JSON.stringify(place.name)}, how: "${place.how}" },`);
  }
  const text = [
    "// Baked by scripts/bake-map-lod.mjs from the Census 118th districts, the city",
    "// gazetteer's metros and Natural Earth's US places (scripts/vendor/ne-us-places.tsv,",
    "// public domain); do not edit by hand. The place a House seat is known by: the",
    '// most populous place inside it ("in"), the nearest metro within 80 km for a seat',
    '// with none of its own ("area"), or the nearest place of any size ("near").',
    "",
    "// prettier-ignore",
    'export const DISTRICT_PLACES: Readonly<Record<string, { readonly name: string; readonly how: "in" | "area" | "near" }>> = {',
    ...rows,
    "};",
    "",
  ].join("\n");
  writeFileSync(path.join(root, "packages/world/src/dataset/district-places.generated.ts"), text);
  return tally;
}

function worldIndex(hiTopology, names) {
  const regions = regionIndex(hiTopology);
  const pointOnly = [];
  for (const nation of worldNations) {
    if (regions[nation.id]) continue;
    pointOnly.push(nation.id);
    regions[nation.id] = { c: [nation.geo.lon, nation.geo.lat], l: [nation.geo.lon, nation.geo.lat], a: 0, b: [nation.geo.lon, nation.geo.lat, nation.geo.lon, nation.geo.lat], point: true };
  }
  for (const [id, name] of Object.entries(names)) if (regions[id]) regions[id].name = name;
  return { regions, pointOnly };
}

function neutralNames() {
  const names = {};
  for (const source of ["world50"]) {
    for (const geometry of readTopology(source).objects.countries.geometries) {
      const resolved = worldRegion(geometry);
      if (resolved && resolved.government === null) names[resolved.region] = geometry.properties.name;
    }
  }
  return names;
}

function writeJson(name, value) {
  const text = JSON.stringify(value);
  writeFileSync(path.join(OUT_DIR, `${name}.json`), text);
  return text.length;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const report = [];
  const baked = {};
  for (const lod of LODS) {
    const { topology, points } = bakeLod(lod);
    baked[lod.name] = topology;
    report.push({ file: `${lod.name}.json`, regions: new Set(topology.objects.regions.geometries.map((g) => g.id)).size, arcs: topology.arcs.length, points, bytes: writeJson(lod.name, topology) });
  }
  const world = worldIndex(baked["world-hi"], neutralNames());
  const lowWorld = new Set(baked["world-lo"].objects.regions.geometries.map((g) => g.id));
  const index = { world: world.regions, states: regionIndex(baked["states-hi"]), districts: regionIndex(baked["districts-hi"]) };
  report.push({ file: "regions.json", regions: Object.keys(index.world).length + Object.keys(index.states).length + Object.keys(index.districts).length, arcs: 0, points: 0, bytes: writeJson("regions", index) });
  const places = writeDistrictPlaces(baked["districts-hi"], index.districts);
  console.log(`District places: ${places.in} named for a place inside, ${places.area} for a nearby metro, ${places.near} for the nearest place`);
  const missing = worldNations.filter((nation) => !index.world[nation.id]);
  if (missing.length > 0) throw new Error(`Governments with neither geometry nor point: ${missing.map((n) => n.id).join(", ")}`);
  console.table(report.map((row) => ({ ...row, kb: (row.bytes / 1024).toFixed(1) })));
  console.log(`Point-only governments at every level (no 50m shape): ${world.pointOnly.join(", ") || "none"}`);
  console.log(`Governments drawn only as a centroid at world-lo: ${worldNations.filter((n) => !lowWorld.has(n.id)).map((n) => n.id).join(", ")}`);
}

main();
