#!/usr/bin/env node
// Vendors the facts about each roster government that Wikidata states and the
// statistical sources do not: its capital's population, the universities its
// officials come out of, and what its seated parties say they believe.
//
// Network, run rarely. Reads the roster and the seated parties from the seed
// tables scripts/vendor-nation-stats.mjs writes, and writes three pinned tables
// beside them. Wikidata is CC0, so nothing here carries an attribution
// obligation; the headers name it anyway, because a figure nobody can trace is
// a figure nobody can check.
//
// Queries are batched by country and filtered client-side where a server-side
// filter makes the query service time out (a dissolved university is dropped
// here, not in SPARQL). Answers are cached (scripts/lib/wikidata.mjs), so an
// interrupted run resumes.
//
// Usage: node scripts/vendor-nation-wikidata.mjs [--fresh]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countryItems, qid, wikidataClient } from "./lib/wikidata.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedDir = path.join(root, "packages/world/src/dataset/seed");
const BATCH = 8;

/** Kinds of institution a flagship university is recorded as. */
const UNIVERSITY_KINDS = ["Q3918", "Q875538", "Q902104", "Q15936437"];
/** Kinds of ticket a seated party or electoral alliance is recorded as. */
const PARTY_KINDS = ["Q7278", "Q1823134", "Q6138528", "Q2169023"];

function readSeed(file) {
  const lines = readFileSync(path.join(seedDir, file), "utf8").split("\n").filter((line) => line && !line.startsWith("#"));
  const columns = lines[0].split("\t");
  return lines.slice(1).map((line) => Object.fromEntries(line.split("\t").map((cell, i) => [columns[i], cell])));
}

const clean = (value) => String(value ?? "").replace(/[\t\n\r]+/g, " ").trim();
const normalize = (name) => name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
const values = (ids) => ids.map((id) => `wd:${id}`).join(" ");

function batches(list) {
  const out = [];
  for (let i = 0; i < list.length; i += BATCH) out.push(list.slice(i, i + BATCH));
  return out;
}

/**
 * Where the game names a seat of government other than the capital Wikidata
 * records, the city it names: Bolivia's government sits in La Paz, not Sucre;
 * Equatorial Guinea's in Malabo, not the unfinished Ciudad de la Paz; the
 * Palestinian Authority's in Ramallah, not East Jerusalem.
 */
const CAPITAL_ITEMS = { BOL: "Q1491", GNQ: "Q3818", PSE: "Q158119" };

/** The capital's latest population statement. Where a country names two capitals, the one the seed names wins. */
async function capitalPopulations(sparql, items, identity) {
  const rows = await sparql(`SELECT ?country ?capital ?name ?population ?date WHERE {
    ?country wdt:P298 ?iso3; wdt:P36 ?capital. ?capital rdfs:label ?name. FILTER(LANG(?name) = "en")
    ?capital p:P1082 ?statement. ?statement ps:P1082 ?population.
    OPTIONAL { ?statement pq:P585 ?date }
  }`);
  const kosovo = items.get("XKX");
  const extra = await sparql(`SELECT ?capital ?name ?population ?date WHERE {
    wd:${kosovo} wdt:P36 ?capital. ?capital rdfs:label ?name. FILTER(LANG(?name) = "en")
    ?capital p:P1082 ?statement. ?statement ps:P1082 ?population. OPTIONAL { ?statement pq:P585 ?date }
  }`);
  const named = await sparql(`SELECT ?capital ?name ?population ?date WHERE {
    VALUES ?capital { ${values(Object.values(CAPITAL_ITEMS))} }
    ?capital rdfs:label ?name. FILTER(LANG(?name) = "en")
    ?capital p:P1082 ?statement. ?statement ps:P1082 ?population. OPTIONAL { ?statement pq:P585 ?date }
  }`);
  const all = [...rows, ...extra.map((row) => ({ ...row, country: `http://www.wikidata.org/entity/${kosovo}` }))];
  const lines = [];
  for (const [iso3, item] of items) {
    const byCapital = new Map();
    const namedCapital = CAPITAL_ITEMS[iso3];
    const candidates = namedCapital ? named.filter((r) => qid(r.capital) === namedCapital) : all.filter((r) => qid(r.country) === item);
    for (const row of candidates) {
      const year = row.date ? Number(row.date.slice(0, 4)) : 0;
      const seen = byCapital.get(row.capital);
      if (!seen || year > seen.year) byCapital.set(row.capital, { name: row.name, population: Math.round(Number(row.population)), year });
    }
    const seedCapital = normalize(identity.get(iso3)?.capital ?? "");
    const capitals = [...byCapital.values()];
    const chosen = capitals.find((c) => normalize(c.name) === seedCapital) ?? capitals.sort((a, b) => b.population - a.population)[0];
    if (chosen) lines.push([iso3, chosen.name, chosen.population, chosen.year || ""].map(clean).join("\t"));
  }
  return lines;
}

