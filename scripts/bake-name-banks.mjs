#!/usr/bin/env node
// Bakes the vendored name frequencies into NameBanks.
//
// Reads packages/world/src/dataset/seed/name-banks/<culture>.tsv (written by
// scripts/vendor-name-banks.mjs) and writes
// packages/world/src/dataset/name-banks.vendored.ts. Nothing here is typed:
// each bank is the most frequent names real holders of the citizenship carry.
//
// The rules, in the order they apply:
//   - Only names written in the Latin alphabet, the script every other bank
//     and every screen uses; a label Wikidata carries only in its own script is
//     dropped rather than transliterated by guesswork.
//   - A given name goes to the sex that carries it at least three times as
//     often; one carried by both sexes more evenly than that is neutral, which
//     is what the authored banks mean by it. The neutral list is topped up to
//     its floor from the least frequent kept names of each sex, alternately.
//   - Burmese, Bhutanese and Mongolian public names carry no family name: a
//     person is known by a second personal name (Mongolia's is the father's).
//     Their "surname" list is drawn from the given names, which is how such a
//     name actually reads, and their neutral list may reuse the least frequent
//     personal names when too few are carried evenly by both sexes.
//   - Ethiopia, Eritrea, Chad, the Comoros and the Maldives carry no family
//     name either: the second name is the father's given name. Their
//     "surname" list is their own men's given names, and the group is marked
//     patronymic, which is the leader table's surname rule for each.
//   - Every group carries its culture's name as its id, so a nation can be
//     held to the traditions it may draw from.
//   - A culture whose people are too few to fill a bank to the schema's floors
//     is reported and left out, and the nations drawing from it keep their
//     nearest authored bank until a source fills it.
//
//   node scripts/bake-name-banks.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedDir = path.join(root, "packages/world/src/dataset/seed/name-banks");
const outPath = path.join(root, "packages/world/src/dataset/name-banks.vendored.ts");

