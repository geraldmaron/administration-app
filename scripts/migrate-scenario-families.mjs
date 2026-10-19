#!/usr/bin/env node
// Writes `family: { id, role }` onto the corpus arcs that already exist as
// bare flags, so a follow-up binds to the country its opener dealt with rather
// than re-ranking the board.
//
// The arcs are not invented here. A pair is already an arc: scenario A's reply
// sets a flag and scenario B waits on it. What the migration adds is the pin —
// A becomes the family's `opener`, B a `beat`, and the last B to ripen the
// `close`, which is what ends the run so the arc rail can empty.
//
// Three kinds of pair are deliberately left alone, because a family would be
// the wrong fix rather than a missing one:
//
//   * either end casts domestically (`pick: none`) or on a fixed nation — the
//     pin would rebind a scenario written about home to a foreign country;
//   * the gating flag has more than one setter — a reader can belong to one
//     family, so which arc it continues is an authoring decision, not a
//     mechanical one;
//   * the pair crosses the corpus and an authored pack. Packs are TypeScript
//     source; this writes shard JSON.
//
// Run with `--check` to print the plan and write nothing.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CORPUS_DIR = path.join(root, "content/corpus/shards");
const CHECK_ONLY = process.argv.includes("--check");

const RERANKING = new Set(["tensest", "closest", "band", "belligerent", "warCounterpart"]);

/** Every shard line, with the file and line it came from, so it can be written back. */
function readShards() {
  const shards = new Map();
  for (const file of readdirSync(CORPUS_DIR).filter((name) => name.endsWith(".jsonl"))) {
    const lines = readFileSync(path.join(CORPUS_DIR, file), "utf8").split("\n");
    shards.set(file, lines);
  }
  return shards;
}

const shards = readShards();
const defs = [];
for (const [file, lines] of shards) {
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    defs.push({ file, index, def: JSON.parse(line) });
  });
}

const packDist = path.join(root, "packages/content/dist/index.js");
const packMod = await import(packDist);
const packDefs = [...(packMod.CORE_SCENARIOS ?? []), ...(packMod.PILOT_SCENARIOS ?? [])];

const entries = new Map(defs.map((entry) => [entry.def.id, entry]));
const all = [...defs.map((entry) => entry.def), ...packDefs];
const byId = new Map(all.map((def) => [def.id, def]));
const inShards = new Set(defs.map((entry) => entry.def.id));

const setters = new Map();
for (const def of all) {
  for (const reply of def.replies ?? []) {
    for (const flag of reply.sets ?? []) {
      if (!setters.has(flag)) setters.set(flag, new Set());
      setters.get(flag).add(def.id);
    }
  }
}

const foreignByRule = (def) => RERANKING.has(def?.cast?.pick);

/** reader id -> { setter, flag, agedAtLeast }, and the reasons a pair was skipped. */
const links = [];
const skipped = [];

for (const def of all) {
  for (const condition of def.conditions ?? []) {
    if (condition.kind !== "flag" || condition.is !== true) continue;
    const from = [...(setters.get(condition.flag) ?? [])].filter((id) => id !== def.id);
    for (const setterId of from) {
      const setter = byId.get(setterId);
      if (!foreignByRule(setter) || !foreignByRule(def)) continue;
      const pair = { setter: setterId, reader: def.id, flag: condition.flag, aged: condition.agedAtLeast ?? 0 };
      if (from.length > 1) {
        skipped.push({ ...pair, why: `"${condition.flag}" is set by ${from.length} scenarios — which arc this continues is an authoring call` });
        continue;
      }
      if (!inShards.has(setterId) || !inShards.has(def.id)) {
        // A pack-crossing pair this script cannot write (packs are TypeScript
        // source) can still be bound by hand on both sides. Recognize that
        // rather than reporting settled work as still owed.
        const opener = setter.family;
        const beat = def.family;
        if (opener && beat && opener.id === beat.id && opener.role === "opener" && beat.role !== "opener") continue;
        skipped.push({ ...pair, why: "the pair crosses an authored pack, which is TypeScript source rather than shard JSON — bind it by hand on both sides" });
        continue;
      }
      links.push(pair);
    }
  }
}

// One family per opener rather than per flag: a scenario carries one `family`,
// so a setter whose two flags are read by two different scenarios still opens
// exactly one arc.
const families = new Map();
for (const link of links) {
  if (!families.has(link.setter)) families.set(link.setter, []);
  families.get(link.setter).push(link);
}

// A reader that continues two arcs cannot be placed. Reported rather than
// guessed at.
const readerFamilies = new Map();
for (const link of links) {
  if (!readerFamilies.has(link.reader)) readerFamilies.set(link.reader, new Set());
  readerFamilies.get(link.reader).add(link.setter);
}
for (const [reader, openers] of readerFamilies) {
  if (openers.size < 2) continue;
  skipped.push({ reader, setter: [...openers].join(" and "), flag: "-", aged: 0, why: "the reader continues two arcs at once — it can only declare one family" });
  for (const opener of openers) {
    families.set(opener, (families.get(opener) ?? []).filter((link) => link.reader !== reader));
  }
}

const plan = [];
for (const [opener, members] of families) {
  if (members.length === 0) continue;
  const id = `arc-${opener}`;
  plan.push({ scenario: opener, family: { id, role: "opener" } });
  // The last beat to ripen closes the arc: a family that never closes keeps
  // handing out its pin and the open-arcs rail never empties.
  const ordered = [...members].sort((a, b) => a.aged - b.aged || a.reader.localeCompare(b.reader));
  ordered.forEach((link, index) => {
    plan.push({ scenario: link.reader, family: { id, role: index === ordered.length - 1 ? "close" : "beat" } });
  });
}

for (const step of plan) {
  const entry = entries.get(step.scenario);
  if (!entry) throw new Error(`migration planned ${step.scenario}, which is not in a shard`);
  const current = entry.def.family;
  if (current && current.id === step.family.id && current.role === step.family.role) continue;
  entry.def = { ...entry.def, family: step.family };
  entry.dirty = true;
}

const touched = new Set();
for (const entry of defs) {
  if (!entry.dirty) continue;
  shards.get(entry.file)[entry.index] = JSON.stringify(entry.def);
  touched.add(entry.file);
}

if (!CHECK_ONLY) {
  for (const file of touched) {
    writeFileSync(path.join(CORPUS_DIR, file), shards.get(file).join("\n"), "utf8");
  }
}

console.log(`${CHECK_ONLY ? "would write" : "wrote"} ${plan.length} family declaration(s) across ${families.size} arc(s) in ${touched.size} shard(s):`);
for (const [opener, members] of families) {
  if (members.length === 0) continue;
  console.log(`  arc-${opener}`);
  for (const link of members) console.log(`    <- ${link.reader} (waits ${link.aged} weeks on "${link.flag}")`);
}
if (skipped.length > 0) {
  console.log(`\n${skipped.length} pair(s) left for an author:`);
  for (const s of skipped) console.log(`  ${s.setter} -> ${s.reader}: ${s.why}`);
}