/** Each country's universities still operating, most-documented first. */
async function universities(sparql, items) {
  const byItem = new Map([...items].map(([iso3, item]) => [item, iso3]));
  const found = new Map();
  for (const group of batches([...items.values()])) {
    const rows = await sparql(`SELECT ?country ?uni ?name ?links ?dissolved WHERE {
      VALUES ?country { ${values(group)} }
      VALUES ?kind { ${values(UNIVERSITY_KINDS)} }
      ?uni wdt:P17 ?country; wdt:P31 ?kind; wikibase:sitelinks ?links; rdfs:label ?name. FILTER(LANG(?name) = "en")
      OPTIONAL { ?uni wdt:P576 ?dissolved }
    }`);
    for (const row of rows) {
      if (row.dissolved) continue;
      const iso3 = byItem.get(qid(row.country));
      const list = found.get(iso3) ?? new Map();
      list.set(row.uni, row);
      found.set(iso3, list);
    }
  }
  const lines = [];
  for (const iso3 of items.keys()) {
    const ranked = [...(found.get(iso3)?.values() ?? [])].sort((a, b) => Number(b.links) - Number(a.links) || a.name.localeCompare(b.name)).slice(0, 5);
    ranked.forEach((row, i) => lines.push([iso3, i + 1, row.name, row.links, qid(row.uni)].map(clean).join("\t")));
  }
  return lines;
}

/** What each seated ticket says it believes, matched to the Factbook's name or abbreviation within its own country. */
async function partyIdeologies(sparql, items, parties) {
  const byItem = new Map([...items].map(([iso3, item]) => [item, iso3]));
  const seatedBy = new Map();
  for (const party of parties) seatedBy.set(party.iso3, [...(seatedBy.get(party.iso3) ?? []), party]);
  const known = new Map();
  for (const group of batches([...seatedBy.keys()].map((iso3) => items.get(iso3)))) {
    const rows = await sparql(`SELECT ?country ?party ?name ?short (GROUP_CONCAT(DISTINCT ?ideologyName; separator="|") AS ?ideologies) WHERE {
      VALUES ?country { ${values(group)} }
      VALUES ?kind { ${values(PARTY_KINDS)} }
      ?party wdt:P17 ?country; wdt:P31 ?kind; rdfs:label ?name. FILTER(LANG(?name) = "en")
      OPTIONAL { ?party wdt:P1813 ?short }
      OPTIONAL { ?party wdt:P1142 ?ideology. ?ideology rdfs:label ?ideologyName. FILTER(LANG(?ideologyName) = "en") }
    } GROUP BY ?country ?party ?name ?short`);
    for (const row of rows) {
      const iso3 = byItem.get(qid(row.country));
      known.set(iso3, [...(known.get(iso3) ?? []), row]);
    }
  }
  const lines = [];
  for (const [iso3, seated] of seatedBy) {
    const rows = known.get(iso3) ?? [];
    for (const party of seated) {
      const wanted = [normalize(party.name), normalize(party.short)].filter(Boolean);
      const match = rows.find((row) => wanted.includes(normalize(row.name))) ?? rows.find((row) => row.short && wanted.includes(normalize(row.short)));
      lines.push([iso3, party.rank, party.name, match ? qid(match.party) : "", match?.name ?? "", match?.ideologies ?? ""].map(clean).join("\t"));
    }
  }
  return lines;
}

function write(file, header, columns, lines) {
  const fetched = new Date().toISOString().slice(0, 10);
  const text = [`# ${header}, vendored by scripts/vendor-nation-wikidata.mjs — do not edit by hand.`, `# fetched: ${fetched}`, "# source: Wikidata (query.wikidata.org), CC0", columns.join("\t"), ...lines].join("\n");
  writeFileSync(path.join(seedDir, file), `${text}\n`);
}

async function main() {
  const sparql = wikidataClient("vendor-nation-wikidata", { fresh: process.argv.includes("--fresh") });
  const identityRows = readSeed("nation-identity.tsv");
  const identity = new Map(identityRows.map((row) => [row.iso3, row]));
  const items = await countryItems(sparql, identityRows.map((row) => row.iso3));
  write("capital-population-wikidata.tsv", "Capital-city population", ["iso3", "capital", "population", "year"], await capitalPopulations(sparql, items, identity));
  console.log("capitals written");
  write("nation-universities.tsv", "Universities by country, most-documented first (Wikipedia sitelinks)", ["iso3", "rank", "name", "sitelinks", "qid"], await universities(sparql, items));
  console.log("universities written");
  write("nation-party-ideologies.tsv", "Stated ideologies of the Factbook's seated parties, matched by name or abbreviation", ["iso3", "rank", "factbook_name", "qid", "wikidata_name", "ideologies"], await partyIdeologies(sparql, items, readSeed("nation-parties.tsv")));
  console.log("party ideologies written");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
