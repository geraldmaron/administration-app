#!/usr/bin/env node
// Vendors the demographic composition of each state for the five cohort axes
// added in 2026-10: race and ethnicity, sex, nativity, disability and veteran
// status.
//
// Race, ethnicity and sex come from the Census Bureau's Vintage 2023 state
// population estimates by characteristics (the file whose population the rest
// of the dataset already uses). Nativity, disability and veteran status are
// approximate, hand-rounded shares kept in seed/state-demographics-approx.tsv:
// the Census API that serves those tables now needs a key, and the game does
// not need them exact, because every campaign samples around these values when
// it opens (`jitterDemographics` in the engine). Each approximate column is
// rescaled so its population-weighted mean matches the national figure the
// Census Bureau published, which keeps a chosen set of state values from
// drifting the country off its own total.
//
//   node scripts/vendor-state-demographics.mjs          fetch, write seed/state-demographics.tsv, bake state-demographics.ts
//   node scripts/vendor-state-demographics.mjs --bake   bake from the seed already on disk
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedPath = path.join(root, "packages/world/src/dataset/seed/state-demographics.tsv");
const approxPath = path.join(root, "packages/world/src/dataset/seed/state-demographics-approx.tsv");
const statesPath = path.join(root, "packages/world/src/dataset/states.ts");
const outPath = path.join(root, "packages/world/src/dataset/state-demographics.ts");

const POPEST = "https://www2.census.gov/programs-surveys/popest/datasets/2020-2023/state/asrh/sc-est2023-alldata6.csv";
// National anchors, percent, from the Census Bureau's 2023 ACS 1-year releases.
const NATIONAL = { foreign: 14.3, disability: 13.6, veteran: 6.1 };

