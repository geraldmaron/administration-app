#!/usr/bin/env node
/**
 * Proves verify-seal-coverage can fail: copies the seal registry, the device
 * drawings, the palette and the rosters into a scratch tree, plants one
 * violation per copy, requires the gate to reject every one, then requires it
 * to pass an unplanted copy and the real tree.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..");
const gate = path.join(here, "verify-seal-coverage.mjs");

const COPIED = [
  "packages/player-core/src/seals",
  "packages/ui/src/seals",
  "packages/ui/src/theme/seal-palette.ts",
  "packages/engine/src/institution-catalog.ts",
  "packages/engine/src/ic-elements.ts",
  "packages/engine/src/press-outlets.ts",
  "packages/world/src/dataset/orgs-cradles.ts",
];

/** [what is planted, file, text replaced, replacement] */
const PLANTS = [
  ["an outlet with no seal", "packages/engine/src/press-outlets.ts", 'id: "outlet-midland-dispatch",', 'id: "outlet-midland-dispatch",\n      id: "outlet-planted-gazette",'],
  ["an institution with no seal", "packages/engine/src/institution-catalog.ts", 'id: "INST-CONGRESS",', 'id: "INST-PLANTED-BOARD",'],
  ["a spec naming an undrawn device", "packages/player-core/src/seals/registry/outlets.ts", '"lighthouse", PRINT', '"telescope", PRINT'],
  ["a spec naming an unknown color", "packages/player-core/src/seals/registry/outlets.ts", '["teal", "white", "white"], "wave"', '["teal", "chartreuse", "white"], "wave"'],
  ["a device with no path data", "packages/ui/src/seals/devices/science.ts", 'export const DROP: DeviceDrawing = {\n  parts: [', 'export const DROP: DeviceDrawing = {\n  parts: [] ?? ['],
  ["a device id nothing draws", "packages/player-core/src/seals/devices.ts", '"monogram",\n] as const;', '"monogram",\n  "phoenix",\n] as const;'],
  ["a palette color the registry does not know", "packages/ui/src/theme/seal-palette.ts", "  black:", '  chartreuse: "#7FFF00",\n  black:'],
  ["a charge on a device with no place for one", "packages/player-core/src/seals/registry/agencies.ts", '"wheat", `COMMODITY FUTURES TRADING COMMISSION · ${USA}`)', '"wheat", `COMMODITY FUTURES TRADING COMMISSION · ${USA}`, { charge: { device: "key", color: "gold" } })'],
];

function scratchTree() {
  const dir = mkdtempSync(path.join(tmpdir(), "seal-coverage-"));
  for (const rel of COPIED) cpSync(path.join(repo, rel), path.join(dir, rel), { recursive: true });
  return dir;
}

function passes(root) {
  try {
    execFileSync("node", [gate, root], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

let failed = false;
for (const [what, file, from, to] of PLANTS) {
  const dir = scratchTree();
  try {
    const full = path.join(dir, file);
    const source = readFileSync(full, "utf8");
    if (!source.includes(from)) {
      failed = true;
      console.error(`verify-seal-coverage-proof: could not plant ${what}; "${from.slice(0, 40)}" is no longer in ${file}.`);
      continue;
    }
    writeFileSync(full, source.replace(from, to));
    if (passes(dir)) {
      failed = true;
      console.error(`verify-seal-coverage-proof: the gate passed ${what} (${file}).`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const clean = scratchTree();
try {
  if (!passes(clean)) {
    failed = true;
    console.error("verify-seal-coverage-proof: the gate refused an unplanted copy of the tree.");
  }
} finally {
  rmSync(clean, { recursive: true, force: true });
}
if (failed) process.exit(1);
execFileSync("node", [gate], { stdio: "inherit" });
console.log(`verify-seal-coverage-proof: all ${PLANTS.length} planted violations are refused and the real tree passes.`);
