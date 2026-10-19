#!/usr/bin/env node
// One "day of this presidency", one days-to-weeks converter, and one calendar.
//
// The game kept two day counters that both meant "the day this presidency is
// on" and disagreed by exactly a week: `campaign.turn * 7`, which stamped
// every nomination, war powers window, finding and intelligence tasking, and
// `daysBetween(foundingDate, currentDate)`, which every date a room prints was
// rendered from. A record opened on the first and read against the second was
// seven days out, and nothing failed — the numbers were both plausible.
//
// Three rules, each with one legal home.
//
//   1. A day of the presidency is derived in packages/engine/src/clock.ts and
//      nowhere else. Multiplying a turn ordinal by a turn length anywhere else
//      is a second counter, whatever it is named.
//   2. A count of days becomes a count of weeks, or a count of weeks becomes
//      days, in packages/engine/src/pace.ts and nowhere else (`turnsFor`,
//      `weeksFor`, `elapsedDays`). A private `ceil(days / DAYS_PER_TURN)` or
//      `days / 7` is a second converter that can round a different way from
//      its neighbors, which is how six days left and two days left came to
//      read as the same week on one screen and different weeks on the next.
//   3. An appropriation runs to the end of a fiscal year, a date. Writing its
//      last turn as `turn + TURNS_PER_YEAR` moves a September 30 deadline to
//      whatever week the money happened to pass.
//
// Test files are not scanned. A test states the expected number independently
// on purpose — that is what makes it a check rather than a restatement of the
// implementation.
//
// There is no debt list. The last two sites that predated the rules were
// rewritten, so every conversion outside the two homes is a violation.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// An explicit root so the paired proof can run this exact code over a fixture
// tree rather than planting a violation in the working copy, where a file it
// would have to write into may be open in front of somebody.
const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const DAY_COUNTER_HOME = "packages/engine/src/clock.ts";
const CONVERTER_HOME = "packages/engine/src/pace.ts";

const SCAN_ROOTS = ["packages", "apps", "services"];
const EXCLUDED_DIRS = new Set(["node_modules", "dist", "__fixtures__", ".git", ".expo"]);

/**
 * A campaign's turn ordinal multiplied out into a day of the presidency.
 * Matches `campaign.turn * 7`, `(campaign.turn - 1) * DAYS_PER_TURN` and
 * `state.turn * daysElapsed` — the three shapes the second counter was written
 * in.
 *
 * Deliberately not matched: `SOME_WINDOW_TURNS * DAYS_PER_TURN`, an authored
 * span held in turns and rendered in days, and `2 * DAYS_PER_TURN`, a span
 * written as a number of weeks. `TURNS_PER_YEAR * 3` is not matched either —
 * turns times a number is turns.
 */
const DAY_FROM_TURN =
  /(?:^|[^\w$.])(?:\w+\.)?(?:turn|turns|\w+Turn|\w+Turns)\b\s*(?:[-+]\s*\d+\s*\))?\s*\*\s*(\d+|DAYS_PER_TURN|daysPerTurn|days[A-Z]\w*)\b/;

/**
 * A span of weeks multiplied out into days: a difference of two turns in
 * parentheses, or a count named as weeks, times a week's length.
 */
const DAYS_FROM_WEEKS =
  /(?:\([^()]*\b(?:\w+\.)?(?:turn|\w+Turn)\b[^()]*\)|\b(?:weeks|\w+Weeks))\s*\*\s*(?:7|DAYS_PER_TURN|daysPerTurn)\b/;

/**
 * A day count divided by a turn length, or a count named as days divided by
 * seven. `DAYS_PER_TURN / 365` is the reverse — a per-fiction-day rate — and is
 * not this, and neither is `Math.log10(x) / 7`, which divides nothing that is a
 * day.
 */
const TURNS_FROM_DAYS = /\/\s*(?:\w+\.)?(?:DAYS_PER_TURN|daysPerTurn)\b|\b(?:days|\w+Days)\s*\/\s*7\b/;

/** An appropriation window written as a year of turns from whenever it was set. */
const YEAR_OF_TURNS_WINDOW = /throughTurn:\s*[\w.]+\s*\+\s*TURNS_PER_YEAR\b/;

const RULES = [
  { name: "day counter", pattern: DAY_FROM_TURN, homes: [DAY_COUNTER_HOME] },
  { name: "weeks-to-days", pattern: DAYS_FROM_WEEKS, homes: [CONVERTER_HOME] },
  { name: "days-to-turns", pattern: TURNS_FROM_DAYS, homes: [CONVERTER_HOME] },
  { name: "fiscal year as turns", pattern: YEAR_OF_TURNS_WINDOW, homes: [] },
];

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    out.push(path.relative(root, path.join(dir, entry.name)));
  }
  return out;
}

function sourceFiles() {
  const out = [];
  for (const scanRoot of SCAN_ROOTS) {
    const dir = path.join(root, scanRoot);
    try {
      walk(dir, out);
    } catch (error) {
      // A workspace that is not checked out is not a violation; the
      // empty-corpus guard below is what refuses a run that saw nothing.
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return out;
}

/** Strips line and block comments, so a rule quoted in prose is not a hit. */
function code(contents) {
  return contents.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function hitsIn(relPath) {
  const lines = code(readFileSync(path.join(root, relPath), "utf8")).split("\n");
  return lines.flatMap((line, index) =>
    RULES.filter((rule) => !rule.homes.includes(relPath) && rule.pattern.test(line)).map((rule) => ({
      relPath,
      line: index + 1,
      rule: rule.name,
      text: line.trim(),
    })),
  );
}

const files = sourceFiles();
if (files.length === 0) {
  console.error("FAIL: verify-one-day-counter.mjs scanned no source files. A check that sees nothing cannot pass.");
  process.exit(1);
}

const violations = files.flatMap(hitsIn).map((hit) => `${hit.relPath}:${hit.line} [${hit.rule}] ${hit.text}`);

if (violations.length > 0) {
  console.error(`FAIL: ${violations.length} calendar conversion(s) outside the one place each belongs:\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    `\nA day of the presidency comes from campaignDay() in ${DAY_COUNTER_HOME}. Days become weeks, and weeks ` +
      `days, through turnsFor(), weeksFor() and elapsedDays() in ${CONVERTER_HOME}. An appropriation runs to ` +
      "selectFiscalYearEndTurn(), never to a year of turns." +
      "\n\nIf the conversion exists only to print a figure, print the days instead. Rounding six days left and two " +
      "days left to the same week is the reading this rule was written to stop.",
  );
  process.exit(1);
}

console.log(`OK: ${files.length} source files carry one day counter, one days-to-weeks converter and one fiscal calendar.`);