function stateIds() {
  const text = readFileSync(statesPath, "utf8");
  return Object.fromEntries([...text.matchAll(/\{ id: "([A-Z]{2})", name: "[^"]+", fips: "(\d{2})"/g)].map(([, id, fips]) => [fips, id]));
}

async function fetchRaceSex() {
  const fipsToId = stateIds();
  const response = await fetch(POPEST);
  if (!response.ok) throw new Error(`Census population estimates: HTTP ${response.status}`);
  const lines = (await response.text()).replaceAll("\r", "").split("\n");
  const head = lines[0].split(",");
  const col = Object.fromEntries(head.map((name, i) => [name, i]));
  const t = {};
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const c = line.split(",");
    const id = fipsToId[c[col.STATE]];
    if (!id) continue;
    const v = Number(c[col.POPESTIMATE2023]);
    const [sex, origin, race, age] = [c[col.SEX], c[col.ORIGIN], c[col.RACE], Number(c[col.AGE])];
    const s = (t[id] ??= { pop: 0, hisp: 0, white: 0, black: 0, asian: 0, other: 0, female: 0, adults: 0 });
    if (sex === "0" && origin === "0") {
      s.pop += v;
      if (age >= 18) s.adults += v;
    }
    if (sex === "0" && origin === "2") s.hisp += v;
    if (sex === "0" && origin === "1") s[{ 1: "white", 2: "black", 4: "asian" }[race] ?? "other"] += v;
    if (sex === "2" && origin === "0") s.female += v;
  }
  if (Object.keys(t).length !== 51) throw new Error(`expected 50 states and DC, got ${Object.keys(t).length}`);
  return t;
}

function readApprox() {
  const rows = readFileSync(approxPath, "utf8").split("\n").filter((l) => l && !l.startsWith("#") && !l.startsWith("state\t"));
  return Object.fromEntries(rows.map((l) => { const [id, foreign, disability, veteran] = l.split("\t"); return [id, { foreign: +foreign, disability: +disability, veteran: +veteran }]; }));
}

function rescale(approx, pops, key) {
  const total = Object.values(pops).reduce((a, b) => a + b, 0);
  const mean = Object.entries(pops).reduce((sum, [id, p]) => sum + approx[id][key] * p, 0) / total;
  return NATIONAL[key] / mean;
}

async function fetchSeed() {
  const raceSex = await fetchRaceSex();
  const approx = readApprox();
  const pops = Object.fromEntries(Object.entries(raceSex).map(([id, s]) => [id, s.pop]));
  const scale = Object.fromEntries(Object.keys(NATIONAL).map((k) => [k, rescale(approx, pops, k)]));
  const fixed = (x) => (Math.round(x * 10000) / 10000).toString();
  const lines = Object.keys(raceSex).sort().map((id) => {
    const s = raceSex[id];
    const a = approx[id];
    if (!a) throw new Error(`${id}: no approximate row`);
    const adultShare = s.adults / s.pop;
    return [
      id, s.pop, fixed(s.hisp / s.pop), fixed(s.black / s.pop), fixed(s.asian / s.pop), fixed(s.white / s.pop), fixed(s.other / s.pop), fixed(s.female / s.pop),
      fixed((a.foreign * scale.foreign) / 100), fixed((a.disability * scale.disability) / 100), fixed(((a.veteran * scale.veteran) / 100) * adultShare),
    ].join("\t");
  });
  const text = [
    "# State demographic composition, vendored by scripts/vendor-state-demographics.mjs — do not edit by hand.",
    `# opened: ${new Date().toISOString().slice(0, 10)}`,
    `# source race, ethnicity, sex: US Census Bureau, Vintage 2023 population estimates by characteristics, July 1 2023 (${POPEST}); public domain. Race is non-Hispanic single race; other is American Indian and Alaska Native, Native Hawaiian and Pacific Islander, and two or more races, non-Hispanic.`,
    "# source nativity, disability, veteran: approximate, hand-rounded shares (seed/state-demographics-approx.tsv) from public Census Bureau ACS 2023 summaries, rescaled so the population-weighted mean matches the national figure (foreign-born 14.3, disability 13.6, veterans 6.1 percent of civilian adults). Veteran share is converted to a share of all residents using the state's 18-and-over share. Not exact.",
    "state\tpopulation\thispanic\tblack\tasian\twhite\tother\tfemale\tforeign\tdisability\tveteran",
    ...lines,
  ].join("\n");
  writeFileSync(seedPath, `${text}\n`);
  console.log(`Wrote ${lines.length} states; rescale ${JSON.stringify(Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, +v.toFixed(3)])))}`);
}

function bake() {
  const lines = readFileSync(seedPath, "utf8").split("\n");
  const opened = lines.find((l) => l.startsWith("# opened: "))?.slice(10);
  const sources = lines.filter((l) => l.startsWith("# source ")).map((l) => l.slice(2));
  const rows = lines.filter((l) => l && !l.startsWith("#") && !l.startsWith("state\t")).map((l) => l.split("\t"));
  const body = rows.map(([id, , hisp, black, asian, white, other, female, foreign, disability, veteran]) => {
    const f = (x) => Number(x);
    const race = [f(hisp), f(black), f(asian), f(white), f(other)];
    const drift = Math.round((1 - race.reduce((a, b) => a + b, 0)) * 10000) / 10000;
    race[3] = Math.round((race[3] + drift) * 10000) / 10000;
    return `  ${id}: {
    race: { "race-hispanic": ${race[0]}, "race-black": ${race[1]}, "race-asian": ${race[2]}, "race-white": ${race[3]}, "race-other": ${race[4]} },
    sex: { "sex-female": ${f(female)}, "sex-male": ${Math.round((1 - f(female)) * 10000) / 10000} },
    nativity: { "foreign-born": ${f(foreign)}, "us-born": ${Math.round((1 - f(foreign)) * 10000) / 10000} },
    disability: { "with-disability": ${f(disability)}, "no-disability": ${Math.round((1 - f(disability)) * 10000) / 10000} },
    veteran: { veteran: ${f(veteran)}, "non-veteran": ${Math.round((1 - f(veteran)) * 10000) / 10000} },
  },`;
  });
  const out = `// Written by scripts/vendor-state-demographics.mjs from seed/state-demographics.tsv; do not edit by hand.
//
// The opening composition of each state on the race, sex, nativity, disability
// and veteran axes, as shares of residents. Race, ethnicity and sex are Census
// Bureau counts; the other three are approximate. Every campaign samples around
// these values when it opens, so no two games start from exactly the same
// country.
${sources.map((s) => `// ${s}`).join("\n")}
// opened ${opened}

import type { StateId } from "../schemas/state.js";

export type StateDemographics = {
  readonly race: Readonly<Record<"race-hispanic" | "race-black" | "race-asian" | "race-white" | "race-other", number>>;
  readonly sex: Readonly<Record<"sex-female" | "sex-male", number>>;
  readonly nativity: Readonly<Record<"foreign-born" | "us-born", number>>;
  readonly disability: Readonly<Record<"with-disability" | "no-disability", number>>;
  readonly veteran: Readonly<Record<"veteran" | "non-veteran", number>>;
};

// prettier-ignore
export const STATE_DEMOGRAPHICS: Readonly<Record<StateId, StateDemographics>> = {
${body.join("\n")}
} as Readonly<Record<StateId, StateDemographics>>;
`;
  writeFileSync(outPath, out);
  console.log(`Wrote ${rows.length} states → ${path.relative(root, outPath)}`);
}

async function main() {
  if (!process.argv.includes("--bake")) await fetchSeed();
  bake();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
