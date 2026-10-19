#!/usr/bin/env node
// Proves verify-metric-registry.mjs fails each thing it exists to catch,
// rather than passing because today's tree is already forgiven.
//
// Each fixture is a miniature typed tree (a world package declaring one
// registered record, an engine package reading and writing it) with its own
// registry.json, report.json and baseline, written inside the checkout so the
// ratchet's path to a staged HEAD resolves, and removed in a finally block.
// The clean tree matters as much as the planted defects: it reads one field
// through a helper with its own parameter type, which the gate must confirm
// rather than report.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.metric-registry-proof-${process.pid}`);
const committedDir = path.join(root, `.metric-registry-proof-${process.pid}-head`);

function run(script, target, env = {}) {
  const argv = [`scripts/${script}`, ...(target ? [target] : [])];
  try {
    return { passed: true, output: execFileSync("node", argv, { cwd: root, stdio: "pipe", env: { ...process.env, ...env } }).toString() };
  } catch (err) {
    return { passed: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function writeTree(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  writeFiles(dir, files);
}

function writeFiles(dir, files) {
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
}

const ENGINE = "packages/engine/src/index.ts";
const WORLD = "packages/world/src/index.ts";
const STATS = `export type Stats = {
  readonly gdp: number;
  readonly debt: number;
  readonly mood: { readonly calm: number; readonly anger: number };
};
`;
const READS = `import type { Stats } from "@admin/world";
export type Effect = { readonly kind: "stat"; readonly set: Partial<Stats> };
export function growth(stats: Stats): number { return stats.gdp * 0.02; }
export function borrow(stats: Stats): Effect { return { kind: "stat", set: { debt: stats.debt + 1 } }; }
function calmOf(mood: { readonly calm: number }): number { return mood.calm; }
export function temper(stats: Stats): number { return calmOf(stats.mood) + stats.mood.anger; }
`;
const site = (name) => `${ENGINE}#${name}`;
const ENTRIES = [
  { path: "gdp", readBy: [site("growth")], writePolicy: "founding-only" },
  { path: "debt", readBy: [site("borrow")], writePolicy: "effect-written" },
  { path: "mood.calm", readBy: [site("calmOf"), site("temper")] },
  { path: "mood.anger", readBy: [site("temper")] },
];
const registry = (entries = ENTRIES, blindSpots = []) =>
  JSON.stringify({ roots: { Stats: { pkg: "world", type: "Stats" } }, consumerRegistries: [{ name: "Stats", entries }], blindSpots });
const baseline = (entries) => JSON.stringify({ entries });
const tree = (overrides = {}) => ({
  "tsconfig.base.json": JSON.stringify({ compilerOptions: { strict: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler", skipLibCheck: true } }),
  [WORLD]: STATS,
  [ENGINE]: READS,
  "registry.json": registry(),
  ...overrides,
});

const problems = [];
function expect(label, files, wantPass, pattern, { env, afterReport } = {}) {
  writeTree(fixtureDir, files);
  const written = run("report-metric-registry.mjs", fixtureDir);
  if (!written.passed) return problems.push(`${label}: the report would not build.\n${written.output}`);
  if (afterReport) writeFiles(fixtureDir, afterReport);
  const { passed, output } = run("verify-metric-registry.mjs", fixtureDir, env);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

const without = (pathName) => ENTRIES.filter((entry) => entry.path !== pathName);
const WIPE = `export function wipe(patch: Partial<Stats>): Effect { return { kind: "stat", set: patch }; }\n`;
const SEED = `export const SEED: Stats = { gdp: 1, debt: 0, mood: { calm: 0.5, anger: 0.5 } };\n`;
const REVALUE = `export function revalue(): Effect { return { kind: "stat", set: { gdp: 2 } }; }\n`;
const NUDGE = `type MoodPath = "mood.calm" | "mood.anger";
export function nudge(path: MoodPath, value: number): Effect {
  const [group, field] = path.split(".") as [string, string];
  return { kind: "stat", set: { [group]: { [field]: value } } as Partial<Stats> };
}
`;
const BLANK = `export function blank(key: string): Effect { return { kind: "stat", set: { [key]: 0 } as Partial<Stats> }; }\n`;
const ANGER_MOVES = ENTRIES.map((entry) => (entry.path === "mood.anger" ? { ...entry, writePolicy: "effect-written" } : entry));

// A scenario corpus of one, gated on gdp, with a gate table of its own whose
// row names the evaluator that reads the field.
const gated = (via = site("growth"), extra = []) => JSON.stringify({
  ...JSON.parse(registry()),
  scenarios: [{ id: "fixture-scenario", cast: { pick: "none" }, conditions: [{ kind: "metric", metric: "gdp" }, { kind: "turn" }, ...extra] }],
  gateTable: { reads: [{ kind: "metric", key: "metric", root: "Stats:", via }], casts: [], none: { turn: "the turn counter" } },
});

// The campaign's metrics: a payload typed by alias (`MetricDeltas`, a Record
// with no declarations of its own, intersected as the engine's is so the
// alias survives), a handler at the path the walk names as one, and a sender
// whose keys are what it writes.
const METRIC_TYPES = `export type MetricSet = { readonly stability: number; readonly standing: number };
export type MetricDeltas = Partial<Record<keyof MetricSet, number>> & { readonly headline?: never };
export type Effect = { readonly kind: "metric"; readonly deltas: MetricDeltas };
export function standingOf(m: MetricSet): number { return m.standing + m.stability; }
`;
const METRIC_READS = `${METRIC_TYPES}export { applyMetric } from "./effects.js";
export function steady(): Effect { return { kind: "metric", deltas: { standing: 0.01 } }; }
`;
const METRIC_ENGINE = `${METRIC_READS}export function rebuke(): Effect { return { kind: "metric", deltas: { stability: -0.01 } }; }\n`;
const METRIC_WHOLE = `export function relay(deltas: MetricDeltas): Effect { return { kind: "metric", deltas }; }\n`;
const HANDLER = `import type { Effect, MetricSet } from "./index.js";
export function applyMetric(metrics: MetricSet, effect: Effect): MetricSet {
  const merged: { -readonly [K in keyof MetricSet]: number } = { ...metrics };
  for (const [key, delta] of Object.entries(effect.deltas) as [keyof MetricSet, number][]) merged[key] = merged[key] + delta;
  return merged;
}
`;
const metricTree = (overrides = {}) => ({
  "tsconfig.base.json": tree()["tsconfig.base.json"],
  [ENGINE]: METRIC_ENGINE,
  "packages/engine/src/effects.ts": HANDLER,
  "registry.json": JSON.stringify({
    roots: { MetricSet: { pkg: "engine", type: "MetricSet" } },
    consumerRegistries: [],
    metricRegistry: [
      { id: "stability", field: "MetricSet.stability", writePolicy: "effect-written" },
      { id: "standing", field: "MetricSet.standing", writePolicy: "effect-written" },
    ],
  }),
  ...overrides,
});
const NO_GROWTH = READS.replace("return stats.gdp * 0.02;", "return 0.02;");
const CLAIM = `Stats:gdp <- ${site("borrow")}`;
const FALSE_CLAIM = [{ path: "gdp", readBy: [site("growth"), site("borrow")], writePolicy: "founding-only" }, ...without("gdp")];

try {
  expect("a clean tree, with a field read through a helper's own parameter type", tree(), true, /OK — 4 registered field\(s\), 5 claimed reader\(s\), 0 unconfirmed/);
  expect("a stored field with no registry entry", tree({ [WORLD]: STATS.replace("readonly debt: number;", "readonly debt: number;\n  readonly rate: number;") }), false, /UNREGISTERED {2}Stats:rate/);
  expect("a registered field the walk cannot declare, not named a blind spot", tree({ "registry.json": registry([...ENTRIES, { path: "mood.fear", owedBy: "a fear law" }]) }), false, /UNDECLARED {2}Stats:mood\.fear/);
  expect(
    "the same field named as a blind spot",
    tree({ "registry.json": registry([...ENTRIES, { path: "mood.fear", owedBy: "a fear law" }], [{ prefix: "Stats:mood.fear", why: "a fixture's blind spot" }]) }),
    true,
    /Stats:mood\.fear\* — 1 field\(s\)/,
  );
  expect("a field nothing reads", tree({ [ENGINE]: NO_GROWTH }), false, /NO READER {2}Stats:gdp has no reader/);
  expect("the same field pinned as owed", tree({ [ENGINE]: NO_GROWTH, "registry.json": registry([{ path: "gdp", owedBy: "a growth law", writePolicy: "founding-only" }, ...without("gdp")]) }), true, /OK — 4 registered field\(s\)/);
  expect("an effect-written field nothing writes", tree({ [ENGINE]: READS.replace("set: { debt: stats.debt + 1 }", "set: {}") }), false, /NO WRITER {2}Stats:debt is effect-written/);
  expect("an effect payload too loose to say what it writes", tree({ [ENGINE]: `${READS}${WIPE}` }), false, /NEW {2}opaque {2}packages\/engine\/src\/index\.ts#wipe: Stats/);
  expect("the same payload, forgiven by the blind-sites baseline", tree({ [ENGINE]: `${READS}${WIPE}`, "blind-sites.json": baseline({ [`opaque  ${site("wipe")}: Stats`]: 1 }) }), true, /1 blind site\(s\) forgiven/);
  expect("a founding-only field written by the dataset", tree({ [WORLD]: `${STATS}${SEED}` }), true, /OK — 4 registered field\(s\)/);
  expect("a founding-only field a campaign writes", tree({ [ENGINE]: `${READS}${REVALUE}` }), false, /FOUNDING WRITTEN {2}Stats:gdp is founding-only but a campaign writes it \(packages\/engine\/src\/index\.ts#revalue\)/);
  expect("an effect-written field only the dataset writes", tree({ [WORLD]: `${STATS}${SEED}`, [ENGINE]: READS.replace("set: { debt: stats.debt + 1 }", "set: {}") }), false, /NO WRITER {2}Stats:debt is effect-written but nothing outside the dataset and founding writes it/);
  expect("a patch whose computed keys come from a dotted path in scope", tree({ [ENGINE]: `${READS}${NUDGE}`, "registry.json": registry(ANGER_MOVES) }), true, /OK — 4 registered field\(s\)/);
  expect("the same field with the computed patch's path removed", tree({ [ENGINE]: READS, "registry.json": registry(ANGER_MOVES) }), false, /NO WRITER {2}Stats:mood\.anger is effect-written/);
  expect("a computed-key patch with no path in scope", tree({ [ENGINE]: `${READS}${BLANK}` }), false, /NEW {2}computed {2}packages\/engine\/src\/index\.ts#blank: Stats/);
  expect("a metric effect credited to its sender, not its handler", metricTree(), true, /OK — 2 registered field\(s\)/);
  expect("a metric field only the handler touches", metricTree({ [ENGINE]: METRIC_READS }), false, /NO WRITER {2}MetricSet:stability is effect-written/);
  expect("a metric effect sent a whole payload", metricTree({ [ENGINE]: `${METRIC_ENGINE}${METRIC_WHOLE}` }), false, /NEW {2}opaque {2}packages\/engine\/src\/index\.ts#relay: MetricSet/);
  expect("a scenario gate read through the evaluator the table names", tree({ "registry.json": gated() }), true, /OK — 4 registered field\(s\).*1 field\(s\) gated on by 1 scenario\(s\)/);
  expect("a scenario gate whose evaluator does not read the field", tree({ "registry.json": gated(site("borrow")) }), false, /GATE UNREAD {2}the corpus gates on Stats:gdp through packages\/engine\/src\/index\.ts#borrow/);
  expect("a scenario gate of a kind the table does not classify", tree({ "registry.json": gated(site("growth"), [{ kind: "mystery" }]) }), false, /GATE UNCLASSIFIED {2}1 scenario\(s\) gate on condition kind "mystery"/);
  expect("a claimed reader the walk cannot confirm", tree({ "registry.json": registry(FALSE_CLAIM) }), false, /NEW {2}Stats:gdp <- packages\/engine\/src\/index\.ts#borrow/);
  expect("the same claim, forgiven by the baseline", tree({ "registry.json": registry(FALSE_CLAIM), "baseline.json": baseline({ [CLAIM]: 1 }) }), true, /1 unconfirmed and forgiven/);
  expect("a baseline forgiving a claim the tree no longer makes", tree({ "baseline.json": baseline({ [CLAIM]: 1 }) }), false, /STALE {2}Stats:gdp <- /);
  writeTree(committedDir, { [path.join(path.basename(fixtureDir), "baseline.json")]: baseline({}) });
  expect("a baseline raised above the committed one", tree({ "registry.json": registry(FALSE_CLAIM), "baseline.json": baseline({ [CLAIM]: 1 }) }), false, /RAISED {2}Stats:gdp <- /, { env: { RATCHET_COMMITTED_ROOT: committedDir } });
  expect("a report the tree no longer writes", tree(), false, /STALE REPORT {2}report\.json/, { afterReport: { [ENGINE]: READS.replace("return stats.gdp * 0.02;", "return stats.gdp * stats.debt;") } });
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
  rmSync(committedDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-metric-registry-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run("verify-metric-registry.mjs");
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
