// Prints the place-bearing fields of named shipped scenarios for reading.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const dir = join(root, "content/corpus/shards");
const defs = readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
  .flatMap((f) => readFileSync(join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const want = process.argv[2] ? process.argv[2].split(",") : [];
const pick = want.length ? defs.filter((d) => want.includes(d.id)) : defs.filter((d) => new RegExp(process.argv[3] ?? "^$", "i").test(JSON.stringify(d)));
for (const d of pick) {
  console.log(`\n=== ${d.id} [${d.class}/${d.severity}] cast=${JSON.stringify(d.cast)} locus=${JSON.stringify(d.locus)}`);
  console.log(`conditions=${JSON.stringify(d.conditions)}`);
  console.log(`SUBJECT: ${d.subject}`);
  for (const b of d.opening) console.log(`  [${b.speaker.kind}${b.speaker.roleHint ? ":" + b.speaker.roleHint : ""}] ${b.text}`);
  for (const r of d.replies) console.log(`  -> ${r.id}: ${r.commitment?.remembered ?? ""} ${r.commitment?.gazetteer ? "GAZ=" + JSON.stringify(r.commitment.gazetteer) : ""}${r.commitment?.domestic ? " DOM=" + JSON.stringify(r.commitment.domestic.sectors ?? r.commitment.domestic.axes) : ""}`);
}
