#!/usr/bin/env node
// Proves the web player "tokens are the only source of color" lint actually
// fails on a violation, not just that it passes on clean code.
import { execFileSync } from "node:child_process";
import { copyFileSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = path.join(root, "packages/ui-web/__fixtures__/adhoc-color-violation.ts.fixture");
const target = path.join(root, "packages/ui-web/src/__adhoc_color_violation_tmp__.ts");

try {
  copyFileSync(fixture, target);
  execFileSync("pnpm", ["exec", "eslint", target], { cwd: root, stdio: "pipe" });
  console.error("FAIL: eslint did not reject the ad-hoc-color fixture. The tokens-only-color lint is not working.");
  process.exitCode = 1;
} catch (err) {
  if (err.status && err.status !== 0) {
    console.log("OK: tokens-only-color lint correctly rejected the fixture violation.");
  } else {
    console.error("FAIL: eslint invocation errored for an unexpected reason.");
    console.error(err.message);
    process.exitCode = 1;
  }
} finally {
  if (existsSync(target)) rmSync(target);
}
