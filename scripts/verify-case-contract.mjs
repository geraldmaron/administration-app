#!/usr/bin/env node
// The case effect has one handler, and a due case is defaulted by the day
// loop rather than dropped.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const effects = process.argv[2] ?? "packages/engine/src/effects.ts";
const advance = process.argv[3] ?? "packages/engine/src/advance.ts";
const failures = [];

function text(relative) {
  return readFileSync(path.resolve(root, relative), "utf8");
}

const effectSource = text(effects);
if (!effectSource.includes("case: applyCase")) {
  failures.push(`${effects}: the case effect has no handler. Register case: applyCase.`);
}
const day = text(advance);
if (!day.includes("withDueCaseDefaults")) {
  failures.push(`${advance}: the day loop does not apply due case defaults. Call withDueCaseDefaults before the day advances.`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`ok ${effects}`);
