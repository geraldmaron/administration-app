#!/usr/bin/env node
// Vendors the roster of real officeholders the name draw refuses.
//
// The leader table's sources cite each government's head and little else, so
// a blocklist built from them let a generated Secretary of State candidate
// carry the sitting one's name, and any cabinet carry a senator's. This reads
// rosters of people in office rather than citations:
//
//   - every foreign government's leaders and cabinet: the CIA's World Leaders
//     directory (https://www.cia.gov/resources/world-leaders/foreign-governments/);
//   - the United States: every member of Congress, and every member who served
//     since 2007, and every President and Vice President (congress-legislators,
//     https://unitedstates.github.io/congress-legislators/),
//     every Supreme Court justice, every governor in office, and every holder
//     of a federal office whose term began in 2017 or later and has not ended
//     (Wikidata);
//   - every head of state and head of government of every state since 1945,
//     and every head of the UN, NATO, the European Commission and the European
//     Council (Wikidata).
//
// It writes salted hashes, never names (packages/world/src/dataset/officeholders.generated.ts):
//
//   - OFFICEHOLDER_NAME_HASHES: ordered pairs of the words of each name, which
//     `carriesRealName` refuses. Where a directory marks the family name (the
//     CIA writes it in capitals), a pair must hold it, so a Korean given name
//     is not refused on its own; elsewhere every pair counts.
//   - LEADER_SURNAME_HASHES: for each nation, the words of the name of everyone
//     who has led it since 1945, and abroad the American presidents' and vice
//     presidents' family names, which `carriesLeaderSurname` refuses as a
//     family name there. A nation's most common family names are left off (a
//     Korean cabinet with no Kim is the stranger fiction), more of them for a
//     head long gone, and none in a bank counted from Wikidata, where the
//     head's own family is why a name ranks. A tradition that names people by
//     their fathers has no family name to refuse, so the draw skips it there.
//
// `--roster <file>` also writes the plaintext roster to a file outside the
// repository, which scripts/verify-leader-fidelity.mjs reads when it is given
// one; nothing under packages/ ever holds a name.
//
// Network, run by hand after `pnpm --filter @admin/world run build`:
//   node scripts/vendor-officeholders.mjs [--fresh] [--roster <file>]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { qid, wikidataClient } from "./lib/wikidata.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(root, "packages/world/src/dataset/officeholders.generated.ts");
const world = await import(path.join(root, "packages/world/dist/index.js"));

const AS_OF = "2026-09-23";
const USER_AGENT = "admin-app-dataset-vendor/1.0 (officeholder roster vendor, run by hand)";
const CIA = "https://www.cia.gov/resources/world-leaders";
const LEGISLATORS = "https://unitedstates.github.io/congress-legislators";

/** A family name among this many of a nation's commonest is not a current or recent head's alone. */
const COMMON_SURNAME_RANK = 12;
/** A family name among this many is not an earlier head's alone: a 1950s president's surname has had time to be anyone's. */
const COMMON_FOR_EARLIER_HEADS = 40;
/** Heads in office since this date are current or recent. */
const RECENT_HEADS_SINCE = "1990-01-01";
/** An American president's family name is refused everywhere it is not this common. */
const COMMON_FOR_PRESIDENTS = 40;

/** Words in a directory's names that are offices and styles, not names. */
const HONORIFICS = new Set(
  (
    "dr gen lt col maj adm brig cdr cmdr capt prof eng amb gov sen rep pres vice mr mrs ms sir dame hon rev sheikh " +
    "sheikha shaykh prince princess king queen emir sultan mawlawi mullah qari hajji haji acting vacant"
  ).split(" "),
);

async function fetchJson(url, fresh) {
  const cacheDir = path.join(tmpdir(), "vendor-officeholders");
  mkdirSync(cacheDir, { recursive: true });
  const cached = path.join(cacheDir, `${createHash("sha256").update(url).digest("hex").slice(0, 24)}.json`);
  if (!fresh && existsSync(cached)) return JSON.parse(readFileSync(cached, "utf8"));
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const body = await response.json();
  writeFileSync(cached, JSON.stringify(body));
  return body;
}

// --- Reading a name into words ------------------------------------------------

const wordsOf = (text) => world.realNameTokens(text).filter((word) => !HONORIFICS.has(word));

/** Every ordered pair of distinct words where the second is one of `anchors`, both ways round. */
function anchoredPairs(words, anchors) {
  const pairs = new Set();
  for (const a of words) {
    for (const b of anchors) {
      if (a === b) continue;
      pairs.add(`${a}|${b}`);
      pairs.add(`${b}|${a}`);
    }
  }
  return pairs;
}

