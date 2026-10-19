#!/usr/bin/env node
// Who reads and who writes every registered figure, found by the type checker
// rather than by a hand-kept claim.
//
// The registries name readers by hand (`stat-consumers.ts`'s `readBy`, the
// engine's `METRIC_REGISTRY`), and a hand claim drifts: two of them once named
// functions that never existed. This walks the source the way the compiler
// sees it and lists, per registered field, every declaration that reads or
// writes it, keyed `path#declaration` (repo-relative path, enclosing top-level
// declaration), never by line, so moving code does not change the report and
// the committed report's diff is the audit.
//
// It writes `scripts/metric-registry-report.json`, and
// `scripts/verify-metric-registry.mjs` fails when the committed report is not
// what the tree writes, so the report moves in the same commit as the code.
//
// The registries and the scenario corpus are read from the built `dist/`; the
// walk itself reads source (`scripts/lib/metric-sites.mjs` says why). Run it
// after `pnpm run build`:
//
//   node scripts/report-metric-registry.mjs                 # rewrite the report
//   node scripts/report-metric-registry.mjs <fixture-dir>   # a proof fixture's report.json
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CONSUMER_REGISTRIES } from "../packages/world/dist/index.js";
import { METRIC_REGISTRY } from "../packages/engine/dist/index.js";
import { CORE_SCENARIOS, PILOT_SCENARIOS } from "../packages/content/dist/index.js";
import { BUNDLED_SHARDS } from "../packages/player-core/dist/content/bundled-corpus.generated.js";
import { parseShardBody } from "../packages/player-core/dist/content/shard-parser.js";
import { dealtScenarios, readGates } from "./lib/content-gates.mjs";
import { PAYLOAD_HANDLERS, scanSources } from "./lib/metric-sites.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const REPORT_FILE = path.join(ROOT, "scripts/metric-registry-report.json");

// Where a registry's paths are walked from: the exported type its schema
// infers, in the package that declares it. `Nation.geo` is the one surface
// that is a property of a type rather than a type.
const WORLD_ROOTS = {
  NationStats: { pkg: "world", type: "NationStats" },
  "Nation.geo": { pkg: "world", type: "Nation", property: "geo" },
  NationTraits: { pkg: "world", type: "NationTraits" },
  Person: { pkg: "world", type: "Person" },
  NationBands: { pkg: "world", type: "NationBands" },
  City: { pkg: "world", type: "City" },
  State: { pkg: "world", type: "State" },
  District: { pkg: "world", type: "District" },
  SectorMixEntry: { pkg: "world", type: "SectorMixEntry" },
  Party: { pkg: "world", type: "Party" },
  MaritimeZone: { pkg: "world", type: "MaritimeZone" },
  InstallationAnchor: { pkg: "world", type: "InstallationAnchor" },
  FederalSite: { pkg: "world", type: "FederalSite" },
  StateCapitol: { pkg: "world", type: "StateCapitol" },
};

const ENGINE_ROOTS = {
  MetricSet: { pkg: "engine", type: "MetricSet" },
  PublicMood: { pkg: "engine", type: "PublicMood" },
};

/**
 * What the report is built from: a tree, the types its paths are walked from,
 * the registries in the shape `@admin/world` and `@admin/engine` export them,
 * and the scenarios the player is dealt. The gate's proof hands in a fixture
 * tree with its own.
 */
export function treeInput() {
  return {
    root: ROOT,
    roots: { ...WORLD_ROOTS, ...ENGINE_ROOTS },
    consumerRegistries: CONSUMER_REGISTRIES,
    metricRegistry: METRIC_REGISTRY,
    scenarios: dealtScenarios([...CORE_SCENARIOS, ...PILOT_SCENARIOS], BUNDLED_SHARDS, parseShardBody),
  };
}

/** Every registered field, as `registry:path`, with the readers its registry claims. */
function registeredFields(input) {
  const fields = new Map();
  for (const registry of input.consumerRegistries) {
    for (const entry of registry.entries) fields.set(`${registry.name}:${entry.path}`, "readBy" in entry ? entry.readBy : []);
  }
  for (const node of input.metricRegistry) {
    if (!node.field) continue;
    const [type, ...rest] = node.field.split(".");
    fields.set(`${type}:${rest.join(".")}`, []);
  }
  return fields;
}

const sorted = (values) => [...new Set(values)].sort();

function fieldReport(fields, found, gates) {
  return Object.fromEntries(
    [...fields.keys()].sort().map((id) => {
      const readers = sorted(found.readers.get(id) ?? []);
      const seen = new Set(readers.map((site) => site.replace(/ \(.*\)$/, "")));
      const throughCall = new Set(found.throughCall.get(id) ?? []);
      const unseen = fields.get(id).filter((site) => !seen.has(site));
      const claimedNotSeen = sorted(unseen.filter((site) => !throughCall.has(site)));
      const claimedThroughCall = sorted(unseen.filter((site) => throughCall.has(site)));
      const contentGates = gates.scenarios.get(id) ?? 0;
      return [id, {
        readers,
        writers: sorted(found.writers.get(id) ?? []),
        ...(contentGates > 0 ? { contentGates } : {}),
        ...(claimedThroughCall.length > 0 ? { claimedThroughCall } : {}),
        ...(claimedNotSeen.length > 0 ? { claimedNotSeen } : {}),
      }];
    }),
  );
}

