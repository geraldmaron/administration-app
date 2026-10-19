#!/usr/bin/env node
// Vendors the public figures the nation bake composes into records.
//
// Network, run rarely: fetches seven open sources and writes six pinned seed
// tables under packages/world/src/dataset/seed/, with the source, license and
// fetch date in each header, plus the anchors' TypeScript table beside them. The bake (scripts/bake-nations.mjs) reads only
// these tables and never the network, so a record's figures are the figures a
// named source published, never numbers typed or drafted.
//
//   GeoNames countryInfo.txt      CC BY 4.0      codes, capital, area, currency, languages, neighbors, continent
//   CIA World Factbook archive    public domain  UN membership, adjective, government type, median age, capital coordinates, coastline, standing forces, seated parties
//   World Bank WDI + WGI          CC BY 4.0      population, economy, trade and its composition, demography, military, governance, homicide, aid received
//   World Bank Fiscal Space       CC BY 4.0      general government gross debt, sovereign rating index
//   US EIA International          public domain  primary energy production and consumption by fuel
//   US BEA NIPA and BLS           public domain  the United States' own growth, inflation and unemployment (the macro anchors)
//
// The IMF's World Economic Outlook is deliberately absent: its data terms
// allow reuse without permission only for noncommercial purposes.
//
// Needs `unzip` on the PATH (EIA and the Fiscal Space workbook ship zipped).
//
// Usage: node scripts/vendor-nation-stats.mjs            every table, the anchors last
//        node scripts/vendor-nation-stats.mjs --anchors  the macro anchors alone
//        node scripts/vendor-nation-stats.mjs --fiscal   the fiscal table and its anchors alone
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { xlsxSheet } from "./lib/xlsx.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedDir = path.join(root, "packages/world/src/dataset/seed");

const GEONAMES = "https://download.geonames.org/export/dump/countryInfo.txt";
const FACTBOOK_TREE = "https://api.github.com/repos/factbook/factbook.json/git/trees/master?recursive=1";
const FACTBOOK_RAW = "https://raw.githubusercontent.com/factbook/factbook.json/master/";
const WB = "https://api.worldbank.org/v2/country/all/indicator/";
const FISCAL_SPACE = "https://thedocs.worldbank.org/en/doc/31a9f7ffd7c72b9fbed93f3fb79af70a-0050012026/original/Fiscal-space-data.xlsx";
const EIA_INTL = "https://www.eia.gov/opendata/bulk/INTL.zip";
// Latest year wins, so the early end of the window only fills a gap: Eritrea has
// published no national accounts since 2011, and a stated 2011 figure is
// better than a prior standing in for one.
const FIRST_YEAR = 2010;
const LAST_YEAR = 2024;

/** Governments that hold territory and that a US President deals with, beyond the UN's 193. */
const BEYOND_THE_UN = ["TWN", "XKX", "PSE"];

/** World Bank indicator → seed column. Each takes the latest non-null year in the window. */
const WDI = {
  population: "SP.POP.TOTL",
  urbanization: "SP.URB.TOTL.IN.ZS",
  gdp_usd: "NY.GDP.MKTP.CD",
  growth: "NY.GDP.MKTP.KD.ZG",
  inflation: "FP.CPI.TOTL.ZG",
  unemployment: "SL.UEM.TOTL.ZS",
  reserves_usd: "FI.RES.TOTL.CD",
  exports_usd: "NE.EXP.GNFS.CD",
  imports_usd: "NE.IMP.GNFS.CD",
  birth_per_1000: "SP.DYN.CBRT.IN",
  death_per_1000: "SP.DYN.CDRT.IN",
  net_migration: "SM.POP.NETM",
  literacy: "SE.ADT.LITR.ZS",
  military_usd: "MS.MIL.XPND.CD",
  armed_forces: "MS.MIL.TOTL.P1",
  energy_import_pct: "EG.IMP.CONS.ZS",
  homicide_per_100k: "VC.IHR.PSRC.P5",
  oda_received_usd: "DT.ODA.ODAT.CD",
  // What a country sells, as shares. Merchandise shares are of merchandise
  // exports and service shares of service exports; the bake weights the two
  // by their dollar totals to rank a country's leading exports.
  merch_exports_usd: "TX.VAL.MRCH.CD.WT",
  service_exports_usd: "BX.GSR.NFSV.CD",
  fuel_exports_pct: "TX.VAL.FUEL.ZS.UN",
  ores_metals_exports_pct: "TX.VAL.MMTL.ZS.UN",
  food_exports_pct: "TX.VAL.FOOD.ZS.UN",
  agri_raw_exports_pct: "TX.VAL.AGRI.ZS.UN",
  manufactures_exports_pct: "TX.VAL.MANF.ZS.UN",
  hightech_manufactures_pct: "TX.VAL.TECH.MF.ZS",
  travel_services_pct: "BX.GSR.TRVL.ZS",
  ict_services_pct: "BX.GSR.CCIS.ZS",
  finance_services_pct: "BX.GSR.INSF.ZS",
  transport_services_pct: "BX.GSR.TRAN.ZS",
};

