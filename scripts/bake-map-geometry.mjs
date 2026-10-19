#!/usr/bin/env node
// Bakes world map geometry from Natural Earth 50m data (via world-atlas) into
// a generated TypeScript module with projected SVG paths.
//
// The projection is imported from the built world package rather than written
// again here (packages/world/src/maps/projection.ts). The outlines this bakes and
// the pins the app drops on them have to agree about where a place is, and two
// copies of a polynomial is a marker floating in the sea beside its own
// country. Run `pnpm run build` before `pnpm bake:map`.
//
// 50m rather than 110m: at 110m a coastline is a dozen straight cuts and the
// board reads as a diagram of a world rather than a map of one.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";
import isoCountries from "i18n-iso-countries";
import { MAP_HEIGHT, MAP_WIDTH, projectToPlate } from "../packages/world/dist/maps/projection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

// Resolve world-atlas dataset
let atlasPath;
try {
  // ESM import.meta.resolve would require the import to be speculative,
  // so we use require.resolve pattern via createRequire or a direct path lookup.
  // For world-atlas in node_modules, this works:
  atlasPath = path.join(
    root,
    "node_modules",
    "world-atlas",
    "countries-50m.json"
  );
} catch {
  console.error("Failed to resolve world-atlas/countries-110m.json");
  process.exit(1);
}

// Read and parse the TopoJSON data
const topoData = JSON.parse(readFileSync(atlasPath, "utf-8"));

// Convert TopoJSON to GeoJSON FeatureCollection
const countries = feature(topoData, topoData.objects.countries);

function projectPoint(lon, lat) {
  return projectToPlate(lon, lat);
}

// Antarctica is not a government, it is never in play, and in any world
// projection it is a white band welded to the bottom edge of the frame. Left
// out entirely rather than drawn and then ignored.
const OMITTED = new Set(["ATA"]);

// One decimal place on a 1000-unit plate. The board renders around 750 CSS
// pixels wide, so a tenth of a unit is under a tenth of a pixel — precision
// past this is bytes the player cannot see.
function roundCoord(value) {
  return Math.round(value * 10) / 10;
}

// Ramer-Douglas-Peucker, in projected units so the tolerance means the same
// thing everywhere on the plate rather than shrinking with latitude.
//
// 50m source data carries far more vertices than a world board can resolve —
// baked raw it is 1.2 MB of coastline nobody can see. The tolerance is set at
// a fifth of a unit: below the pixel grid at the size this is ever drawn, and
// still fine enough that a fjord reads as a fjord.
const SIMPLIFY_TOLERANCE = 0.2;

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

