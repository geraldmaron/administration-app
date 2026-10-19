#!/usr/bin/env node
// Bakes the figures a roster government's record composes from.
//
// Reads only the pinned seed tables (scripts/vendor-nation-stats.mjs writes
// them, with sources and licenses in their headers) and the built world
// package, and writes packages/world/src/dataset/nation-figures.generated.ts:
// one row of complete NationStats, with provenance, for every roster
// government the authored roster does not already state in full.
//
// Three kinds of number come out, and the provenance says which is which:
//   sourced  a figure a source published, converted to the dataset's units
//   prior    a figure no source states for this country, filled from a median
//            of the same ratio across its continent's sourced figures, or from
//            a least-squares fit of sourced figures against each other
//   judged   a 0..1 reading the dataset authors by judgment (readiness,
//            legitimacy, reach), filled from a least-squares fit of the 61
//            authored records' own readings against the governance indicators
//            and the country's sourced mass, so a new country lands on the
//            scale the shipped content was tuned against
//
// It also checks, and refuses to write when a check fails: every baked row
// parses as a Nation through composeNation; composing each authored record
// with its baked figures returns the record unchanged (the bake moves no
// shipped number); the dataset as last built validates clean. And it prints
// the drift between the authored records and their sources.
//
// Reads packages/world/dist, so build the world package first:
//   pnpm --filter @admin/world run build && node scripts/bake-nations.mjs [--report <file>]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
// Module by module rather than through the package index: the index assembles
// the dataset at import, and assembly needs the tables this bake writes. The
// assembled dataset is loaded lazily, after the tables exist (see check()).
import { composeNation } from "../packages/world/dist/dataset/compose-nation.js";
import { ROSTER_DRAFTS, worldNations } from "../packages/world/dist/dataset/nations.js";
import { NATION_PARTY_SYSTEMS } from "../packages/world/dist/dataset/party-systems.js";
import { AUTHORED_SCHOOLS } from "../packages/world/dist/dataset/schools.js";
import { renderReport } from "./lib/nation-drift.mjs";
import { rosterPartySystems, rosterSchools } from "./lib/roster-tables.mjs";
import { continentMedians, fitLinear, getPath, loadSeed, median, QBTU_TO_TWH, seedRatios } from "./lib/nation-seed.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedDir = path.join(root, "packages/world/src/dataset/seed");
const outPath = path.join(root, "packages/world/src/dataset/nation-figures.generated.ts");

/** The judged readings and the sourced quantities each is fitted on. */
const JUDGED = [
  ["politics.regimeStability", ["PV", "GE"]],
  ["politics.legitimacy", ["VA", "GE", "PV"]],
  ["politics.pressFreedom", ["VA"]],
  ["politics.factionalism", ["VA", "PV"]],
  ["politics.protestPressure", ["PV", "VA", "lnGdpPc"]],
  ["security.corruptionIndex", ["CC"]],
  ["security.insurgencyPressure", ["PV"]],
  ["security.borderControl", ["GE", "RL"]],
  ["security.crimeIndex", ["lnHom", "RL"]],
  ["security.intelCapability", ["lnMil", "GE"]],
  // Counter-intelligence is policing a state does with or without an army, so
  // it is fitted on how well the state governs and not on its defense budget,
  // which read every microstate without forces as a country with no police.
  ["security.counterIntel", ["GE", "RL", "VA"]],
  ["military.readiness", ["lnMilPerSoldier", "GE"]],
  ["military.doctrineQuality", ["lnMilPerSoldier", "GE"]],
  ["military.branchStrength.land", ["lnMil", "lnPop"]],
  ["military.branchStrength.air", ["lnMil", "lnGdpPc"]],
  ["military.branchStrength.naval", ["lnMil", "coast"]],
  ["military.branchStrength.cyber", ["lnMil", "lnGdpPc"]],
  ["military.branchStrength.space", ["lnMil", "lnGdp"]],
  ["military.airliftCapacity", ["lnMil", "lnGdpPc"]],
  ["military.sealiftCapacity", ["lnMil", "coast"]],
  ["softPower.diplomaticReach", ["lnGdp", "lnPop"]],
  ["softPower.culturalReach", ["lnGdp", "lnGdpPc"]],
];

/** Every reading the bake fills from the authored roster's fits rather than from a source. */
const JUDGED_READINGS = [...JUDGED.map(([dotted]) => dotted), "military.reserveHeadcount", "softPower.aidGiven"];

/** Readings a country with no standing military holds at zero, by the Factbook's word rather than a fit. */
const NO_FORCES_ZERO = [
  "military.readiness", "military.doctrineQuality", "military.branchStrength.land", "military.branchStrength.air",
  "military.branchStrength.naval", "military.branchStrength.space", "military.airliftCapacity", "military.sealiftCapacity",
];

