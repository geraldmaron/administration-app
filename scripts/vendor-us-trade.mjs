#!/usr/bin/env node
// Vendors what the United States actually trades in goods with every roster
// government, sector by sector, from the Census Bureau's end-use tables.
//
// The country file used to print a dollar figure the trade model itself called
// a shape: Canada at $20 billion a year when the real figure is around $700
// billion. This is the real figure the model opens with. The Census publishes
// US imports and exports by partner across some 140 five-digit end-use
// categories (green coffee, crude oil, computers, passenger cars); each is
// mapped onto the game's trade sectors below, and what no sector covers (gold,
// furniture, toys, jewelry, returned goods) is kept as "other", so a partner's
// rows still sum to what the two countries traded. Values are USD millions for
// the latest complete year; goods only, since services are not in it.
//
// Census reports territories separately where the game draws them as territory
// of the government that holds them, so their trade is folded into that
// government, the same way the map reads them: Hong Kong and Macau into China,
// Greenland and the Faroes into Denmark, Curaçao and Aruba into the
// Netherlands, the overseas departments and collectivities into France, the
// British overseas territories into the United Kingdom. The West Bank and Gaza
// are one row, Palestine's.
//
// Network. Needs `unzip` on the PATH.
//
// Usage: node scripts/vendor-us-trade.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { xlsxSheet } from "./lib/xlsx.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedDir = path.join(root, "packages/world/src/dataset/seed");
const WORKBOOKS = {
  imports: "https://www.census.gov/foreign-trade/statistics/product/enduse/imports/enduse_imports.xlsx",
  exports: "https://www.census.gov/foreign-trade/statistics/product/enduse/exports/enduse_exports.xlsx",
};

/**
 * End-use category → trade sector, per direction, since the Census numbers
 * the two lists differently. A value is a sector id, or a split where one
 * end-use category holds two of the game's sectors: organic chemicals are
 * where traded pharmaceutical ingredients sit (HS 29), batteries and solar
 * cells are inside electric apparatus, and semiconductor manufacturing
 * equipment is inside "industrial machines, other". The split shares are
 * stated priors, not measurements. A category not listed is "other".
 */
const IMPORT_SECTORS = {
  "00000": "agriculture-specialty", "00010": "agriculture-specialty", "00020": "food-processing",
  "00100": "agriculture-livestock", "00110": "agriculture-livestock", "00120": "agriculture-specialty",
  "00130": "agriculture-specialty", "00140": "agriculture-specialty", "00150": "agriculture-row-crops",
  "00160": "food-processing", "00170": "agriculture-specialty", "00180": "food-processing",
  "00190": "food-processing", "00200": "agriculture-row-crops", "01000": "agriculture-livestock",
  "01010": "food-processing", "01020": "food-processing",
  "10000": "energy-crude", "10010": "energy-refined", "10020": "energy-refined", "10030": "energy-refined",
  "10100": "bulk-mining", "10110": "energy-gas-lng", "10300": "critical-minerals",
  "12000": "agriculture-row-crops", "12030": "agriculture-livestock", "12060": "agriculture-livestock",
  "12070": "agriculture-specialty",
  "12100": "textiles-apparel", "12110": "textiles-apparel", "12135": "textiles-apparel", "12150": "textiles-apparel",
  "12160": "textiles-apparel",
  "12500": "chemicals", "12510": "fertilizer", "12530": "chemicals",
  "12540": { chemicals: 0.5, "pharmaceutical-ingredients": 0.5 }, "12550": "chemicals", "16050": "chemicals",
  "13020": "bulk-mining", "16040": "bulk-mining", "14000": "bulk-mining",
  "14100": "steel", "15000": "steel", "15100": "steel", "14200": "aluminum",
  "14220": "critical-minerals", "14240": "critical-minerals", "14250": "critical-minerals",
  "14260": "critical-minerals", "14280": "critical-minerals", "14290": "critical-minerals",
  "20000": "machine-tools", "20005": { "machine-tools": 0.6, "batteries-solar": 0.4 },
  "21000": "machine-tools", "21010": "machine-tools", "21030": "machine-tools", "21040": "machine-tools",
  "21100": "machine-tools", "21110": "machine-tools", "21120": "machine-tools", "21130": "machine-tools",
  "21140": "machine-tools", "21150": "machine-tools", "21160": "machine-tools", "21170": "machine-tools",
  "21180": { "machine-tools": 0.7, "semiconductor-equipment": 0.3 }, "21190": "machine-tools", "21200": "machine-tools",
  "21300": "consumer-electronics", "21301": "consumer-electronics", "21320": "semiconductors",
  "21400": "telecom-equipment", "21600": "medical-devices", "21610": "medical-devices",
  "22000": "aerospace-civil", "22010": "aerospace-civil", "22020": "aerospace-civil", "22300": "aerospace-civil",
  "22200": "shipbuilding-maritime", "22210": "shipbuilding-maritime", "22220": "shipbuilding-maritime",
  "41110": "shipbuilding-maritime",
  "30000": "autos-light-vehicles", "30100": "autos-light-vehicles", "41100": "autos-light-vehicles",
  "30110": "auto-parts", "30200": "auto-parts", "30210": "auto-parts", "30220": "auto-parts", "30230": "auto-parts",
  "40000": "textiles-apparel", "40010": "textiles-apparel", "40020": "textiles-apparel", "40030": "textiles-apparel",
  "40040": "textiles-apparel", "40050": "textiles-apparel", "41040": "textiles-apparel",
  "40100": "pharmaceuticals-finished",
  "41050": "consumer-electronics", "41200": "consumer-electronics", "41210": "consumer-electronics",
  "42000": "agriculture-specialty",
  "50000": "defense-articles", "50010": "defense-articles",
};

