#!/usr/bin/env node
// Vendors the published United States series the economy room draws behind the
// inauguration: the unemployment rate and the consumer price index from the
// Bureau of Labor Statistics, and real GDP growth from the Bureau of Economic
// Analysis. Monthly (quarterly for GDP) from January 2017 to the latest
// release, exactly as the agency published it. A month the agency did not
// publish is left out, not filled: October 2025 has no CPI or unemployment
// figure because the 2025 lapse in appropriations stopped the collection.
//
// Two steps, so the table can be rebaked offline:
//   node scripts/vendor-us-series.mjs          fetch, write seed/us-series.tsv, bake us-series.ts
//   node scripts/vendor-us-series.mjs --bake   bake us-series.ts from the seed already on disk
//
// The vintage column is the publication date of the release the figures came
// from. It is passed in rather than scraped, because neither agency's data
// endpoint states it: read it off the BLS release schedule and the BEA flat
// file's Last-Modified header, and pass it as --vintage series=YYYY-MM-DD.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedPath = path.join(root, "packages/world/src/dataset/seed/us-series.tsv");
const outPath = path.join(root, "packages/world/src/dataset/us-series.ts");
const FIRST_YEAR = 2017;

const BLS_API = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const BEA_FILE = "https://apps.bea.gov/national/Release/TXT/NipaDataQ.txt";

const SOURCES = {
  unemployment: `US Bureau of Labor Statistics, Current Population Survey, unemployment rate, seasonally adjusted, percent (series LNS14000000; ${BLS_API}); release schedule https://www.bls.gov/bls/news-release/empsit.htm; public domain`,
  cpi: `US Bureau of Labor Statistics, CPI-U all items, U.S. city average, not seasonally adjusted, index 1982-84=100 (series CUUR0000SA0; ${BLS_API}); release schedule https://www.bls.gov/schedule/news_release/cpi.htm; public domain`,
  "gdp-growth": `US Bureau of Economic Analysis, NIPA Table 1.1.11 line 1, real GDP, percent change from the same quarter a year ago (series A191RO; ${BEA_FILE}); public domain`,
};

function vintages() {
  const out = {};
  process.argv.forEach((arg, index) => {
    if (arg !== "--vintage") return;
    const [series, date] = (process.argv[index + 1] ?? "").split("=");
    if (!SOURCES[series] || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error(`--vintage wants series=YYYY-MM-DD, got ${process.argv[index + 1]}`);
    out[series] = date;
  });
  const missing = Object.keys(SOURCES).filter((series) => !out[series]);
  if (missing.length > 0) throw new Error(`no --vintage for ${missing.join(", ")}: every row states the release it came from`);
  return out;
}

// The keyless API answers at most ten years a request, so a longer span is asked for in windows.
async function blsWindow(id, firstYear, lastYear) {
  const response = await fetch(BLS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seriesid: [id], startyear: String(firstYear), endyear: String(lastYear) }),
  });
  if (!response.ok) throw new Error(`BLS ${id}: HTTP ${response.status}`);
  const body = await response.json();
  if (body.status !== "REQUEST_SUCCEEDED") throw new Error(`BLS ${id}: ${body.status} ${JSON.stringify(body.message)}`);
  return body.Results.series[0]?.data ?? [];
}

