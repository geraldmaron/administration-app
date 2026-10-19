#!/usr/bin/env node
// Enforces the "files < 800 lines" convention, which shipped with no
// gate behind it while ten-plus files already broke it. The
// dividing line is data vs. logic, not a line count on its own: an authored
// data table (a name bank, a nation roster) is a flat
// list whose length is the content, and splitting it buys nothing but import
// noise. A logic file that size is a file doing too many things.
//
// DATA_TABLE_ALLOWLIST is unlimited by design — these are tables, not code.
// LOGIC_DEBT is a frozen ceiling per pre-existing logic file over 800 lines,
// recorded at the size measured when this gate was added: it can shrink (a
// file split down converts to a lower ceiling or drops off the list) but
// cannot grow, so today's debt cannot get worse even though it is not yet
// paid off. Anything else crossing 800 lines is a new violation and fails.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MAX_LINES = 800;

const DATA_TABLE_ALLOWLIST = new Set([
  "packages/world/src/dataset/name-banks.ts",
  "packages/world/src/dataset/nations.ts",
  // Baked from seed/world-series.tsv: one row per country-year, so its length is its content.
  "packages/world/src/dataset/world-series.ts",
  "packages/world/src/maps/world-geometry.ts",
  "packages/world/src/maps/us-geometry.ts",
  "packages/content/src/packs/core.ts",
  "packages/engine/src/policy-catalog.ts",
  "packages/player-core/src/content/bundled-corpus.generated.ts",
  // The glossary: authored entries and explainers, one record
  // after another. An area grows by the civics it has to teach.
  "packages/player-core/src/glossary/desk.ts",
  "packages/player-core/src/glossary/government.ts",
  "packages/player-core/src/glossary/policy.ts",
  "packages/player-core/src/glossary/record.ts",
  "packages/player-core/src/glossary/world.ts",
]);

// Each ceiling is the size that file was measured at when it was admitted
// here. A file on this list is still over budget — it is debt, not an
// exemption — but the gate only fails it for growing past its own recorded
// size, not for the violation itself. Lower a ceiling when a file shrinks;
// raise one only on the owner's explicit say-so, with the reason recorded
// beside the new number.
const LOGIC_DEBT = {
  "packages/content/src/scenario-audit.ts": 1569,
  // Owner-approved 2026-09-01: the brief is one document read top to bottom
  // by the drafting model; splitting it would scatter one argument.
  "packages/engine/src/resolution.ts": 908,
  "packages/content/src/audit-lexicon.ts": 801,
};

const SCAN_ROOTS = ["packages", "apps", "services", "scripts"];
const EXCLUDED_DIRS = new Set(["node_modules", "dist", "out", "__fixtures__", ".git"]);

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx") && !entry.name.endsWith(".gen.ts")) {
      out.push(path.relative(root, path.join(dir, entry.name)));
    }
  }
  return out;
}

function sourceFiles() {
  const out = [];
  for (const scanRoot of SCAN_ROOTS) walk(path.join(root, scanRoot), out);
  return out;
}

function lineCount(relPath) {
  const contents = readFileSync(path.join(root, relPath), "utf8");
  const lines = contents.split("\n").length;
  // A trailing newline should not count as an extra line, matching `wc -l`.
  return contents.endsWith("\n") ? lines - 1 : lines;
}

const violations = [];

// An allowlist entry naming a file that no longer exists is worse than a large
// file: it is a forgiveness nobody can see being spent, and it survives the
// deletion of the thing it forgave. A future file at that path inherits the
// exemption without anyone deciding to grant it. Both lists are checked, and a
// stale entry fails the gate rather than being quietly skipped.
for (const relPath of [...DATA_TABLE_ALLOWLIST, ...Object.keys(LOGIC_DEBT)]) {
  if (!existsSync(path.join(root, relPath))) {
    violations.push(`${relPath}: named in an allowlist but does not exist — remove the entry`);
  }
}

for (const relPath of sourceFiles()) {
  if (DATA_TABLE_ALLOWLIST.has(relPath)) continue;

  const lines = lineCount(relPath);
  const debtCeiling = LOGIC_DEBT[relPath];

  if (debtCeiling !== undefined) {
    if (lines > debtCeiling) {
      violations.push(
        `${relPath}: ${lines} lines, grew past its recorded debt ceiling of ${debtCeiling} — split it, don't let it grow further`,
      );
    }
    continue;
  }

  if (lines > MAX_LINES) {
    violations.push(`${relPath}: ${lines} lines, exceeds the ${MAX_LINES}-line limit and is not on the debt list`);
  }
}

if (violations.length > 0) {
  console.error(`FAIL: ${violations.length} file(s) violate the file-size convention:\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    "\nA data table belongs in DATA_TABLE_ALLOWLIST in scripts/verify-file-size.mjs. A logic file over 800 " +
      "lines needs to be split, not added to LOGIC_DEBT — that list is pre-existing debt, not a place to file new work.",
  );
  process.exit(1);
} else {
  console.log(`OK: no file exceeds ${MAX_LINES} lines outside the recorded data-table and logic-debt allowlists.`);
}