/** The range NationStats models, where a real figure can fall outside it. */
const MODELED_RANGE = {
  "demography.medianAge": [10, 60],
  "demography.birthRate": [0.004, 0.045],
  "demography.deathRate": [0.003, 0.025],
  "demography.netMigration": [-0.05, 0.05],
  "economy.growth": [-0.3, 0.3],
  "economy.inflation": [-0.1, 2],
};

/** Rating index (21 = AAA, one notch per point, 1 = selective default) → the dataset's letter grades. */
const RATING_FLOORS = [[20.5, "AAA"], [17.5, "AA"], [14.5, "A"], [11.5, "BBB"], [8.5, "BB"], [5.5, "B"], [1.5, "CCC"]];
const ratingLetter = (index) => RATING_FLOORS.find(([floor]) => index >= floor)?.[1] ?? "D";

const round = (value, places) => Math.round(value * 10 ** places) / 10 ** places;
const money = (usd) => (Math.abs(usd) >= 1e7 ? Math.round(usd / 1e6) : round(usd / 1e6, 1));
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const val = (cell) => cell?.value;

/** Builds a nested object from dotted paths without mutating anything already built. */
function nest(entries) {
  const tree = {};
  for (const [dotted, value] of entries) {
    const keys = dotted.split(".");
    let node = tree;
    for (const key of keys.slice(0, -1)) node = node[key] ??= {};
    node[keys.at(-1)] = value;
  }
  return tree;
}

/** Fits for the two sourced gaps whose cause is poverty of reporting rather than of the country. */
function fitGaps(seed) {
  const rows = [...seed.values()];
  const lnGdpPc = (row) => Math.log(val(row.wb.gdp_usd) / val(row.wb.population));
  const literacy = fitLinear(rows.filter((r) => val(r.wb.literacy) !== undefined && val(r.wb.gdp_usd)).map((r) => ({ x: [lnGdpPc(r)], y: val(r.wb.literacy) / 100 })));
  const rating = fitLinear(
    rows.filter((r) => val(r.fiscal.rating_index) !== undefined && val(r.wb.gdp_usd) && val(r.wb.wgi_effectiveness) !== undefined)
      .map((r) => ({ x: [lnGdpPc(r), val(r.wb.wgi_effectiveness)], y: val(r.fiscal.rating_index) })),
  );
  return { literacy, rating };
}

/**
 * Where the World Bank publishes no usable breakdown of a country's exports, a net
 * energy exporter still sells what EIA says it produces: Turkmenistan's gas,
 * Chad's oil.
 */
function producerExports(produced, producedTotal) {
  if (producedTotal <= 0) return undefined;
  return Object.entries(produced).filter(([, qbtu]) => qbtu / producedTotal >= 0.2).sort((a, b) => b[1] - a[1]).map(([sector]) => sector);
}

/** The leading exports, ranked by dollar value across what the World Bank breaks merchandise and services into. */
function topExports(row) {
  const { wb, energy } = row;
  const merch = val(wb.merch_exports_usd) ?? 0;
  const services = val(wb.service_exports_usd) ?? 0;
  const total = merch + services;
  const produced = { "energy-oil": val(energy.oil_production_qbtu) ?? 0, "energy-gas": val(energy.gas_production_qbtu) ?? 0, mining: val(energy.coal_production_qbtu) ?? 0 };
  const producedTotal = Object.values(produced).reduce((a, b) => a + b, 0);
  const netExporter = (val(energy.production_qbtu) ?? 0) > (val(energy.consumption_qbtu) ?? 0);
  if (total <= 0) return netExporter ? producerExports(produced, producedTotal) : undefined;
  const share = (column, base) => ((val(wb[column]) ?? 0) / 100) * base;
  const fuel = share("fuel_exports_pct", merch);
  const dollars = new Map();
  const add = (sector, amount) => dollars.set(sector, (dollars.get(sector) ?? 0) + amount);
  // Only a net energy exporter sells what it digs up. A net importer that still
  // ships fuel is refining or re-exporting crude it bought, and that trade is in
  // oil products whatever it mines at home — Greece mines lignite and exports
  // refined petroleum.
  if (netExporter && producedTotal > 0) for (const [sector, qbtu] of Object.entries(produced)) add(sector, (fuel * qbtu) / producedTotal);
  else add("energy-oil", fuel);
  add("mining", share("ores_metals_exports_pct", merch));
  add("agriculture", share("food_exports_pct", merch) + share("agri_raw_exports_pct", merch));
  add("semiconductors", share("manufactures_exports_pct", merch) * ((val(wb.hightech_manufactures_pct) ?? 0) / 100));
  add("tourism-hospitality", share("travel_services_pct", services));
  add("telecom-cyber", share("ict_services_pct", services));
  add("finance", share("finance_services_pct", services));
  add("ports-shipping", share("transport_services_pct", services));
  const ranked = [...dollars].map(([sector, amount]) => [sector, amount / total]).sort((a, b) => b[1] - a[1]);
  const leading = ranked.filter(([, s]) => s >= 0.1).slice(0, 3).map(([sector]) => sector);
  if (leading.length > 0) return leading;
  const minor = ranked.filter(([, s]) => s >= 0.05).slice(0, 1).map(([sector]) => sector);
  return minor.length > 0 ? minor : netExporter ? producerExports(produced, producedTotal) : undefined;
}

