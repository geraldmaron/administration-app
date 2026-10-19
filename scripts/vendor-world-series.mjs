#!/usr/bin/env node
// Vendors a small international reference pack from the World Bank's World
// Development Indicators: the unemployment rate, consumer-price inflation,
// population growth and real GDP growth, annual, for the United States and five large advanced
// economies. They are the real-world reference the comparison panel draws when
// it sets countries beside each other; the campaign's own countries are
// simulated and are never mixed into these.
//
// Two steps, so the table can be rebaked offline:
//   node scripts/vendor-world-series.mjs          fetch, write seed/world-series.tsv, bake world-series.ts
//   node scripts/vendor-world-series.mjs --bake   bake world-series.ts from the seed already on disk
//
// The vintage on every row is the World Bank's own "last updated" date for the
// WDI database as the API states it. A year the source did not publish is kept
// as a row with an empty value inside a series' coverage, so a gap is a gap and
// never a zero or an interpolation. Leading and trailing years with no value
// are not rows: they are outside the series' coverage.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedPath = path.join(root, "packages/world/src/dataset/seed/world-series.tsv");
const outPath = path.join(root, "packages/world/src/dataset/world-series.ts");

const API = "https://api.worldbank.org/v2";
const COUNTRIES = { USA: "United States", GBR: "United Kingdom", DEU: "Germany", FRA: "France", JPN: "Japan", CAN: "Canada" };
const FIRST_YEAR = 1960;

const SERIES = {
  unemployment: {
    code: "SL.UEM.TOTL.ZS",
    source: "World Bank, World Development Indicators, SL.UEM.TOTL.ZS, unemployment, total (% of total labor force), modeled ILO estimate, annual; ILO modeled-estimates database via ILOSTAT",
  },
  inflation: {
    code: "FP.CPI.TOTL.ZG",
    source: "World Bank, World Development Indicators, FP.CPI.TOTL.ZG, inflation, consumer prices (annual %), annual percent change in the consumer price index; IMF International Financial Statistics",
  },
  "population-growth": {
    code: "SP.POP.GROW",
    source: "World Bank, World Development Indicators, SP.POP.GROW, population growth (annual %), exponential growth rate of midyear population; derived from total population, UN Population Division World Population Prospects and national statistical offices",
  },
  "gdp-growth": {
    code: "NY.GDP.MKTP.KD.ZG",
    source: "World Bank, World Development Indicators, NY.GDP.MKTP.KD.ZG, GDP growth (annual %), percent change in constant-price GDP; national statistical offices and OECD national accounts files",
  },
};
const LICENSE = "Creative Commons Attribution 4.0 (World Bank Data Catalog, World Development Indicators); attribute The World Bank Group and the original providers named in each series";

async function indicator(code) {
  const url = `${API}/country/${Object.keys(COUNTRIES).join(";")}/indicator/${code}?format=json&per_page=2000&date=${FIRST_YEAR}:${new Date().getUTCFullYear()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`World Bank ${code}: HTTP ${response.status}`);
  const [meta, rows] = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`World Bank ${code}: no rows (${JSON.stringify(meta)})`);
  if (meta.pages > 1) throw new Error(`World Bank ${code}: ${meta.pages} pages; raise per_page`);
  return { updated: meta.lastupdated, rows };
}

function trimmed(rows) {
  const byCountry = new Map();
  for (const row of rows) byCountry.set(row.countryiso3code, [...(byCountry.get(row.countryiso3code) ?? []), { date: row.date, value: row.value }]);
  const out = [];
  for (const [country, points] of byCountry) {
    const sorted = points.sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted.findIndex((p) => p.value !== null);
    const last = sorted.length - 1 - [...sorted].reverse().findIndex((p) => p.value !== null);
    if (first < 0) throw new Error(`${country}: no value in any year`);
    for (const p of sorted.slice(first, last + 1)) out.push({ country, date: p.date, value: p.value });
  }
  return out;
}

async function fetchSeed() {
  const fetched = new Date().toISOString().slice(0, 10);
  const lines = [];
  for (const [name, spec] of Object.entries(SERIES)) {
    const { updated, rows } = await indicator(spec.code);
    const kept = trimmed(rows);
    for (const row of kept) lines.push(`${name}\t${row.country}\t${row.date}\t${row.value === null ? "" : row.value}\t${name}\t${updated}`);
    console.log(`${name}: ${kept.length} rows, WDI updated ${updated}`);
  }
  const text = [
    "# World Bank reference series, vendored by scripts/vendor-world-series.mjs — do not edit by hand.",
    `# opened: ${fetched}`,
    `# license: ${LICENSE}`,
    ...Object.entries(SERIES).map(([name, spec]) => `# source ${name}: ${spec.source}`),
    ...Object.entries(COUNTRIES).map(([code, label]) => `# country ${code}: ${label}`),
    "# vintage: the World Bank's last-updated date for the WDI database the row came from; an empty value is a year inside coverage the source did not publish",
    "series\tcountry\tdate\tvalue\tsource\tvintage",
    ...lines,
  ].join("\n");
  writeFileSync(seedPath, `${text}\n`);
}

