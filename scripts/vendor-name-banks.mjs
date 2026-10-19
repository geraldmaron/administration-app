#!/usr/bin/env node
// Vendors the names a country's officials are drawn from.
//
// The authored banks cover the naming traditions of the 61 countries written
// by hand. A roster of every recognized government needs dozens more, and a
// bank typed from memory is exactly what the dataset refuses: so each new
// tradition is counted from Wikidata instead. For the people who hold a
// country's citizenship and were born since 1940, it counts how often each
// given name occurs (by the person's recorded sex) and how often each family
// name occurs among men — men only because several traditions inflect the
// surname by sex (Czech -ová, Lithuanian -ienė, Greek -ou), and a bank has one
// surname list: a woman drawing the masculine form is the convention the
// authored banks already accept, a man drawing the feminine one is not.
//
// Wikidata's people skew toward the notable — footballers, politicians,
// writers — so the counts are of real names in real use, weighted toward the
// public life a president's counterparts come from. Pools of small countries
// share a bank where their naming is one tradition.
//
// Network, slow (two queries per culture, cached). Writes one table per
// culture under packages/world/src/dataset/seed/name-banks/; the bake
// (scripts/bake-name-banks.mjs) turns them into NameBanks.
//
// Usage: node scripts/vendor-name-banks.mjs [--fresh] [culture ...]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countryItems, wikidataClient } from "./lib/wikidata.mjs";
import { NAME_BANKS } from "../packages/world/dist/dataset/name-banks.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedDir = path.join(root, "packages/world/src/dataset/seed");
const outDir = path.join(seedDir, "name-banks");

/** Culture → the citizenships its names are counted over. */
const VENDORED_CULTURES = {
  greek: "GRC CYP",
  romanian: "ROU MDA",
  "serbo-croatian": "HRV BIH MNE",
  serbian: "SRB",
  macedonian: "MKD",
  slovene: "SVN",
  bulgarian: "BGR",
  "czech-slovak": "CZE SVK",
  finnish: "FIN",
  estonian: "EST",
  latvian: "LVA",
  lithuanian: "LTU",
  albanian: "ALB XKX",
  georgian: "GEO",
  armenian: "ARM",
  azerbaijani: "AZE",
  mongolian: "MNG",
  khmer: "KHM",
  lao: "LAO",
  sinhalese: "LKA",
  nepali: "NPL",
  bhutanese: "BTN",
  malagasy: "MDG",
  maltese: "MLT",
  polynesian: "WSM TON TUV",
  melanesian: "FJI PNG SLB VUT",
  micronesian: "KIR MHL FSM NRU PLW",
  somali: "SOM DJI",
  "great-lakes": "RWA BDI",
  kenyan: "KEN",
  tanzanian: "TZA",
  ugandan: "UGA",
  "south-sudanese": "SSD",
  senegambian: "SEN GMB",
  mande: "MLI GIN",
  burkinabe: "BFA",
  nigerien: "NER",
  ivorian: "CIV",
  "gbe-speaking": "BEN TGO",
  ghanaian: "GHA",
  "upper-guinea-coast": "LBR SLE",
  cameroonian: "CMR",
  congolese: "COG",
  gabonese: "GAB",
  centrafrican: "CAF",
  equatoguinean: "GNQ",
  zimbabwean: "ZWE",
  "zambian-malawian": "ZMB MWI",
  "sotho-tswana": "BWA LSO",
  namibian: "NAM",
  ethiopian: "ETH",
};


/**
 * Traditions whose documented people mostly carry no given-name or family-name
 * statements on Wikidata, so too few names were counted to fill a bank. Their
 * people do carry English labels, so the names are also read off those labels,
 * split by the order the tradition writes them in:
 *   - given-family: Lao and Nigerien names, the personal name first;
 *   - family-given: Khmer names, the family name first. A family name is a
 *     token that opens at least three labels and opens more than it closes
 *     (Cambodia's family names are few and recur), or one a person's family-name
 *     statement already records; a label that fits neither order is skipped;
 *   - patronymic: Mongolian, where the father's name is written in the
 *     genitive (-iin, -yn) and the person's own name is the other token;
 *   - personal: Bhutanese, where every token is a personal name.
 * Honorifics are dropped, and a Lao token ending in -vong, the lineage suffix
 * Lao family names are built on, is never taken as a personal name.
 */