/** A cell set with the helpers every stage writes through. */
function cellSet() {
  const cells = new Map();
  return {
    cells,
    get: (p) => cells.get(p)?.value,
    has: (p) => cells.has(p),
    source: (p, cell, convert = (v) => v) => cell !== undefined && cells.set(p, { value: convert(cell.value), year: cell.year }),
    stated: (p, value) => cells.set(p, { value }),
    prior: (p, value) => cells.set(p, { value, prior: true }),
    judge: (p, value) => cells.set(p, { value, judged: true }),
    fillPrior: (p, value) => !cells.has(p) && value !== undefined && cells.set(p, { value, prior: true }),
  };
}

function demographyAndEconomy(c, row, med, gaps) {
  const { wb, fiscal, identity } = row;
  c.source("demography.population", wb.population, Math.round);
  c.source("demography.urbanization", wb.urbanization, (v) => round(v / 100, 4));
  if (identity.median_age) c.stated("demography.medianAge", Number(identity.median_age));
  c.source("demography.literacy", wb.literacy, (v) => round(v / 100, 4));
  c.source("demography.birthRate", wb.birth_per_1000, (v) => round(v / 1000, 5));
  c.source("demography.deathRate", wb.death_per_1000, (v) => round(v / 1000, 5));
  const population = c.get("demography.population");
  if (population) c.source("demography.netMigration", wb.net_migration, (v) => round(v / population, 5));
  c.source("economy.gdp", wb.gdp_usd, money);
  c.source("economy.growth", wb.growth, (v) => round(v / 100, 4));
  c.source("economy.inflation", wb.inflation, (v) => round(v / 100, 4));
  c.source("economy.unemployment", wb.unemployment, (v) => round(v / 100, 4));
  c.source("economy.reserves", wb.reserves_usd, money);
  c.source("trade.exports", wb.exports_usd, money);
  c.source("trade.imports", wb.imports_usd, money);
  const gdp = c.get("economy.gdp");
  if (gdp !== undefined) c.source("economy.debt", fiscal.debt_pct_gdp, (v) => Math.round((v / 100) * gdp));
  c.source("economy.sovereignRating", fiscal.rating_index, ratingLetter);
  if (!population || gdp === undefined) return;
  const lnGdpPc = Math.log((gdp * 1e6) / population);
  c.fillPrior("demography.literacy", round(clamp(gaps.literacy.predict([lnGdpPc]), 0.1, 0.99), 4));
  c.fillPrior("economy.growth", round(med.growth, 4));
  c.fillPrior("economy.inflation", round(med.inflation, 4));
  c.fillPrior("economy.unemployment", round(med.unemployment, 4));
  c.fillPrior("trade.exports", Math.round(gdp * med.exportsShare));
  c.fillPrior("trade.imports", Math.round(gdp * med.importsShare));
  c.fillPrior("economy.reserves", Math.round((c.get("trade.imports") * med.reserveMonths) / 12));
  c.fillPrior("economy.debt", Math.round(gdp * med.debtShare));
  const ge = val(wb.wgi_effectiveness) ?? 0;
  c.fillPrior("economy.sovereignRating", ratingLetter(clamp(gaps.rating.predict([lnGdpPc, ge]), 1, 21)));
}

