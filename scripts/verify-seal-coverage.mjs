#!/usr/bin/env node
/**
 * Seal coverage (DECISIONS §8.10). Every institution, intelligence element,
 * international organization, founding cradle and outlet the player meets
 * carries an authored emblem, and every emblem names only devices and colors
 * the design system can draw:
 *
 *   - each id in the engine's institution catalog, the intelligence
 *     community, the world's organizations and cradles, and the press roster
 *     resolves to an authored seal (player-core/src/seals), not the generic one
 *   - each spec's device and charge are in DEVICE_IDS, each color in SEAL_COLORS
 *   - DEVICE_IDS equals the drawn device set (ui/src/seals/devices), every
 *     drawing but the lettered one has path data, and a charge sits only on a
 *     device that marks where it goes
 *   - SEAL_COLORS equals the palette (ui/src/theme/seal-palette.ts)
 *
 * The registry and the drawings are dependency-free TypeScript, so they are
 * bundled and read as values; the rosters are read from source.
 * `node scripts/verify-seal-coverage.mjs <root>` checks another tree; the
 * proof twin uses that to show the gate can fail.
 */
import { build } from "esbuild";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const at = (...parts) => path.join(root, ...parts);
const failures = [];

async function load(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

function idsIn(file, pattern) {
  const full = at(file);
  if (!existsSync(full)) {
    failures.push(`${file} is missing, so its ids cannot be checked.`);
    return [];
  }
  return [...readFileSync(full, "utf8").matchAll(pattern)].map((m) => m[1]);
}

function paletteKeys() {
  const source = readFileSync(at("packages/ui/src/theme/seal-palette.ts"), "utf8");
  const block = source.slice(source.indexOf("SEAL_PALETTE = {"), source.indexOf("} as const"));
  return [...block.matchAll(/^\s+([A-Za-z]+):/gm)].map((m) => m[1]);
}

function sameSet(label, a, b, aName, bName) {
  const [left, right] = [new Set(a), new Set(b)];
  for (const x of left) if (!right.has(x)) failures.push(`${label} "${x}" is in ${aName} but not ${bName}.`);
  for (const x of right) if (!left.has(x)) failures.push(`${label} "${x}" is in ${bName} but not ${aName}.`);
}

const registry = await load(at("packages/player-core/src/seals/index.ts"));
const { DEVICES } = await load(at("packages/ui/src/seals/devices/index.ts"));

const bodies = [
  ...idsIn("packages/engine/src/institution-catalog.ts", /"(INST-[A-Z0-9-]+)"/g),
  ...idsIn("packages/engine/src/ic-elements.ts", /id: "(IC-[A-Z0-9-]+)"/g),
  ...idsIn("packages/world/src/dataset/orgs-cradles.ts", /= "((?:ORG|CRADLE)-[A-Z0-9-]+)" as/g),
  ...idsIn("packages/engine/src/press-outlets.ts", /id: "(outlet-[a-z0-9-]+)"/g),
  "INST-CIRCUIT-FIRST-SEAT-1",
];
const uncovered = [...new Set(bodies)].filter((id) => !registry.hasAuthoredSeal(id));
for (const id of uncovered) failures.push(`${id} has no authored seal; it would show the generic emblem.`);

sameSet("Device", registry.DEVICE_IDS, Object.keys(DEVICES), "player-core DEVICE_IDS", "the ui device drawings");
sameSet("Color", registry.SEAL_COLORS, paletteKeys(), "player-core SEAL_COLORS", "the seal palette");
for (const [id, drawing] of Object.entries(DEVICES)) {
  if (id !== "monogram" && !(drawing.parts?.length > 0)) failures.push(`Device "${id}" has no path data.`);
}

const devices = new Set(registry.DEVICE_IDS);
const colors = new Set(registry.SEAL_COLORS);
for (const spec of Object.values(registry.SEALS)) {
  for (const device of [spec.device, spec.charge?.device].filter(Boolean)) {
    if (!devices.has(device)) failures.push(`${spec.id} names undefined device "${device}".`);
  }
  if (spec.charge && !DEVICES[spec.device]?.charge) failures.push(`${spec.id} bears a charge on "${spec.device}", which marks no place for one.`);
  if (spec.device === "monogram" && !spec.monogram) failures.push(`${spec.id} is lettered but has no monogram.`);
  for (const color of [spec.field, spec.rim, spec.deviceColor, spec.ring?.color, spec.charge?.color, spec.charge?.field].filter(Boolean)) {
    if (!colors.has(color)) failures.push(`${spec.id} names undefined color "${color}".`);
  }
}

if (failures.length) {
  console.error(`verify-seal-coverage: ${failures.length} problem(s).\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
const covered = new Set(bodies).size;
console.log(`verify-seal-coverage: ${covered}/${covered} bodies carry an authored seal (100%); ${Object.keys(registry.SEALS).length} specs, ${Object.keys(DEVICES).length} devices, ${colors.size} colors, all consistent.`);
