#!/usr/bin/env node
// Drafts the thin record of every roster government that has no record yet.
//
// A thin record is the authored layer of a country nobody has researched: its
// name as the game spells it, its charter, its region and coordinates, its
// temperament, and nothing it has decided about the President. Its figures
// come from the bake (nation-figures.generated.ts) and its aims from its
// archetype's pool, so a thin record authors no agenda and no red line.
//
// Everything here is drafted from a source or a stated prior, never typed:
//   identity   the seed (GeoNames, the Factbook), with the spelling overrides
//              in scripts/lib/nation-roster-priors.mjs
//   charter    the Factbook's government type, by the priors' mapping
//   hazards    the priors' regional table, with its country overrides
//   traits     a least-squares fit of the authored records' own temperament
//              against the governance indicators and sourced mass, so a new
//              country reads on the scale the shipped content was tuned for
//   posture    the authored records' aggression cutoffs between postures
//
// Written once per country: a record already in a region file is left alone,
// because once drafted it belongs to the content room, which promotes it to
// standard by authoring it. Reads packages/world/dist; build the world package
// first. Prints each trait fit's R².
//
//   node scripts/draft-nation-records.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NATION_FIGURES } from "../packages/world/dist/dataset/nation-figures.generated.js";
import { ROSTER_DRAFTS, worldNations } from "../packages/world/dist/dataset/nations.js";
import { CHARTER_BY_GOVERNMENT_TYPE, CHARTER_OVERRIDES, HAZARD_OVERRIDES, IDENTITY_OVERRIDES, REGION_HAZARDS, REGION_OF } from "./lib/nation-roster-priors.mjs";
import { fitLinear, loadSeed, median } from "./lib/nation-seed.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedDir = path.join(root, "packages/world/src/dataset/seed");
const datasetDir = path.join(root, "packages/world/src/dataset");

/** Region → the file its thin records live in. */
const FILE_OF_REGION = {
  "region-north-africa": "mena", "region-middle-east": "mena",
  "region-west-africa": "africa", "region-central-africa": "africa", "region-east-africa": "africa", "region-southern-africa": "africa",
  "region-caribbean": "americas", "region-central-america": "americas", "region-south-america": "americas",
  "region-northern-europe": "europe", "region-western-europe": "europe", "region-central-europe": "europe",
  "region-southern-europe": "europe", "region-eastern-europe": "europe", "region-caucasus": "europe",
  "region-central-asia": "asia", "region-south-asia": "asia", "region-southeast-asia": "asia", "region-east-asia": "asia",
  "region-oceania": "oceania",
};

/** Each trait and the sourced quantities it is fitted on. */
const TRAIT_FITS = {
  aggression: ["militaryShare", "PV", "VA"],
  opportunism: ["CC", "VA"],
  legalism: ["RL", "VA"],
  isolationism: ["openness", "lnGdp"],
  riskTolerance: ["PV", "militaryShare"],
  vengefulness: ["PV", "VA"],
  reliability: ["GE", "RL"],
  transparency: ["VA", "CC"],
};

const POSTURES = ["defensive", "balanced", "assertive", "expansionist"];
const round2 = (value) => Math.round(value * 100) / 100;
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

function features(stats, row) {
  const wgi = (column) => row.wb[column]?.value;
  return {
    militaryShare: stats.military.budget / Math.max(1, stats.economy.gdp),
    openness: (stats.trade.exports + stats.trade.imports) / Math.max(1, stats.economy.gdp),
    lnGdp: Math.log(Math.max(1, stats.economy.gdp)),
    PV: wgi("wgi_stability"), GE: wgi("wgi_effectiveness"), CC: wgi("wgi_corruption_control"), RL: wgi("wgi_rule_of_law"), VA: wgi("wgi_voice"),
  };
}

/** The records written in full, whose temperament somebody decided; a drafted record's is this script's own output. */
const fullyAuthored = () => {
  const drafted = new Set(ROSTER_DRAFTS.map((draft) => draft.id));
  return worldNations.filter((n) => !drafted.has(n.id));
};

function fitTraits(seed) {
  const samples = fullyAuthored().filter((n) => seed.has(n.id)).map((n) => ({ nation: n, x: features(n.stats, seed.get(n.id)) })).filter((s) => Object.values(s.x).every(Number.isFinite));
  const fits = Object.fromEntries(Object.entries(TRAIT_FITS).map(([trait, predictors]) => [trait, fitLinear(samples.map((s) => ({ x: predictors.map((p) => s.x[p]), y: s.nation.traits[trait] })))]));
  // Cut points between adjacent postures, midway between their median aggression.
  const medians = POSTURES.map((posture) => median(fullyAuthored().filter((n) => n.doctrine.posture === posture).map((n) => n.traits.aggression)));
  const cuts = medians.slice(1).map((m, i) => (m + medians[i]) / 2);
  return { fits, cuts, sampleSize: samples.length };
}

function charterFor(iso3, governmentType) {
  if (CHARTER_OVERRIDES[iso3]) return CHARTER_OVERRIDES[iso3];
  const found = CHARTER_BY_GOVERNMENT_TYPE.find(([pattern]) => pattern.test(governmentType));
  if (!found) throw new Error(`${iso3}: no charter maps the Factbook's government type "${governmentType}"`);
  return found[1];
}