/** A directory name, the family name in capitals where the directory marks one. */
function directoryPairs(raw) {
  const name = raw.replace(/\([^)]*\)/g, " ").replace(/,/g, " ").trim();
  const words = wordsOf(name);
  if (words.length < 2) return new Set();
  const capitals = name.split(/\s+/).filter((word) => /[A-Z]{2,}/.test(word) && !/[a-z]/.test(word)).join(" ");
  const marked = wordsOf(capitals);
  return anchoredPairs(words, marked.length > 0 && marked.length < words.length ? marked : words);
}

/** A name read off a label with no marking: every pair of its words counts. */
function labelPairs(label) {
  const words = wordsOf(label.replace(/\([^)]*\)/g, " "));
  return words.length >= 2 && words.length <= 7 ? anchoredPairs(words, words) : new Set();
}

/** A name split into given names and a family name, as the legislators' files record it. */
function recordPairs(record) {
  const given = [record.first, record.nickname, record.middle].filter(Boolean).flatMap(wordsOf);
  const family = wordsOf(record.last ?? "");
  return family.length > 0 ? new Set([...anchoredPairs(given, family), ...anchoredPairs(family, family)]) : new Set();
}

/** The pairs one roster entry's name contributes, read the way its source writes names. */
export function pairsFor(entry) {
  if (entry.record) return recordPairs(entry.record);
  return entry.source === "cia" ? directoryPairs(entry.name) : labelPairs(entry.name);
}

// --- The rosters ----------------------------------------------------------------

async function ciaDirectory(fresh) {
  const index = await fetchJson(`${CIA}/page-data/foreign-governments/page-data.json`, fresh);
  for (const hash of index.staticQueryHashes ?? []) {
    const query = await fetchJson(`${CIA}/page-data/sq/d/${hash}.json`, fresh);
    const nodes = query.data?.leaders?.nodes;
    if (!nodes) continue;
    return nodes.flatMap((node) =>
      [...(node.leaders ?? []), ...(node.leaders_2 ?? []), ...(node.leaders_3 ?? [])]
        .map((entry) => (entry.name ?? "").trim())
        .filter((name) => name && !/^vacant$/i.test(name))
        .map((name) => ({ source: "cia", place: node.country, name, pairs: directoryPairs(name) })),
    );
  }
  throw new Error("the World Leaders directory answered with no leaders list");
}

/** A member who left Congress within this many years is still a name a reader knows. */
const RECENT_MEMBERS_SINCE = "2007-01-01";

async function legislators(fresh) {
  const [current, historical, executive] = await Promise.all([
    fetchJson(`${LEGISLATORS}/legislators-current.json`, fresh),
    fetchJson(`${LEGISLATORS}/legislators-historical.json`, fresh),
    fetchJson(`${LEGISLATORS}/executive.json`, fresh),
  ]);
  const people = (list, source) =>
    list.map((person) => ({ source, place: "USA", name: person.name.official_full ?? `${person.name.first} ${person.name.last}`, record: person.name, pairs: recordPairs(person.name) }));
  const recent = historical.filter((person) => person.terms.some((term) => term.end >= RECENT_MEMBERS_SINCE));
  return { congress: [...people(current, "congress"), ...people(recent, "congress")], executive: people(executive, "executive") };
}

const HELD = (from) => `?person p:P39 ?held. ?held ps:P39 ?office. OPTIONAL { ?held pq:P580 ?start } OPTIONAL { ?held pq:P582 ?end } ${from}`;
const SINCE_1945 = `FILTER((BOUND(?end) && ?end >= "1945-01-01T00:00:00Z"^^xsd:dateTime) || (!BOUND(?end) && (!BOUND(?start) || ?start >= "1945-01-01T00:00:00Z"^^xsd:dateTime)))`;
// Wikidata has moved many people's names to the language-neutral "mul" label,
// so a name held only there is read from it rather than dropped.
const LABEL = `OPTIONAL { ?person rdfs:label ?en. FILTER(LANG(?en) = "en") }
    OPTIONAL { ?person rdfs:label ?mul. FILTER(LANG(?mul) = "mul") }
    BIND(COALESCE(?en, ?mul) AS ?label) FILTER(BOUND(?label))`;

/**
 * Every head of state and government since 1945 of every state, with the state
 * they led: the offices each state names as its heads, and every national
 * office Wikidata files under head of state or head of government, since
 * neither alone reaches every holder.
 */
