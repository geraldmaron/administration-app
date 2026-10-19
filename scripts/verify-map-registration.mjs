#!/usr/bin/env node
// The terrain plate the game ships is in the same projection as the vectors
// drawn over it.
//
// A mismatch here is invisible until someone looks closely, and nothing else
// asserts the two agree. An equirectangular relief under Natural Earth I
// coastlines, borders, graticule lines and pins puts the terrain up to 17 units
// of the 1000-unit plate north of its own coastline — a tenth of the Situation
// Room's frame away from the borders annotating it.
//
// The two projections are distinguishable without decoding a pixel: an
// equirectangular plate is exactly 2:1, and Natural Earth I's is 1000:520.
// Aspect ratio alone is a complete test of which one is on disk.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MAP_HEIGHT, MAP_WIDTH } from "../packages/world/dist/maps/projection.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TERRAIN_PLATE = path.join(root, "assets/player/shaded-relief-ne1.jpg");

// A JPEG's dimensions live in its SOFn frame marker. Reading them here rather
// than shelling out keeps the gate runnable on any machine, including CI images
// with no macOS image tooling.
function jpegSize(file) {
  const buffer = readFileSync(file);
  let offset = 2; // Past SOI.
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    // SOF0..SOF15, excluding the non-frame markers DHT (c4), JPG (c8), DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  throw new Error(`no JPEG frame header in ${file}`);
}

const failures = [];

function checkPlate(file, label) {
  if (!existsSync(file)) {
    failures.push(`${label}: ${path.relative(root, file)} is missing — run \`pnpm bake:terrain\``);
    return;
  }
  const { width, height } = jpegSize(file);
  const aspect = width / height;
  const expected = MAP_WIDTH / MAP_HEIGHT;
  // Half a percent: enough slack for the output height being rounded to whole
  // pixels, nowhere near enough to let an equirectangular 2:1 plate through.
  if (Math.abs(aspect - expected) / expected > 0.005) {
    failures.push(
      `${label}: ${path.relative(root, file)} is ${width}x${height} (aspect ${aspect.toFixed(4)}), ` +
        `but the projection's plate is ${MAP_WIDTH}x${MAP_HEIGHT} (aspect ${expected.toFixed(4)}). ` +
        `${Math.abs(aspect - 2) < 0.005 ? "That is an equirectangular plate — " : ""}` +
        `run \`pnpm bake:terrain\` to reproject it.`,
    );
  }
}

// 1. The baked plate the web player will draw is in the projection's aspect.
checkPlate(TERRAIN_PLATE, "shipped terrain");

// 2. The gate has to actually reject the bug. The unprojected source is kept in
//    the tree as the warp's input, which makes it a free, real, permanently
//    available fixture for the failure this whole check exists to catch.
const source = path.join(root, "assets/player/shaded-relief.jpg");
if (existsSync(source)) {
  const probe = [];
  const saved = failures.splice(0, failures.length);
  checkPlate(source, "probe");
  probe.push(...failures.splice(0, failures.length));
  failures.push(...saved);
  if (probe.length === 0) {
    failures.push(
      "the registration check passed the raw equirectangular source, so it would not " +
        "catch the misregistration it exists to catch",
    );
  }
}

// 3. Nothing still *resolves* the unprojected source at runtime. Matched as a
//    module specifier — quote-terminated — so the bake script and the comments
//    that explain where the plate comes from are free to name it.
let strayUse = [];
try {
  strayUse = execFileSync(
    "git",
    ["grep", "-l", "-e", 'shaded-relief\\.jpg"', "--", "apps", "packages", "services"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
} catch (error) {
  // `git grep` exits 1 on no matches, which is the passing case here. Anything
  // else is a real failure and must not be swallowed into a green gate.
  if (error.status !== 1) throw error;
}
if (strayUse.length > 0) {
  failures.push(
    `these still reference the unprojected plate rather than the baked one: ${strayUse.join(", ")}`,
  );
}

// --- The US state/district plate ------------------------------------------
//
// Vector rather than raster, so the raster-specific check above does not
// apply — there is no JPEG aspect ratio to misread. The equivalent risk here
// is that the states and the districts drawn over them were projected
// separately and do not register, or that shipped code reads the raw vendored
// source directly instead of the baked, simplified output.

const US_GEOMETRY_MODULE = path.join(root, "packages/world/dist/maps/us-geometry.js");

if (!existsSync(US_GEOMETRY_MODULE)) {
  failures.push(`US map geometry: ${path.relative(root, US_GEOMETRY_MODULE)} is missing — run \`pnpm bake:district-map\` then \`pnpm run build\``);
} else {
  const { US_STATE_PATHS, US_DISTRICT_PATHS } = await import(pathToFileURL(US_GEOMETRY_MODULE).href);
  const stateIds = new Set(Object.keys(US_STATE_PATHS));
  if (stateIds.size !== 51) {
    failures.push(`US map geometry: ${stateIds.size} states baked, expected 51 (50 states + DC)`);
  }
  // Every district's state prefix must be a state this same bake also drew —
  // the one check that catches the two sources drifting out of the same
  // projection call and disagreeing about which states exist.
  const orphaned = Object.keys(US_DISTRICT_PATHS)
    .map((id) => id.split("-")[0])
    .filter((state) => !stateIds.has(state));
  if (orphaned.length > 0) {
    failures.push(`US map geometry: districts reference states with no baked outline: ${[...new Set(orphaned)].join(", ")}`);
  }
}

// Nothing outside the bake scripts may read the vendored source directly —
// the same discipline check 3 above runs for the unprojected terrain source,
// applied to the US plate's own raw input.
let strayVendorUse = [];
try {
  strayVendorUse = execFileSync(
    "git",
    ["grep", "-l", "-e", "scripts/vendor/census-", "--", "apps", "packages", "services"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
} catch (error) {
  if (error.status !== 1) throw error;
}
if (strayVendorUse.length > 0) {
  failures.push(`these read the raw vendored US map source instead of the baked plate: ${strayVendorUse.join(", ")}`);
}

if (failures.length > 0) {
  process.stderr.write(`verify-map-registration: ${failures.length} problem(s)\n\n`);
  for (const failure of failures) process.stderr.write(`  ${failure}\n`);
  process.exit(1);
}

process.stdout.write("verify-map-registration: terrain plate is registered to the projection\n");