const EXPORT_SECTORS = {
  "00000": "agriculture-row-crops", "00010": "agriculture-row-crops", "00100": "agriculture-row-crops",
  "00110": "agriculture-row-crops", "00200": "agriculture-row-crops", "00210": "agriculture-row-crops",
  "00220": "agriculture-row-crops", "10000": "agriculture-row-crops",
  "00300": "agriculture-livestock", "00310": "agriculture-livestock", "01000": "agriculture-livestock",
  "10120": "agriculture-livestock",
  "00320": "agriculture-specialty", "00330": "agriculture-specialty", "00340": "agriculture-specialty",
  "10100": "agriculture-specialty", "10130": "agriculture-specialty", "10140": "agriculture-specialty",
  "42000": "agriculture-specialty",
  "00350": "food-processing", "00360": "food-processing", "00370": "food-processing", "01010": "food-processing",
  "01020": "food-processing", "10150": "food-processing", "40130": "food-processing",
  "11100": "energy-crude", "11110": "energy-refined", "11120": "energy-refined", "11130": "energy-refined",
  "11200": "energy-gas-lng", "11010": "bulk-mining", "11020": "bulk-mining", "12720": "bulk-mining",
  "12000": "bulk-mining", "11300": "critical-minerals",
  "12100": "steel", "12110": "steel", "12200": "aluminum",
  "12210": "critical-minerals", "12270": "critical-minerals", "12290": "critical-minerals",
  "12500": "chemicals", "12510": "fertilizer", "12530": "chemicals",
  "12540": { chemicals: 0.5, "pharmaceutical-ingredients": 0.5 }, "12550": "chemicals",
  "12700": "chemicals", "12750": "chemicals",
  "12600": "textiles-apparel", "12620": "textiles-apparel", "12640": "textiles-apparel",
  "40000": "textiles-apparel", "40030": "textiles-apparel", "40050": "textiles-apparel",
  "20000": "machine-tools", "20005": { "machine-tools": 0.6, "batteries-solar": 0.4 },
  "21000": "machine-tools", "21010": "machine-tools", "21030": "machine-tools", "21040": "machine-tools",
  "21100": "machine-tools", "21110": "machine-tools", "21120": "machine-tools", "21130": "machine-tools",
  "21140": "machine-tools", "21150": "machine-tools", "21160": "machine-tools", "21170": "machine-tools",
  "21180": { "machine-tools": 0.7, "semiconductor-equipment": 0.3 }, "21190": "machine-tools", "21200": "machine-tools",
  "21300": "consumer-electronics", "21301": "consumer-electronics", "21320": "semiconductors",
  "21400": "telecom-equipment", "21600": "medical-devices", "21610": "medical-devices",
  "22000": "aerospace-civil", "22090": "aerospace-civil", "22300": "aerospace-civil",
  "22200": "shipbuilding-maritime", "22210": "shipbuilding-maritime", "22220": "shipbuilding-maritime",
  "41110": "shipbuilding-maritime",
  "30000": "autos-light-vehicles", "30100": "autos-light-vehicles",
  "30200": "auto-parts", "30210": "auto-parts", "30220": "auto-parts", "30230": "auto-parts",
  "40100": "pharmaceuticals-finished",
  "41050": "consumer-electronics", "41200": "consumer-electronics", "41210": "consumer-electronics",
  "50000": "defense-articles", "50010": "defense-articles", "50020": "defense-articles", "50030": "defense-articles",
  "50040": "defense-articles", "50050": "defense-articles", "50060": "defense-articles", "50070": "defense-articles",
};

