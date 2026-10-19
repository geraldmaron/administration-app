#!/usr/bin/env node
// The case-contract gate must reject a handler table that dropped `case`,
// and a day loop that no longer defaults due cases.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = path.join(root, "scripts/verify-case-contract.mjs");
const dir = mkdtempSync(path.join(tmpdir(), "case-contract-"));
const effects = path.join(dir, "effects.ts");
const advance = path.join(dir, "advance.ts");
writeFileSync(effects, "export const handlers = { docket: applyDocket };\n");
writeFileSync(advance, "export function day() { return advanceOneDay(working); }\n");

function run(effectFile, dayFile) {
  try {
    execFileSync("node", [gate, effectFile, dayFile], { cwd: root, stdio: "pipe" });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
}

const failures = [];
if (run("packages/engine/src/effects.ts", "packages/engine/src/advance.ts") !== 0) failures.push("the engine files failed the gate");
if (run(effects, advance) === 0) failures.push("a handler table without case was accepted");
rmSync(dir, { recursive: true, force: true });
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log("ok verify-case-contract proof");
