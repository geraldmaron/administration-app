#!/usr/bin/env node
// Vendors real US state flag SVGs into scripts/vendor/state-flags/ — a local
// copy bake-state-flags.mjs reads offline. Only this script touches the
// network, and only when re-vendoring.
//
// Source: nibsbin/us-state-flags-svg, which re-hosts Wikipedia's own SVG
// tracings of each state's flag. The repo carries no LICENSE file of its own;
// its README states the images were "pulled from public domain on 10/11/2019"
// — consistent with US state flags being government works with no federal
// copyright. Re-vendor only after checking that claim still holds if this
// source is ever swapped.
//
// Run this ONLY when re-vendoring: a state redesigns its flag (Minnesota did
// in 2024, Utah in 2023 — check STATE_ID_TO_WIKI_FILENAME still points at the
// current design first) or STATE_IDS in packages/world/src/schemas/state.ts
// gains an entry. It needs network access.
//
// Run: node scripts/vendor-state-flags.mjs

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

const COMMIT = "master"; // pin to a commit SHA on re-vendor for reproducibility
const BASE_URL = `https://raw.githubusercontent.com/nibsbin/us-state-flags-svg/${COMMIT}/flags`;

const outDir = path.join(root, "scripts/vendor/state-flags");

// Wikipedia's own file-naming quirks: most states are "Flag_of_<Name>.svg",
// but Georgia disambiguates against the country and Colorado's 2024 redesign
// credits its designer in the filename. DC uses "the".
const STATE_ID_TO_WIKI_FILENAME = {
  AL: "Flag_of_Alabama.svg",
  AK: "Flag_of_Alaska.svg",
  AZ: "Flag_of_Arizona.svg",
  AR: "Flag_of_Arkansas.svg",
  CA: "Flag_of_California.svg",
  CO: "Flag_of_Colorado_designed_by_Andrew_Carlisle_Carson.svg",
  CT: "Flag_of_Connecticut.svg",
  DE: "Flag_of_Delaware.svg",
  DC: "Flag_of_the_District_of_Columbia.svg",
  FL: "Flag_of_Florida.svg",
  GA: "Flag_of_Georgia_(U.S._state).svg",
  HI: "Flag_of_Hawaii.svg",
  ID: "Flag_of_Idaho.svg",
  IL: "Flag_of_Illinois.svg",
  IN: "Flag_of_Indiana.svg",
  IA: "Flag_of_Iowa.svg",
  KS: "Flag_of_Kansas.svg",
  KY: "Flag_of_Kentucky.svg",
  LA: "Flag_of_Louisiana.svg",
  ME: "Flag_of_Maine.svg",
  MD: "Flag_of_Maryland.svg",
  MA: "Flag_of_Massachusetts.svg",
  MI: "Flag_of_Michigan.svg",
  MN: "Flag_of_Minnesota.svg",
  MS: "Flag_of_Mississippi.svg",
  MO: "Flag_of_Missouri.svg",
  MT: "Flag_of_Montana.svg",
  NE: "Flag_of_Nebraska.svg",
  NV: "Flag_of_Nevada.svg",
  NH: "Flag_of_New_Hampshire.svg",
  NJ: "Flag_of_New_Jersey.svg",
  NM: "Flag_of_New_Mexico.svg",
  NY: "Flag_of_New_York.svg",
  NC: "Flag_of_North_Carolina.svg",
  ND: "Flag_of_North_Dakota.svg",
  OH: "Flag_of_Ohio.svg",
  OK: "Flag_of_Oklahoma.svg",
  OR: "Flag_of_Oregon.svg",
  PA: "Flag_of_Pennsylvania.svg",
  RI: "Flag_of_Rhode_Island.svg",
  SC: "Flag_of_South_Carolina.svg",
  SD: "Flag_of_South_Dakota.svg",
  TN: "Flag_of_Tennessee.svg",
  TX: "Flag_of_Texas.svg",
  UT: "Flag_of_Utah.svg",
  VT: "Flag_of_Vermont.svg",
  VA: "Flag_of_Virginia.svg",
  WA: "Flag_of_Washington.svg",
  WV: "Flag_of_West_Virginia.svg",
  WI: "Flag_of_Wisconsin.svg",
  WY: "Flag_of_Wyoming.svg",
};

function fetchText(url) {
  return execSync(`curl -sL --fail ${JSON.stringify(url)}`, { encoding: "utf8" });
}

function main() {
  mkdirSync(outDir, { recursive: true });

  const ids = Object.keys(STATE_ID_TO_WIKI_FILENAME).sort();
  console.log(`Fetching ${ids.length} state flag SVGs (network required)...`);
  for (const id of ids) {
    const url = `${BASE_URL}/${encodeURIComponent(STATE_ID_TO_WIKI_FILENAME[id]).replace(/%2F/g, "/")}`;
    const svg = fetchText(url);
    writeFileSync(path.join(outDir, `${id}.svg`), svg);
  }

  writeFileSync(
    path.join(outDir, "SOURCE.md"),
    `Vendored from https://github.com/nibsbin/us-state-flags-svg (${COMMIT}), which re-hosts\n` +
      `Wikipedia's SVG tracings of each state flag. That repo carries no LICENSE file; its README\n` +
      `states the images were pulled from public domain sources on 10/11/2019 — consistent with US\n` +
      `state flags being government works with no federal copyright.\n\n` +
      `Re-vendor with \`node scripts/vendor-state-flags.mjs\`, then rebuild with \`node scripts/bake-state-flags.mjs\`.\n`,
  );

  console.log(`Vendored ${ids.length} state flags into ${path.relative(root, outDir)}.`);
  console.log("Now run: node scripts/bake-state-flags.mjs");
}

main();