const LABEL_ORDERS = {
  lao: "given-family",
  nigerien: "given-family",
  khmer: "family-given",
  mongolian: "patronymic",
  bhutanese: "personal",
};
// For the Asian traditions read off labels, a person who also holds a
// European, North American or Australian citizenship is counted with the
// diaspora, not the tradition: a Lao-American director is why "Mattie" was in
// the Lao bank. Niger is left out of this, as it is out of the Western-name
// filter below, because its francophone names are its own.
const DIASPORA_CITIZENSHIPS = "wd:Q30 wd:Q16 wd:Q142 wd:Q145 wd:Q408 wd:Q183 wd:Q29 wd:Q38 wd:Q55 wd:Q34 wd:Q39 wd:Q40 wd:Q31 wd:Q664";
const diasporaExcluded = (culture) => (LABEL_ORDERS[culture] && culture !== "nigerien"
  ? `FILTER NOT EXISTS { ?person wdt:P27 ?other. VALUES ?other { ${DIASPORA_CITIZENSHIPS} } }`
  : "");
const HONORIFICS = new Set(["thao", "nang", "chao", "tiao", "sao", "phra", "mom", "samdech", "oknha", "lok", "neak", "el", "hadj", "alhaji"]);
const GENITIVE = /(?:iin|ijn|iyn|yn|in|ün|ny)$/i;
const LINEAGE = /vong$/i;

const MASCULINE = "Q6581097";
const FEMININE = "Q6581072";

function roster() {
  const lines = readFileSync(path.join(seedDir, "nation-identity.tsv"), "utf8").split("\n").filter((line) => line && !line.startsWith("#"));
  return lines.slice(1).map((line) => line.split("\t")[0]);
}

/** Rows below which a culture is counted over every holder of the citizenship, not only those born since 1940. */
const SPARSE = { given: 300, family: 150 };

async function queryNames(sparql, values, since, exclude = "") {
  const born = since ? `wdt:P569 ?born. FILTER(?born >= "${since}T00:00:00Z"^^xsd:dateTime)` : "wdt:P31 wd:Q5.";
  const given = await sparql(`SELECT ?name ?sex (COUNT(DISTINCT ?person) AS ?n) WHERE {
    VALUES ?country { ${values} }
    VALUES ?sex { wd:${MASCULINE} wd:${FEMININE} }
    ?person wdt:P27 ?country; wdt:P735 ?given; wdt:P21 ?sex; ${born}
    ${exclude}
    ?given rdfs:label ?name. FILTER(LANG(?name) = "en")
  } GROUP BY ?name ?sex ORDER BY DESC(?n) LIMIT 1200`);
  const family = await sparql(`SELECT ?name (COUNT(DISTINCT ?person) AS ?n) WHERE {
    VALUES ?country { ${values} }
    ?person wdt:P27 ?country; wdt:P734 ?family; wdt:P21 wd:${MASCULINE}; ${born}
    ${exclude}
    ?family rdfs:label ?name. FILTER(LANG(?name) = "en")
  } GROUP BY ?name ORDER BY DESC(?n) LIMIT 800`);
  return { given, family };
}

/**
 * Counted over people born since 1940, so the names are the ones in use in the
 * public life a president's counterparts come from. A small country's
 * documented people are too few for that to fill a bank, so a sparse count is
 * taken again over every holder of the citizenship: an older name of the same
 * tradition is still a name of it.
 */
async function countNames(sparql, items, exclude = "") {
  const values = items.map((item) => `wd:${item}`).join(" ");
  let { given, family } = await queryNames(sparql, values, "1940-01-01", exclude);
  const sparse = given.length < SPARSE.given || family.length < SPARSE.family;
  if (sparse) ({ given, family } = await queryNames(sparql, values, undefined, exclude));
  return {
    sparse,
    rows: [
      ...given.map((row) => [row.sex.endsWith(MASCULINE) ? "masculine" : "feminine", row.name, row.n]),
      ...family.map((row) => ["surname", row.name, row.n]),
    ],
  };
}