/** Census names that are not a roster government's own name, and what each is. */
const CENSUS_NAMES = {
  "Czech Republic": "CZE",
  Macedonia: "MKD",
  "Korea, South": "KOR",
  "Korea, North": "PRK",
  "Cote d'Ivoire": "CIV",
  "Congo (Brazzaville)": "COG",
  "Congo (Kinshasa)": "COD",
  "St Kitts and Nevis": "KNA",
  "St Lucia": "LCA",
  "St Vincent and the Grenadines": "VCT",
  "Republic of Yemen": "YEM",
  "East Timor": "TLS",
  "Gaza Strip Administered by Israel": "PSE",
  "West Bank Administered by Israel": "PSE",
  // Territories, folded into the government that holds them.
  "Hong Kong": "CHN",
  Macau: "CHN",
  Greenland: "DNK",
  "Faroe Islands": "DNK",
  Curacao: "NLD",
  Aruba: "NLD",
  "Sint Maarten": "NLD",
  "St Pierre and Miquelon": "FRA",
  Guadeloupe: "FRA",
  Martinique: "FRA",
  "French Guiana": "FRA",
  Reunion: "FRA",
  Mayotte: "FRA",
  "New Caledonia": "FRA",
  "French Polynesia": "FRA",
  "Wallis and Futuna": "FRA",
  "French Southern and Antarctic": "FRA",
  Bermuda: "GBR",
  "Turks and Caicos Islands": "GBR",
  "Cayman Islands": "GBR",
  Anguilla: "GBR",
  "British Virgin Islands": "GBR",
  Montserrat: "GBR",
  "Falkland Islands(Islas Malvin": "GBR",
  Gibraltar: "GBR",
  "St Helena": "GBR",
  "British Indian Ocean Terr.": "GBR",
  "Pitcairn Islands": "GBR",
  "Svalbard, Jan Mayen Island": "NOR",
  "Cocos (Keeling) Islands": "AUS",
  "Christmas Island": "AUS",
  "Cook Islands": "NZL",
  Niue: "NZL",
  Tokelau: "NZL",
};

const norm = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

function rosterNames() {
  const lines = readFileSync(path.join(seedDir, "nation-identity.tsv"), "utf8").split("\n").filter((line) => line && !line.startsWith("#"));
  const header = lines[0].split("\t");
  const byName = new Map();
  const roster = [];
  for (const line of lines.slice(1)) {
    const row = Object.fromEntries(line.split("\t").map((value, i) => [header[i], value]));
    roster.push(row.iso3);
    byName.set(norm(row.name), row.iso3);
    if (row.short_name) byName.set(norm(row.short_name), row.iso3);
  }
  return { byName, roster };
}

