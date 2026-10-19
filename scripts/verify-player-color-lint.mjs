#!/usr/bin/env node
// Proves the universal player's "color comes from the theme" lint fails on
// each kind of literal it exists to refuse: a hex, an rgb() and an rgba() in a
// string, and an rgb() in a template. Each is planted in packages/ui and in
// apps/player outside the theme folder, eslint must reject every one, and the
// same literal inside packages/ui/src/theme must pass, since the theme is
// where color is allowed to be written.
import { execFileSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tag = `__color_lint_${process.pid}__`;
const planted = [path.join(root, `packages/ui/src/${tag}.ts`), path.join(root, `apps/player/src/${tag}.ts`)];
const theme = path.join(root, `packages/ui/src/theme/${tag}.ts`);
const LITERALS = ['export const a = "#0B1B33";', 'export const b = "rgb(11, 27, 51)";', 'export const c = "rgba(4,8,17,0.55)";', "export const d = `rgba(${4}, 8, 17, 0.5)`;"];

function lint(file) {
  try {
    execFileSync("pnpm", ["exec", "eslint", "--no-warn-ignored", "--format", "json", file], { cwd: root, stdio: "pipe" });
    return [];
  } catch (err) {
    const out = `${err.stdout ?? ""}`;
    if (!out.trim().startsWith("[")) throw new Error(`eslint did not run on ${path.relative(root, file)}: ${err.message}`);
    return JSON.parse(out).flatMap((result) => result.messages.filter((m) => m.ruleId === "no-restricted-syntax").map((m) => m.line));
  }
}

const problems = [];
try {
  for (const file of [...planted, theme]) writeFileSync(file, `${LITERALS.join("\n")}\n`);
  for (const file of planted) {
    const lines = lint(file);
    for (let line = 1; line <= LITERALS.length; line++) {
      if (!lines.includes(line)) problems.push(`${path.relative(root, file)}: eslint let \`${LITERALS[line - 1]}\` through`);
    }
  }
  if (lint(theme).length > 0) problems.push("the theme folder is refused its own colors; the lint's ignore moved");
} finally {
  for (const file of [...planted, theme]) if (existsSync(file)) rmSync(file);
}

if (problems.length > 0) {
  console.error("verify-player-color-lint: FAIL");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`verify-player-color-lint: OK — eslint refused ${LITERALS.length} kinds of color literal in packages/ui and apps/player, and allowed them in the theme.`);