function energyFigures(c, row, med) {
  const { energy, wb } = row;
  const population = c.get("demography.population");
  const consumption = val(energy.consumption_qbtu);
  if (consumption > 0) {
    c.source("energy.consumption", energy.consumption_qbtu, (v) => round(v * QBTU_TO_TWH, 1));
    c.source("energy.production", energy.production_qbtu, (v) => round(v * QBTU_TO_TWH, 1));
  }
  c.fillPrior("energy.consumption", round(population * med.energyPerHead, 1));
  c.fillPrior("energy.production", round(c.get("energy.consumption") * med.selfSufficiency, 1));
  const shares = seedRatios(row);
  const mix = shares.oilShare !== undefined
    ? { oil: shares.oilShare, gas: shares.gasShare, nuclear: shares.nuclearShare, renewables: shares.renewablesShare }
    : { oil: med.oilShare, gas: med.gasShare, nuclear: med.nuclearShare, renewables: med.renewablesShare };
  const year = shares.oilShare !== undefined ? energy.consumption_qbtu.year : undefined;
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  const rounded = Object.fromEntries(Object.entries(mix).map(([k, v]) => [k, round(v / total, 3)]));
  const largest = Object.entries(rounded).sort((a, b) => b[1] - a[1])[0][0];
  rounded[largest] = round(1 - Object.entries(rounded).filter(([k]) => k !== largest).reduce((s, [, v]) => s + v, 0), 3);
  const mixValue = { "energy-oil": rounded.oil, "energy-gas": rounded.gas, "energy-nuclear": rounded.nuclear, "energy-renewables": rounded.renewables };
  c.cells.set("energy.mix", year ? { value: mixValue, year } : { value: mixValue, prior: true });
  const dependence = round(clamp(1 - c.get("energy.production") / Math.max(0.1, c.get("energy.consumption")), 0, 1), 4);
  const derivedFromPrior = c.cells.get("energy.consumption").prior || c.cells.get("energy.production").prior;
  c.cells.set("energy.importDependence", derivedFromPrior ? { value: dependence, prior: true } : { value: dependence, year: energy.consumption_qbtu.year });
  const exportsRanked = topExports(row);
  const exportsYear = wb.merch_exports_usd?.year ?? wb.service_exports_usd?.year ?? energy.production_qbtu?.year;
  if (exportsRanked) c.cells.set("trade.topExports", { value: exportsRanked, year: exportsYear });
  else c.prior("trade.topExports", []);
  c.source("softPower.aidReceived", wb.oda_received_usd, (v) => Math.max(0, money(v)));
  // The World Bank lists aid only for recipients; absence means none received.
  c.fillPrior("softPower.aidReceived", 0);
}

function militaryFigures(c, row, med) {
  const { wb, identity } = row;
  const gdp = c.get("economy.gdp");
  if (identity.standing_forces === "no") {
    c.stated("military.budget", 0);
    c.stated("military.activeHeadcount", 0);
    return;
  }
  c.source("military.budget", wb.military_usd, money);
  // A headcount of zero beside real spending is a gap in the series, not a
  // country paying for an army it does not have: Libya's reads that way.
  if (!(val(wb.armed_forces) === 0 && val(wb.military_usd) !== 0)) c.source("military.activeHeadcount", wb.armed_forces, Math.round);
  c.fillPrior("military.budget", Math.round(gdp * med.militaryShare));
  c.fillPrior("military.activeHeadcount", Math.round((c.get("military.budget") * 1e6) / med.costPerSoldier));
}

/** Everything a source states about one country, with its gaps filled from sourced priors. */
function sourcedCells(row, med, gaps) {
  const c = cellSet();
  demographyAndEconomy(c, row, med, gaps);
  if (!c.has("demography.population") || !c.has("economy.gdp")) return undefined;
  energyFigures(c, row, med);
  militaryFigures(c, row, med);
  return c;
}

/** The quantities a judged reading is fitted on, for one country. */
function features(row, c, med) {
  const { wb, identity } = row;
  const gdpUsd = c.get("economy.gdp") * 1e6;
  const population = c.get("demography.population");
  const budget = c.get("military.budget");
  return {
    lnGdpPc: Math.log(gdpUsd / population),
    lnGdp: Math.log(gdpUsd),
    lnPop: Math.log(population),
    lnMil: Math.log1p(budget),
    lnMilPerSoldier: Math.log1p((budget * 1e6) / Math.max(1, c.get("military.activeHeadcount"))),
    PV: val(wb.wgi_stability),
    GE: val(wb.wgi_effectiveness),
    CC: val(wb.wgi_corruption_control),
    RL: val(wb.wgi_rule_of_law),
    VA: val(wb.wgi_voice),
    // A homicide rate over fewer than a million people is a handful of events:
    // one killing in Tuvalu is ten per 100,000. Such a country reads its
    // continent's median rate rather than its own noise.
    lnHom: Math.log1p(population < 1_000_000 ? med.homicide : val(wb.homicide_per_100k) ?? med.homicide),
    coast: Number(identity.coastline_km) > 0 ? 1 : 0,
  };
}