/** Name rows read off citizens' English labels, by the tradition's name order. */
async function labelNames(sparql, values, culture, recordedFamily) {
  const order = LABEL_ORDERS[culture];
  const rows = await sparql(`SELECT ?person ?label ?sex WHERE {
    VALUES ?country { ${values} }
    VALUES ?sex { wd:${MASCULINE} wd:${FEMININE} }
    ?person wdt:P31 wd:Q5; wdt:P27 ?country; wdt:P21 ?sex.
    ${diasporaExcluded(culture)}
    ?person rdfs:label ?label. FILTER(LANG(?label) = "en")
  }`);
  const people = rows.map((row) => ({
    sex: row.sex.endsWith(MASCULINE) ? "masculine" : "feminine",
    tokens: row.label.replace(/\(.*?\)/g, " ").trim().split(/\s+/).filter((token) => token && !HONORIFICS.has(token.toLowerCase())),
  })).filter((person) => person.tokens.length >= 2);
  const family = new Set(recordedFamily);
  if (order === "family-given") {
    const opens = new Map();
    const closes = new Map();
    for (const { tokens } of people) {
      const first = tokens[0].toLowerCase();
      const last = tokens[tokens.length - 1].toLowerCase();
      opens.set(first, (opens.get(first) ?? 0) + 1);
      closes.set(last, (closes.get(last) ?? 0) + 1);
    }
    for (const [token, n] of opens) if (n >= 3 && n > (closes.get(token) ?? 0)) family.add(token);
  }
  const counts = { masculine: new Map(), feminine: new Map(), surname: new Map() };
  const add = (kind, name) => counts[kind].set(name, (counts[kind].get(name) ?? 0) + 1);
  for (const { sex, tokens } of people) {
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    if (order === "given-family") {
      add(sex, first);
      if (sex === "masculine") add("surname", last);
    } else if (order === "family-given") {
      if (family.has(first.toLowerCase())) {
        add(sex, tokens.slice(1).join(" "));
        if (sex === "masculine") add("surname", first);
      } else if (family.has(last.toLowerCase())) {
        add(sex, tokens.slice(0, -1).join(" "));
        if (sex === "masculine") add("surname", last);
      }
    } else if (order === "patronymic") {
      const own = tokens.find((token) => !GENITIVE.test(token));
      if (own) add(sex, own);
    } else {
      for (const token of tokens) add(sex, token);
    }
  }
  // A token the labels use more as a family name than as a personal one is a
  // family name written first, not a personal name.
  if (order === "given-family") {
    for (const kind of ["masculine", "feminine"]) {
      for (const [name, n] of counts[kind]) {
        if ((counts.surname.get(name) ?? 0) * 2 > n || (culture === "lao" && LINEAGE.test(name))) counts[kind].delete(name);
      }
    }
  }
  return Object.entries(counts).flatMap(([kind, map]) => [...map].map(([name, n]) => [kind, name, n]));
}

// The labels of a small country's documented people carry names that are not
// of its tradition: a Lao citizen named Thomas, a Cambodian actor named Hélène.
// For the Asian traditions read off labels, a name an authored European or
// American bank already carries is taken as that bank's rather than as
// evidence of this one. (Niger is francophone, and a French name there is its
// own.) Initials and regnal numerals are not names.
const WESTERN_BANKS = ["anglo", "hispanic", "lusophone", "germanic", "nordic", "french", "italian", "dutch", "polish", "slavic-east", "hungarian"];

/**
 * Traditions counted over a citizenship that also holds people of another
 * tradition the roster already names, whose names are taken as that
 * tradition's rather than as evidence of this one. `given` filters only given
 * names, `surname` only family names, and `all` both. The Central Asian,
 * Ukrainian, Gulf and Maghreb traditions are authored instead
 * (name-banks-regional.ts): counted over their citizens, each came back led by
 * Russian or French names in their Russian or French spellings, which no
 * filter on another bank's spelling could catch.
 */
const FOREIGN_TO = {
  // French given names are the equatorial states' own; a French or English
  // family name among their citizens is a naturalized footballer, not a minister.
  congolese: { banks: ["french", "anglo"], kinds: "surname" },
  gabonese: { banks: ["french", "anglo"], kinds: "surname" },
  centrafrican: { banks: ["french", "anglo"], kinds: "surname" },
  equatoguinean: { banks: ["french", "anglo"], kinds: "surname" },
};

const WESTERN = new Set(
  WESTERN_BANKS.flatMap((key) =>
    NAME_BANKS[key].groups.flatMap((group) => [...group.given.masculine, ...group.given.feminine, ...group.given.neutral, ...group.surname]),
  ).map((name) => name.toLowerCase()),
);
const NOT_A_NAME = /^(?:[IVX]+\.?|.{1,2}|.*\.)$/;

