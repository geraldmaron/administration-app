#!/usr/bin/env node
// A deed flag is a fact the engine resolved: this government's act landed or
// failed at some weight, or another capital's act landed on it. Content that
// gates on one parses, audits clean, publishes, and reaches no player if the
// engine never writes that string — a misspelt family, an outcome no emitter
// produces, a family whose emitter was never built. And the engine writing a
// deed no content reads is the other half of the same defect: a record the
// game keeps and never answers.
//
// So this gate holds both directions over the shipped corpus (the shards, or
// the bake where the shards are absent, plus the authored core pack):
//
//   1. every deed flag content gates on is in the engine's vocabulary AND has a
//      live emitter for its family and outcome;
//   2. every flag an emitter can write is read by some scenario, or is on the
//      allowlist with an owner and a reason — the allowlist is the work queue
//      for readers, and it may only shrink: an entry that is now read, or that
//      no emitter can write, fails;
//   3. multi-hop: a scenario gated on a dead deed flag is dead, and so is every
//      scenario that waits on a flag only dead scenarios set. The chain is
//      reported from its root, because the reader three hops down is the one a
//      writer is looking at when it silently never arrives.
//
// The emitter table below is checked against the engine's source on every run,
// so it cannot outlive the code it describes: an emitter that is renamed or
// deleted fails here instead of leaving its flags forgiven.
//
//   node scripts/verify-deed-reachability.mjs [--corpus <dir>] [--allowlist <file>] [--no-packs]
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const CORPUS_DIR = path.resolve(option("--corpus") ?? path.join(root, "content/corpus/shards"));
const ALLOWLIST = path.resolve(option("--allowlist") ?? path.join(root, "scripts/deed-reachability-allowlist.json"));
const WITH_PACKS = !args.includes("--no-packs");
const BAKE = path.join(root, "packages/player-core/src/content/bundled-corpus.generated.ts");
const ENGINE_SRC = path.join(root, "packages/engine/src");
const INSTRUMENTS = ["diplomatic", "economic", "covert", "military", "assistance"];
const BANDS = ["low", "mid", "high"];
const BOTH = ["landed", "failed"];

/**
 * Which families the engine can write, at which outcomes, and where. Each row
 * names a source file and the exact call that writes the flag; the call must
 * still be in the file. `neglect-answered` has no row: its emitter has not
 * been built, so nothing may gate on it and nothing owes it a reader.
 */
const EMITTERS = [
  ...INSTRUMENTS.map((family) => ({
    prefix: "deed",
    family,
    outcomes: BOTH,
    file: "resolution-deeds.ts",
    call: "deedFlag(instrument, band, outcome)",
  })),
  ...INSTRUMENTS.map((family) => ({
    prefix: "deed-received",
    family,
    outcomes: BOTH,
    file: "resolution-deeds.ts",
    call: "deedReceivedFlag(instrument, band, outcome)",
  })),
  { prefix: "deed", family: "pledge", outcomes: ["landed"], file: "commitments.ts", call: 'commitmentDeed(campaign, commitment, "pledge")' },
  { prefix: "deed", family: "withdrawal", outcomes: ["landed"], file: "commitments.ts", call: 'commitmentDeed(campaign, current, "withdrawal")' },
  { prefix: "deed", family: "order", outcomes: ["landed"], file: "orders.ts", call: 'orderDeed(ORDER_DOMAIN_BAND[order.domain], "landed"' },
  { prefix: "deed", family: "order", outcomes: ["failed"], file: "judicial-review.ts", call: 'orderDeed(ORDER_DOMAIN_BAND[order.domain], "failed"' },
];

const failures = [];

function emittable() {
  const out = new Map();
  for (const row of EMITTERS) {
    const file = path.join(ENGINE_SRC, row.file);
    const source = existsSync(file) ? readFileSync(file, "utf8") : "";
    if (!source.includes(row.call)) {
      failures.push(`the emitter table says ${row.file} writes ${row.prefix}:${row.family} with \`${row.call}\`, and it no longer does — update the table to the code, or the flags it forgave are dead`);
      continue;
    }
    for (const band of BANDS) {
      for (const outcome of row.outcomes) out.set(`${row.prefix}:${row.family}:${band}:${outcome}`, `${row.file}`);
    }
  }
  return out;
}

async function vocabulary() {
  const dist = path.join(root, "packages/engine/dist/index.js");
  if (!existsSync(dist)) {
    console.error("FAIL: verify-deed-reachability cannot read packages/engine/dist — build the workspace first.");
    process.exit(1);
  }
  const mod = await import(dist);
  if (!Array.isArray(mod.DEED_FLAGS) || mod.DEED_FLAGS.length === 0) {
    console.error("FAIL: the engine exports no DEED_FLAGS — the vocabulary this gate reads has moved.");
    process.exit(1);
  }
  return new Set(mod.DEED_FLAGS);
}

