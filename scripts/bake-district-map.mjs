#!/usr/bin/env node
// Bakes the US state and congressional-district outlines into a generated
// TypeScript module with projected SVG paths.
//
// Source: `scripts/vendor/census-states-2023-500k.topo.json` and
// `census-districts-118-2023-500k.topo.json` — the Census Bureau's own 2023
// cartographic boundary files (1:500,000, already generalized for map
// display), the 118th Congress (the current post-2020-reapportionment
// districts), filtered to the 50 states + DC and converted to TopoJSON.
// Vendored and committed, not fetched live: a `curl` to a government URL at
// build time is not reproducible the way a pinned npm dependency is — the URL
// can move, the file can be revised, the network can be down for whoever runs
// this next. Committing the source is the same choice this repo already made
// for the world terrain (`assets/player/shaded-relief-ne1.jpg`) and mirrors
// why `world-atlas`'s data is a pinned devDependency rather than a live fetch.
// This bake needs no network at all.
//
// To re-vendor after a new redistricting cycle: see
// `scripts/vendor-district-map-source.mjs`, which does need network (a
// one-time, occasional operation, the same class as `bake-map-terrain.mjs`
// needing `sips` on the machine that runs it).
//
// States and districts are projected through the SAME `d3-geo` geoAlbersUsa()
// call, which is what guarantees they register: two projections of the same
// coastline is a state border floating off its own district, the exact defect
// `verify-map-registration.mjs` exists to catch on the world map. `d3-geo` is
// a devDependency used only here — nothing in the shipped app imports it.
//
// Run: node scripts/bake-district-map.mjs (or `pnpm bake:district-map`)

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoAlbersUsa } from "d3-geo";
import { feature } from "topojson-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

const STATE_SOURCE = path.join(root, "scripts/vendor/census-states-2023-500k.topo.json");
const DISTRICT_SOURCE = path.join(root, "scripts/vendor/census-districts-118-2023-500k.topo.json");

const project = geoAlbersUsa();
const [PLATE_WIDTH, PLATE_HEIGHT] = [960, 600];

// Ramer-Douglas-Peucker, in projected units — the same algorithm and the same
// reasoning as scripts/bake-map-geometry.mjs's own simplify().
const SIMPLIFY_TOLERANCE = 0.3;
const MIN_AREA = 0.5;

function roundCoord(value) {
  return Math.round(value * 10) / 10;
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(point[0] - (start[0] + clamped * dx), point[1] - (start[1] + clamped * dy));
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let index = 0;
  let furthest = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > furthest) {
      furthest = distance;
      index = i;
    }
  }
  if (furthest <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

function shoelaceArea(projectedRing) {
  if (projectedRing.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < projectedRing.length - 1; i++) {
    const [x1, y1] = projectedRing[i];
    const [x2, y2] = projectedRing[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

/** A ring to an SVG subpath, or "" if any vertex falls outside the AlbersUsa composite. */
function ringToPath(ring) {
  const projected = [];
  for (const [lon, lat] of ring) {
    const point = project([lon, lat]);
    if (!point) return "";
    projected.push([roundCoord(point[0]), roundCoord(point[1])]);
  }
  if (shoelaceArea(projected) < MIN_AREA) return "";
  const kept = simplify(projected, SIMPLIFY_TOLERANCE).map(([x, y]) => `${x} ${y}`);
  if (kept.length < 3) return "";
  return `M ${kept[0]} L ${kept.slice(1).join(" ")} Z`;
}

function featureToPath(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const subpaths = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const drawn = ringToPath(ring);
      if (drawn) subpaths.push(drawn);
    }
  }
  return subpaths.join(" ");
}

function loadFeatures(sourcePath, objectName) {
  const topo = JSON.parse(readFileSync(sourcePath, "utf-8"));
  return feature(topo, topo.objects[objectName]).features;
}

function main() {
  const stateFeatures = loadFeatures(STATE_SOURCE, "states");
  const districtFeatures = loadFeatures(DISTRICT_SOURCE, "districts");

  const statePaths = {};
  for (const f of stateFeatures) {
    const drawn = featureToPath(f.geometry);
    if (drawn) statePaths[f.properties.id] = drawn;
  }

  const districtPaths = {};
  let dropped = 0;
  for (const f of districtFeatures) {
    const drawn = featureToPath(f.geometry);
    if (drawn) districtPaths[f.properties.id] = drawn;
    else dropped++;
  }

  const outputPath = path.join(root, "packages/world/src/maps/us-geometry.ts");
  const tsOutput = `// Generated by scripts/bake-district-map.mjs from scripts/vendor's Census
// Bureau 2023 cartographic boundary files (1:500,000; state and cd118 — the
// 118th Congress, the current post-2020-reapportionment districts), projected
// with d3-geo's geoAlbersUsa(). Edit the bake script to change.
//
// States and districts share one projection call, so they register: a state
// border and the district borders inside it come from the same composite
// (CONUS + repositioned Alaska/Hawaii insets), never two independent ones.

export const US_MAP_VIEWBOX = { width: ${PLATE_WIDTH}, height: ${PLATE_HEIGHT} } as const;

export const US_STATE_PATHS: Readonly<Record<string, string>> = {
${Object.entries(statePaths)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, path]) => `  ${id}: ${JSON.stringify(path)},`)
  .join("\n")}
};

export const US_DISTRICT_PATHS: Readonly<Record<string, string>> = {
${Object.entries(districtPaths)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, path]) => `  "${id}": ${JSON.stringify(path)},`)
  .join("\n")}
};
`;

  writeFileSync(outputPath, tsOutput, "utf-8");

  console.log(
    `Generated US map geometry:\n` +
      `  States: ${Object.keys(statePaths).length}\n` +
      `  Districts: ${Object.keys(districtPaths).length} (${dropped} dropped)\n` +
      `  File size: ${(tsOutput.length / 1024).toFixed(1)} KB\n` +
      `  Output: packages/world/src/maps/us-geometry.ts`,
  );
}

main();