// Compute absolute shoelace area for a ring (closed polygon)
// Ring is array of [lon, lat] pairs. Returns absolute area in projected units.
function shoelaceArea(ring) {
  if (ring.length < 3) return 0;

  // Project ring to get xy coordinates
  const projected = ring.map(([lon, lat]) => {
    const p = projectPoint(lon, lat);
    return [roundCoord(p.x), roundCoord(p.y)];
  });

  // Shoelace formula: sum((x_i * y_{i+1} - x_{i+1} * y_i))
  let area = 0;
  for (let i = 0; i < projected.length - 1; i++) {
    const x1 = projected[i][0],
      y1 = projected[i][1];
    const x2 = projected[i + 1][0],
      y2 = projected[i + 1][1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

// Split ring at antimeridian crossings (when consecutive lon values differ by > 180°)
// Returns array of subrings, each safe to project without smearing
function splitRingAtAntimeridian(ring) {
  if (ring.length < 3) return [ring]; // Can't split a tiny ring

  const subrings = [];
  let currentSubring = [ring[0]];

  for (let i = 1; i < ring.length; i++) {
    const prevLon = ring[i - 1][0];
    const currLon = ring[i][0];
    const lonDiff = Math.abs(currLon - prevLon);

    if (lonDiff > 180) {
      // Antimeridian crossing: the segment from ring[i-1] to ring[i] is the one
      // that would be drawn straight across the whole map, so it must belong to
      // neither run. Close the current run *before* the crossing point and
      // start the next one *at* it — appending it to the run being closed is
      // what leaves the smear in place.
      if (currentSubring.length >= 3) subrings.push(currentSubring);
      currentSubring = [ring[i]];
    } else {
      currentSubring.push(ring[i]);
    }
  }

  // Add the final subring
  if (currentSubring.length > 2) {
    subrings.push(currentSubring);
  }

  return subrings.length > 0 ? subrings : [ring];
}

// Convert ring (or subring) to SVG path subpath (M x y L x y ... Z)
function ringToPath(ring) {
  if (ring.length < 2) return "";

  const projected = ring.map(([lon, lat]) => {
    const p = projectPoint(lon, lat);
    return [roundCoord(p.x), roundCoord(p.y)];
  });
  // Simplified after projection and rounding, so the tolerance is measured in
  // the units the shape is actually drawn in.
  const kept = simplify(projected, SIMPLIFY_TOLERANCE).map(([x, y]) => `${x} ${y}`);
  if (kept.length < 3) return "";

  return `M ${kept[0]} L ${kept.slice(1).join(" ")} Z`;
}

// Half a plate: anything further from the country's main mass than this got
// there by wrapping, not by being large.
const WRAP_DISTANCE = MAP_WIDTH / 2;

function subpathStats(subpath) {
  const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  let sumX = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const count = Math.floor(numbers.length / 2);
  for (let i = 0; i < count; i++) {
    const x = numbers[i * 2];
    const y = numbers[i * 2 + 1];
    sumX += x;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { meanX: sumX / count, extent: (maxX - minX) * (maxY - minY) };
}

function dropWrappedOutliers(subpaths) {
  if (subpaths.length < 2) return subpaths;
  const stats = subpaths.map(subpathStats);
  let anchor = 0;
  for (let i = 1; i < stats.length; i++) if (stats[i].extent > stats[anchor].extent) anchor = i;
  return subpaths.filter((_, i) => Math.abs(stats[i].meanX - stats[anchor].meanX) < WRAP_DISTANCE);
}

// Process all countries
const countryPaths = {};
let totalDroppedRings = 0;
let totalSplitRings = 0;
const splitCountries = {};
const MIN_AREA = 0.15;

for (const feature of countries.features) {
  if (!feature.id) continue;

  // Map numeric ISO code to alpha-3
  const alpha3 = isoCountries.numericToAlpha3(String(feature.id));
  if (alpha3 && OMITTED.has(alpha3)) continue;
  if (!alpha3) {
    // Skip countries that don't map (should be very rare)
    continue;
  }

  const geom = feature.geometry;
  const subpaths = [];
  let countrySplitCount = 0;

  // Handle both Polygon and MultiPolygon geometries
  const polygons =
    geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;

  for (const polygon of polygons) {
    // polygon[0] is outer ring, polygon[1+] are holes
    for (let i = 0; i < polygon.length; i++) {
      const ring = polygon[i];

      // Split ring at antimeridian crossings
      const subrings = splitRingAtAntimeridian(ring);

      // Track if this ring was split
      if (subrings.length > 1) {
        countrySplitCount += subrings.length - 1;
        totalSplitRings += subrings.length - 1;
      }

      // Process each subring
      for (const subring of subrings) {
        const area = shoelaceArea(subring);

        if (area >= MIN_AREA) {
          const drawn = ringToPath(subring);
          if (drawn) subpaths.push(drawn);
          else totalDroppedRings++;
        } else {
          totalDroppedRings++;
        }
      }
    }
  }

  // Track countries that had splits
  if (countrySplitCount > 0) {
    splitCountries[alpha3] = countrySplitCount;
  }

  // A plate does not wrap, so a country cannot be drawn on both edges of it.
  //
  // At 50m the Aleutians past the antimeridian and Russia's Chukotka overhang
  // survive as specks on the far side of the frame, and every consumer that
  // reasons about a country by its bounding box — the press target on the
  // board, the label placer on the desk map — then sees the United States as a
  // rectangle covering the entire world. The specks are dropped rather than
  // the box being special-cased, because a country appearing at both edges of
  // the plate reads as a rendering fault to a player anyway.
  const kept = dropWrappedOutliers(subpaths);
  totalDroppedRings += subpaths.length - kept.length;
  if (kept.length > 0) {
    countryPaths[alpha3] = kept.join(" ");
  }
}

// Generate TypeScript output file
const outputDir = path.join(root, "packages/world/src/maps");
mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "world-geometry.ts");

// The frame of the projection itself, and the grid inside it. Both are curves
// under Natural Earth I — the meridians bow toward the poles and the poles are
// lines rather than points — so neither can be drawn as a straight rule by the
// component. Baked here for the same reason the coastlines are: one projection,
// one place it is applied.
function polyline(points) {
  const drawn = points.map(([lon, lat]) => {
    const p = projectPoint(lon, lat);
    return `${roundCoord(p.x)} ${roundCoord(p.y)}`;
  });
  return `M ${drawn[0]} L ${drawn.slice(1).join(" ")}`;
}

// Walks `from` to `to` in either direction. The descending case is not a
// nicety: the sphere outline is traced up the -180 meridian, across the north
// pole, *down* the +180 meridian and *back* along the south pole, and a
// `v <= to` loop given a negative step exits before its first iteration. That
// silently baked a sphere with no right edge and no bottom — a half outline
// whose `Z` closed it with a diagonal straight across the Pacific. It went
// unseen for as long as the shape was only ever filled with `ground.sunken`
// over `ground.base`, two colors a hair apart; the moment terrain was clipped
// to it, a third of the world disappeared.
function sampled(from, to, step, at) {
  if (step === 0) throw new Error("sampled() needs a non-zero step");
  const points = [];
  if (step > 0) for (let v = from; v <= to; v += step) points.push(at(v));
  else for (let v = from; v >= to; v += step) points.push(at(v));
  return points;
}

const SPHERE_PATH = `${polyline([
  ...sampled(-90, 90, 2, (lat) => [-180, lat]),
  ...sampled(-180, 180, 2, (lon) => [lon, 90]),
  ...sampled(90, -90, -2, (lat) => [180, lat]),
  ...sampled(180, -180, -2, (lon) => [lon, -90]),
])} Z`;

const GRATICULE_PATHS = [
  ...sampled(-150, 150, 30, (lon) => lon).map((lon) => polyline(sampled(-90, 90, 2, (lat) => [lon, lat]))),
  ...sampled(-60, 60, 30, (lat) => lat).map((lat) => polyline(sampled(-180, 180, 2, (lon) => [lon, lat]))),
];

const tsOutput = `// Generated by scripts/bake-map-geometry.mjs from Natural Earth 50m data via
// world-atlas and topojson-client, projected with Natural Earth I.
// Edit the pnpm bake:map script to change.

export const MAP_VIEWBOX = { width: ${MAP_WIDTH}, height: ${MAP_HEIGHT} } as const;

/** The outline of the projected world: the frame every landmass sits inside. */
export const SPHERE_PATH = ${JSON.stringify(SPHERE_PATH)};

/** Meridians every 30 degrees and parallels every 30, as the projection bends them. */
export const GRATICULE_PATHS: readonly string[] = ${JSON.stringify(GRATICULE_PATHS, null, 2)};

export const COUNTRY_PATHS: Readonly<Record<string, string>> = {
${Object.entries(countryPaths)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([code, path]) => `  ${code}: ${JSON.stringify(path)},`)
  .join("\n")}
};
`;

writeFileSync(outputPath, tsOutput, "utf-8");

// Report stats
const fileSizeKB = (tsOutput.length / 1024).toFixed(2);
const countryCount = Object.keys(countryPaths).length;
const splitCountriesList = Object.entries(splitCountries)
  .sort()
  .map(([code, count]) => `${code}(${count})`)
  .join(", ");

console.log(
  `Generated world map geometry:
  Countries: ${countryCount}
  Dropped rings: ${totalDroppedRings}
  Rings split at antimeridian: ${totalSplitRings}
  Countries with splits: ${splitCountriesList || "none"}
  File size: ${fileSizeKB} KB
  Output: packages/world/src/maps/world-geometry.ts`
);
