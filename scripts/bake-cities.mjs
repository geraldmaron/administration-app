#!/usr/bin/env node
// Bakes the world city table from compact seed extracts plus worldNations
// identity/geo. Capitals cannot drift from the nation record. Does not fetch
// Census or MIT Election Lab — those vintages are pinned in the seed headers.
//
// Reads the nations from the built world package, because a thin record lives
// in a region file a pattern over nations.ts cannot see: build the world
// package first. Writes packages/world/src/dataset/cities.ts (tracked, one
// city per line).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { worldNations, worldStates } from "../packages/world/dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);
const seedDir = path.join(root, "packages/world/src/dataset/seed");
const outPath = path.join(root, "packages/world/src/dataset/cities.ts");

const EMP_RATE = {
  capital: 0.52,
  port: 0.5,
  financial: 0.54,
  industrial: 0.47,
  border: 0.48,
  interior: 0.5,
};
const TAX_RATE = {
  capital: 0.014,
  port: 0.012,
  financial: 0.018,
  industrial: 0.009,
  border: 0.008,
  interior: 0.01,
};

const REQUIRED_US = ["washington-dc", "new-york", "boston", "pittsburgh", "el-paso", "denver"];

function readLines(file) {
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function parseTsv(file, headers) {
  return readLines(file).map((line) => {
    const cols = line.split("\t");
    if (cols.length !== headers.length) {
      throw new Error(`${path.basename(file)}: expected ${headers.length} columns, got ${cols.length}: ${line}`);
    }
    return Object.fromEntries(headers.map((key, i) => [key, cols[i]]));
  });
}

function loadNations() {
  return worldNations.map((nation) => ({
    id: nation.id,
    capital: nation.identity.capital,
    lat: nation.geo.lat,
    lon: nation.geo.lon,
    region: nation.geo.region,
    population: nation.stats.demography.population,
  }));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * A capital no source states a population for (Antigua's Saint John's is
 * recorded as a parish, not a city) holds its region's median share of the
 * national population, logged so the prior is visible rather than silent.
 */
function capitalPriors(nations, populations) {
  const share = (n) => populations[n.id] / n.population;
  const known = nations.filter((n) => populations[n.id] && n.id !== "USA");
  const world = median(known.map(share));
  const filled = {};
  for (const nation of nations) {
    if (populations[nation.id] || nation.id === "USA") continue;
    const local = known.filter((n) => n.region === nation.region).map(share);
    filled[nation.id] = Math.round(nation.population * (local.length >= 3 ? median(local) : world));
    console.log(`prior: ${nation.id} capital ${nation.capital} at ${filled[nation.id]} (region median share of the national population)`);
  }
  return filled;
}

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cityId(nation, slug) {
  return `CITY-${nation}-${slug}`;
}

function economy(kind, population) {
  const employment = Math.round(population * EMP_RATE[kind]);
  const taxBase = Math.max(1, Math.round(population * TAX_RATE[kind]));
  return { employment, taxBase };
}

function usCities(rows, nations) {
  const usa = nations.find((n) => n.id === "USA");
  if (!usa) throw new Error("USA missing from nations.ts");
  const ranked = [...rows].sort((a, b) => b.population - a.population);
  if (ranked.length < 200) {
    throw new Error(`US seed has ${ranked.length} metros, need 200`);
  }
  const taken = ranked.slice(0, 200);
  const slugs = new Set(taken.map((row) => row.slug));
  for (const slug of REQUIRED_US) {
    if (!slugs.has(slug)) throw new Error(`required US metro "${slug}" dropped out of the top 200`);
  }
  return taken.map((row) => {
    const isCapital = row.kind === "capital" || row.slug === "washington-dc";
    const kind = isCapital ? "capital" : row.kind;
    const lat = isCapital ? usa.lat : row.lat;
    const lon = isCapital ? usa.lon : row.lon;
    const name = isCapital ? usa.capital : row.name;
    return {
      id: cityId("USA", row.slug),
      nation: "USA",
      name,
      kind,
      lat,
      lon,
      population: row.population,
      ...economy(kind, row.population),
      demShare: row.demShare,
      state: row.state,
    };
  });
}

function capitalCities(nations, populations, us) {
  const washington = us.find((c) => c.kind === "capital");
  return nations.map((nation) => {
    if (nation.id === "USA") return washington;
    const sourced = populations[nation.id];
    if (!sourced) throw new Error(`no capital population for ${nation.id}`);
    // A city-state's capital and country are counted by different sources in
    // different years, and Monaco's comes out larger than Monaco; a capital is
    // never more than its country.
    const population = Math.min(sourced, nation.population);
    if (population < sourced) console.log(`capped: ${nation.id} capital ${nation.capital} ${sourced} → ${population} (the nation's population)`);
    return {
      id: cityId(nation.id, slugify(nation.capital)),
      nation: nation.id,
      name: nation.capital,
      kind: "capital",
      lat: nation.lat,
      lon: nation.lon,
      population,
      ...economy("capital", population),
    };
  });
}

function extraCities(rows, nations) {
  const byId = new Map(nations.map((n) => [n.id, n]));
  const extras = [];
  for (const row of rows) {
    const nation = byId.get(row.nation);
    if (!nation) throw new Error(`extra city ${row.slug} references unknown nation ${row.nation}`);
    if (row.name === nation.capital) {
      throw new Error(`extra ${row.slug} duplicates capital name ${nation.capital}`);
    }
    extras.push({
      id: cityId(row.nation, row.slug),
      nation: row.nation,
      name: row.name,
      kind: row.kind,
      lat: row.lat,
      lon: row.lon,
      population: row.population,
      ...economy(row.kind, row.population),
    });
  }
  return extras;
}

function emitRow(city) {
  const row = {
    id: city.id,
    nation: city.nation,
    name: city.name,
    kind: city.kind,
    lat: city.lat,
    lon: city.lon,
    population: city.population,
    employment: city.employment,
    taxBase: city.taxBase,
  };
  if (city.demShare !== undefined) row.demShare = city.demShare;
  if (city.state !== undefined) row.state = city.state;
  return `  ${JSON.stringify(row)},`;
}

function assemble() {
  const nations = loadNations();
  const usRows = parseTsv(path.join(seedDir, "us-metros.tsv"), [
    "slug",
    "name",
    "kind",
    "lat",
    "lon",
    "population",
    "demShare",
    "state",
  ]).map((row) => ({
    ...row,
    lat: Number(row.lat),
    lon: Number(row.lon),
    population: Number(row.population),
    demShare: Number(row.demShare),
    state: row.state,
  }));
  const extraRows = parseTsv(path.join(seedDir, "global-extras.tsv"), [
    "nation",
    "slug",
    "name",
    "kind",
    "lat",
    "lon",
    "population",
  ]).map((row) => ({
    ...row,
    lat: Number(row.lat),
    lon: Number(row.lon),
    population: Number(row.population),
  }));
  // The authored table covers the countries written by hand; every other
  // capital's population is Wikidata's latest statement for it.
  const vendoredPath = path.join(seedDir, "capital-population-wikidata.tsv");
  // Undated statements leave the year column empty, which the trimmed line
  // loses; only the first three columns are read.
  const vendored = existsSync(vendoredPath)
    ? readLines(vendoredPath).slice(1).map((line) => line.split("\t")).map(([nation, , population]) => [nation, Number(population)])
    : [];
  const capitalPop = Object.fromEntries([
    ...vendored,
    ...parseTsv(path.join(seedDir, "capital-population.tsv"), ["nation", "population"]).map((row) => [row.nation, Number(row.population)]),
  ]);

  const us = usCities(usRows, nations);
  const capitals = capitalCities(nations, { ...capitalPop, ...capitalPriors(nations, capitalPop) }, us).filter(Boolean);
  const extras = extraCities(extraRows, nations);
  const seen = new Set();
  const cities = [];
  for (const city of [...us, ...capitals.filter((c) => c.nation !== "USA"), ...extras]) {
    if (seen.has(city.id)) throw new Error(`duplicate city id ${city.id}`);
    seen.add(city.id);
    cities.push(city);
  }
  return { cities, usCount: us.length, extraCount: extras.length };
}

const header = `import { City } from "../schemas/city.js";

// Baked city table. One city per line. Regenerated by \`pnpm bake:cities\`.
// Do not edit by hand.
//
// US metros: Census CBSA (metro, not micro/CSA), 2023 vintage population, top 200.
// demShare: 2020 two-party Democratic presidential share (MIT Election Lab
// county returns, population-weighted to CBSA; smaller metros use regional
// approximations, game-plausible like nations.ts).
// state: primary state of the CBSA (NYC→NY, Kansas City→MO, DC→DC).
// Capitals: name and lat/lon copied from worldNations identity + geo.
// Global extras: authored major populated places (2–5 per large nation).
// employment ≈ 0.47–0.54 of metro population; taxBase is USD millions.

// prettier-ignore
export const worldCities: readonly City[] = [
`;

const { cities, usCount, extraCount } = assemble();
const body = cities.map(emitRow).join("\n");
const footer = `\n].map((row) => City.parse(row));\n`;
writeFileSync(outPath, `${header}${body}${footer}`);
const lines = readFileSync(outPath, "utf8").split("\n").length;
if (lines > 800) {
  throw new Error(`cities.ts is ${lines} lines; keep generated rows to one city per line under 800`);
}
console.log(`Wrote ${cities.length} cities (${usCount} US, ${cities.length - usCount - extraCount} other capitals, ${extraCount} extras) → ${path.relative(root, outPath)} (${lines} lines)`);

// Natural Earth points are context, not a second economic city table. Its population
// estimates describe urban agglomerations, not current municipal census counts.
const stateNames = new Map(worldStates.map((state) => [state.name, state.id]));
const settlementRows = parseTsv(path.join(root, "scripts/vendor/ne-us-places.tsv"), ["name", "state", "lat", "lon", "population"])
  .filter((row) => stateNames.has(row.state) && Number(row.population) > 0 && (Number(row.population) <= 100000 || row.name === "Newark" && row.state === "New Jersey"))
  .map((row) => ({ id: `SETTLEMENT-USA-${stateNames.get(row.state)}-${slugify(row.name)}`, nation: "USA", state: stateNames.get(row.state),
    name: row.name, lat: Number(row.lat), lon: Number(row.lon), population: Number(row.population), source: "natural-earth-10m-5.1.2",
    ...(row.name === "Newark" && row.state === "New Jersey" ? { commercialPort: true } : {}),
    ...(row.name === "International Falls" && row.state === "Minnesota" ? { roadBorderCrossing: true } : {}) }));
const settlements = [...new Map(settlementRows.map((row) => [row.id, row])).values()].sort((a, b) => a.id.localeCompare(b.id));
const settlementPath = path.join(root, "packages/world/src/dataset/settlements.ts");
writeFileSync(settlementPath, 'import { Settlement } from "../schemas/settlement.js";\n\n// Generated by scripts/bake-cities.mjs from vendored Natural Earth 5.1.2.\n// Small settlement is a model size tier, not legal town status or evidence of rural industry.\n// Newark commercial-port context: Port Authority terminal map; see sources/settlements-sources.md.\nexport const worldSettlements: readonly Settlement[] = [\n' + settlements.map((row) => '  ' + JSON.stringify(row) + ',').join('\n') + '\n].map((row) => Settlement.parse(row));\n');
console.log(`Wrote ${settlements.length} geographic settlements → ${path.relative(root, settlementPath)}`);