/** Fits every judged reading against the authored roster, plus the three shares the authored roster alone states. */
function fitJudgment(base, featureOf, authored) {
  const samples = [...authored.values()].filter((n) => base.get(n.id) && Object.values(featureOf.get(n.id)).every(Number.isFinite));
  const fits = new Map();
  for (const [dotted, predictors] of JUDGED) {
    fits.set(dotted, fitLinear(samples.map((n) => ({ x: predictors.map((p) => featureOf.get(n.id)[p]), y: getPath(n.stats, dotted) }))));
  }
  const reserveRatio = median(samples.filter((n) => n.stats.military.activeHeadcount > 0).map((n) => n.stats.military.reserveHeadcount / n.stats.military.activeHeadcount));
  const aidShare = fitLinear(samples.map((n) => ({ x: [featureOf.get(n.id).lnGdpPc], y: n.stats.softPower.aidGiven / n.stats.economy.gdp })));
  return { fits, reserveRatio, aidShare, sampleSize: samples.length };
}

function judgedCells(c, row, feature, judgment) {
  for (const [dotted, predictors] of JUDGED) {
    const x = predictors.map((p) => feature[p] ?? 0);
    c.judge(dotted, round(clamp(judgment.fits.get(dotted).predict(x), 0, 1), 2));
  }
  if (row.identity.standing_forces === "no") for (const dotted of NO_FORCES_ZERO) c.stated(dotted, 0);
  c.judge("military.reserveHeadcount", Math.round(c.get("military.activeHeadcount") * judgment.reserveRatio));
  c.judge("softPower.aidGiven", Math.max(0, Math.round(c.get("economy.gdp") * judgment.aidShare.predict([feature.lnGdpPc]))));
}

/** Holds each figure to the range the game models, recording every one it had to move. */
function clampToModel(c) {
  const clamped = [];
  for (const [dotted, [lo, hi]] of Object.entries(MODELED_RANGE)) {
    const cell = c.cells.get(dotted);
    if (cell && (cell.value < lo || cell.value > hi)) {
      c.cells.set(dotted, { ...cell, value: clamp(cell.value, lo, hi) });
      clamped.push(dotted);
    }
  }
  return clamped;
}

function provenance(c, clamped) {
  const sourced = [...c.cells].filter(([, cell]) => cell.year !== undefined);
  const counts = new Map();
  for (const [, cell] of sourced) counts.set(cell.year, (counts.get(cell.year) ?? 0) + 1);
  const vintage = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const older = Object.fromEntries(sourced.filter(([, cell]) => cell.year < vintage).map(([dotted, cell]) => [dotted, cell.year]).sort());
  const priors = [...c.cells].filter(([, cell]) => cell.prior).map(([dotted]) => dotted).sort();
  return { vintage, older, priors, clamped: clamped.sort() };
}

/** Complete NationStats in schema order, derived identities computed rather than restated. */
function toStats(c) {
  const g = c.get;
  const tree = nest([...c.cells].map(([dotted, cell]) => [dotted, cell.value]));
  const d = tree.demography;
  return {
    demography: { population: d.population, urbanization: d.urbanization, medianAge: d.medianAge, growthRate: round(d.birthRate - d.deathRate + d.netMigration, 4), literacy: d.literacy, birthRate: d.birthRate, deathRate: d.deathRate, netMigration: d.netMigration },
    economy: { gdp: g("economy.gdp"), gdpPerCapita: Math.round((g("economy.gdp") * 1e6) / d.population), growth: g("economy.growth"), inflation: g("economy.inflation"), unemployment: g("economy.unemployment"), costOfLiving: 1, debt: g("economy.debt"), reserves: g("economy.reserves"), sovereignRating: g("economy.sovereignRating") },
    trade: { exports: g("trade.exports"), imports: g("trade.imports"), balance: round(g("trade.exports") - g("trade.imports"), 1), topExports: g("trade.topExports"), topPartners: [], tradeDependence: {} },
    energy: { production: g("energy.production"), consumption: g("energy.consumption"), importDependence: g("energy.importDependence"), mix: g("energy.mix") },
    military: { ...tree.military, arsenal: { warheads: 0, deliveryTriad: false }, basesAbroad: 0 },
    security: tree.security,
    politics: tree.politics,
    softPower: tree.softPower,
  };
}

/** A thin record around baked figures, so every row is proven to parse as a Nation before it is written. */
function probeDraft(row, stats) {
  const { identity } = row;
  return {
    id: row.iso3, playable: false, fidelity: "thin",
    identity: { name: identity.name, adjective: identity.adjective || identity.name, capital: identity.capital || identity.capital_fb || identity.name, government: "charter-parliamentary-republic", languages: ["(probe)"], currency: identity.currency || "USD" },
    geo: { region: "region-probe", lat: Number(identity.capital_lat) || 0, lon: Number(identity.capital_lon) || 0, neighbors: [], coastline: Number(identity.coastline_km) > 0, chokepoints: [], disasterExposure: {} },
    traits: { aggression: 0.5, opportunism: 0.5, legalism: 0.5, isolationism: 0.5, riskTolerance: 0.5, vengefulness: 0.5, reliability: 0.5, transparency: 0.5, agendas: [{ id: "probe", description: "probe", weight: 0.5 }] },
    doctrine: { posture: "balanced", redLines: [], alignmentPull: [] },
    stats,
  };
}

