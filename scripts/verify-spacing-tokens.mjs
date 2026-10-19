#!/usr/bin/env node
// Spacing and corner radii in the player name a token.
//
// The space scale (2xs to 3xl, a 4-point scale) and the radii (chip,
// control, card, sheet, pill) live in packages/design and reach Tamagui as
// tokens, so `gap="md"` follows the scale everywhere and a retune moves every
// screen at once. A JSX prop that writes `padding={14}` or `borderRadius={6}`
// is a value the scale never chose, and it drifts. Zero is allowed: it is
// the absence of space, not a size.
//
// Counted: numeric literals passed to padding*, margin*, gap, rowGap,
// columnGap and *Radius props in apps/player. Today's are forgiven per file
// in scripts/baselines/spacing-tokens.json, a ratchet that may only shrink
// (scripts/baselines/ratchet.mjs).
//
//   node scripts/verify-spacing-tokens.mjs                    the gate
//   node scripts/verify-spacing-tokens.mjs --update-baseline  shrink the baseline
//   node scripts/verify-spacing-tokens.mjs <fixture-dir>      the proof's tree: player/, baseline.json
import { fileURLToPath } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";
import { codeOf, playerFiles } from "./lib/player-jsx.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const ROOTS = fixture ? [path.join(base, "player")] : [path.join(root, "apps/player/src"), path.join(root, "apps/player/app")];
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/spacing-tokens.json");

const PROP = /\s((?:padding|margin)(?:Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?|gap|rowGap|columnGap|border(?:Top|Bottom)?(?:Left|Right)?Radius)=\{\s*-?(\d+(?:\.\d+)?)\s*\}/g;

const current = {};
let files = 0;
for (const file of playerFiles(ROOTS)) {
  files++;
  for (const match of codeOf(file).matchAll(PROP)) {
    if (Number(match[2]) === 0) continue;
    const key = path.relative(base, file);
    current[key] = (current[key] ?? 0) + 1;
  }
}

if (files === 0) {
  console.error("verify-spacing-tokens: FAIL — found no player source; the scan roots moved and this gate is checking nothing.");
  process.exit(1);
}

const held = holdRatchet({
  label: "verify-spacing-tokens",
  repoRoot: root,
  file: BASELINE,
  comment: "Numeric padding, margin, gap and radius props in apps/player, per file. Written by `node scripts/verify-spacing-tokens.mjs --update-baseline`; it may only shrink.",
  current,
  update: process.argv.includes("--update-baseline"),
});

if (!held) {
  console.error('verify-spacing-tokens: FAIL — name a token instead of a number: gap="md", padding="lg", borderRadius="card".');
  process.exit(1);
}
const numeric = Object.values(current).reduce((sum, n) => sum + n, 0);
console.log(`verify-spacing-tokens: OK — ${files} player file(s) read, ${numeric} numeric spacing or radius prop(s) left (forgiven, and shrinking).`);