async function blsSeries(id, firstYear, lastYear) {
  const data = [];
  for (let start = firstYear; start <= lastYear; start += 10) data.push(...(await blsWindow(id, start, Math.min(lastYear, start + 9))));
  return data
    .filter((row) => /^M(0[1-9]|1[0-2])$/.test(row.period) && row.value !== "-" && row.value !== "")
    .map((row) => ({ date: `${row.year}-${row.period.slice(1)}`, value: Number(row.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function beaSeries(code) {
  const response = await fetch(BEA_FILE);
  if (!response.ok) throw new Error(`BEA: HTTP ${response.status}`);
  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line.startsWith(`${code},`))
    .map((line) => {
      const [, period, quoted] = line.match(/^[^,]+,(\d{4}Q[1-4]),"?([^"]*)"?/) ?? [];
      return { period, value: Number(String(quoted).replaceAll(",", "")) };
    })
    .filter((row) => row.period && Number(row.period.slice(0, 4)) >= FIRST_YEAR && Number.isFinite(row.value))
    .map((row) => ({ date: `${row.period.slice(0, 4)}-Q${row.period.slice(5)}`, value: row.value }));
}

async function fetchSeed() {
  const vintage = vintages();
  const lastYear = new Date().getUTCFullYear();
  const series = {
    unemployment: await blsSeries("LNS14000000", FIRST_YEAR, lastYear),
    // A year earlier than the rest, so the twelve-month change it is read as
    // starts in January 2017 with the others.
    cpi: await blsSeries("CUUR0000SA0", FIRST_YEAR - 1, lastYear),
    "gdp-growth": await beaSeries("A191RO"),
  };
  const fetched = new Date().toISOString().slice(0, 10);
  const lines = Object.entries(series).flatMap(([name, rows]) => {
    if (rows.length === 0) throw new Error(`${name}: the source returned no rows`);
    return rows.map((row) => `${name}\t${row.date}\t${row.value}\t${name}\t${vintage[name]}`);
  });
  const text = [
    "# United States series, vendored by scripts/vendor-us-series.mjs — do not edit by hand.",
    `# opened: ${fetched}`,
    ...Object.entries(SOURCES).map(([name, source]) => `# source ${name}: ${source}`),
    "# vintage: the publication date of the release each row came from; a month the agency did not publish has no row",
    "series\tdate\tvalue\tsource\tvintage",
    ...lines,
  ].join("\n");
  writeFileSync(seedPath, `${text}\n`);
  console.log(Object.entries(series).map(([name, rows]) => `${name}: ${rows.length} rows to ${rows.at(-1).date}`).join("; "));
}

function readSeed() {
  const lines = readFileSync(seedPath, "utf8").split("\n");
  const opened = lines.find((line) => line.startsWith("# opened: "))?.slice("# opened: ".length);
  const sources = Object.fromEntries(
    lines
      .filter((line) => line.startsWith("# source "))
      .map((line) => {
        const [, name, text] = line.match(/^# source ([^:]+): (.*)$/) ?? [];
        return [name, text];
      }),
  );
  const rows = lines
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("series\t"))
    .map((line) => {
      const [series, date, value, source, vintage] = line.split("\t");
      if (!sources[source]) throw new Error(`us-series.tsv: row ${series} ${date} names source ${source}, which the header does not state`);
      return { series, date, value: Number(value), vintage };
    });
  if (!opened) throw new Error("us-series.tsv states no opened date");
  return { opened, sources, rows };
}

function bake() {
  const { opened, sources, rows } = readSeed();
  const bySeries = new Map();
  for (const row of rows) bySeries.set(row.series, [...(bySeries.get(row.series) ?? []), row]);
  const vintage = rows.map((row) => row.vintage).sort().at(-1);
  const series = [...bySeries.entries()]
    .map(([name, points]) => `  ${JSON.stringify(name)}: [\n${points.map((p) => `    { date: ${JSON.stringify(p.date)}, value: ${p.value} },`).join("\n")}\n  ],`)
    .join("\n");
  const sourceLines = Object.entries(sources).map(([name, text]) => `  ${JSON.stringify(name)}: ${JSON.stringify(`${text}; opened ${opened}`)},`);
  const vintageLines = [...bySeries.entries()].map(([name, points]) => `  ${JSON.stringify(name)}: ${JSON.stringify(points.at(-1).vintage)},`);
  const out = `// Written by scripts/vendor-us-series.mjs from seed/us-series.tsv; do not edit by hand.
//
// Published United States series, as the statistical agencies report them.
//
// The economy the player reads is simulated from the opening snapshot forward,
// which means a chart of it starts on the inauguration and has nothing behind
// it. A President looking at unemployment wants to know where it has been, and
// "since you took office" is nine weeks of it.
//
// Each series is a list of dated observations in the units the agency
// publishes: "YYYY-MM" for a monthly figure, "YYYY-Qn" for a quarterly one. A
// month the agency did not publish is absent rather than filled. The vintage is
// the day the latest release these numbers came from was published; everything
// after it and before the inauguration is a projection, and is labeled so by
// whoever draws it.

export type UsSeriesPoint = { readonly date: string; readonly value: number };

// prettier-ignore
export const US_SERIES: Readonly<Record<string, readonly UsSeriesPoint[]>> = {
${series}
};

export const US_SERIES_SOURCES: Readonly<Record<string, string>> = {
${sourceLines.join("\n")}
};

/** The publication date of each series' latest release. */
export const US_SERIES_RELEASES: Readonly<Record<string, string>> = {
${vintageLines.join("\n")}
};

export const US_SERIES_VINTAGE: string | undefined = ${JSON.stringify(vintage)};
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