/** Worldwide Governance Indicators (source 3), estimates on roughly −2.5..2.5. */
const WGI = {
  wgi_stability: "GOV_WGI_PV.EST",
  wgi_effectiveness: "GOV_WGI_GE.EST",
  wgi_corruption_control: "GOV_WGI_CC.EST",
  wgi_rule_of_law: "GOV_WGI_RL.EST",
  wgi_voice: "GOV_WGI_VA.EST",
};

/**
 * Fiscal Space workbook sheet → seed column, with the fewest economies a sheet
 * may cover before the fetch is refused rather than baked as missing data. The
 * debt-structure sheets are thinner by nature: few governments publish the
 * currency and maturity of what they owe.
 */
const FISCAL = {
  debt_pct_gdp: { sheet: "ggdy", covers: 150 },
  rating_index: { sheet: "sovrate", covers: 150 },
  primary_balance_pct_gdp: { sheet: "pby", covers: 150 },
  balance_pct_gdp: { sheet: "fby", covers: 150 },
  fx_debt_pct: { sheet: "fxsovsh", covers: 40 },
  maturity_years: { sheet: "avglife", covers: 40 },
};

const FISCAL_SOURCE = `World Bank Prospects Group, A Cross-Country Database of Fiscal Space (${FISCAL_SPACE}), CC BY 4.0 — Kose, Kurlat, Ohnsorge and Sugawara (2022), Journal of International Money and Finance 128: 102682`;

/** EIA series activity code (production 1, consumption 2) → seed column, all in quadrillion Btu. */
const EIA = {
  "44-1": "production_qbtu",
  "44-2": "consumption_qbtu",
  "4411-2": "coal_qbtu",
  "4413-2": "gas_qbtu",
  "4415-2": "oil_qbtu",
  "4417-2": "nuclear_qbtu",
  "4418-2": "renewables_qbtu",
  "4413-1": "gas_production_qbtu",
  "4415-1": "oil_production_qbtu",
  "4411-1": "coal_production_qbtu",
};