/**
 * Bhutan's Lhotshampa citizens carry Nepali family names (Gurung, Rai,
 * Adhikari), which the personal-name reading of a Bhutanese label would
 * otherwise count as given names. The vendored Nepali bank's own family names
 * say which they are.
 */
function nepaliFamilyNames() {
  const text = readFileSync(path.join(outDir, "nepali.tsv"), "utf8");
  return new Set(text.split("\n").filter((line) => line.startsWith("surname\t")).map((line) => line.split("\t")[1].toLowerCase()));
}

function keepTraditional(culture, rows) {
  const western = culture !== "nigerien";
  const nepaliFamily = culture === "bhutanese" ? nepaliFamilyNames() : new Set();
  return rows.filter(([kind, name]) => {
    const key = String(name).toLowerCase();
    if (NOT_A_NAME.test(String(name))) return false;
    if (western && WESTERN.has(key)) return false;
    return !(kind !== "surname" && nepaliFamily.has(key));
  });
}

function withoutForeign(culture, rows) {
  const rule = FOREIGN_TO[culture];
  if (!rule) return rows;
  const given = rule.kinds !== "surname";
  const family = rule.kinds !== "given";
  const foreign = new Set(
    rule.banks.flatMap((key) =>
      NAME_BANKS[key].groups.flatMap((group) => [
        ...(given ? [...group.given.masculine, ...group.given.feminine, ...group.given.neutral] : []),
        ...(family ? group.surname : []),
      ]),
    ).map((name) => name.toLowerCase()),
  );
  const filtered = (kind) => (kind === "surname" ? family : given);
  return rows.filter(([kind, name]) => !filtered(kind) || !foreign.has(String(name).toLowerCase()));
}

/** Rows for the same kind and name, counted once with their counts summed. */
function mergeRows(...lists) {
  const merged = new Map();
  for (const [kind, name, n] of lists.flat()) {
    const key = `${kind}\t${name.toLowerCase()}`;
    const seen = merged.get(key);
    merged.set(key, seen ? [kind, seen[1], seen[2] + Number(n)] : [kind, name, Number(n)]);
  }
  return [...merged.values()].sort((a, b) => (a[0] === b[0] ? b[2] - a[2] : a[0].localeCompare(b[0])));
}

async function main() {
  const fresh = process.argv.includes("--fresh");
  const only = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const sparql = wikidataClient("vendor-name-banks", { fresh });
  const items = await countryItems(sparql, roster());
  mkdirSync(outDir, { recursive: true });
  const fetched = new Date().toISOString().slice(0, 10);
  for (const [culture, iso3s] of Object.entries(VENDORED_CULTURES)) {
    if (only.length > 0 && !only.includes(culture)) continue;
    const countries = iso3s.split(" ");
    const counted = await countNames(sparql, countries.map((iso3) => items.get(iso3)), diasporaExcluded(culture));
    const order = LABEL_ORDERS[culture];
    const values = countries.map((iso3) => `wd:${items.get(iso3)}`).join(" ");
    const recordedFamily = counted.rows.filter(([kind]) => kind === "surname").map(([, name]) => String(name).toLowerCase());
    const read = order ? keepTraditional(culture, mergeRows(counted.rows, await labelNames(sparql, values, culture, recordedFamily))) : counted.rows;
    const rows = withoutForeign(culture, read);
    const { sparse } = counted;
    const text = [
      `# Name frequencies for the ${culture} bank, vendored by scripts/vendor-name-banks.mjs — do not edit by hand.`,
      `# fetched: ${fetched}`,
      `# source: Wikidata (via qlever.dev), CC0 — people holding the citizenship${sparse ? ", of any birth year (too few born since 1940 to fill a bank)" : ", born 1940 or later"}; given names by recorded sex, family names among men${order ? `; and the same people's English labels, split in ${order} order` : ""}`,
      `# citizenships: ${countries.join(" ")}`,
      "kind\tname\tcount",
      ...rows.map((row) => row.map((cell) => String(cell).replace(/[\t\n\r]+/g, " ").trim()).join("\t")),
    ].join("\n");
    writeFileSync(path.join(outDir, `${culture}.tsv`), `${text}\n`);
    console.log(`${culture}: ${rows.length} rows`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