function languagesOf(codes) {
  const names = codes.split(",").map((code) => code.split("-")[0]).filter(Boolean).map((code) => languageNames.of(code)).filter((name) => name && !/^[a-z]{2,3}$/.test(name));
  return [...new Set(names)].slice(0, 2);
}

function draftFor(row, figures, traitModel) {
  const { identity: id } = row;
  const override = IDENTITY_OVERRIDES[row.iso3] ?? {};
  const region = REGION_OF[row.iso3];
  if (!region) throw new Error(`${row.iso3}: no region assigned in nation-roster-priors.mjs`);
  const x = features(figures.stats, row);
  const traits = Object.fromEntries(Object.entries(TRAIT_FITS).map(([trait, predictors]) => [trait, round2(Math.min(0.95, Math.max(0.05, traitModel.fits[trait].predict(predictors.map((p) => x[p] ?? 0)))))]));
  const posture = POSTURES[traitModel.cuts.filter((cut) => traits.aggression >= cut).length];
  const languages = override.languages ?? languagesOf(id.languages);
  if (languages.length === 0) throw new Error(`${row.iso3}: no language name for "${id.languages}"`);
  return {
    id: row.iso3,
    identity: {
      name: override.name ?? id.name, adjective: override.adjective ?? id.adjective, capital: override.capital ?? id.capital,
      government: charterFor(row.iso3, id.government_type), languages, currency: id.currency,
      ...(override.definiteArticle ? { definiteArticle: true } : {}),
    },
    geo: {
      region, lat: override.lat ?? Number(id.capital_lat), lon: override.lon ?? Number(id.capital_lon),
      coastline: Number(id.coastline_km) > 0, disasterExposure: HAZARD_OVERRIDES[row.iso3] ?? REGION_HAZARDS[region],
    },
    traits, posture,
    source: id.government_type,
  };
}

/** A TypeScript object literal in the house style: unquoted keys, spaced braces and commas. */
function literal(value) {
  if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${literal(v)}`);
    return entries.length === 0 ? "{}" : `{ ${entries.join(", ")} }`;
  }
  return JSON.stringify(value);
}

function render(draft) {
  const { identity, geo, traits } = draft;
  const traitLine = Object.entries(traits).map(([k, v]) => `${k}: ${v}`).join(", ");
  const note = draft.source ? `  // Factbook: ${draft.source}\n` : "";
  return `${note}  {
    id: ${JSON.stringify(draft.id)}, playable: false, fidelity: "thin",
    identity: ${literal(identity)},
    geo: { region: ${JSON.stringify(geo.region)}, lat: ${geo.lat}, lon: ${geo.lon}, neighbors: [], coastline: ${geo.coastline}, chokepoints: [], disasterExposure: ${literal(geo.disasterExposure)} },
    traits: { ${traitLine}, agendas: [] },
    doctrine: { posture: ${JSON.stringify(draft.posture)}, redLines: [], alignmentPull: [] },
  },`;
}

function header(file, count) {
  const title = { africa: "Sub-Saharan Africa", americas: "the Americas", asia: "Asia", europe: "Europe and the Caucasus", mena: "North Africa and the Middle East", oceania: "Oceania" }[file];
  return `import type { NationDraft } from "./compose-nation.js";

// Thin records for ${title}: ${count} countries the roster carries at thin fidelity.
//
// Drafted by scripts/draft-nation-records.mjs from the seed and the stated
// priors in scripts/lib/nation-roster-priors.mjs, then left to the content
// room. Figures come from nation-figures.generated.ts; the temperament is a fit
// of the authored records' own traits against the governance indicators; a
// thin record authors no agenda or red line, and rolls its aims from its
// archetype's pool. Promoting a country to standard means researching its
// agendas, a red line and its alignment and authoring them here, and moving
// its fidelity to "standard".

// prettier-ignore
export const ${file}Drafts: readonly NationDraft[] = [
`;
}

const seed = loadSeed(seedDir);
const traitModel = fitTraits(seed);
console.log(`trait fits on ${traitModel.sampleSize} authored records:`);
for (const [trait, fit] of Object.entries(traitModel.fits)) console.log(`  ${trait.padEnd(14)} ~ ${TRAIT_FITS[trait].join(" + ").padEnd(24)} R²=${fit.r2.toFixed(2)}`);
console.log(`posture cuts on aggression: ${traitModel.cuts.map((c) => c.toFixed(2)).join(", ")}`);

const authored = new Set(worldNations.map((n) => n.id));
const byFile = new Map();
for (const [iso3, row] of seed) {
  if (authored.has(iso3)) continue;
  const figures = NATION_FIGURES[iso3];
  if (!figures) throw new Error(`${iso3}: no baked figures — run scripts/bake-nations.mjs first`);
  const draft = draftFor(row, figures, traitModel);
  const file = FILE_OF_REGION[draft.geo.region];
  byFile.set(file, [...(byFile.get(file) ?? []), draft]);
}
for (const [file, drafts] of byFile) {
  const out = path.join(datasetDir, `nations-${file}.ts`);
  if (existsSync(out) && readFileSync(out, "utf8").includes("fidelity:")) {
    console.log(`nations-${file}.ts exists; left alone`);
    continue;
  }
  const sorted = drafts.sort((a, b) => a.geo.region.localeCompare(b.geo.region) || a.identity.name.localeCompare(b.identity.name));
  writeFileSync(out, `${header(file, sorted.length)}${sorted.map(render).join("\n")}\n];\n`);
  console.log(`wrote nations-${file}.ts (${sorted.length})`);
}