async function headsOfGovernment(sparql) {
  const STATES = `?country wdt:P31 ?kind. VALUES ?kind { wd:Q3624078 wd:Q15634554 wd:Q219060 } OPTIONAL { ?country wdt:P298 ?iso3 }`;
  const named = await sparql(`SELECT DISTINCT ?person ?label ?iso3 ?end WHERE {
    ${STATES} ?country wdt:P1906|wdt:P1313 ?office.
    ${HELD(SINCE_1945)} ${LABEL}
  }`);
  const filed = await sparql(`SELECT DISTINCT ?person ?label ?iso3 ?end WHERE {
    VALUES ?root { wd:Q2285706 wd:Q48352 } ?office wdt:P279+ ?root; wdt:P1001 ?country. ${STATES}
    ${HELD(SINCE_1945)} ${LABEL}
  }`);
  const heads = new Map();
  for (const row of [...named, ...filed]) {
    const key = `${row.person}|${row.iso3 ?? ""}`;
    const recent = !row.end || row.end >= RECENT_HEADS_SINCE;
    const seen = heads.get(key);
    if (seen) seen.recent ||= recent;
    else heads.set(key, { source: "heads", place: row.iso3 ?? "", name: row.label, person: qid(row.person), recent, pairs: labelPairs(row.label) });
  }
  return [...heads.values()];
}

async function wikidataOffices(sparql) {
  const international = await sparql(`SELECT DISTINCT ?person ?label WHERE {
    VALUES ?office { wd:Q81066 wd:Q8882 wd:Q735587 wd:Q634291 wd:Q167662 } ${HELD("")} ${LABEL}
  }`);
  const justices = await sparql(`SELECT DISTINCT ?person ?label WHERE { VALUES ?office { wd:Q11144 wd:Q11147 } ${HELD("")} ${LABEL} }`);
  const federal = await sparql(`SELECT DISTINCT ?person ?label WHERE {
    ?office wdt:P1001 wd:Q30. ?person p:P39 ?held. ?held ps:P39 ?office; pq:P580 ?start.
    FILTER(?start >= "2017-01-01T00:00:00Z"^^xsd:dateTime) FILTER NOT EXISTS { ?held pq:P582 ?end } ${LABEL}
  }`);
  const governors = await sparql(`SELECT DISTINCT ?person ?label WHERE {
    ?state wdt:P31 wd:Q35657. ?office wdt:P1001 ?state; rdfs:label ?officeLabel.
    FILTER(LANG(?officeLabel) = "en" && STRSTARTS(?officeLabel, "Governor of"))
    ?person p:P39 ?held. ?held ps:P39 ?office; pq:P580 ?start.
    FILTER(?start >= "2015-01-01T00:00:00Z"^^xsd:dateTime) FILTER NOT EXISTS { ?held pq:P582 ?end } ${LABEL}
  }`);
  const read = (rows, source, place) => rows.map((row) => ({ source, place, name: row.label, pairs: labelPairs(row.label) }));
  return [
    ...read(international, "international", ""),
    ...read(justices, "justices", "USA"),
    ...read(federal, "federal", "USA"),
    ...read(governors, "governors", "USA"),
  ];
}

// --- The family names each tradition refuses ------------------------------------

/** The words of a nation's `rank` commonest family names in each tradition it draws from, which no guard refuses. */
function commonWords(nation, rank) {
  const bank = world.nationNameBank(nation, world.nameCultureFor(nation));
  return new Set(bank.groups.flatMap((group) => group.surname.slice(0, rank)).flatMap((surname) => world.realNameTokens(surname)));
}

const COUNTED = new Set(world.VENDORED_NAME_CULTURES);

/**
 * Each nation's refused family-name words: its own heads' since 1945, and the
 * best-known American presidents' and vice presidents' abroad. Keyed by
 * nation, not tradition: a Spanish minister named Morales is nobody's
 * relative, whatever Bolivia's presidents were called.
 */