async function fetchResponse(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, { headers: { "user-agent": "admin-app vendor-nation-stats" } });
    if (response.ok) return response;
    if (attempt === 3) throw new Error(`${url} answered ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw new Error(`unreachable: ${url}`);
}

const fetchText = async (url) => (await fetchResponse(url)).text();

async function download(url, dir, name) {
  const file = path.join(dir, name);
  writeFileSync(file, Buffer.from(await (await fetchResponse(url)).arrayBuffer()));
  return file;
}

function parseGeoNames(text) {
  const rows = new Map();
  for (const line of text.split("\n")) {
    if (line.startsWith("#") || line.trim() === "") continue;
    const cols = line.split("\t");
    const [iso2, iso3, , fips, name, capital, area, population, continent, , currency, , , , , languages, , neighborCodes] = cols;
    rows.set(iso3, { iso2, iso3, fips, name, capital, area: Number(area), population: Number(population), continent, currency, languages, neighborCodes });
  }
  return rows;
}

/** Keeps the latest in-window year per economy. */
function keepLatest(latest, iso3, year, value, window = { first: FIRST_YEAR, last: LAST_YEAR }) {
  if (value === null || value === undefined || Number.isNaN(value) || year < window.first || year > window.last) return;
  const seen = latest.get(iso3);
  if (!seen || year > seen.year) latest.set(iso3, { value, year });
}

async function worldBank(indicator, source, window = { first: FIRST_YEAR, last: LAST_YEAR }) {
  const url = `${WB}${indicator}?format=json&date=${window.first}:${window.last}&per_page=20000${source ? `&source=${source}` : ""}`;
  const body = JSON.parse(await fetchText(url));
  // The API answers a bad indicator id with a 200 and a message, not an error;
  // an empty column would then bake as missing data rather than fail here.
  if (Array.isArray(body) && body[0]?.message) throw new Error(`${indicator}: ${JSON.stringify(body[0].message)}`);
  const rows = Array.isArray(body) ? body[1] ?? [] : [];
  if (rows.length === 0) throw new Error(`${indicator} returned no rows`);
  const latest = new Map();
  for (const row of rows) {
    if (row.countryiso3code) keepLatest(latest, row.countryiso3code, Number(row.date), row.value, window);
  }
  return latest;
}

async function fiscalSpace(dir) {
  const zip = await download(FISCAL_SPACE, dir, "fiscal-space.xlsx");
  const columns = {};
  for (const [column, { sheet, covers }] of Object.entries(FISCAL)) {
    const latest = new Map();
    for (const row of xlsxSheet(zip, sheet)) {
      const iso3 = row["Country Code"];
      if (!iso3) continue;
      for (const [key, value] of Object.entries(row)) {
        if (/^\d{4}$/.test(key)) keepLatest(latest, iso3, Number(key), Number(value));
      }
    }
    if (latest.size < covers) throw new Error(`Fiscal Space ${sheet} covers only ${latest.size} economies`);
    columns[column] = latest;
  }
  return columns;
}

function writeFiscal(fetched, roster, columns) {
  const coverage = Object.entries(columns).map(([name, latest]) => `${name} ${roster.filter((row) => latest.has(row.iso3)).length}`);
  writeFigures("nation-fiscal.tsv", [
    "# Nation fiscal figures, vendored by scripts/vendor-nation-stats.mjs — do not edit by hand.",
    `# fetched: ${fetched}`,
    `# source: ${FISCAL_SOURCE}`,
    "# debt_pct_gdp: general government gross debt, percent of GDP. rating_index: foreign-currency long-term sovereign rating averaged across agencies, 21 = AAA down one notch per point to 1 = selective default. primary_balance_pct_gdp and balance_pct_gdp: general government primary and overall balance, percent of GDP. fx_debt_pct: general government debt in foreign currency, percent of the total. maturity_years: average maturity of sovereign debt",
    `# coverage, of ${roster.length} governments: ${coverage.join(", ")}`,
  ], roster, columns);
}

const FISCAL_MODULE = path.join(root, "packages/world/src/dataset/fiscal-anchors.ts");

/** The anchors one government's figures give the books, as fractions a year; a figure only where the workbook has one. */
function fiscalAnchor(iso3, columns) {
  const cell = (name) => columns[name].get(iso3);
  const figure = (value, year) => ({ value: Math.round(value * 1e6) / 1e6, year });
  const anchor = {};
  const rating = cell("rating_index");
  if (rating) anchor.rating = figure(rating.value, rating.year);
  const fx = cell("fx_debt_pct");
  if (fx) anchor.foreignCurrencyShare = figure(Math.min(1, Math.max(0, fx.value / 100)), fx.year);
  const primary = cell("primary_balance_pct_gdp");
  const overall = cell("balance_pct_gdp");
  const debt = cell("debt_pct_gdp");
  // Interest is what the primary balance has that the overall balance does
  // not, over the debt it was paid on, all three from the same year.
  if (primary && overall && debt && primary.year === overall.year && debt.year === primary.year && debt.value > 5) {
    anchor.effectiveRate = figure(Math.max(0.005, (primary.value - overall.value) / debt.value), primary.year);
  }
  const maturity = cell("maturity_years");
  if (maturity) anchor.maturityYears = figure(maturity.value, maturity.year);
  return anchor;
}