function parseJsonl(body, out) {
  for (const line of body.split("\n")) if (line.trim()) out.push(JSON.parse(line));
}

function corpusScenarios() {
  const out = [];
  if (existsSync(CORPUS_DIR)) {
    for (const file of readdirSync(CORPUS_DIR).filter((name) => name.endsWith(".jsonl")).sort()) {
      parseJsonl(readFileSync(path.join(CORPUS_DIR, file), "utf8"), out);
    }
    return out;
  }
  if (option("--corpus") || !existsSync(BAKE)) return out;
  for (const match of readFileSync(BAKE, "utf8").matchAll(/^ {4}jsonl: (".*"),$/gm)) parseJsonl(JSON.parse(match[1]), out);
  return out;
}

async function packScenarios() {
  if (!WITH_PACKS) return [];
  const dist = path.join(root, "packages/content/dist/index.js");
  if (!existsSync(dist)) {
    console.error("FAIL: verify-deed-reachability cannot read packages/content/dist — build the workspace first.");
    process.exit(1);
  }
  const mod = await import(dist);
  return [...(mod.CORE_SCENARIOS ?? [])];
}

const isDeed = (flag) => /^deed(-received)?:/.test(flag);
const gatesOf = (def) => (def.conditions ?? []).filter((condition) => condition.kind === "flag" && condition.is === true);

const [vocab, defs] = await Promise.all([vocabulary(), (async () => [...corpusScenarios(), ...(await packScenarios())])()]);
const emits = emittable();

if (defs.length === 0) {
  console.error("FAIL: verify-deed-reachability read no scenarios — the corpus path is wrong, and a clean result would mean nothing.");
  process.exit(1);
}

// Direction 1: a gate on a deed the engine cannot write.
const reads = new Map();
const deadRoots = new Map();
for (const def of defs) {
  for (const condition of gatesOf(def)) {
    if (!isDeed(condition.flag)) continue;
    reads.set(condition.flag, [...(reads.get(condition.flag) ?? []), def.id]);
    if (emits.has(condition.flag)) continue;
    const why = vocab.has(condition.flag) ? "no emitter writes it" : "it is not in the engine's deed vocabulary";
    deadRoots.set(def.id, `${condition.flag} (${why})`);
    failures.push(`"${def.id}" gates on "${condition.flag}", and ${why}, so no player ever sees it`);
  }
}

// Direction 3: the chain. A flag is dead when every scenario that sets it is dead.
const setters = new Map();
for (const def of defs) {
  for (const reply of def.replies ?? []) for (const flag of reply.sets ?? []) setters.set(flag, new Set([...(setters.get(flag) ?? []), def.id]));
}
const dead = new Map(deadRoots);
for (let changed = true; changed; ) {
  changed = false;
  for (const def of defs) {
    if (dead.has(def.id)) continue;
    const blocked = gatesOf(def).find((condition) => {
      const from = setters.get(condition.flag);
      return from !== undefined && from.size > 0 && [...from].every((id) => dead.has(id));
    });
    if (!blocked) continue;
    const via = [...setters.get(blocked.flag)][0];
    dead.set(def.id, `"${blocked.flag}", set only by dead "${via}" ← ${dead.get(via)}`);
    failures.push(`"${def.id}" waits on "${blocked.flag}", which only unreachable scenarios set (${dead.get(def.id)})`);
    changed = true;
  }
}

// Direction 2: an emitted deed nobody reads, and the allowlist that queues it.
const allowlist = existsSync(ALLOWLIST) ? JSON.parse(readFileSync(ALLOWLIST, "utf8")) : {};
for (const [flag, entry] of Object.entries(allowlist)) {
  if (!entry || typeof entry.owner !== "string" || !entry.owner || typeof entry.reason !== "string" || !entry.reason) {
    failures.push(`allowlist entry "${flag}" needs an owner and a reason`);
  }
  if (!emits.has(flag)) failures.push(`allowlist forgives "${flag}", which no emitter writes — remove the entry`);
  else if (reads.has(flag)) failures.push(`allowlist forgives "${flag}", which ${reads.get(flag).join(", ")} now reads — remove the entry`);
}
for (const flag of [...emits.keys()].sort()) {
  if (reads.has(flag) || flag in allowlist) continue;
  failures.push(`the engine writes "${flag}" (${emits.get(flag)}) and nothing reads it — write a reader, or allowlist it with an owner and a reason`);
}

if (failures.length > 0) {
  console.error(`FAIL: verify-deed-reachability — ${failures.length} finding(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
const read = [...reads.keys()].length;
console.log(
  `verify-deed-reachability: ${emits.size} emittable deed flags over ${defs.length} scenarios; ` +
    `${read} read, ${Object.keys(allowlist).length} queued on the allowlist, no dead gate or chain.`,
);