export function refusedSurnames(heads, presidents) {
  const nations = new Map();
  const known = new Set(world.worldDataset.nations.map((nation) => nation.id));
  const refuse = (nation, word) => {
    if (!nations.has(nation)) nations.set(nation, new Set());
    nations.get(nation).add(word);
  };
  for (const head of heads) {
    if (!known.has(head.place)) continue;
    // A bank counted from Wikidata ranks a family name partly by how many of the
    // head's own family are documented there, so its rank says nothing about
    // how common the name is.
    const counted = COUNTED.has(world.nameCultureFor(head.place));
    const common = counted ? new Set() : commonWords(head.place, head.recent ? COMMON_SURNAME_RANK : COMMON_FOR_EARLIER_HEADS);
    for (const word of wordsOf(head.name)) if (word.length > 2 && !common.has(word)) refuse(head.place, word);
  }
  // Abroad only: the American bench already leaves out every modern
  // president's family name, and an American senator who shares a
  // nineteenth-century president's reads as nobody's relative.
  const presidential = new Set(presidents.flatMap((person) => wordsOf(person.record.last ?? "")));
  for (const nation of known) {
    if (nation === "USA") continue;
    const common = commonWords(nation, COMMON_FOR_PRESIDENTS);
    for (const word of presidential) if (!common.has(word)) refuse(nation, word);
  }
  return nations;
}

// --- Writing it out ---------------------------------------------------------------

function pack(hashes) {
  const sorted = [...new Set(hashes)].sort((a, b) => a - b);
  const bytes = Buffer.alloc(sorted.length * 4);
  sorted.forEach((hash, index) => bytes.writeUInt32BE(hash >>> 0, index * 4));
  return { count: sorted.length, text: bytes.toString("base64") };
}

/**
 * The packed list as a data URI on one line: the repository's text gates
 * (the spelling gate among them) blank an encoded payload written that way
 * instead of reading its letters as words.
 */
const dataUri = (text) => JSON.stringify(`data:application/octet-stream;base64,${text}`);

function moduleText(counts, names, surnames) {
  return [
    "// Generated by scripts/vendor-officeholders.mjs from rosters of people in office; do not edit by hand.",
    "// Salted hashes only (packed big-endian uint32, base64 data URIs): no name is written here. What each roster",
    "// is and where it was read are in the script's header.",
    "",
    `export const OFFICEHOLDER_ROSTER_AS_OF = ${JSON.stringify(AS_OF)};`,
    "",
    "/** How many people each roster held when it was read, so a roster that came back short is caught. */",
    `export const OFFICEHOLDER_ROSTER_COUNTS: Readonly<Record<string, number>> = ${JSON.stringify(counts)};`,
    "",
    `/** ${names.count} ordered pairs of officeholders' name words. */`,
    "// prettier-ignore",
    `export const OFFICEHOLDER_NAME_HASHES =\n  ${dataUri(names.text)};`,
    "",
    `/** ${surnames.count} family-name words, keyed by the nation that refuses them. */`,
    "// prettier-ignore",
    `export const LEADER_SURNAME_HASHES =\n  ${dataUri(surnames.text)};`,
    "",
  ].join("\n");
}

/** The roster as the vendor reads it, computed and not written: the gate reuses it with a plaintext roster. */
export function hashRoster(people, heads, presidents) {
  const salt = world.REAL_NAME_SALT;
  const pairs = new Set(people.flatMap((person) => [...person.pairs]));
  const names = [...pairs].map((pair) => {
    const [a, b] = pair.split("|");
    return world.realNameKey(salt, a, b);
  });
  const surnames = [...refusedSurnames(heads, presidents)].flatMap(([nation, words]) =>
    [...words].map((word) => world.leaderSurnameKey(salt, nation, word)),
  );
  return { names: pack(names), surnames: pack(surnames) };
}

async function main() {
  const fresh = process.argv.includes("--fresh");
  const rosterAt = process.argv.indexOf("--roster");
  const sparql = wikidataClient("vendor-officeholders", { fresh });
  const cia = await ciaDirectory(fresh);
  const { congress, executive } = await legislators(fresh);
  const heads = await headsOfGovernment(sparql);
  const offices = await wikidataOffices(sparql);
  const people = [...cia, ...congress, ...executive, ...heads, ...offices];
  const counts = Object.fromEntries(
    ["cia", "congress", "executive", "heads", "international", "justices", "federal", "governors"].map((source) => [
      source,
      people.filter((person) => person.source === source).length,
    ]),
  );
  const { names, surnames } = hashRoster(people, heads, executive);
  writeFileSync(OUT, moduleText(counts, names, surnames));
  if (rosterAt > 0) {
    const file = process.argv[rosterAt + 1];
    if (!file || path.resolve(file).startsWith(root)) throw new Error("--roster needs a file outside the repository");
    writeFileSync(file, JSON.stringify(people.map(({ source, place, name, record, recent }) => ({ source, place, name, ...(record ? { record } : {}), ...(recent !== undefined ? { recent } : {}) }))));
  }
  console.log(`${people.length} officeholders (${JSON.stringify(counts)}): ${names.count} name pairs, ${surnames.count} family names -> ${path.relative(root, OUT)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
