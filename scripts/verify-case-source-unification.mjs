#!/usr/bin/env node
// An open scenario case is read before the live pool. The pool must not be
// able to replace it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target = process.argv[2] ?? "packages/player-core/src/conversation/scripts.ts";
const source = readFileSync(path.resolve(root, target), "utf8");
const bodyAt = source.indexOf("function pendingConversations");
const body = bodyAt < 0 ? source : source.slice(bodyAt);
const frozen = body.indexOf("openScenarioCasts");
const pool = body.indexOf("stageFromResidentPool");
const failures = [];

if (frozen < 0) failures.push(`${target}: pending conversations never read openScenarioCasts. An open case can be replaced by a new draw.`);
if (pool < 0) failures.push(`${target}: the resident pool draw is gone, so this gate cannot see the order it guards.`);
if (frozen >= 0 && pool >= 0 && frozen > pool) {
  failures.push(`${target}: the live pool is consulted before open cases. Read openScenarioCasts first.`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`ok ${target}`);
