// A one-shot remediation harness for the corpus prose pass.
//
// The corpus shards are JSONL and are the record of what ships, so a fix has to
// land in them without disturbing the ids, flags and arcs the rest of the
// corpus points at. This applies a patch file of id -> { particulars, replace }
// and re-audits, so the gate is what says the pass is done.
//
// Usage: node scripts/patch-corpus-prose.mjs <patch.json> [--dry-run]

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SHARD_DIR = "content/corpus/shards";
const [patchPath, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");

if (!patchPath) {
  console.error("usage: node scripts/patch-corpus-prose.mjs <patch.json> [--dry-run]");
  process.exit(2);
}

const patches = JSON.parse(readFileSync(patchPath, "utf8"));
const unseen = new Set(Object.keys(patches));

/** Apply every literal replacement to one string, reporting which ones bit. */
function rewrite(text, replacements, hits) {
  let next = text;
  for (const [from, to] of replacements) {
    if (!next.includes(from)) continue;
    next = next.split(from).join(to);
    hits.add(from);
  }
  return next;
}

/** Every player-facing string in a scenario, rewritten in place. */
function rewriteScenario(def, replacements, hits) {
  const beat = (b) => ({ ...b, text: rewrite(b.text, replacements, hits) });
  return {
    ...def,
    subject: rewrite(def.subject, replacements, hits),
    ...(def.locus ? { locus: { ...def.locus, descriptor: rewrite(def.locus.descriptor, replacements, hits) } } : {}),
    opening: def.opening.map(beat),
    ...(def.transmission ? { transmission: { ...def.transmission, text: rewrite(def.transmission.text, replacements, hits) } } : {}),
    replies: def.replies.map((reply) => ({
      ...reply,
      text: rewrite(reply.text, replacements, hits),
      ...(reply.commitment
        ? {
            commitment: {
              ...reply.commitment,
              ...(reply.commitment.remembered ? { remembered: rewrite(reply.commitment.remembered, replacements, hits) } : {}),
              ...(reply.commitment.rejoinder
                ? { rejoinder: { ...reply.commitment.rejoinder, text: rewrite(reply.commitment.rejoinder.text, replacements, hits) } }
                : {}),
            },
          }
        : {}),
    })),
  };
}

let changed = 0;
const missedReplacements = [];

for (const file of readdirSync(SHARD_DIR).filter((f) => f.endsWith(".jsonl"))) {
  const full = path.join(SHARD_DIR, file);
  const lines = readFileSync(full, "utf8").trim().split("\n").filter(Boolean);
  let touched = false;

  const out = lines.map((line) => {
    const def = JSON.parse(line);
    const patch = patches[def.id];
    if (!patch) return line;
    unseen.delete(def.id);

    const hits = new Set();
    let next = patch.replace ? rewriteScenario(def, Object.entries(patch.replace), hits) : def;
    if (patch.particulars) next = { ...next, particulars: patch.particulars };

    for (const from of Object.keys(patch.replace ?? {})) {
      if (!hits.has(from)) missedReplacements.push(`${def.id}: ${JSON.stringify(from)}`);
    }

    touched = true;
    changed += 1;
    // Key order is preserved by the spread above, so the diff stays readable.
    return JSON.stringify(next);
  });

  if (touched && !dryRun) writeFileSync(full, out.join("\n") + "\n");
}

console.log(`${dryRun ? "would patch" : "patched"} ${changed} scenario(s)`);
if (unseen.size) console.error(`NOT FOUND in the corpus: ${[...unseen].join(", ")}`);
if (missedReplacements.length) {
  console.error(`replacements that matched nothing (${missedReplacements.length}):`);
  for (const miss of missedReplacements) console.error(`  ${miss}`);
}
if (unseen.size || missedReplacements.length) process.exit(1);
