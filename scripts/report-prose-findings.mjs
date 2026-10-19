// Dump the flagged scenarios in the compact shape the prose pass needs:
// what the room says, what the options cost, and which rule bit.
//
// Usage: node scripts/report-prose-findings.mjs <kind> [offset] [limit]

import { readFileSync, readdirSync } from "node:fs";

const [kind, offset = "0", limit = "12"] = process.argv.slice(2);
const audit = await import("../packages/content/dist/scenario-audit.js");

const SHARD_DIR = "content/corpus/shards";
const defs = readdirSync(SHARD_DIR)
  .filter((f) => f.endsWith(".jsonl"))
  .flatMap((f) => readFileSync(`${SHARD_DIR}/${f}`, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)));

const flagged = defs
  .map((def) => ({ def, findings: audit.auditScenario(def).filter((f) => f.kind === kind) }))
  .filter((row) => row.findings.length > 0);

console.log(`# ${kind}: ${flagged.length} scenario(s); showing ${offset}..${Number(offset) + Number(limit)}\n`);

for (const { def, findings } of flagged.slice(Number(offset), Number(offset) + Number(limit))) {
  console.log(`## ${def.id}  [${def.class}/${def.severity}]`);
  console.log(`subject: ${def.subject}`);
  if (def.particulars) console.log(`particulars: ${JSON.stringify(def.particulars)}`);
  for (const beat of def.opening) console.log(`  (${beat.speaker.roleHint ?? beat.speaker.kind}) ${beat.text}`);
  if (def.transmission) console.log(`  (transmission/${def.transmission.relay}) ${def.transmission.text}`);
  for (const reply of def.replies) {
    const cost = reply.commitment?.cost ? JSON.stringify(reply.commitment.cost) : "-";
    console.log(`  > [${reply.tone}] ${reply.text}  ::cost ${cost}`);
    if (reply.commitment?.rejoinder) console.log(`    ^ ${reply.commitment.rejoinder.text}`);
  }
  for (const f of findings) console.log(`  !! ${f.message}`);
  console.log();
}