function writeFiscalAnchorModule(fetched, roster, columns) {
  const rows = roster.map((row) => [row.iso3, fiscalAnchor(row.iso3, columns)]).filter(([, anchor]) => Object.keys(anchor).length > 0);
  const lines = [
    "// Written by scripts/vendor-nation-stats.mjs --fiscal from seed/nation-fiscal.tsv; do not edit by hand.",
    "//",
    "// What each government's books open on, where the World Bank's fiscal space",
    "// database has a figure: the rating agencies' average notch, the share of its",
    "// debt written in foreign currency, the rate its debt costs (interest over",
    "// the debt it was paid on) and how long that debt runs. A government with no",
    "// figure opens on the engine's labeled rule for its letter and its wealth.",
    "",
    "export type FiscalAnchorFigure = { readonly value: number; readonly year: number };",
    "",
    "export type FiscalAnchor = {",
    "  /** The agencies' average foreign-currency notch, 1 (default) to 21 (AAA). */",
    "  readonly rating?: FiscalAnchorFigure;",
    "  /** Debt in foreign currency, as a share of the total. */",
    "  readonly foreignCurrencyShare?: FiscalAnchorFigure;",
    "  /** Interest over gross debt, as a fraction a year. */",
    "  readonly effectiveRate?: FiscalAnchorFigure;",
    "  readonly maturityYears?: FiscalAnchorFigure;",
    "};",
    "",
    `export const FISCAL_ANCHORS_FETCHED = ${JSON.stringify(fetched)};`,
    "",
    `export const FISCAL_ANCHOR_SOURCE = ${JSON.stringify(FISCAL_SOURCE)};`,
    "",
    "// prettier-ignore",
    "export const FISCAL_ANCHORS: Readonly<Record<string, FiscalAnchor>> = {",
    ...rows.map(([iso3, anchor]) => `  ${JSON.stringify(iso3)}: ${JSON.stringify(anchor)},`),
    "};",
  ];
  writeFileSync(FISCAL_MODULE, lines.join("\n") + "\n");
  console.log(`fiscal anchors: ${rows.length} of ${roster.length} governments carry at least one`);
}

async function vendorFiscal(fetched) {
  const scratch = mkdtempSync(path.join(tmpdir(), "vendor-nation-stats-"));
  const roster = seedRoster().map((iso3) => ({ iso3 }));
  const columns = await fiscalSpace(scratch);
  writeFiscal(fetched, roster, columns);
  writeFiscalAnchorModule(fetched, roster, columns);
}

/** Streams EIA's 130 MB bulk file and keeps only the annual series the bake reads. */
async function eiaEnergy(dir) {
  const zip = await download(EIA_INTL, dir, "INTL.zip");
  const wanted = /^INTL\.(\d+-\d)-([A-Z]{3})-QBTU\.A$/;
  const columns = Object.fromEntries(Object.values(EIA).map((column) => [column, new Map()]));
  const unzip = spawn("unzip", ["-p", zip, "INTL.txt"]);
  const lines = createInterface({ input: unzip.stdout, crlfDelay: Infinity });
  for await (const line of lines) {
    const id = /"series_id":"([^"]+)"/.exec(line)?.[1];
    const match = id && wanted.exec(id);
    const column = match && EIA[match[1]];
    if (!column) continue;
    for (const [year, value] of JSON.parse(line).data ?? []) {
      if (typeof value === "number") keepLatest(columns[column], match[2], Number(year), value);
    }
  }
  if (columns.consumption_qbtu.size < 150) throw new Error(`EIA consumption covers only ${columns.consumption_qbtu.size} economies`);
  return columns;
}

function text(node) {
  return typeof node?.text === "string" ? node.text : "";
}

/** "64 09 N, 21 57 W" → [64.15, -21.95]. */
function coordinates(raw) {
  const match = /(\d+)\s+(\d+)\s+([NS]),\s*(\d+)\s+(\d+)\s+([EW])/.exec(raw);
  if (!match) return ["", ""];
  const lat = (Number(match[1]) + Number(match[2]) / 60) * (match[3] === "S" ? -1 : 1);
  const lon = (Number(match[4]) + Number(match[5]) / 60) * (match[6] === "W" ? -1 : 1);
  return [lat.toFixed(2), lon.toFixed(2)];
}

