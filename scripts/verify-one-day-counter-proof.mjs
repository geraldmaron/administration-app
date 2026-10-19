#!/usr/bin/env node
// Proves verify-one-day-counter.mjs actually fails, rather than passing
// because the tree happens to be clean today.
//
// Every plant goes into a fixture tree in a temp directory and the gate is
// pointed at it, so nothing is ever written into the working copy — a proof
// that has to edit a real source file to make its point is a proof that can
// lose somebody else's work when it cleans up.
//
// One plant per way the rule can be broken and one per way the gate could be
// quietly useless:
//
//   1. a second day-of-the-presidency counter (`campaign.turn * 7`);
//   2. a second days-to-turns converter (`ceil(days / DAYS_PER_TURN)`), and
//      the bare `days / 7` shape the same converter was also written in;
//   3. a span of weeks multiplied back into days outside pace.ts;
//   4. an appropriation that runs a year of turns instead of to a fiscal year;
//   5. the shapes near the rule that are not the defect — a rate per
//      fiction-day (`DAYS_PER_TURN / 365`), turns times a plain number
//      (`TURNS_PER_YEAR * 3`), an authored span (`2 * DAYS_PER_TURN`) and a
//      logarithm over seven — because a gate that fails everything in the
//      neighborhood is turned off within a week;
//   6. a run whose corpus came back empty, because a check that examined
//      nothing must fail rather than report a clean tree.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = path.join(root, "scripts/verify-one-day-counter.mjs");

/** Builds a fixture tree from a path→contents map and returns its root. */
function fixtureTree(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "one-day-counter-"));
  for (const [relPath, contents] of Object.entries(files)) {
    const full = path.join(dir, relPath);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
  return dir;
}

/** Runs the gate over a tree. Returns null when it passed, its output when it failed. */
function runGate(treeRoot) {
  try {
    execFileSync("node", [gate, treeRoot], { cwd: root, stdio: "pipe" });
    return null;
  } catch (err) {
    if (!err.status) throw err;
    return `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
}

// Enough of a tree that the gate's empty-corpus guard is satisfied on the runs
// that are meant to reach the rules.
const CLEAN_COMPANION = {
  "packages/engine/src/turn-clock.ts": "export const DAYS_PER_TURN = 7;\n",
  "packages/engine/src/policy.ts":
    'import { DAYS_PER_TURN } from "./turn-clock.js";\nexport const POLICY_TURN_SHARE = DAYS_PER_TURN / 365;\n',
};

const failures = [];

function check(label, files, expectation) {
  const dir = fixtureTree(files);
  try {
    expectation(runGate(dir), label);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function rejects(mustMention) {
  return (output, label) => {
    if (output === null) failures.push(`${label}: the gate accepted it.`);
    else if (!output.includes(mustMention)) failures.push(`${label}: it failed, but never named "${mustMention}".`);
  };
}

function accepts() {
  return (output, label) => {
    if (output !== null) failures.push(`${label}: the gate rejected code the rule allows.\n${output}`);
  };
}

function plant(relPath, body) {
  return { ...CLEAN_COMPANION, [relPath]: body };
}

check(
  "a second day-of-the-presidency counter",
  plant(
    "packages/engine/src/dossier.ts",
    'import type { Campaign } from "./state.js";\nexport function dayOfIt(c: Campaign): number {\n  return c.turn * 7;\n}\n',
  ),
  rejects("day counter"),
);

check(
  "a second days-to-turns converter",
  plant(
    "packages/engine/src/dossier.ts",
    'import { DAYS_PER_TURN } from "./turn-clock.js";\nexport function weeksOf(days: number): number {\n  return Math.max(1, Math.ceil(days / DAYS_PER_TURN));\n}\n',
  ),
  rejects("days-to-turns"),
);

check(
  "a count of days divided by seven in a screen",
  plant("apps/web/src/campaign/when.ts", "export const weeksAway = (days: number): number => Math.round(days / 7);\n"),
  rejects("days-to-turns"),
);

check(
  "a span of weeks multiplied back into days",
  plant(
    "packages/engine/src/closure.ts",
    'import { DAYS_PER_TURN } from "./turn-clock.js";\nexport const closedFor = (turn: number, begunTurn: number): number => (turn - begunTurn) * DAYS_PER_TURN;\n',
  ),
  rejects("weeks-to-days"),
);

check(
  "an appropriation that runs a year of turns from the week it passed",
  plant(
    "packages/engine/src/book.ts",
    'import { TURNS_PER_YEAR } from "./pace.js";\nexport const book = (turn: number) => ({ enactedTurn: turn, throughTurn: turn + TURNS_PER_YEAR });\n',
  ),
  rejects("fiscal year as turns"),
);

check(
  "the shapes near the rule that are not the defect",
  plant(
    "packages/engine/src/legislative-acts.ts",
    'import { DAYS_PER_TURN } from "./turn-clock.js";\n' +
      "export const TURNS_PER_YEAR = 52;\nexport const RECURRENCE = TURNS_PER_YEAR * 3;\n" +
      "export const CLOSE_DAYS = 2 * DAYS_PER_TURN;\n" +
      "export const mass = (budget: number): number => Math.log10(budget + 1) / 7;\n",
  ),
  accepts(),
);

check("an empty corpus", { "README.md": "no source here\n" }, rejects("scanned no source files"));

// The homes themselves have to stay legal, or the one counter has nowhere to live.
check(
  "the two files the rule names as its homes",
  {
    ...CLEAN_COMPANION,
    "packages/engine/src/clock.ts":
      'import { DAYS_PER_TURN } from "./turn-clock.js";\nexport const dayOfTurn = (turn: number): number => turn * DAYS_PER_TURN;\n',
    "packages/engine/src/pace.ts":
      "export const turnsFor = (days: number, daysPerTurn = 7): number => Math.max(1, Math.ceil(days / daysPerTurn));\n" +
      "export const elapsedDays = (weeks: number, daysPerTurn = 7): number => weeks * daysPerTurn;\n",
  },
  accepts(),
);

if (failures.length > 0) {
  console.error(`FAIL: verify-one-day-counter.mjs did not hold on ${failures.length} plant(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  "OK: verify-one-day-counter.mjs rejects a second day counter, a second days-to-weeks converter in both its " +
    "shapes, weeks multiplied back into days and an appropriation run to a year of turns; accepts a " +
    "per-fiction-day rate, a turn-count multiple, an authored span, a logarithm and the two homes themselves; " +
    "and refuses an empty corpus.",
);
