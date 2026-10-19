#!/usr/bin/env node
// Proves verify-file-size.mjs actually fails its two ways of being wrong,
// rather than only passing because the tree happens to be clean today:
//   1. an oversized file on neither allowlist
//   2. an allowlist entry naming a file that no longer exists
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = path.join(root, "scripts/verify-file-size.mjs");

/** Runs the gate and reports whether it rejected. */
function rejects() {
  try {
    execFileSync("node", ["scripts/verify-file-size.mjs"], { cwd: root, stdio: "pipe" });
    return false;
  } catch (err) {
    if (err.status && err.status !== 0) return true;
    throw err;
  }
}

const failures = [];

// 1. An 850-line file on neither the DATA_TABLE_ALLOWLIST nor LOGIC_DEBT.
const target = path.join(root, "packages/engine/src/__file_size_violation_tmp__.ts");
try {
  writeFileSync(target, `${Array.from({ length: 850 }, (_, i) => `export const __line${i} = ${i};`).join("\n")}\n`);
  if (!rejects()) failures.push("did not reject an 850-line file outside both allowlists");
} finally {
  if (existsSync(target)) rmSync(target);
}

// 2. A LOGIC_DEBT ceiling on a path that does not exist. A forgiveness whose
// subject has been deleted is invisible debt: nobody can see it being spent,
// and a future file at that path inherits an exemption nobody granted.
const original = readFileSync(gate, "utf8");
try {
  writeFileSync(
    gate,
    original.replace("const LOGIC_DEBT = {", 'const LOGIC_DEBT = {\n  "packages/engine/src/__never_existed_tmp__.ts": 900,'),
  );
  if (!rejects()) failures.push("did not reject a LOGIC_DEBT entry naming a file that does not exist");
} finally {
  writeFileSync(gate, original);
}

if (failures.length > 0) {
  console.error(`FAIL: verify-file-size.mjs missed ${failures.length} deliberate fixture(s):`);
  for (const f of failures) console.error(`  - it ${f}.`);
  process.exitCode = 1;
} else {
  console.log("OK: verify-file-size.mjs rejected the oversized fixture and the stale allowlist entry.");
}
