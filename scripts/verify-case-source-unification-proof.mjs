#!/usr/bin/env node
// The source-unification gate must reject a desk that draws from the pool
// before it reads an open case.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = path.join(root, "scripts/verify-case-source-unification.mjs");
const dir = mkdtempSync(path.join(tmpdir(), "case-source-"));
const reversed = path.join(dir, "scripts.ts");
writeFileSync(reversed, "export function pending() { stageFromResidentPool(); return openScenarioCasts(); }\n");

function run(file) {
  try {
    execFileSync("node", [gate, file], { cwd: root, stdio: "pipe" });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
}

const failures = [];
if (run("packages/player-core/src/conversation/scripts.ts") !== 0) failures.push("the desk script failed the gate");
if (run(reversed) === 0) failures.push("a pool-first desk was accepted");
rmSync(dir, { recursive: true, force: true });
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log("ok verify-case-source-unification proof");