function firstClause(raw) {
  return raw.split(/[;(]/)[0].trim();
}

/**
 * The tickets that hold seats, in the order of how many, from the chamber that
 * makes and unmakes governments: the lower one where there are two. "Name (ABBR)
 * (N)" or "Name (N)", separated by semicolons; the residual "Other" and
 * independents are not a ticket.
 */
function seatedParties(government) {
  const chamber = government["Legislative branch - lower chamber"] ?? government["Legislative branch"] ?? {};
  const raw = text(chamber["parties elected and seats per party"]).replace(/<[^>]+>/g, " ");
  const parties = [];
  for (const segment of raw.split(";")) {
    const match = /^\s*(.+?)\s*(?:\(([^()]+)\))?\s*\((\d+)\)\s*$/.exec(segment);
    if (!match || /^(others?|independents?|vacant|non-partisans?)\b/i.test(match[1])) continue;
    parties.push({ name: match[1].replace(/\s+/g, " ").trim(), short: match[2]?.trim() ?? "", seats: Number(match[3]) });
  }
  return parties.sort((a, b) => b.seats - a.seats);
}

function factbookRow(doc) {
  const government = doc.Government ?? {};
  const people = doc["People and Society"] ?? {};
  const military = doc["Military and Security"] ?? {};
  const orgs = text(government["International organization participation"]);
  const [lat, lon] = coordinates(text(government.Capital?.["geographic coordinates"]));
  const median = /([\d.]+)\s+years/.exec(text(people["Median age"]?.total));
  const coastline = /^([\d,.]+)\s*km/.exec(text(doc.Geography?.Coastline));
  return {
    un_member: /(^|,\s*)UN(,|$)/.test(orgs) ? "yes" : "no",
    short_name: text(government["Country name"]?.["conventional short form"]),
    adjective: firstClause(text(people.Nationality?.adjective)),
    government_type: firstClause(text(government["Government type"])),
    capital_fb: firstClause(text(government.Capital?.name)),
    capital_lat: lat,
    capital_lon: lon,
    median_age: median ? median[1] : "",
    languages_fb: firstClause(text(people.Languages)),
    coastline_km: coastline ? coastline[1].replace(/,/g, "") : "",
    standing_forces: /^no regular military forces/i.test(text(military["Military and security forces"])) ? "no" : "yes",
    party_system: /no political parties/i.test(text(government["Political parties"])) ? "none" : "",
    parties: seatedParties(government),
  };
}

function clean(value) {
  return String(value ?? "").replace(/[\t\n\r]+/g, " ").trim();
}

async function identities() {
  const geonames = parseGeoNames(await fetchText(GEONAMES));
  const tree = JSON.parse(await fetchText(FACTBOOK_TREE));
  const factbookPath = new Map();
  for (const entry of tree.tree ?? []) {
    const match = /^([a-z-]+)\/([a-z]{2})\.json$/.exec(entry.path);
    if (match) factbookPath.set(match[2].toUpperCase(), entry.path);
  }
  const found = new Map();
  for (const row of geonames.values()) {
    const file = factbookPath.get(row.fips);
    if (!file) continue;
    const doc = JSON.parse(await fetchText(FACTBOOK_RAW + file));
    found.set(row.iso3, { ...row, factbook: file, ...factbookRow(doc) });
  }
  const roster = [...found.values()].filter((row) => row.un_member === "yes" || BEYOND_THE_UN.includes(row.iso3));
  for (const iso3 of BEYOND_THE_UN) {
    if (!roster.some((row) => row.iso3 === iso3) && geonames.has(iso3)) roster.push({ ...geonames.get(iso3), factbook: "", un_member: "no" });
  }
  roster.sort((a, b) => a.iso3.localeCompare(b.iso3));
  const members = roster.filter((row) => row.un_member === "yes").length;
  if (members !== 193) console.warn(`warning: the Factbook archive lists ${members} UN members, not 193 — check the organization field`);
  return { geonames, roster, members };
}

function writeIdentity(fetched, geonames, roster) {
  const columns = ["iso3", "iso2", "un_member", "name", "short_name", "adjective", "capital", "capital_fb", "capital_lat", "capital_lon", "continent", "currency", "languages", "languages_fb", "government_type", "median_age", "area_km2", "coastline_km", "standing_forces", "party_system", "neighbors", "factbook"];
  const byIso2 = new Map([...geonames.values()].map((row) => [row.iso2, row.iso3]));
  const lines = [
    "# Nation identity, vendored by scripts/vendor-nation-stats.mjs — do not edit by hand.",
    `# fetched: ${fetched}`,
    `# source: GeoNames countryInfo.txt (${GEONAMES}), CC BY 4.0 — codes, capital, continent, currency, languages, neighbors, area`,
    "# source: CIA World Factbook archive (github.com/factbook/factbook.json), public domain — UN membership, short name, adjective, government type, capital coordinates, median age, coastline, standing forces",
    `# roster: every Factbook entry listing UN membership, plus ${BEYOND_THE_UN.join(", ")}`,
    columns.join("\t"),
    ...roster.map((row) =>
      [
        row.iso3, row.iso2, row.un_member, row.name, row.short_name, row.adjective, row.capital, row.capital_fb, row.capital_lat, row.capital_lon,
        row.continent, row.currency, row.languages, row.languages_fb, row.government_type, row.median_age, row.area, row.coastline_km, row.standing_forces, row.party_system,
        (row.neighborCodes ?? "").split(",").filter(Boolean).map((iso2) => byIso2.get(iso2) ?? "").filter(Boolean).join(","),
        row.factbook,
      ].map(clean).join("\t"),
    ),
  ];
  writeFileSync(path.join(seedDir, "nation-identity.tsv"), lines.join("\n") + "\n");
}

/** The seated tickets per government, most seats first. */
function writeParties(fetched, roster) {
  const lines = [
    "# Nation parties, vendored by scripts/vendor-nation-stats.mjs — do not edit by hand.",
    `# fetched: ${fetched}`,
    "# source: CIA World Factbook archive (github.com/factbook/factbook.json), public domain — Legislative branch, parties elected and seats per party (the lower chamber where there are two), from the most recent election the Factbook records",
    ["iso3", "rank", "name", "short", "seats"].join("\t"),
    ...roster.flatMap((row) => (row.parties ?? []).map((party, i) => [row.iso3, i + 1, party.name, party.short, party.seats].map(clean).join("\t"))),
  ];
  writeFileSync(path.join(seedDir, "nation-parties.tsv"), lines.join("\n") + "\n");
}

/** A figures table: one row per roster government, each cell `value@year` or empty. */
function writeFigures(file, header, roster, columns) {
  const names = Object.keys(columns);
  const lines = [
    ...header,
    `# vintage: each cell is the latest non-null year in ${FIRST_YEAR}:${LAST_YEAR}; the year follows the value after an @`,
    ["iso3", ...names].join("\t"),
    ...roster.map((row) => [row.iso3, ...names.map((name) => {
      const cell = columns[name].get(row.iso3);
      return cell ? `${cell.value}@${cell.year}` : "";
    })].join("\t")),
  ];
  writeFileSync(path.join(seedDir, file), lines.join("\n") + "\n");
}

// --- The macro anchors ------------------------------------------------------
//
// Where each economy's growth, inflation and unemployment rest when nothing is
// happening to it. The engine reverts every economy toward its authored record,
// and these are the figures that record is held to: the latest year a named
// source published inside the five years before the snapshot. An older figure
// is no anchor at all, because a rate from 2016 describes a different economy.
//
// The United States is read from its own statistical agencies rather than from
// the World Bank's republication of them: it is the economy the player governs,
// and its figures are the ones a player can check.

const ANCHOR_WINDOW = { first: 2020, last: LAST_YEAR };
const ANCHOR_RATES = { growth: "NY.GDP.MKTP.KD.ZG", inflation: "FP.CPI.TOTL.ZG", unemployment: "SL.UEM.TOTL.ZS" };
const BEA_NIPA_ANNUAL = "https://apps.bea.gov/national/Release/TXT/NipaDataA.txt";
const BEA_REAL_GDP_CHANGE = "A191RL";
const BLS_API = "https://api.bls.gov/publicAPI/v1/timeseries/data/";
const BLS_CPI_U = "CUUR0000SA0";
const BLS_UNEMPLOYMENT = "LNU04000000";
const ANCHOR_SOURCES = {
  wdi: `World Bank World Development Indicators (${WB}), CC BY 4.0: ${Object.values(ANCHOR_RATES).join(", ")} (unemployment is the ILO modeled estimate)`,
  bea: `US Bureau of Economic Analysis, NIPA annual series ${BEA_REAL_GDP_CHANGE}, real GDP percent change (${BEA_NIPA_ANNUAL}), public domain`,
  bls: `US Bureau of Labor Statistics, CPI-U ${BLS_CPI_U} and the unemployment rate ${BLS_UNEMPLOYMENT}, annual averages of the twelve monthly figures (${BLS_API}), public domain`,
};
const ANCHOR_MODULE = path.join(root, "packages/world/src/dataset/macro-anchors.ts");

/** The roster the identity table already pins, so the anchors need no second roster fetch. */
function seedRoster() {
  const lines = readFileSync(path.join(seedDir, "nation-identity.tsv"), "utf8").split("\n");
  return lines.filter((line) => line && !line.startsWith("#") && !line.startsWith("iso3\t")).map((line) => line.split("\t")[0]);
}

/** Each series' annual average per year; a year missing a month is refused rather than averaged over eleven. */
async function blsAnnualAverages(series, first, last) {
  const response = await fetch(BLS_API, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "admin-app vendor-nation-stats" },
    body: JSON.stringify({ seriesid: series, startyear: String(first), endyear: String(last) }),
  });
  const body = await response.json();
  if (body.status !== "REQUEST_SUCCEEDED") throw new Error(`BLS answered ${body.status}: ${JSON.stringify(body.message)}`);
  const averages = {};
  for (const entry of body.Results.series) {
    const months = {};
    for (const row of entry.data) {
      if (!/^M(0[1-9]|1[0-2])$/.test(row.period)) continue;
      const value = Number(row.value);
      if (Number.isFinite(value)) (months[row.year] ??= []).push(value);
    }
    averages[entry.seriesID] = Object.fromEntries(
      Object.entries(months).map(([year, values]) => {
        if (values.length !== 12) throw new Error(`BLS ${entry.seriesID} ${year} has ${values.length} months`);
        return [year, values.reduce((sum, value) => sum + value, 0) / 12];
      }),
    );
  }
  return averages;
}