/**
 * Land borders for every roster government, from GeoNames' neighbor column.
 * Only roster members are kept: a border with a territory the roster does not
 * model (Western Sahara, French Guiana) is not a neighbor anything can act on.
 */
function writeNeighbors(seed) {
  const rows = [...seed.values()]
    .map((row) => [row.iso3, row.identity.neighbors.split(",").filter((id) => id && seed.has(id)).sort()])
    .filter(([, neighbors]) => neighbors.length > 0);
  const text = `// Baked by scripts/bake-nations.mjs from GeoNames countryInfo (CC BY 4.0) in
// seed/nation-identity.tsv — do not edit by hand. Land borders between roster
// governments; applyGeography (geography.ts) unites them with the authored
// neighbor lists and makes every border run both ways.

// prettier-ignore
export const NATION_LAND_BORDERS: Readonly<Record<string, readonly string[]>> = {
${rows.map(([id, neighbors]) => `  ${JSON.stringify(id)}: ${JSON.stringify(neighbors)},`).join("\n")}
};
`;
  writeFileSync(path.join(root, "packages/world/src/dataset/nation-borders.generated.ts"), text);
  console.log(`Wrote land borders for ${rows.length} governments → packages/world/src/dataset/nation-borders.generated.ts`);
}

// Where the Factbook archive's government type is empty, stale or not a form
// of government, the label a reader is owed instead, and why.
const GOVERNMENT_TYPE_OVERRIDES = {
  // The archive describes the Islamic Emirate only as "theocratic".
  AFG: "theocratic emirate",
  // "Absolute monarchy or sultanate": it is both, one form.
  BRN: "absolute monarchy (sultanate)",
  // Prefixed with the name of the state the entry covers.
  CYP: "presidential republic",
  // The archive's sentence, shortened; the fact it states is kept.
  BLR: "presidential republic in name, a dictatorship in fact",
  ERI: "authoritarian presidential state",
  // A war's two rival governments, not a form: "in transition".
  LBY: "divided between rival governments",
  YEM: "divided between rival governments",
  // Ruled by the junta that seized power in July 2023: "formerly, semi-presidential republic".
  NER: "military junta",
  // The archive keeps the West Bank and Gaza as separate entries with no government type.
  PSE: "semi-presidential republic",
};

/** The Factbook's government type for every roster government, as a reader-facing label. */
function writeGovernmentTypes(seed) {
  const rows = [...seed.values()]
    .map((row) => {
      const stated = (GOVERNMENT_TYPE_OVERRIDES[row.iso3] ?? row.identity.government_type ?? "").replace(/&nbsp;?/g, "").trim();
      return [row.iso3, stated.charAt(0).toUpperCase() + stated.slice(1)];
    })
    .filter(([, label]) => label !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  const text = `// Baked by scripts/bake-nations.mjs from the CIA World Factbook archive's
// government type (public domain) in seed/nation-identity.tsv — do not edit by
// hand. What a reader is told the government is; the charter the simulation
// runs it under is a separate, coarser thing. The few entries the archive
// leaves empty or stale are overridden in the bake, each with its reason.

// prettier-ignore
export const GOVERNMENT_TYPES: Readonly<Record<string, string>> = {
${rows.map(([id, label]) => `  ${JSON.stringify(id)}: ${JSON.stringify(label)},`).join("\n")}
};
`;
  writeFileSync(path.join(root, "packages/world/src/dataset/nation-government-types.generated.ts"), text);
  console.log(`Wrote government types for ${rows.length} governments → packages/world/src/dataset/nation-government-types.generated.ts`);
}

/** What the United States trades in goods with each roster government, by sector, from the Census seed. */
function writeUsGoodsTrade() {
  const text = readFileSync(path.join(seedDir, "us-goods-trade.tsv"), "utf8");
  const year = /# year: (\d{4})/.exec(text)?.[1];
  if (!year) throw new Error("us-goods-trade.tsv states no year");
  const partners = new Map();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#") || line.startsWith("iso3\t")) continue;
    const [iso3, direction, sector, value] = line.split("\t");
    const partner = partners.get(iso3) ?? { imports: {}, exports: {} };
    partner[direction][sector] = Number(value);
    partners.set(iso3, partner);
  }
  const rows = [...partners.entries()].sort(([a], [b]) => a.localeCompare(b));
  const out = `// Baked by scripts/bake-nations.mjs from seed/us-goods-trade.tsv (US Census
// Bureau, US imports and exports by end-use code and country, public domain) —
// do not edit by hand. What the United States imported from and exported to
// each roster government in goods, USD millions in the reference year, by trade
// sector, with "other" for what no sector covers (gold, furniture, toys);
// territories are folded into the government that holds them. The trade model
// opens every campaign here and moves it with the two economies and the
// measures in force.

export const US_GOODS_TRADE_YEAR = ${Number(year)};

export type UsGoodsTrade = {
  readonly imports: Readonly<Record<string, number>>;
  readonly exports: Readonly<Record<string, number>>;
};

// prettier-ignore
export const US_GOODS_TRADE: Readonly<Record<string, UsGoodsTrade>> = {
${rows.map(([iso3, row]) => `  ${JSON.stringify(iso3)}: ${JSON.stringify(row)},`).join("\n")}
};
`;
  writeFileSync(path.join(root, "packages/world/src/dataset/us-goods-trade.generated.ts"), out);
  console.log(`Wrote US goods trade for ${rows.length} partners (${year}) → packages/world/src/dataset/us-goods-trade.generated.ts`);
}

