#!/usr/bin/env node
// An arc is written in one place. `campaign.scenarioFamilies` records which
// stories opened, against whom, and how each ended; the family effect in
// scenario-family-effects.ts is its one writer, and every open, beat and close
// (the answered close, the unanswered one, and the lapse) goes through it.
//
// A second writer is how an arc gets closed twice, reopened, or ended without
// saying how: a phase that "tidies up" a family by spreading a new record over
// the old one skips the rule that a closed family stays closed and that a close
// carries its disposition. So this gate reads the source for any other
// assignment to the field.
//
// Allowed, by name and with the reason:
//   - the founding, which seats the empty record a campaign opens with;
//   - the reachability boards, which stand a family open on a preview board to
//     ask whether a follow-up could be dealt, and never reach a real campaign;
//   - test fixtures.
//
//   node scripts/verify-family-closure.mjs [<root to scan>]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCAN = process.argv[2] ? [path.resolve(process.argv[2])] : ["packages", "apps"].map((dir) => path.join(root, dir));
const WRITER = "packages/engine/src/scenario-family-effects.ts";
const ALLOWED = new Map([
  ["packages/engine/src/founding.ts", "seats the empty record a campaign opens with"],
  ["packages/content/src/scenario-reachability.ts", "opens a family on a preview board, never on a campaign"],
]);
const ASSIGNS = /\bscenarioFamilies\s*:(?!\s*(?:ScenarioFamilyState|Readonly|Record)\b)|\.scenarioFamilies\s*=(?!=)/;

function sources(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(name) && !/\.test\.|\.d\.ts$/.test(name) && !full.includes("__fixtures__")) out.push(full);
  }
  return out;
}

const files = SCAN.flatMap((dir) => sources(dir));
if (files.length === 0) {
  console.error("FAIL: verify-family-closure scanned no source files — the scan root is wrong.");
  process.exit(1);
}

const violations = [];
let writerSeen = false;
for (const file of files) {
  const rel = path.relative(root, file);
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (!ASSIGNS.test(line) || /^\s*(\/\/|\*)/.test(line)) return;
    if (rel === WRITER) {
      writerSeen = true;
      return;
    }
    if (ALLOWED.has(rel)) return;
    violations.push(`${rel}:${index + 1} writes campaign.scenarioFamilies outside the family effect — route it through a { kind: "scenarioFamily" } effect`);
  });
}

// The writer itself has to be found, or a rename has blinded this gate.
if (!writerSeen && !process.argv[2]) {
  violations.push(`${WRITER} no longer writes scenarioFamilies where this gate looks — update the gate to the writer`);
}

if (violations.length > 0) {
  console.error(`FAIL: verify-family-closure — ${violations.length} finding(s):`);
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}
console.log(`verify-family-closure: ${files.length} source files, one writer of the arc record.`);
