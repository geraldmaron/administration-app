#!/usr/bin/env node
// Every stored figure is registered, read and (where a campaign moves it)
// written, and a registry's claim about who reads it is one the code bears out.
//
// The registries (`stat-consumers.ts`'s `readBy`, the engine's
// `METRIC_REGISTRY`) are hand-kept, and a hand claim rots: two fields were
// credited for years to rate laws that were never written. The typed walk in
// `scripts/report-metric-registry.mjs` lists what the compiler sees reading
// and writing each field; this holds the registries to it. It fails when:
//
//   (a) a field stored under a registered root type has no registry entry, or
//       a registered field has no declaration the walk can find and is not a
//       named blind spot below;
//   (b) a registered field has no reader the walk sees (directly, one call
//       deep, or through a scenario gate) and is not owed one, or a field
//       whose write policy says a campaign moves it (`phase-written`,
//       `effect-written`, `derived-only`) has no writer outside the dataset
//       and founding;
//   (c) a field whose write policy is `founding-only` is written by code
//       that runs in a campaign: the policy or the code is wrong, and the
//       registry is what a writer reads to decide;
//   (d) the scenario corpus gates on a field through an evaluator the walk
//       does not see reading it, or uses a condition kind the table in
//       `scripts/lib/content-gates.mjs` does not classify;
//   (e) a claimed reader the walk cannot confirm is not forgiven by
//       `scripts/baselines/metric-registry.json`, or a blind site (an effect
//       payload typed so loosely the walk cannot say which fields it writes,
//       or a patch built with computed keys it cannot resolve) is not
//       forgiven by `scripts/baselines/metric-registry-blind-sites.json`;
//       both are ratchets that may only shrink (scripts/baselines/ratchet.mjs);
//   (f) the committed `scripts/metric-registry-report.json` is not what the
//       tree writes.
//
// Named blind spots, reported on every run and never failed or forgiven
// silently: the cohort shares (their schemas are built from a computed key
// list, so no access resolves to one field); readers outside the typed
// packages (the studio console and scripts are plain modules the checker does
// not type); and gates on relationship edges and the President's alignment,
// which are not registered roots.
//
// It reads the registries and the corpus from the built `dist/` and the walk
// reads source, so run it after `pnpm run build`.
//
//   node scripts/verify-metric-registry.mjs                    the gate
//   node scripts/verify-metric-registry.mjs --update-baseline  shrink the baseline
//   node scripts/verify-metric-registry.mjs <fixture-dir>      the proof's trees
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { holdRatchet } from "./baselines/ratchet.mjs";
import { PROGRAMS } from "./lib/metric-sites.mjs";
import { REPORT_FILE, fixtureInput, reportText, scanRegistry, treeInput } from "./report-metric-registry.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/metric-registry.json");
const BLIND_BASELINE = fixture ? path.join(base, "blind-sites.json") : path.join(root, "scripts/baselines/metric-registry-blind-sites.json");
const REPORT = fixture ? path.join(base, "report.json") : REPORT_FILE;

/** Registered paths the walk cannot see by construction, by prefix, with the reason. */
const BLIND_SPOTS = [
  { prefix: "State:character.cohorts.", why: "a state's cohort shares: the schema is built from the cohort axis list, so no access resolves to one share" },
  { prefix: "District:cohortSkew.", why: "a district's cohort skews: the schema is built from the cohort axis list, so no access resolves to one skew" },
];
const NOT_WALKED = "scenario gates on relationship edges and on the President's alignment read state outside the registered roots";
const MOVED_IN_A_CAMPAIGN = new Set(["phase-written", "effect-written", "derived-only"]);

