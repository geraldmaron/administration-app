// A polite, cached SPARQL client over Wikidata for the vendor scripts.
//
// It queries QLever (University of Freiburg), a public SPARQL engine over the
// same Wikidata dump, rather than the Wikimedia query service: the counts the
// name banks need (every citizen's given name, grouped) run in a second or two
// there and time out at Wikimedia's sixty seconds. The data is Wikidata's, CC0,
// whichever engine answers. QLever declares no default prefixes, so the ones
// these queries use are prepended.
//
// A query that fails in passing (a 5xx, a dropped connection) is retried with a
// growing pause, and every answer is cached under the OS temp directory by the
// query's hash, so an interrupted run resumes rather than starting over.
// `--fresh` on the calling script bypasses the cache.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ENDPOINT = "https://qlever.dev/api/wikidata";
const PREFIXES = [
  "PREFIX wd: <http://www.wikidata.org/entity/>",
  "PREFIX wdt: <http://www.wikidata.org/prop/direct/>",
  "PREFIX p: <http://www.wikidata.org/prop/>",
  "PREFIX ps: <http://www.wikidata.org/prop/statement/>",
  "PREFIX pq: <http://www.wikidata.org/prop/qualifier/>",
  "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
  "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
  "PREFIX wikibase: <http://wikiba.se/ontology#>",
].join("\n");
const USER_AGENT = "admin-app-dataset-vendor/1.0 (nation roster vendor, run by hand)";
const PAUSE_MS = 400;
const ATTEMPTS = 5;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function wikidataClient(cacheName, { fresh = false } = {}) {
  const cacheDir = path.join(tmpdir(), cacheName);
  mkdirSync(cacheDir, { recursive: true });
  return async function sparql(query) {
    const key = createHash("sha256").update(query).digest("hex").slice(0, 24);
    const cached = path.join(cacheDir, `${key}.json`);
    if (!fresh && existsSync(cached)) return JSON.parse(readFileSync(cached, "utf8"));
    let failure = "";
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      await pause(PAUSE_MS * attempt);
      try {
        const response = await fetch(`${ENDPOINT}?query=${encodeURIComponent(`${PREFIXES}\n${query}`)}`, {
          headers: { accept: "application/sparql-results+json", "user-agent": USER_AGENT },
        });
        if (response.ok) {
          const body = await response.json();
          const rows = body.results.bindings.map((binding) => Object.fromEntries(Object.entries(binding).map(([k, v]) => [k, v.value])));
          writeFileSync(cached, JSON.stringify(rows));
          return rows;
        }
        failure = `answered ${response.status}`;
      } catch (error) {
        // The service drops long connections under load; a dropped socket is
        // the same passing condition a 504 is, and is retried the same way.
        failure = `dropped the connection (${error.cause?.code ?? error.message})`;
      }
    }
    throw new Error(`Wikidata ${failure} ${ATTEMPTS} times running: ${query.slice(0, 160)}`);
  };
}

export const qid = (uri) => uri.replace(/^.*\/entity\//, "");

/**
 * ISO3 → the Wikidata item for that government, preferring a sovereign state
 * over a territory sharing the code. Kosovo's XKX is user-assigned rather than
 * ISO's, so no item carries it; it is named here by the convention the World
 * Bank and the European Commission use.
 */
const UNASSIGNED_CODES = { XKX: "Q1246" };

export async function countryItems(sparql, roster) {
  const rows = await sparql(`SELECT ?iso3 ?country (COUNT(?type) AS ?sovereign) WHERE {
    ?country wdt:P298 ?iso3.
    OPTIONAL { ?country wdt:P31 ?type. VALUES ?type { wd:Q3624078 wd:Q6256 wd:Q15634554 } }
  } GROUP BY ?iso3 ?country`);
  const best = new Map();
  for (const row of rows) {
    const seen = best.get(row.iso3);
    if (!seen || Number(row.sovereign) > Number(seen.sovereign)) best.set(row.iso3, row);
  }
  const missing = roster.filter((iso3) => !best.has(iso3) && !UNASSIGNED_CODES[iso3]);
  if (missing.length > 0) throw new Error(`no Wikidata item carries ISO3 ${missing.join(", ")}`);
  return new Map(roster.map((iso3) => [iso3, UNASSIGNED_CODES[iso3] ?? qid(best.get(iso3).country)]));
}