const KEEP = { given: 90, neutral: 30, surname: 120 };
const FLOOR = { given: 60, neutral: 30, surname: 60 };
const GENDER_RATIO = 3;
const GIVEN_AS_SECOND_NAME = new Set(["burmese", "bhutanese", "mongolian"]);
const PATRONYMIC = new Set(["ethiopian", "eritrean", "chadian", "comorian", "maldivian"]);
const LATIN_NAME = /^[\p{Script=Latin}][\p{Script=Latin}\p{M}'’ .-]{1,23}$/u;

function readCulture(file) {
  const rows = readFileSync(path.join(seedDir, file), "utf8").split("\n").filter((line) => line && !line.startsWith("#")).slice(1);
  const counts = { masculine: new Map(), feminine: new Map(), surname: new Map() };
  for (const row of rows) {
    const [kind, raw, count] = row.split("\t");
    const name = raw.replace(/\s+/g, " ").trim();
    if (!LATIN_NAME.test(name) || /\s-|-\s/.test(name)) continue;
    const key = name.toLocaleLowerCase("en");
    const seen = counts[kind].get(key);
    if (!seen || Number(count) > seen.count) counts[kind].set(key, { name, count: Number(count) + (seen?.count ?? 0) });
  }
  return counts;
}

const ranked = (map) => [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

function splitGiven(counts) {
  const masculine = [];
  const feminine = [];
  const neutral = [];
  const keys = new Set([...counts.masculine.keys(), ...counts.feminine.keys()]);
  for (const key of keys) {
    const m = counts.masculine.get(key)?.count ?? 0;
    const f = counts.feminine.get(key)?.count ?? 0;
    const entry = { name: (counts.masculine.get(key) ?? counts.feminine.get(key)).name, count: m + f };
    if (m >= GENDER_RATIO * f) masculine.push({ ...entry, count: m });
    else if (f >= GENDER_RATIO * m) feminine.push({ ...entry, count: f });
    else if (Math.min(m, f) >= 2) neutral.push(entry);
    else (m > f ? masculine : feminine).push(entry);
  }
  const byCount = (a, b) => b.count - a.count || a.name.localeCompare(b.name);
  return { masculine: masculine.sort(byCount), feminine: feminine.sort(byCount), neutral: neutral.sort(byCount) };
}

function bankFor(culture, counts) {
  const split = splitGiven(counts);
  const masculine = split.masculine.slice(0, KEEP.given);
  const feminine = split.feminine.slice(0, KEEP.given);
  const neutral = split.neutral.slice(0, KEEP.neutral);
  // Top the neutral list up from the tails beyond what was kept, then from the
  // least frequent kept names, alternating so neither sex supplies it all.
  const tails = [split.masculine.slice(KEEP.given), split.feminine.slice(KEEP.given)];
  for (let i = 0; neutral.length < KEEP.neutral && (tails[0].length || tails[1].length); i += 1) {
    const next = tails[i % 2].shift();
    if (next) neutral.push(next);
  }
  for (let i = 0; neutral.length < FLOOR.neutral && masculine.length + feminine.length > 2 * FLOOR.given; i += 1) {
    const from = i % 2 === 0 ? masculine : feminine;
    if (from.length > FLOOR.given) neutral.push(from.pop());
  }
  // A tradition without family names draws every name from one pool of
  // personal names, so its neutral list may reuse the least frequent of them
  // rather than leave the bank unfilled.
  if (GIVEN_AS_SECOND_NAME.has(culture)) {
    const spare = [...masculine.slice(-KEEP.neutral), ...feminine.slice(-KEEP.neutral)].reverse();
    while (neutral.length < FLOOR.neutral && spare.length > 0) neutral.push(spare.shift());
  }
  const surnames = GIVEN_AS_SECOND_NAME.has(culture)
    ? [...split.masculine, ...split.feminine, ...split.neutral].sort((a, b) => b.count - a.count).slice(0, KEEP.surname)
    : PATRONYMIC.has(culture)
      ? split.masculine.slice(0, KEEP.surname)
      : ranked(counts.surname).slice(0, KEEP.surname);
  const bank = { masculine, feminine, neutral, surname: surnames };
  const short = Object.entries({ masculine: FLOOR.given, feminine: FLOOR.given, neutral: FLOOR.neutral, surname: FLOOR.surname })
    .filter(([list, floor]) => bank[list].length < floor)
    .map(([list, floor]) => `${list} ${bank[list].length}/${floor}`);
  return { bank, short };
}

const names = (list) => JSON.stringify(list.map((entry) => entry.name));

const baked = [];
const skipped = [];
for (const file of readdirSync(seedDir).filter((f) => f.endsWith(".tsv")).sort()) {
  const culture = file.replace(/\.tsv$/, "");
  const { bank, short } = bankFor(culture, readCulture(file));
  if (short.length > 0) skipped.push(`${culture} (${short.join(", ")})`);
  else baked.push([culture, bank]);
}

const body = baked
  .map(([culture, bank]) => `  ${JSON.stringify(culture)}: NameBank.parse({
    groups: [{
      id: ${JSON.stringify(culture)},${PATRONYMIC.has(culture) ? `\n      form: "patronymic",` : ""}
      given: {
        masculine: ${names(bank.masculine)},
        feminine: ${names(bank.feminine)},
        neutral: ${names(bank.neutral)},
      },
      surname: ${names(bank.surname)},
    }],
  }),`)
  .join("\n");

writeFileSync(
  outPath,
  `import { NameBank } from "../schemas/people-pool.js";

// Baked by scripts/bake-name-banks.mjs from seed/name-banks/*.tsv — do not edit
// by hand. Each bank is the most frequent names carried by people who hold the
// citizenships its seed names (Wikidata, CC0, born 1940 or later); the rules
// that turn frequencies into a bank are in the script's header.

export const VENDORED_NAME_CULTURES = ${JSON.stringify(baked.map(([culture]) => culture))} as const;

export type VendoredNameCulture = (typeof VENDORED_NAME_CULTURES)[number];

// prettier-ignore
export const VENDORED_NAME_BANKS: Record<VendoredNameCulture, NameBank> = {
${body}
};
`,
);
console.log(`Baked ${baked.length} banks → ${path.relative(root, outPath)}`);
if (skipped.length > 0) console.log(`Too few names to fill a bank, left out: ${skipped.join("; ")}`);