async function usAnchors(year) {
  const nipa = await fetchText(BEA_NIPA_ANNUAL);
  const growth = new RegExp(`^${BEA_REAL_GDP_CHANGE},${year},"([^"]+)"`, "m").exec(nipa)?.[1];
  if (growth === undefined) throw new Error(`BEA ${BEA_REAL_GDP_CHANGE} has no ${year}`);
  const bls = await blsAnnualAverages([BLS_CPI_U, BLS_UNEMPLOYMENT], year - 1, year);
  const cpi = bls[BLS_CPI_U];
  return {
    growth: { value: Number(growth), year, source: "bea" },
    inflation: { value: (cpi[year] / cpi[year - 1] - 1) * 100, year, source: "bls" },
    unemployment: { value: bls[BLS_UNEMPLOYMENT][year], year, source: "bls" },
  };
}

async function macroAnchors() {
  const wdi = {};
  for (const [rate, code] of Object.entries(ANCHOR_RATES)) wdi[rate] = await worldBank(code, undefined, ANCHOR_WINDOW);
  const us = await usAnchors(ANCHOR_WINDOW.last);
  return seedRoster().map((iso3) => ({
    iso3,
    ...Object.fromEntries(
      Object.keys(ANCHOR_RATES).map((rate) => {
        if (iso3 === "USA") return [rate, us[rate]];
        const cell = wdi[rate].get(iso3);
        return [rate, cell ? { value: cell.value, year: cell.year, source: "wdi" } : undefined];
      }),
    ),
  }));
}

