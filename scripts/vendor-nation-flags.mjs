#!/usr/bin/env node
// Vendors the real-world nation flag SVGs from lipis/flag-icons (MIT) into
// scripts/vendor/nation-flags/ — a local copy bake-nation-flags.mjs reads
// offline. flag-icons is not an npm dependency of anything that ships; only
// this script touches the network, and only when re-vendoring.
//
// Run this ONLY when re-vendoring: the roster seed gains a government, or
// upstream fixes a flag's artwork. Also writes the code table
// (packages/ui-web/src/assets/flags/nation-flag-codes.generated.ts).
// It needs network access.
//
// Run: node scripts/vendor-nation-flags.mjs

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

// The pinned flag-icons release. Bump deliberately, not on every re-vendor —
// a version bump can redraw a nation's artwork, which is worth reviewing.
const FLAG_ICONS_VERSION = "7.5.0";
const BASE_URL = `https://cdn.jsdelivr.net/npm/flag-icons@${FLAG_ICONS_VERSION}/flags/4x3`;
const LICENSE_URL = `https://cdn.jsdelivr.net/npm/flag-icons@${FLAG_ICONS_VERSION}/LICENSE`;

const outDir = path.join(root, "scripts/vendor/nation-flags");

/**
 * Every roster government's alpha-2 code, from the seed's GeoNames column
 * (Kosovo is XK there, as it is in flag-icons), so a country added to the
 * roster has a flag without anybody extending a list by hand.
 */
function rosterCodes() {
  const lines = readFileSync(path.join(root, "packages/world/src/dataset/seed/nation-identity.tsv"), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"));
  const columns = lines[0].split("\t");
  const iso3 = columns.indexOf("iso3");
  const iso2 = columns.indexOf("iso2");
  return lines.slice(1).map((line) => line.split("\t")).map((cells) => [cells[iso3], cells[iso2].toLowerCase()]).sort(([a], [b]) => a.localeCompare(b));
}

/** The table the web app maps a nation id through to its artwork, written beside it. */
function writeCodeTable(codes) {
  const rows = codes.map(([alpha3, alpha2]) => `  ${alpha3}: ${JSON.stringify(alpha2)},`).join("\n");
  writeFileSync(
    path.join(root, "packages/ui-web/src/assets/flags/nation-flag-codes.generated.ts"),
    `// Written by scripts/vendor-nation-flags.mjs from the roster seed — do not edit by hand.\n\n/** Nation id → the ISO 3166-1 alpha-2 code its artwork is filed under. */\n// prettier-ignore\nexport const NATION_FLAG_ALPHA2: Readonly<Record<string, string>> = {\n${rows}\n};\n`,
  );
}

function fetchText(url) {
  return execSync(`curl -sL --fail ${JSON.stringify(url)}`, { encoding: "utf8" });
}

function main() {
  const table = rosterCodes();
  const codes = table.map(([, alpha2]) => alpha2);
  mkdirSync(outDir, { recursive: true });

  console.log(`Fetching ${codes.length} flag SVGs from flag-icons@${FLAG_ICONS_VERSION} (network required)...`);
  for (const code of codes) {
    const svg = fetchText(`${BASE_URL}/${code}.svg`);
    writeFileSync(path.join(outDir, `${code}.svg`), svg);
  }

  const license = fetchText(LICENSE_URL);
  writeFileSync(path.join(outDir, "LICENSE"), license);
  writeFileSync(
    path.join(outDir, "SOURCE.md"),
    `Vendored from https://github.com/lipis/flag-icons at v${FLAG_ICONS_VERSION} (MIT, see LICENSE).\n` +
      `Re-vendor with \`node scripts/vendor-nation-flags.mjs\`, then rebuild with \`node scripts/bake-nation-flags.mjs\`.\n`,
  );

  writeCodeTable(table);
  console.log(`Vendored ${codes.length} flags into ${path.relative(root, outDir)}.`);
  console.log("Now run: node scripts/bake-nation-flags.mjs");
}

main();
