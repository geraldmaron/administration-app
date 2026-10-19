#!/usr/bin/env node
// Proves verify-family-closure.mjs fails the ways it is supposed to, rather
// than passing because today's tree happens to have one writer.
//
//   1. a phase spreading a new arc record over the campaign
//   2. a direct assignment to the field
//   3. the honest shapes — a read, a type annotation, a comment — which must pass
//   4. a scan that found no source at all
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const work = mkdtempSync(path.join(tmpdir(), "family-closure-proof-"));
const failures = [];

function run(files) {
  const dir = path.join(work, Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, name), body);
  try {
    execFileSync("node", ["scripts/verify-family-closure.mjs", dir], { cwd: root, stdio: "pipe" });
    return 0;
  } catch (err) {
    if (typeof err.status !== "number") throw err;
    return err.status;
  }
}

try {
  if (run({ "tidy.ts": "export const tidy = (campaign) => ({ ...campaign, scenarioFamilies: {} });\n" }) === 0) {
    failures.push("did not reject a phase spreading a new arc record over the campaign");
  }
  if (run({ "assign.ts": "export function reset(campaign) { campaign.scenarioFamilies = {}; }\n" }) === 0) {
    failures.push("did not reject a direct assignment to the arc record");
  }
  const honest = [
    "export const open = (campaign) => campaign.scenarioFamilies['strait'];",
    "type Shape = { readonly scenarioFamilies: ScenarioFamilyState };",
    "// scenarioFamilies: written only by the family effect",
    "export const same = (a, b) => a.scenarioFamilies === b.scenarioFamilies;",
  ].join("\n");
  if (run({ "honest.ts": `${honest}\n` }) !== 0) failures.push("rejected a read, a type or a comment");
  if (run({}) === 0) failures.push("passed a scan that found no source file at all");
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("FAIL: verify-family-closure-proof");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("verify-family-closure-proof: 4 of 4 cases behave.");