/**
 * Six places, finer than the bake's four, so a figure the agency publishes as
 * 2.9% is not stored as 0.0295 and printed back as 3.0%. A composed record keeps
 * the bake's four places and agrees with its anchor to within that rounding.
 */
const anchorFraction = (percent) => Math.round((percent / 100) * 1_000_000) / 1_000_000;

function writeAnchors(fetched, rows) {
  const rates = Object.keys(ANCHOR_RATES);
  const lines = [
    "# Macro anchors, vendored by scripts/vendor-nation-stats.mjs — do not edit by hand.",
    `# fetched: ${fetched}`,
    ...Object.entries(ANCHOR_SOURCES).map(([id, source]) => `# source ${id}: ${source}`),
    `# vintage: each cell is the latest non-null year in ${ANCHOR_WINDOW.first}:${ANCHOR_WINDOW.last}, in percent, the year after an @; an empty cell has no anchor`,
    ["iso3", ...rates, ...rates.map((rate) => `${rate}_source`)].join("\t"),
    ...rows.map((row) =>
      [row.iso3, ...rates.map((rate) => (row[rate] ? `${row[rate].value}@${row[rate].year}` : "")), ...rates.map((rate) => row[rate]?.source ?? "")].join("\t"),
    ),
  ];
  writeFileSync(path.join(seedDir, "macro-anchors.tsv"), lines.join("\n") + "\n");
}

