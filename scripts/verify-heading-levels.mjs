#!/usr/bin/env node
// The player's headings stop at level 3.
//
// A screen's title is level 1, a section (SectionHeader, Panel) level 2, and
// a card, a reading or a group inside it level 3 (Card, ReadingFrame).
// Screens that hand-write `aria-level={4}` or deeper outline a page no
// screen reader user can follow, and say a group is a sub-sub-section when
// it sits beside its siblings. A level deeper than 3 means the group should
// be a list, a Card, or a reading's own head.
//
// Today's hand-written levels past 3 in apps/player are forgiven in
// scripts/baselines/heading-levels.json, a ratchet that may only shrink
// (scripts/baselines/ratchet.mjs).
//
//   node scripts/verify-heading-levels.mjs                    the gate
//   node scripts/verify-heading-levels.mjs --update-baseline  shrink the baseline
//   node scripts/verify-heading-levels.mjs <fixture-dir>      the proof's tree: player/, baseline.json
import { fileURLToPath } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";
import { codeOf, playerFiles } from "./lib/player-jsx.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const ROOTS = fixture ? [path.join(base, "player")] : [path.join(root, "apps/player/src"), path.join(root, "apps/player/app")];
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/heading-levels.json");
const DEEPEST = 3;

const current = {};
let levels = 0;
for (const file of playerFiles(ROOTS)) {
  for (const match of codeOf(file).matchAll(/aria-level=(?:\{\s*(\d+)\s*\}|["'](\d+)["'])/g)) {
    levels++;
    if (Number(match[1] ?? match[2]) <= DEEPEST) continue;
    const key = path.relative(base, file);
    current[key] = (current[key] ?? 0) + 1;
  }
}

if (levels === 0) {
  console.error("verify-heading-levels: FAIL — found no aria-level at all; the scan roots moved and this gate is checking nothing.");
  process.exit(1);
}

const held = holdRatchet({
  label: "verify-heading-levels",
  repoRoot: root,
  file: BASELINE,
  comment: "Hand-written aria-level deeper than 3 in apps/player, per file. Written by `node scripts/verify-heading-levels.mjs --update-baseline`; it may only shrink.",
  current,
  update: process.argv.includes("--update-baseline"),
});

if (!held) {
  console.error(`verify-heading-levels: FAIL — keep headings at level ${DEEPEST} or above: use SectionHeader or Panel (2), Card or ReadingFrame (3), or a list.`);
  process.exit(1);
}
const deep = Object.values(current).reduce((sum, n) => sum + n, 0);
console.log(`verify-heading-levels: OK — ${levels} hand-written heading level(s) in the player, ${deep} deeper than ${DEEPEST} (forgiven, and shrinking).`);
