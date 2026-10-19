// Full text of every passage the insider-shorthand rule flags, so a
// replacement can be written against the real sentence rather than an excerpt.

import { readFileSync, readdirSync } from "node:fs";

const audit = await import("../packages/content/dist/scenario-audit.js");
const SHARD_DIR = "content/corpus/shards";
const [offset = "0", limit = "20"] = process.argv.slice(2);

const defs = readdirSync(SHARD_DIR)
  .filter((f) => f.endsWith(".jsonl"))
  .flatMap((f) => readFileSync(`${SHARD_DIR}/${f}`, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)));

/** Every player-facing string, labeled the way the auditor labels it. */
function passages(def) {
  const out = [["subject", def.subject]];
  if (def.locus?.descriptor) out.push(["locus", def.locus.descriptor]);
  def.opening.forEach((b, i) => out.push([`opening[${i}]`, b.text]));
  if (def.transmission) out.push(["transmission", def.transmission.text]);
  for (const r of def.replies) {
    out.push([`reply ${r.id}`, r.text]);
    if (r.commitment?.remembered) out.push([`remembered ${r.id}`, r.commitment.remembered]);
    if (r.commitment?.rejoinder) out.push([`rejoinder ${r.id}`, r.commitment.rejoinder.text]);
  }
  return out;
}

const PROBES = [
  /\bchairs?\s+(?:who|think|thinks|wants?|asking|agree|agrees|disagree|runs?|says?|refuses?)\b|\b(?:two|three|both|several)\s+chairs\b|\bchair\s+of\s+(?:that|the)\s+(?:program|agency|fund|department|ministry)\b|\b(?:the|their)\s+(?:security|finance|defen[cs]e|health|interior|justice)\s+chair\b|\bchair\s+you\s+appointed\b/i,
  /\b(?:out of|from|against|on|onto)\s+(?:the|that|this)\s+same\s+line\b|\b(?:out of|against)\s+(?:the|that|this)\s+line\b|\b(?:the|that|this)\s+line\s+that\s+(?:funds?|funded|pays?|paid|was supposed to fund)\b|\b(?:split|splitting|drew on|draw on|drawn from|drawing on)\s+(?:the|that|this)\s+(?:same\s+)?line\b|\bthe line was drawn from\b/i,
];

const flagged = defs.filter((d) => audit.auditScenario(d).some((f) => f.kind === "insider-shorthand"));

for (const def of flagged.slice(Number(offset), Number(offset) + Number(limit))) {
  console.log(`## ${def.id}`);
  for (const [label, text] of passages(def)) {
    if (label.startsWith("particular")) continue;
    const hit = PROBES.map((p) => p.exec(text)?.[0]).find(Boolean);
    if (!hit) continue;
    console.log(`  [${label}] HIT ${JSON.stringify(hit)}`);
    console.log(`    ${text}`);
  }
  console.log();
}