function writeAnchorModule(fetched, rows) {
  const rates = Object.keys(ANCHOR_RATES);
  const entry = (row) =>
    JSON.stringify(Object.fromEntries(rates.flatMap((rate) => (row[rate] ? [[rate, { ...row[rate], value: anchorFraction(row[rate].value) }]] : []))));
  const lines = [
    "// Written by scripts/vendor-nation-stats.mjs --anchors from seed/macro-anchors.tsv; do not edit by hand.",
    "//",
    "// Where each economy's growth, inflation and unemployment rest when nothing is",
    "// happening to it, as fractions a year, each with the year and the source it",
    "// was published by. Every nation's authored rates are held to these figures",
    "// wherever one exists, and the engine reverts an economy toward its authored",
    "// record, so a rate here is where that country's economy sits until something",
    "// moves it.",
    "",
    'export type MacroAnchorSource = "wdi" | "bea" | "bls";',
    "",
    "export type MacroAnchorFigure = { readonly value: number; readonly year: number; readonly source: MacroAnchorSource };",
    "",
    "export type MacroAnchor = {",
    "  readonly growth?: MacroAnchorFigure;",
    "  readonly inflation?: MacroAnchorFigure;",
    "  readonly unemployment?: MacroAnchorFigure;",
    "};",
    "",
    `export const MACRO_ANCHORS_FETCHED = ${JSON.stringify(fetched)};`,
    "",
    "export const MACRO_ANCHOR_SOURCES: Readonly<Record<MacroAnchorSource, string>> = {",
    ...Object.entries(ANCHOR_SOURCES).map(([id, source]) => `  ${id}: ${JSON.stringify(source)},`),
    "};",
    "",
    "// prettier-ignore",
    "export const MACRO_ANCHORS: Readonly<Record<string, MacroAnchor>> = {",
    ...rows.filter((row) => rates.some((rate) => row[rate])).map((row) => `  ${JSON.stringify(row.iso3)}: ${entry(row)},`),
    "};",
  ];
  writeFileSync(ANCHOR_MODULE, lines.join("\n") + "\n");
}

async function vendorAnchors(fetched) {
  const rows = await macroAnchors();
  writeAnchors(fetched, rows);
  writeAnchorModule(fetched, rows);
  const anchored = rows.filter((row) => Object.keys(ANCHOR_RATES).some((rate) => row[rate])).length;
  console.log(`macro anchors: ${anchored} of ${rows.length} governments carry at least one`);
}

async function main() {
  const fetched = new Date().toISOString().slice(0, 10);
  if (process.argv.includes("--anchors")) return vendorAnchors(fetched);
  if (process.argv.includes("--fiscal")) return vendorFiscal(fetched);
  const scratch = mkdtempSync(path.join(tmpdir(), "vendor-nation-stats-"));
  const { geonames, roster, members } = await identities();
  writeIdentity(fetched, geonames, roster);
  writeParties(fetched, roster);

  const figures = {};
  for (const [column, code] of Object.entries(WDI)) figures[column] = await worldBank(code);
  for (const [column, code] of Object.entries(WGI)) figures[column] = await worldBank(code, 3);
  writeFigures("nation-figures.tsv", [
    "# Nation figures, vendored by scripts/vendor-nation-stats.mjs — do not edit by hand.",
    `# fetched: ${fetched}`,
    "# source: World Bank World Development Indicators and Worldwide Governance Indicators (api.worldbank.org/v2), CC BY 4.0; military spending is SIPRI's and homicide UNODC's, republished by the World Bank",
  ], roster, figures);

  const fiscal = await fiscalSpace(scratch);
  writeFiscal(fetched, roster, fiscal);
  writeFiscalAnchorModule(fetched, roster, fiscal);

  writeFigures("nation-energy.tsv", [
    "# Nation energy figures, vendored by scripts/vendor-nation-stats.mjs — do not edit by hand.",
    `# fetched: ${fetched}`,
    `# source: US Energy Information Administration, International Energy Statistics bulk file (${EIA_INTL}), public domain`,
    "# unit: quadrillion Btu of primary energy; the fuel columns are consumption, and coal, gas and oil production are kept to tell which fuel a producer exports",
  ], roster, await eiaEnergy(scratch));

  console.log(`roster ${roster.length} (${members} UN members): identity, figures, fiscal and energy written`);
  await vendorAnchors(fetched);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
