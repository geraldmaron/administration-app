#!/usr/bin/env node
// Bakes the GL map's terrain: the Natural Earth shaded relief the Canvas map
// lit its land with (apps/web/src/map/data/relief.jpg, GRAY_50M_SR_W,
// equirectangular, 4096×2048, public domain) as Web Mercator raster tiles,
// zoom 0 to 4, under apps/web/public/map/relief/{z}/{x}/{y}.png.
//
// Each tile holds only the plate's local detail, the same reading relief.ts
// takes: a pixel against the mean around it. Flat ground of any brightness,
// and the sea, come out fully transparent; a shadow is black and a lit slope
// white, each as opaque as the slope is steep. Drawn over the lens colors the
// tiles shade the land without graying it, and the sea stays the sea. Zoom 4
// is the plate's own resolution; MapLibre overzooms past it.
//
// The game runs offline, so the tiles ship with the build; nothing is fetched
// from a tile host. Decoding goes through `sips` (macOS), as the other map
// bake does; the output is pngjs.
//
//   node scripts/bake-map-relief-tiles.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "apps/web/src/map/data/relief.jpg");
const OUTPUT = path.join(root, "apps/web/public/map/relief");
const MAX_ZOOM = 4;
const TILE = 256;
/** How hard local detail is pushed: the plate's ridges span about ±20 levels around their neighborhood. */
const GAIN = 6;
/** The neighborhood, in a level's own pixels, whose mean counts as flat ground. */
const DETAIL_RADIUS = 5;
/** Detail below this many levels is flat: noise in the plate, not terrain. */
const FLOOR = 3;

function decode(jpegPath) {
  const work = mkdtempSync(path.join(tmpdir(), "relief-tiles-"));
  try {
    const pngPath = path.join(work, "relief.png");
    execFileSync("sips", ["-s", "format", "png", jpegPath, "--out", pngPath], { stdio: "pipe" });
    const png = PNG.sync.read(readFileSync(pngPath));
    const shade = new Float32Array(png.width * png.height);
    for (let i = 0; i < shade.length; i++) shade[i] = png.data[i * 4];
    return { width: png.width, height: png.height, shade };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function halve(level) {
  const width = level.width >> 1;
  const height = level.height >> 1;
  const shade = new Float32Array(width * height);
  const at = (x, y) => level.shade[y * level.width + x];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) shade[y * width + x] = (at(2 * x, 2 * y) + at(2 * x + 1, 2 * y) + at(2 * x, 2 * y + 1) + at(2 * x + 1, 2 * y + 1)) / 4;
  }
  return { width, height, shade };
}

function blurAxis(src, width, height, horizontal) {
  const out = new Float32Array(src.length);
  const span = DETAIL_RADIUS * 2 + 1;
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  // Longitude wraps; latitude repeats its edge row.
  const clampOrWrap = (i) => (horizontal ? ((i % length) + length) % length : Math.min(length - 1, Math.max(0, i)));
  const index = (line, i) => (horizontal ? line * width + i : i * width + line);
  for (let line = 0; line < lines; line++) {
    let sum = 0;
    for (let i = -DETAIL_RADIUS; i <= DETAIL_RADIUS; i++) sum += src[index(line, clampOrWrap(i))];
    for (let i = 0; i < length; i++) {
      out[index(line, i)] = sum / span;
      sum += src[index(line, clampOrWrap(i + DETAIL_RADIUS + 1))] - src[index(line, clampOrWrap(i - DETAIL_RADIUS))];
    }
  }
  return out;
}

/** A level's detail: each pixel against its neighborhood's mean, in levels. */
function detail(level) {
  const smooth = blurAxis(blurAxis(level.shade, level.width, level.height, true), level.width, level.height, false);
  const shade = level.shade.map((value, i) => value - smooth[i]);
  return { ...level, shade };
}

function sample(level, lon, lat) {
  const u = ((((lon + 180) % 360) + 360) % 360) / 360 * level.width - 0.5;
  const v = ((90 - lat) / 180) * level.height - 0.5;
  const x0 = Math.floor(u);
  const y0 = Math.max(0, Math.min(level.height - 2, Math.floor(v)));
  const fx = u - x0;
  const fy = Math.min(1, Math.max(0, v - y0));
  const xa = ((x0 % level.width) + level.width) % level.width;
  const xb = (xa + 1) % level.width;
  const at = (x, y) => level.shade[y * level.width + x];
  const top = at(xa, y0) * (1 - fx) + at(xb, y0) * fx;
  const bottom = at(xa, y0 + 1) * (1 - fx) + at(xb, y0 + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

function tile(level, z, x, y) {
  const png = new PNG({ width: TILE, height: TILE, colorType: 6 });
  const world = TILE * 2 ** z;
  for (let py = 0; py < TILE; py++) {
    const my = (y * TILE + py + 0.5) / world;
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * my))) * 180) / Math.PI;
    for (let px = 0; px < TILE; px++) {
      const lon = ((x * TILE + px + 0.5) / world) * 360 - 180;
      const d = sample(level, lon, lat);
      const strength = Math.max(0, Math.abs(d) - FLOOR) * GAIN;
      const i = (py * TILE + px) * 4;
      const tone = d < 0 ? 0 : 255;
      png.data[i] = tone;
      png.data[i + 1] = tone;
      png.data[i + 2] = tone;
      // Lit slopes read lighter than shadows read dark at equal strength, so they are held back.
      png.data[i + 3] = Math.min(255, Math.round(d < 0 ? strength : strength * 0.6));
    }
  }
  return PNG.sync.write(png, { colorType: 6, deflateLevel: 9 });
}

function main() {
  const plate = decode(SOURCE);
  // Level k is the plate halved k times; zoom z wants a world 256·2^z pixels wide.
  const levels = [plate];
  while (levels.length <= MAX_ZOOM) levels.push(halve(levels[levels.length - 1]));
  const details = levels.map(detail);
  rmSync(OUTPUT, { recursive: true, force: true });
  let bytes = 0;
  let count = 0;
  for (let z = 0; z <= MAX_ZOOM; z++) {
    const level = details[Math.min(details.length - 1, Math.max(0, Math.round(Math.log2(plate.width / (TILE * 2 ** z)))))];
    for (let x = 0; x < 2 ** z; x++) {
      mkdirSync(path.join(OUTPUT, String(z), String(x)), { recursive: true });
      for (let y = 0; y < 2 ** z; y++) {
        const data = tile(level, z, x, y);
        writeFileSync(path.join(OUTPUT, String(z), String(x), `${y}.png`), data);
        bytes += data.length;
        count++;
      }
    }
  }
  console.log(`bake-map-relief-tiles: ${count} tiles, ${(bytes / 1024 / 1024).toFixed(2)} MB, zoom 0 to ${MAX_ZOOM}, in ${path.relative(root, OUTPUT)}`);
}

main();
