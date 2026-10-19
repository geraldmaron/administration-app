// A one-shot harness for placement metadata on shipped scenarios.
//
// The corpus shards are the record of what ships and are gitignored, so a
// placement fix (a declared sector, a corrected site) has to land in them
// without touching prose, ids, flags or arcs. This merges each patch entry's
// `locus` fields into the matching scenario's locus and nothing else.
//
// Usage: node scripts/patch-corpus-locus.mjs <patch.json> [--dry-run]
// then rebuild the bake: node studio-cli/dist/cli.js corpus build --content-set <id>

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SHARD_DIR = "content/corpus/shards";
const [patchPath, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");

if (!patchPath) {
  console.error("usage: node scripts/patch-corpus-locus.mjs <patch.json> [--dry-run]");
  process.exit(2);
}

const patches = JSON.parse(readFileSync(patchPath, "utf8"));
const unseen = new Set(Object.keys(patches));
let changed = 0;

for (const file of readdirSync(SHARD_DIR).filter((f) => f.endsWith(".jsonl"))) {
  const full = path.join(SHARD_DIR, file);
  const lines = readFileSync(full, "utf8").trim().split("\n").filter(Boolean);
  let touched = false;
  const out = lines.map((line) => {
    const def = JSON.parse(line);
    const patch = patches[def.id];
    if (!patch) return line;
    unseen.delete(def.id);
    touched = true;
    changed += 1;
    return JSON.stringify({ ...def, locus: { ...def.locus, ...patch.locus } });
  });
  if (touched && !dryRun) writeFileSync(full, out.join("\n") + "\n");
}

console.log(`${dryRun ? "would patch" : "patched"} ${changed} scenario(s)`);
if (unseen.size) {
  console.error(`NOT FOUND in the corpus: ${[...unseen].join(", ")}`);
  process.exit(1);
}
