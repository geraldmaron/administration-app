#!/usr/bin/env node
// Who speaks outside the department that owns the week.
//
// Lists every speaker-department-mismatch warning in the shipped corpus. The
// audit is a work list, not a publish failure — this gate exits 0 either way.
//
//   node scripts/speaker-debt.mjs
//
// Build the workspace first; the audit lives in packages/content/dist and the
// corpus in packages/player-core/dist.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const contentDist = path.join(root, "packages/content/dist/index.js");
const bakeDist = path.join(root, "packages/player-core/dist/content/bundled-corpus.generated.js");
const shardParserDist = path.join(root, "packages/player-core/dist/content/shard-parser.js");

if (!existsSync(contentDist) || !existsSync(bakeDist) || !existsSync(shardParserDist)) {
  console.error(
    "FAIL: speaker-debt cannot read packages/content/dist or packages/player-core/dist — build the workspace first.",
  );
  process.exit(1);
}

const { CORE_SCENARIOS, PILOT_SCENARIOS } = await import(contentDist);
const { auditSpeakerDepartments } = await import(path.join(root, "packages/content/dist/scenario-audit-speakers.js"));
const { BUNDLED_SHARDS } = await import(bakeDist);
const { parseShardBody } = await import(shardParserDist);

/** Every scenario baked into the binary — same read as bundledCorpusScenarios(). */
function bakedScenarios() {
  const scenarios = [];
  for (const shard of BUNDLED_SHARDS) {
    scenarios.push(...parseShardBody(shard.jsonl).scenarios);
  }
  return scenarios;
}

/** The corpus the player is dealt: authored packs plus the bake, once each. */
const byId = new Map();
for (const def of [...CORE_SCENARIOS, ...PILOT_SCENARIOS, ...bakedScenarios()]) {
  byId.set(def.id, def);
}
const shipped = [...byId.values()];

if (shipped.length === 0) {
  console.error("FAIL: speaker-debt read no scenarios — the corpus loader returned nothing.");
  process.exit(1);
}

const found = [];
auditSpeakerDepartments(shipped, { push: (finding) => found.push(finding) });

/** Pull the beat, chair, and owning room out of the audit's fixed message shape. */
function fields(message) {
  const match = message.match(
    /^(.*?) is spoken by the (.*?) \(".*?"\), whose department has no brief in a .*? week\. The .*? room is (.*?): /,
  );
  if (!match) return { where: message, speaker: "", room: "" };
  return { where: match[1], speaker: match[2], room: match[3] };
}

for (const finding of found) {
  const { where, speaker, room } = fields(finding.message);
  console.log([finding.scenario, where, speaker, room].join("\t"));
}

console.log(`${found.length} speaker-department-mismatch warning(s) across ${shipped.length} scenario(s)`);