// Writes that build the world before a campaign runs: the dataset package
// (its authored tables and the derivations that fill them) and the engine's
// founding modules. A founding-only field may be written here and nowhere
// else, and a field a campaign moves needs a writer outside them.
const FOUNDING_SITES = [/^packages\/world\/src\//, /^packages\/engine\/src\/founding[\w-]*\.ts#/];
const isFounding = (site) => FOUNDING_SITES.some((pattern) => pattern.test(site));

const input = fixture ? fixtureInput(base) : treeInput();
const blindSpots = input.blindSpots ?? BLIND_SPOTS;
const { found, gates, report } = scanRegistry(input);
const failures = [];
const fail = (check, line) => failures.push(`${check}  ${line}`);

/** Write policy and owed status per registered field, from the registries the report was built from. */
function registeredFacts() {
  const facts = new Map();
  for (const registry of input.consumerRegistries) {
    for (const entry of registry.entries) facts.set(`${registry.name}:${entry.path}`, { writePolicy: entry.writePolicy, owed: "owedBy" in entry });
  }
  for (const node of input.metricRegistry) {
    if (node.field) facts.set(node.field.replace(".", ":"), { writePolicy: node.writePolicy, owed: false });
  }
  return facts;
}

const blindSpotOf = (id) => blindSpots.find((spot) => id.startsWith(spot.prefix));
const inScan = (site) => PROGRAMS.some((dir) => site.startsWith(`${dir}/src/`));

function checkStoredAreRegistered() {
  const fields = Object.keys(report.fields);
  const leaves = found.declared.filter((id) => !found.declared.some((other) => other.startsWith(`${id}.`)));
  for (const id of leaves) {
    if (!fields.includes(id) && !fields.some((field) => field.startsWith(`${id}.`))) {
      fail("UNREGISTERED", `${id} is stored but has no registry entry: register it with its reader, or pin it as owed`);
    }
  }
  for (const id of found.unindexed) {
    if (!blindSpotOf(id)) fail("UNDECLARED", `${id} is registered but the walk finds no declaration of it, and it is not a named blind spot`);
  }
}

function checkReadAndWritten(facts) {
  for (const [id, field] of Object.entries(report.fields)) {
    if (blindSpotOf(id)) continue;
    const fact = facts.get(id) ?? {};
    const claims = field.claimedNotSeen ?? [];
    const read = field.readers.length > 0 || (field.claimedThroughCall ?? []).length > 0 || (field.contentGates ?? 0) > 0;
    const readOutside = claims.length > 0 && claims.every((site) => !inScan(site));
    if (!read && !fact.owed && !readOutside) fail("NO READER", `${id} has no reader the walk sees and is not owed one`);
    const live = field.writers.filter((site) => !isFounding(site));
    if (MOVED_IN_A_CAMPAIGN.has(fact.writePolicy) && live.length === 0) {
      fail("NO WRITER", `${id} is ${fact.writePolicy} but nothing outside the dataset and founding writes it`);
    }
    if (fact.writePolicy === "founding-only" && live.length > 0) {
      fail("FOUNDING WRITTEN", `${id} is founding-only but a campaign writes it (${live.join(", ")}): correct the policy or the writer`);
    }
  }
}

const withoutNote = (site) => site.replace(/ \(.*\)$/, "");

/** Every evaluator the gate table names must be one the walk sees reading the field it is credited with. */
function checkContentGates() {
  for (const [id, sites] of gates.via) {
    const field = report.fields[id];
    if (!field) {
      fail("GATE UNREGISTERED", `the corpus gates on ${id}, which has no registry entry`);
      continue;
    }
    const seen = new Set([...field.readers, ...(field.claimedThroughCall ?? [])].map(withoutNote));
    for (const site of sites) if (!seen.has(site)) fail("GATE UNREAD", `the corpus gates on ${id} through ${site}, which the walk does not see reading it`);
  }
  for (const [kind, count] of gates.unclassified) {
    fail("GATE UNCLASSIFIED", `${count} scenario(s) gate on condition kind "${kind}", which scripts/lib/content-gates.mjs neither maps to a field nor lists as reading none`);
  }
}

/** Sites the walk cannot resolve, by declaration: an opaque effect payload or an unresolved computed-key patch. */
function blindSites() {
  const current = {};
  const count = (key) => (current[key] = (current[key] ?? 0) + 1);
  for (const site of report.leaky) count(`opaque  ${site.replace(/: opaque patch of (.*?) \(typed .*\)$/, ": $1")}`);
  for (const site of report.computedKey) count(`computed  ${site.replace(/: computed key into /, ": ")}`);
  return current;
}

/** Claimed readers in files the walk does not type, which it can neither confirm nor refute. */
function claimsOutsideTheScan() {
  return Object.entries(report.fields).flatMap(([id, field]) =>
    blindSpotOf(id) ? [] : (field.claimedNotSeen ?? []).filter((site) => !inScan(site)).map((site) => `${id} <- ${site}`),
  );
}

/** Claimed readers the walk cannot confirm, on fields it can see, in files it walks. */
function unconfirmedClaims() {
  const current = {};
  for (const [id, field] of Object.entries(report.fields)) {
    if (blindSpotOf(id)) continue;
    for (const site of field.claimedNotSeen ?? []) if (inScan(site)) current[`${id} <- ${site}`] = 1;
  }
  return current;
}

function checkReportCurrent() {
  const committed = existsSync(REPORT) ? readFileSync(REPORT, "utf8") : "";
  if (committed !== reportText(report)) {
    fail("STALE REPORT", `${path.relative(base, REPORT)} is not what the tree writes: run node scripts/report-metric-registry.mjs${fixture ? " <fixture>" : ""} and commit it`);
  }
}

function blindSpotLines(outside) {
  const counted = blindSpots.map((spot) => {
    const ids = Object.keys(report.fields).filter((id) => id.startsWith(spot.prefix));
    const claims = ids.reduce((n, id) => n + (report.fields[id].claimedNotSeen ?? []).length, 0);
    return `${spot.prefix}* — ${ids.length} field(s), ${claims} claim(s) not checked: ${spot.why}`;
  });
  return [...counted, ...outside.map((line) => `claimed outside the typed packages: ${line}`), NOT_WALKED];
}

const facts = registeredFacts();
checkStoredAreRegistered();
checkReadAndWritten(facts);
checkContentGates();
const outside = claimsOutsideTheScan();
checkReportCurrent();
const current = unconfirmedClaims();
const held = holdRatchet({
  label: "verify-metric-registry",
  repoRoot: root,
  file: BASELINE,
  comment:
    "Claimed readers (`registry:path <- path#declaration`) the typed walk does not see reading the field, directly or one call deep. " +
    "Written by `node scripts/verify-metric-registry.mjs --update-baseline`; it may only shrink. Confirm a claim (or correct it) to take it out.",
  current,
  update: process.argv.includes("--update-baseline"),
});
const blind = blindSites();
const heldBlind = holdRatchet({
  label: "verify-metric-registry",
  repoRoot: root,
  file: BLIND_BASELINE,
  comment:
    "Sites the typed walk cannot resolve to the fields they write, by declaration: `opaque` hands an effect a payload typed as the whole patch type, " +
    "`computed` builds a patch with computed keys and no dotted path in scope. Written by `node scripts/verify-metric-registry.mjs --update-baseline`; " +
    "it may only shrink. Type the payload by the keys it sends to take a site out.",
  current: blind,
  update: process.argv.includes("--update-baseline"),
});

console.log("verify-metric-registry: blind spots (named, not checked):");
for (const line of blindSpotLines(outside)) console.log(`    ${line}`);
for (const line of failures) console.error(`verify-metric-registry: ${line}`);
if (failures.length > 0 || !held || !heldBlind) {
  const ratchets = [held ? "" : "the unconfirmed-claims ratchet", heldBlind ? "" : "the blind-sites ratchet"].filter(Boolean).join(" and ");
  console.error(`\nverify-metric-registry: FAIL — ${failures.length} finding(s)${ratchets ? ` and ${ratchets}` : ""} above.`);
  process.exit(1);
}
const blindCount = Object.values(blind).reduce((n, c) => n + c, 0);
console.log(
  `verify-metric-registry: OK — ${report.summary.fields} registered field(s), ${report.summary.claimedReaders} claimed reader(s), ` +
    `${Object.keys(current).length} unconfirmed and forgiven by the baseline, ${blindCount} blind site(s) forgiven, ` +
    `${report.summary.fieldsGatedByContent} field(s) gated on by ${report.summary.scenariosRead} scenario(s); the report is current.`,
);