function summarize(report, found, fields, unstored, scenarios) {
  const entries = Object.values(report);
  const count = (pick) => entries.reduce((n, f) => n + (pick(f)?.length ?? 0), 0);
  return {
    fields: entries.length,
    fieldsWithAReader: entries.filter((f) => f.readers.length > 0).length,
    fieldsWithAWriter: entries.filter((f) => f.writers.length > 0).length,
    readerSites: count((f) => f.readers),
    writerSites: count((f) => f.writers),
    claimedReaders: [...fields.values()].reduce((n, claims) => n + claims.length, 0),
    claimedThroughCall: count((f) => f.claimedThroughCall),
    claimedNotSeen: count((f) => f.claimedNotSeen),
    fieldsGatedByContent: entries.filter((f) => f.contentGates).length,
    scenariosRead: scenarios,
    leakySites: sorted(found.leaky).length,
    computedKeySites: sorted(found.computed).length,
    fieldsWithNoDeclaration: found.unindexed.length,
    engineNodesWithNoStoredField: unstored.length,
  };
}

const COMMENT = [
  "Written by scripts/report-metric-registry.mjs; do not edit by hand. scripts/verify-metric-registry.mjs fails when it is not current.",
  "Per registered field (`registry:path`), the declarations the type checker finds reading and writing it, keyed `repo-path#top-level-declaration`, never by line.",
  "Reader notes: `(iterates)` reads every leaf of a record through Object.values/entries; `(computed key)` reads one leaf chosen at run time by a key typed as a plain string; `(shared)` is a declaration several paths share that the access could not narrow; `(through name)` hands a record to the helper `name`, which reads the leaf through a parameter of its own type.",
  "Writer notes: `(typed X)` is a patch handed over whole whose own type names the keys it writes, followed down to the leaves; `(spread)` is a narrower patch spread into one; `(computed key over T)` is a patch built with computed keys split from a dotted path of type T, credited with every field T names.",
  "A `metric` effect's write is credited to the site that builds its deltas, by the keys it sends, not to the handler that applies it (`handlers`). A `MetricDeltas` outside the engine and content packages is a price shown to the player, not a write.",
  "`contentGates`: how many scenarios in the dealt corpus (the authored packs and the baked shards) gate on the field, through the condition table in scripts/lib/content-gates.mjs.",
  "`claimedThroughCall`: a registry `readBy` site that reads the field one call deep: a helper handed the field as an argument, through a parameter of its own type, or a caller handing a helper the record the helper reads it from. `claimedNotSeen`: a `readBy` site the checker did not see reading the field, usually a read through a helper's return value or a value re-declared with a local type the walk could not map.",
  "`engineNodes` maps each node of the engine's METRIC_REGISTRY to the field it is stored in, which is the key its readers and writers are listed under.",
  "`leaky`: effect payloads typed so loosely the site cannot say which fields it writes. `computedKey`: patches built with computed keys and no dotted path in scope to resolve them. `fieldsWithNoDeclaration`: registered fields whose schema is built from a computed key list, so no access can resolve to them.",
  "Blind spots not listed: readers outside the typed packages (studio, scripts), relationship and alignment gates (not registered roots), and handler reroutes beyond HANDLER_REROUTES in scripts/lib/metric-sites.mjs.",
];

/** The report and what the gate reads beside it, as values: deterministic for a given tree. */
export function scanRegistry(input = treeInput()) {
  const fields = registeredFields(input);
  const found = scanSources(input.root, input.roots, new Set(fields.keys()));
  const gates = readGates(input.scenarios ?? [], input.gateTable);
  const report = fieldReport(fields, found, gates);
  const unstored = input.metricRegistry.filter((node) => !node.field).map((node) => node.id).sort();
  return {
    found,
    gates,
    report: {
      comment: COMMENT,
      summary: summarize(report, found, fields, unstored, (input.scenarios ?? []).length),
      engineNodes: Object.fromEntries(
        [...input.metricRegistry].sort((a, b) => a.id.localeCompare(b.id)).map((node) => [node.id, node.field ? node.field.replace(".", ":") : "recomputed, no stored field"]),
      ),
      fieldsWithNoDeclaration: found.unindexed,
      handlers: PAYLOAD_HANDLERS,
      leaky: sorted(found.leaky),
      computedKey: sorted(found.computed),
      fields: report,
    },
  };
}

/** The report, as a value: deterministic for a given tree. */
export function buildReport(input = treeInput()) {
  return scanRegistry(input).report;
}

export const reportText = (report) => `${JSON.stringify(report, null, 2)}\n`;

/**
 * A proof fixture: a miniature tree under `dir` (with its own
 * `tsconfig.base.json` and `packages/<pkg>/src`) and a `registry.json` holding
 * the roots and registries in the shape `treeInput` returns.
 */
export function fixtureInput(dir) {
  const spec = JSON.parse(readFileSync(path.join(dir, "registry.json"), "utf8"));
  return {
    root: dir,
    roots: spec.roots,
    consumerRegistries: spec.consumerRegistries,
    metricRegistry: spec.metricRegistry ?? [],
    blindSpots: spec.blindSpots,
    scenarios: spec.scenarios ?? [],
    gateTable: spec.gateTable,
  };
}

function main() {
  const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const report = buildReport(fixture ? fixtureInput(path.resolve(fixture)) : treeInput());
  writeFileSync(fixture ? path.join(path.resolve(fixture), "report.json") : REPORT_FILE, reportText(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
