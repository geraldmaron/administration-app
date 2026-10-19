#!/usr/bin/env node
// Warps the equirectangular shaded-relief plate into Natural Earth I, so the
// terrain lands under the coastlines drawn over it.
//
// The source relief (Natural Earth GRAY_50M_SR_W) is equirectangular: longitude
// and latitude straight onto x and y. Every vector on top of it — coastlines,
// borders, the graticule, the sphere edge, and every pin the game drops — is
// Natural Earth I. Drawing one on the other misregisters the map by up to 17
// units of the 1000-unit plate vertically and 78 horizontally near Alaska,
// which at the Situation Room's zoom is a tenth of the visible frame: the
// coastline is drawn out at sea. Reprojecting once here is what makes the
// terrain and the borders the same map.
//
// The warp is one source row per output row. Natural Earth I's y depends only
// on latitude, and its x is exactly linear in longitude for a fixed latitude
// (x = lambda * f(phi)), so each output row is a horizontal resample of a
// single source row. No 2D resampling, no approximation.
//
// Decoding goes through `sips` because the source and the shipped output are
// both JPEG and pngjs speaks only PNG. Both are on any machine that can build
// this app: sips ships with macOS and CI runs the bake only when the source
// asset changes.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { MAP_HEIGHT, MAP_WIDTH, naturalEarth } from "../packages/world/dist/maps/projection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

const SOURCE = path.join(root, "assets/player/shaded-relief.jpg");
const OUTPUT = path.join(root, "assets/player/shaded-relief-ne1.jpg");

// The output plate keeps the source's horizontal resolution: the Situation Room
// zooms to ~4% of the plate width, so every pixel dropped here is a pixel of
// blur on the one screen that looks at the terrain closely.
const OUT_WIDTH = 8192;
const OUT_HEIGHT = Math.round((OUT_WIDTH * MAP_HEIGHT) / MAP_WIDTH);

// What is not the world. The vector layer draws `ground.base` outside the
// sphere too, so the plate's corners disappear into the card instead of
// reading as black bars — and the component still clips to the sphere path,
// which is what actually hides JPEG ringing along that edge.
const OUTSIDE = 0x08;

const EQUATOR_HALF_WIDTH = Math.PI * 0.8707;
const SCALE = MAP_WIDTH / (2 * EQUATOR_HALF_WIDTH);

/**
 * Latitude in radians whose Natural Earth I y equals `target` (projection
 * units, north positive). The forward polynomial is monotonic in phi over the
 * whole domain, so bisection converges without needing its derivative.
 */
function inverseLatitude(target) {
  let lo = -Math.PI / 2;
  let hi = Math.PI / 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (naturalEarth(0, (mid * 180) / Math.PI).y < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The x-per-radian-of-longitude factor at a latitude — Natural Earth I's f(phi). */
function longitudeScale(latDeg) {
  // x is exactly lambda * f(phi), so f falls straight out of a unit lambda.
  return naturalEarth((180 / Math.PI) * 1, latDeg).x;
}

function decodeToPng(jpegPath, workDir) {
  const pngPath = path.join(workDir, "source.png");
  execFileSync("sips", ["-s", "format", "png", jpegPath, "--out", pngPath], { stdio: "pipe" });
  return PNG.sync.read(readFileSync(pngPath));
}

function encodeToJpeg(png, jpegPath, workDir) {
  const pngPath = path.join(workDir, "out.png");
  writeFileSync(pngPath, PNG.sync.write(png));
  execFileSync(
    "sips",
    ["-s", "format", "jpeg", "-s", "formatOptions", "72", pngPath, "--out", jpegPath],
    { stdio: "pipe" },
  );
}

function main() {
  const workDir = mkdtempSync(path.join(tmpdir(), "bake-terrain-"));
  try {
    process.stdout.write(`Reading ${path.relative(root, SOURCE)}\n`);
    const source = decodeToPng(SOURCE, workDir);
    const { width: srcW, height: srcH } = source;
    process.stdout.write(`  ${srcW}x${srcH} equirectangular\n`);

    const out = new PNG({ width: OUT_WIDTH, height: OUT_HEIGHT });

    for (let y = 0; y < OUT_HEIGHT; y++) {
      // The output row's latitude, through the projection's own inverse.
      const plateY = ((y + 0.5) / OUT_HEIGHT) * MAP_HEIGHT;
      const phi = inverseLatitude((MAP_HEIGHT / 2 - plateY) / SCALE);
      const latDeg = (phi * 180) / Math.PI;

      // The one source row this whole output row is resampled from.
      const srcY = Math.min(srcH - 1, Math.max(0, ((90 - latDeg) / 180) * srcH - 0.5));
      const y0 = Math.floor(srcY);
      const y1 = Math.min(srcH - 1, y0 + 1);
      const fy = srcY - y0;

      const perRadian = longitudeScale(latDeg) * SCALE;
      const outRow = y * OUT_WIDTH * 4;

      for (let x = 0; x < OUT_WIDTH; x++) {
        const idx = outRow + x * 4;
        const plateX = ((x + 0.5) / OUT_WIDTH) * MAP_WIDTH;
        // Invert x = MAP_WIDTH/2 + lambda * f(phi) * SCALE for lambda.
        const lonDeg = (((plateX - MAP_WIDTH / 2) / perRadian) * 180) / Math.PI;

        if (lonDeg < -180 || lonDeg > 180) {
          out.data[idx] = OUTSIDE;
          out.data[idx + 1] = OUTSIDE;
          out.data[idx + 2] = 0x0a;
          out.data[idx + 3] = 255;
          continue;
        }

        const srcX = Math.min(srcW - 1, Math.max(0, ((lonDeg + 180) / 360) * srcW - 0.5));
        const x0 = Math.floor(srcX);
        const x1 = Math.min(srcW - 1, x0 + 1);
        const fx = srcX - x0;

        for (let channel = 0; channel < 3; channel++) {
          const a = source.data[(y0 * srcW + x0) * 4 + channel];
          const b = source.data[(y0 * srcW + x1) * 4 + channel];
          const c = source.data[(y1 * srcW + x0) * 4 + channel];
          const d = source.data[(y1 * srcW + x1) * 4 + channel];
          const top = a + (b - a) * fx;
          const bottom = c + (d - c) * fx;
          out.data[idx + channel] = Math.round(top + (bottom - top) * fy);
        }
        out.data[idx + 3] = 255;
      }

      if (y % 400 === 0) process.stdout.write(`  row ${y}/${OUT_HEIGHT}\n`);
    }

    process.stdout.write(`Writing ${path.relative(root, OUTPUT)}\n`);
    encodeToJpeg(out, OUTPUT, workDir);
    const size = statSync(OUTPUT).size;
    process.stdout.write(`  ${OUT_WIDTH}x${OUT_HEIGHT} Natural Earth I, ${(size / 1024 / 1024).toFixed(2)} MB\n`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main();
