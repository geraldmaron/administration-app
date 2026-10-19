#!/usr/bin/env node
// Bakes each government's first-level divisions (provinces, regions, states,
// oblasts) from Natural Earth's admin-1 table (public domain) into one small
// file per government under apps/web/src/map/data/provinces/. The map draws a
// selected government's inner lines and names its divisions from these; the
// game keeps no data per province, so they are geography, never a region the
// map picks or a lens colors.
//
// The United States is left out: its states and districts are their own layers.
//
// Run this ONLY when re-vendoring (a new Natural Earth release). It needs
// network access, curl and unzip, unless --from points at an unzipped copy.
// Run after `pnpm run build` (the roster is read from packages/world/dist):
//   node scripts/bake-map-provinces.mjs [--from <dir with the .shp and .dbf>]

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoBounds } from "d3-geo";
import { open } from "shapefile";
import { topology } from "topojson-server";
import { mesh } from "topojson-client";
import { worldNations } from "../packages/world/dist/index.js";
import { TERRITORY_ADMINISTRATOR } from "../packages/world/dist/maps/territories.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const URL = "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip";
const BASE = "ne_10m_admin_1_states_provinces";
const OUT_DIR = path.join(root, "apps/web/src/map/data/provinces");

const ROSTER = new Set(worldNations.map((nation) => nation.id));
// Natural Earth's own codes where they are not the ISO code the roster uses.
const ALIAS = { KOS: "XKX", SDS: "SSD", PSX: "PSE", ALD: "FIN", SAH: "MAR" };
const SKIP = new Set(["USA", "ATA"]);

/** Degrees per stored unit: about 110m, finer than a pixel at the closest country zoom. */
const GRID = 1e-3;

function government(code) {
  const id = ALIAS[code] ?? code;
  if (SKIP.has(id)) return null;
  if (ROSTER.has(id)) return id;
  const administrator = TERRITORY_ADMINISTRATOR[id];
  return administrator && ROSTER.has(administrator) && !SKIP.has(administrator) ? administrator : null;
}

const clean = (value) => (typeof value === "string" ? value.replace(/\0+$/, "").trim() : value);

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
  if (points.length < 3) return points;
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

/** A line as integers on the grid, first point absolute and the rest as steps, repeated points dropped. */
function encode(line) {
  const grid = line.map(([x, y]) => [Math.round(x / GRID), Math.round(y / GRID)]);
  const out = [];
  let previous = null;
  for (const [x, y] of grid) {
    if (previous && previous[0] === x && previous[1] === y) continue;
    out.push(previous ? x - previous[0] : x, previous ? y - previous[1] : y);
    previous = [x, y];
  }
  return out.length >= 4 ? out : null;
}

// Simplify against the government's size: Russia keeps fewer corners per
// degree than Belgium, because it is never drawn as large.
function toleranceFor(bounds) {
  const span = Math.max(bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]);
  return Math.min(0.03, Math.max(0.003, span / 500));
}

function bake(features) {
  const collection = { type: "FeatureCollection", features };
  const bounds = geoBounds(collection);
  const topo = topology({ p: collection }, 1e6);
  const inner = mesh(topo, topo.objects.p, (a, b) => a !== b);
  const tolerance = toleranceFor(bounds);
  const lines = inner.coordinates.map((line) => encode(douglasPeucker(line, tolerance))).filter(Boolean);
  const names = features
    .map((f) => {
      const p = f.properties;
      const name = clean(p.name_en) || clean(p.name);
      if (!name || !Number.isFinite(p.longitude) || !Number.isFinite(p.latitude)) return null;
      const [[w, s], [e, n]] = geoBounds(f);
      const round = (v) => Math.round(v * 1000) / 1000;
      return { n: name, l: [round(p.longitude), round(p.latitude)], a: Math.round(p.area_sqkm ?? 0), b: [w, s, e, n].map(round) };
    })
    .filter(Boolean)
    .sort((a, b) => b.a - a.a);
  return { lines, names };
}

async function readFeatures(dir) {
  const source = await open(path.join(dir, `${BASE}.shp`), path.join(dir, `${BASE}.dbf`), { encoding: "utf-8" });
  const byGovernment = new Map();
  for (;;) {
    const row = await source.read();
    if (row.done) break;
    const id = government(clean(row.value.properties.adm0_a3));
    if (!id || !row.value.geometry) continue;
    const list = byGovernment.get(id) ?? [];
    list.push(row.value);
    byGovernment.set(id, list);
  }
  return byGovernment;
}

function download() {
  const dir = mkdtempSync(path.join(tmpdir(), "ne-admin1-"));
  const zip = path.join(dir, "admin1.zip");
  execFileSync("curl", ["-sSfL", "-o", zip, URL]);
  execFileSync("unzip", ["-q", "-o", zip, "-d", dir]);
  return dir;
}

const fromIndex = process.argv.indexOf("--from");
const from = fromIndex > 0 ? process.argv[fromIndex + 1] : undefined;
const dir = from ?? download();
try {
  const byGovernment = await readFeatures(dir);
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  let total = 0;
  for (const [id, features] of [...byGovernment].sort(([a], [b]) => a.localeCompare(b))) {
    // One division is the country itself: nothing to draw inside it.
    if (features.length < 2) continue;
    const set = bake(features);
    // Islands with no shared border between their divisions have no inner line to draw.
    if (set.lines.length === 0 || set.names.length < 2) continue;
    const json = JSON.stringify(set);
    writeFileSync(path.join(OUT_DIR, `${id}.json`), json + "\n");
    total += json.length;
  }
  const files = readdirSync(OUT_DIR).length;
  console.log(`provinces: ${files} governments, ${(total / 1024).toFixed(0)} KB`);
} finally {
  if (!from) rmSync(dir, { recursive: true, force: true });
}
