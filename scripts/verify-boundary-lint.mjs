#!/usr/bin/env node
// Proves the packages/engine dependency-direction lint actually fails on a
// violation, not just that it passes on
// clean code. Copies the fixture into packages/engine/src as a temp file,
// runs eslint on it, asserts a non-zero exit, then removes the temp file.
import { execFileSync } from "node:child_process";
import { copyFileSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = path.join(root, "packages/engine/__fixtures__/boundary-violation.ts.fixture");
const target = path.join(root, "packages/engine/src/__boundary_violation_tmp__.ts");

try {
  copyFileSync(fixture, target);
  execFileSync("pnpm", ["exec", "eslint", target], { cwd: root, stdio: "pipe" });
  console.error("FAIL: eslint did not reject the boundary-violation fixture. The dependency-direction lint is not working.");
  process.exitCode = 1;
} catch (err) {
  if (err.status && err.status !== 0) {
    console.log("OK: dependency-direction lint correctly rejected the fixture violation.");
  } else {
    console.error("FAIL: eslint invocation errored for an unexpected reason.");
    console.error(err.message);
    process.exitCode = 1;
  }
} finally {
  if (existsSync(target)) rmSync(target);
}