async function download(url, dir, name) {
  const response = await fetch(url, { headers: { "User-Agent": "admin-app vendor (research)" } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const file = path.join(dir, name);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

function firstSheet(file) {
  const workbook = execFileSync("unzip", ["-p", file, "xl/workbook.xml"]).toString("utf8");
  const name = /<sheet name="([^"]+)"/.exec(workbook)?.[1];
  if (!name) throw new Error(`${file} has no sheet`);
  return xlsxSheet(file, name);
}

/** The latest year column the world total reports, as its two-digit suffix. */
function latestYear(rows) {
  const world = rows.filter((row) => row.CTY_CODE === "0000");
  const years = Object.keys(world[0] ?? {})
    .map((key) => /^value_(\d{2})$/.exec(key)?.[1])
    .filter((suffix) => suffix !== undefined && world.some((row) => Number(row[`value_${suffix}`]) > 0))
    .sort();
  const latest = years.at(-1);
  if (!latest) throw new Error("the end-use workbook reports no year for the world total");
  return latest;
}

/** Every partner's flow in one direction, by trade sector (and "other"), USD millions. */
function flows(rows, sectors, byName, suffix) {
  const out = new Map();
  const unmapped = new Set();
  for (const row of rows) {
    // Census codes below 1000 are the world total, regions and groupings.
    if (Number(row.CTY_CODE) < 1000) continue;
    const iso3 = CENSUS_NAMES[row.CTY_DESC] ?? byName.get(norm(row.CTY_DESC));
    if (!iso3) {
      unmapped.add(row.CTY_DESC);
      continue;
    }
    const value = Number(row[`value_${suffix}`] ?? 0) / 1_000_000;
    if (!(value > 0)) continue;
    const target = sectors[row.END_USE] ?? "other";
    const split = typeof target === "string" ? { [target]: 1 } : target;
    const partner = out.get(iso3) ?? new Map();
    for (const [sector, share] of Object.entries(split)) partner.set(sector, (partner.get(sector) ?? 0) + value * share);
    out.set(iso3, partner);
  }
  return { out, unmapped };
}

async function main() {
  const scratch = mkdtempSync(path.join(tmpdir(), "vendor-us-trade-"));
  const imports = firstSheet(await download(WORKBOOKS.imports, scratch, "enduse_imports.xlsx"));
  const exports = firstSheet(await download(WORKBOOKS.exports, scratch, "enduse_exports.xlsx"));
  const suffix = latestYear(imports);
  if (latestYear(exports) !== suffix) throw new Error("the import and export workbooks end in different years");
  const year = 2000 + Number(suffix);
  const { byName, roster } = rosterNames();
  const byDirection = { imports: flows(imports, IMPORT_SECTORS, byName, suffix), exports: flows(exports, EXPORT_SECTORS, byName, suffix) };
  const partners = new Set([...byDirection.imports.out.keys(), ...byDirection.exports.out.keys()]);
  const missing = roster.filter((iso3) => iso3 !== "USA" && !partners.has(iso3));
  if (missing.length > 0) throw new Error(`no Census row for ${missing.join(", ")}: add the Census name to CENSUS_NAMES`);
  const unmapped = [...new Set([...byDirection.imports.unmapped, ...byDirection.exports.unmapped])].sort();

  const lines = [];
  for (const iso3 of [...partners].sort()) {
    for (const direction of ["imports", "exports"]) {
      const partner = byDirection[direction].out.get(iso3);
      if (!partner) continue;
      for (const [sector, value] of [...partner].sort(([a], [b]) => a.localeCompare(b))) {
        const rounded = Math.round(value * 100) / 100;
        if (rounded > 0) lines.push(`${iso3}\t${direction}\t${sector}\t${rounded}`);
      }
    }
  }
  const fetched = new Date().toISOString().slice(0, 10);
  const text = [
    "# US goods trade by partner and sector, vendored by scripts/vendor-us-trade.mjs — do not edit by hand.",
    `# fetched: ${fetched}`,
    `# source: US Census Bureau, U.S. imports and exports by five-digit end-use code and country (${WORKBOOKS.imports}, ${WORKBOOKS.exports}), public domain`,
    `# year: ${year} — USD millions; end-use categories mapped to trade sectors in the vendor, "other" for the rest; territories folded into the government that holds them`,
    `# not on the roster and left out: ${unmapped.join("; ")}`,
    "iso3\tdirection\tsector\tusd_m",
    ...lines,
  ].join("\n");
  writeFileSync(path.join(seedDir, "us-goods-trade.tsv"), `${text}\n`);
  const total = (direction) => [...byDirection[direction].out.values()].reduce((sum, partner) => sum + [...partner.values()].reduce((a, b) => a + b, 0), 0);
  console.log(`${year}: ${partners.size} partners, exports $${Math.round(total("exports") / 1000)}B, imports $${Math.round(total("imports") / 1000)}B`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
