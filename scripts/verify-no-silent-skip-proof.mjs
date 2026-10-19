#!/usr/bin/env node
// The silent-skip gate must fail a control that can press Continue while held,
// and a control that defers from Continue. It must pass the real Continue control.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = path.join(root, "scripts/verify-no-silent-skip.mjs");
const dir = mkdtempSync(path.join(tmpdir(), "no-silent-skip-"));

function run(file) {
  try {
    execFileSync("node", [gate, ...(file ? [file] : [])], { cwd: root, stdio: "pipe" });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
}

const held = path.join(dir, "held.tsx");
const skipped = path.join(dir, "skipped.tsx");
writeFileSync(held, "export function advance() { if (offer.held) return; store.continueUntilAttention(); }\n");
writeFileSync(skipped, "export function advance() { deferMatterPacket(); store.continueUntilAttention(); }\n");

const failures = [];
if (run(path.join(dir, "missing.tsx")) === 0) failures.push("a target that does not exist was accepted");
if (run(undefined) !== 0) failures.push("the real Continue control failed the gate");
if (run(held) !== 0) failures.push("a held return was rejected");
if (run(skipped) === 0) failures.push("a Continue that defers was accepted");

rmSync(dir, { recursive: true, force: true });
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log("ok verify-no-silent-skip proof");
