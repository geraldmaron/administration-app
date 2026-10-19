#!/usr/bin/env node
// Fetches and vendors the Census Bureau's cartographic boundary files for US
// states and congressional districts into scripts/vendor/ — a filtered
// (50 states + DC only), TopoJSON-compacted local copy that
// bake-district-map.mjs reads offline.
//
// Run this ONLY when re-vendoring: a new redistricting cycle (the next one is
// due after the 2030 Census), or a Census revision to the current boundaries.
// It needs network access and the system `unzip` (present on macOS and most
// Linux) and the `shapefile` npm package (a devDependency used only here —
// nothing else in the repo parses a shapefile).
//
// Run: node scripts/vendor-district-map-source.mjs

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as shapefile from "shapefile";
import { topology } from "topojson-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

// The current vintage. Update both when re-vendoring for a new cycle — the
// filenames baked below are stamped with this vintage so a stale copy cannot
// be silently mistaken for a fresh one.
const CENSUS_YEAR = "2023";
const CONGRESS = "118"; // the session whose district lines are current

const STATE_ZIP_URL = `https://www2.census.gov/geo/tiger/GENZ${CENSUS_YEAR}/shp/cb_${CENSUS_YEAR}_us_state_500k.zip`;
const DISTRICT_ZIP_URL = `https://www2.census.gov/geo/tiger/GENZ${CENSUS_YEAR}/shp/cb_${CENSUS_YEAR}_us_cd${CONGRESS}_500k.zip`;

const STATEFP_TO_ID = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
  "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
  "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
  "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY",
};

const scratch = mkdtempSync(path.join(tmpdir(), "district-vendor-"));

function fetchAndExtract(url, label) {
  const zipPath = path.join(scratch, `${label}.zip`);
  execSync(`curl -sL ${JSON.stringify(url)} -o ${JSON.stringify(zipPath)}`, { stdio: "inherit" });
  const dir = path.join(scratch, label);
  execSync(`unzip -o -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(dir)}`, { stdio: "inherit" });
  return dir;
}

async function readFeatures(shp, dbf) {
  const source = await shapefile.open(shp, dbf);
  const out = [];
  let r;
  while (!(r = await source.read()).done) out.push(r.value);
  return out;
}

function districtId(stateId, cdCode) {
  const num = parseInt(cdCode, 10);
  if (stateId === "DC") return "DC-DL";
  return num === 0 ? `${stateId}-AL` : `${stateId}-${String(num).padStart(2, "0")}`;
}

async function main() {
  console.log(`Fetching Census ${CENSUS_YEAR} cartographic boundary files (network required)...`);
  const stateDir = fetchAndExtract(STATE_ZIP_URL, "state");
  const districtDir = fetchAndExtract(DISTRICT_ZIP_URL, "district");

  const stateFeatures = await readFeatures(
    path.join(stateDir, `cb_${CENSUS_YEAR}_us_state_500k.shp`),
    path.join(stateDir, `cb_${CENSUS_YEAR}_us_state_500k.dbf`),
  );
  const stateKept = stateFeatures.filter((f) => STATEFP_TO_ID[f.properties.STATEFP]);
  stateKept.forEach((f) => {
    f.properties = { id: STATEFP_TO_ID[f.properties.STATEFP] };
  });
  const stateTopo = topology({ states: { type: "FeatureCollection", features: stateKept } }, 1e5);
  const stateOut = path.join(root, "scripts/vendor", `census-states-${CENSUS_YEAR}-500k.topo.json`);
  writeFileSync(stateOut, JSON.stringify(stateTopo));

  const districtFeatures = await readFeatures(
    path.join(districtDir, `cb_${CENSUS_YEAR}_us_cd${CONGRESS}_500k.shp`),
    path.join(districtDir, `cb_${CENSUS_YEAR}_us_cd${CONGRESS}_500k.dbf`),
  );
  const districtKept = districtFeatures.filter((f) => STATEFP_TO_ID[f.properties.STATEFP]);
  districtKept.forEach((f) => {
    const stateId = STATEFP_TO_ID[f.properties.STATEFP];
    f.properties = { id: districtId(stateId, f.properties[`CD${CONGRESS}FP`]) };
  });
  const districtTopo = topology({ districts: { type: "FeatureCollection", features: districtKept } }, 1e5);
  const districtOut = path.join(root, "scripts/vendor", `census-districts-${CONGRESS}-${CENSUS_YEAR}-500k.topo.json`);
  writeFileSync(districtOut, JSON.stringify(districtTopo));

  rmSync(scratch, { recursive: true, force: true });

  console.log(
    `Vendored:\n` +
      `  ${path.relative(root, stateOut)} — ${stateKept.length} states\n` +
      `  ${path.relative(root, districtOut)} — ${districtKept.length} districts\n` +
      `Now update STATE_SOURCE / DISTRICT_SOURCE in bake-district-map.mjs if the filenames changed, and re-run pnpm bake:district-map.`,
  );
}

main().catch((error) => {
  rmSync(scratch, { recursive: true, force: true });
  console.error(error);
  process.exit(1);
});