/** The party systems and schools of the countries no authored table covers. */
function writeRosterTables(seed) {
  const parties = rosterPartySystems(seedDir, seed, new Set(Object.keys(NATION_PARTY_SYSTEMS)));
  const { schools, hubs } = rosterSchools(seedDir, seed, new Set(AUTHORED_SCHOOLS.map((school) => school.nation)));
  const lines = (entries) => entries.map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`).join("\n");
  const text = `import type { z } from "zod";
import type { NationPartySystem } from "../schemas/nation.js";
import type { School } from "../schemas/background.js";

// Baked by scripts/bake-nations.mjs — do not edit by hand. The party systems
// and schools of every roster government the authored tables do not cover:
// seated tickets from the CIA World Factbook archive (public domain) with
// stated ideologies from Wikidata (CC0) placed on the game's axes, and
// universities from Wikidata ranked by how widely they are documented. A
// country with no university of note borrows its region's hub schools. The
// priors that shape both are in scripts/lib/nation-roster-priors.mjs.

// prettier-ignore
export const ROSTER_PARTY_SYSTEMS: Readonly<Record<string, z.input<typeof NationPartySystem>>> = {
${lines(Object.entries(parties))}
};

// prettier-ignore
export const ROSTER_SCHOOLS: readonly z.input<typeof School>[] = [
${schools.map((school) => `  ${JSON.stringify(school)},`).join("\n")}
];

/** Where a government with no university of note educates its officials: its region's hub countries. */
// prettier-ignore
export const ROSTER_SCHOOL_HUBS: Readonly<Record<string, readonly string[]>> = {
${lines(Object.entries(hubs))}
};
`;
  writeFileSync(path.join(root, "packages/world/src/dataset/roster-tables.generated.ts"), text);
  console.log(`Wrote ${Object.keys(parties).length} party systems, ${schools.length} schools and ${Object.keys(hubs).length} school hubs → packages/world/src/dataset/roster-tables.generated.ts`);
}

function bake() {
  const seed = loadSeed(seedDir);
  const medianFor = continentMedians(seed);
  // Only the records that state their own figures: a drafted record composes
  // from this bake's output, so it is neither a fit sample nor a drift case.
  const drafted = new Set(ROSTER_DRAFTS.map((draft) => draft.id));
  const authored = new Map(worldNations.filter((nation) => !drafted.has(nation.id)).map((nation) => [nation.id, nation]));
  const unseeded = [...authored.keys()].filter((id) => !seed.has(id));
  if (unseeded.length > 0) throw new Error(`authored records missing from the seed roster: ${unseeded.join(", ")}`);
  const gaps = fitGaps(seed);
  const base = new Map();
  const featureOf = new Map();
  for (const [iso3, row] of seed) {
    const cells = sourcedCells(row, medianFor(row.identity.continent), gaps);
    if (!cells) {
      if (!authored.has(iso3)) throw new Error(`${iso3}: the seed states no population or GDP, and no authored record states them either`);
      continue;
    }
    base.set(iso3, cells);
    featureOf.set(iso3, features(row, cells, medianFor(row.identity.continent)));
  }
  const judgment = fitJudgment(base, featureOf, authored);
  const baked = new Map();
  for (const [iso3, cells] of base) {
    judgedCells(cells, seed.get(iso3), featureOf.get(iso3), judgment);
    const clamped = clampToModel(cells);
    baked.set(iso3, { stats: toStats(cells), provenance: provenance(cells, clamped) });
  }
  return { seed, authored, baked, gaps, judgment };
}

function check({ seed, authored, baked }) {
  const failures = [];
  for (const [iso3, figures] of baked) {
    try {
      composeNation(probeDraft(seed.get(iso3), figures.stats), figures);
    } catch (error) {
      const detail = error.issues?.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ") ?? error.message;
      failures.push(`${iso3}: baked figures do not parse as a Nation — ${detail}`);
    }
  }
  let moved = 0;
  for (const [id, record] of authored) {
    if (!baked.has(id)) continue;
    if (!isDeepStrictEqual(composeNation(record, baked.get(id)), record)) {
      moved += 1;
      failures.push(`${id}: composing the authored record with its baked figures changed it`);
    }
  }
  for (const draft of ROSTER_DRAFTS) {
    try {
      composeNation(draft, baked.get(draft.id));
    } catch (error) {
      failures.push(`${draft.id}: its drafted record does not compose with the new figures — ${error.message.split("\n")[0]}`);
    }
  }
  return { failures, moved, datasetErrors: 0 };
}

/**
 * The dataset as last built, validated. Loaded after this bake has written its
 * tables because assembly reads them; on the first run of a new table there is
 * nothing built to validate yet, which `--bootstrap` accepts and says so.
 */
async function validateBuilt(verdict) {
  try {
    const { validateDataset, worldDataset } = await import("../packages/world/dist/index.js");
    const errors = validateDataset(worldDataset);
    for (const error of errors.slice(0, 10)) verdict.failures.push(`dataset: ${error.path} — ${error.message}`);
    if (errors.length > 10) verdict.failures.push(`dataset: …and ${errors.length - 10} more`);
    return { ...verdict, datasetErrors: errors.length };
  } catch (error) {
    if (process.argv.includes("--bootstrap")) {
      console.warn(`bootstrap: the built dataset does not assemble yet (${error.message.split("\n")[0]}); rebuild the world package and rerun the bake`);
      return verdict;
    }
    verdict.failures.push(`dataset: the built dataset does not assemble — ${error.message.split("\n")[0]}`);
    return verdict;
  }
}

const { seed, authored, baked, gaps, judgment } = bake();
writeNeighbors(seed);
writeGovernmentTypes(seed);
writeUsGoodsTrade();
writeRosterTables(seed);
const verdict = await validateBuilt(check({ seed, authored, baked }));
const report = renderReport({ authored, baked, gaps, judgment, verdict, judged: JUDGED });
console.log(report);
const reportFlag = process.argv.indexOf("--report");
if (reportFlag !== -1 && process.argv[reportFlag + 1]) writeFileSync(path.resolve(process.argv[reportFlag + 1]), `${report}\n`);
if (verdict.failures.length > 0) {
  console.error(`\nbake refused — ${verdict.failures.length} check(s) failed:\n  ${verdict.failures.join("\n  ")}`);
  process.exit(1);
}

const rows = [...baked].filter(([id]) => !authored.has(id)).sort(([a], [b]) => a.localeCompare(b));
const header = `import type { NationFigures } from "./compose-nation.js";

// Baked by scripts/bake-nations.mjs from the pinned seed tables in ./seed —
// do not edit by hand; rerun the bake. One roster government per line, for
// every government the authored roster does not already state in full.
//
// Sources (each table's header carries its license and fetch date): World Bank
// WDI and WGI and the World Bank Fiscal Space database (CC BY 4.0), the US EIA
// International Energy Statistics (public domain), GeoNames (CC BY 4.0) and the
// CIA World Factbook archive (public domain). Each row's provenance names the
// year its figures describe, the figures that are older, the figures filled
// from a prior because no source states them, and the figures held to the
// range the game models. Energy production and consumption are in TWh.

/**
 * The readings on every row that no source states: fitted from the authored
 * roster's own readings against the governance indicators and sourced mass.
 * A country with no standing military holds its force readings at zero instead.
 */
export const JUDGED_READINGS: readonly string[] = ${JSON.stringify(JUDGED_READINGS)};

// prettier-ignore
export const NATION_FIGURES: Readonly<Record<string, NationFigures>> = {
`;
const body = rows.map(([id, figures]) => `  ${JSON.stringify(id)}: ${JSON.stringify(figures)},`).join("\n");
writeFileSync(outPath, `${header}${body}\n};\n`);
console.log(`\nWrote ${rows.length} rows → ${path.relative(root, outPath)}; ${authored.size} authored records unchanged (${verdict.moved} moved).`);