function header(lines, key) {
  return Object.fromEntries(
    lines
      .filter((line) => line.startsWith(`# ${key} `))
      .map((line) => {
        const [, name, text] = line.match(new RegExp(`^# ${key} ([^:]+): (.*)$`)) ?? [];
        return [name, text];
      }),
  );
}

function readSeed() {
  const lines = readFileSync(seedPath, "utf8").split("\n");
  const opened = lines.find((line) => line.startsWith("# opened: "))?.slice("# opened: ".length);
  const license = lines.find((line) => line.startsWith("# license: "))?.slice("# license: ".length);
  const sources = header(lines, "source");
  const countries = header(lines, "country");
  const rows = lines
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("series\t"))
    .map((line) => {
      const [series, country, date, value, source, vintage] = line.split("\t");
      if (!sources[source]) throw new Error(`world-series.tsv: ${series} ${country} ${date} names source ${source}, which the header does not state`);
      if (!countries[country]) throw new Error(`world-series.tsv: ${country} is not named in the header`);
      return { series, country, date, value: value === "" ? null : Number(value), vintage };
    });
  if (!opened || !license) throw new Error("world-series.tsv states no opened date or license");
  return { opened, license, sources, countries, rows };
}

function bake() {
  const { opened, license, sources, countries, rows } = readSeed();
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.series}\t${row.country}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  const bySeries = new Map();
  for (const [key, points] of grouped) {
    const [series, country] = key.split("\t");
    bySeries.set(series, [...(bySeries.get(series) ?? []), [country, points]]);
  }
  const body = [...bySeries.entries()]
    .map(([series, countryRows]) => {
      const inner = countryRows
        .map(([country, points]) => `    ${JSON.stringify(country)}: [\n${points.map((p) => `      { date: ${JSON.stringify(p.date)}, value: ${p.value} },`).join("\n")}\n    ],`)
        .join("\n");
      return `  ${JSON.stringify(series)}: {\n${inner}\n  },`;
    })
    .join("\n");
  const sourceLines = Object.entries(sources).map(([name, text]) => `  ${JSON.stringify(name)}: ${JSON.stringify(`${text}; opened ${opened}`)},`);
  const vintage = rows.map((row) => row.vintage).sort().at(-1);
  const out = `// Written by scripts/vendor-world-series.mjs from seed/world-series.tsv; do not edit by hand.
//
// A small real-world international reference: annual unemployment, consumer
// inflation and real GDP growth for the United States and five large advanced
// economies, from the World Bank's World Development Indicators. These are
// published figures, and are never mixed with the campaign's simulated
// countries. A value of null is a year inside coverage that the source did not
// publish; years outside a series' coverage are absent.

export type WorldSeriesPoint = { readonly date: string; readonly value: number | null };

// prettier-ignore
export const WORLD_SERIES: Readonly<Record<string, Readonly<Record<string, readonly WorldSeriesPoint[]>>>> = {
${body}
};

export const WORLD_SERIES_SOURCES: Readonly<Record<string, string>> = {
${sourceLines.join("\n")}
};

export const WORLD_SERIES_COUNTRIES: Readonly<Record<string, string>> = {
${Object.entries(countries).map(([code, label]) => `  ${JSON.stringify(code)}: ${JSON.stringify(label)},`).join("\n")}
};

export const WORLD_SERIES_LICENSE = ${JSON.stringify(license)};

/** The World Bank's last-updated date for the database these rows came from. */
export const WORLD_SERIES_VINTAGE = ${JSON.stringify(vintage)};

export const WORLD_SERIES_OPENED = ${JSON.stringify(opened)};
`;
  writeFileSync(outPath, out);
  console.log(`Wrote ${rows.length} observations in ${bySeries.size} series (vintage ${vintage}) → ${path.relative(root, outPath)}`);
}

async function main() {
  if (!process.argv.includes("--bake")) await fetchSeed();
  bake();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
