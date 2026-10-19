#!/usr/bin/env node
// The step-sequence coverage matrix, cell by cell.
//
// `scripts/verify-resolution-beat-reachability.mjs` is the gate and reports one
// number: how many situations have nothing authored for them. A writer about to
// take a batch needs the names, in the order they should be taken, so this
// prints the same key space broken out per instrument, band, valence and named
// failure branch. It reuses the gate's own bank loader rather than scanning for
// the bank a second way, so the two can never disagree about what is shipped.
//
// Reads the built package: run `pnpm run build` first.
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const { loadContentModule, sequencesFromModule } = await import(path.join(root, "scripts/lib/resolution-sequence-bank.mjs"));

const mod = await loadContentModule();
const { SITUATION_KEYS, coversKey, resolutionSequenceKey, unreachableSequences } = mod;
const shipped = sequencesFromModule(mod);

const rows = SITUATION_KEYS.map((key) => ({
  key: resolutionSequenceKey(key),
  count: shipped.filter((def) => coversKey(def, key)).length,
}));

const empty = rows.filter((row) => row.count === 0);
const thin = rows.filter((row) => row.count === 1);

for (const row of rows) console.log(`${row.count === 0 ? "  --" : String(row.count).padStart(4)}  ${row.key}`);
console.log("");
console.log(`sequences shipped:  ${shipped.length}`);
console.log(`cells filled:       ${rows.length - empty.length} of ${rows.length}`);
console.log(`empty cells:        ${empty.length}${empty.length ? ` — take these first: ${empty.slice(0, 8).map((row) => row.key).join(", ")}` : ""}`);
console.log(`single-sequence:    ${thin.length} (a hot cell with one sequence is a line the player learns by heart)`);

const unreachable = unreachableSequences(shipped);
console.log(`unreachable:        ${unreachable.length}${unreachable.length ? ` — ${unreachable.map((finding) => finding.id).join(", ")}` : ""}`);
