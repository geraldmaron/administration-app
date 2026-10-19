#!/usr/bin/env node
// Every drawn reading says what it measures, keys its marks and says how to
// read it.
//
// The owner found charts, gauges and meters in the universal player with no
// key and no word on how to use them. The design system now carries the
// answer: `ReadingFrame` (title, unit and period, a key for every encoding,
// "How to read this", and a line when its marks can be pressed), and the
// head that BenchmarkChart draws itself takes the same `help`. This gate
// holds the player to it.
//
// A use of a drawn-reading primitive from @admin/ui in apps/player passes
// when its file draws a `<ReadingFrame`, when that use passes `help=`
// itself, or when it passes `keyed` and so draws its own key: a share bar in
// a titled tile, whose key is the whole of how it is read. Each other use counts against `<file>::<Primitive>`. Today's uses
// are forgiven in scripts/baselines/reading-keys.json, a ratchet that may
// only shrink (scripts/baselines/ratchet.mjs): frame a reading and run
// `--update-baseline` to take its entry out.
//
//   node scripts/verify-reading-keys.mjs                    the gate
//   node scripts/verify-reading-keys.mjs --update-baseline  shrink the baseline
//   node scripts/verify-reading-keys.mjs <fixture-dir>      the proof's tree: player/, baseline.json
import { fileURLToPath } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";
import { codeOf, designImports, openTags, playerFiles } from "./lib/player-jsx.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const ROOTS = fixture ? [path.join(base, "player")] : [path.join(root, "apps/player/src"), path.join(root, "apps/player/app")];
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/reading-keys.json");

/** The design system's drawn readings: a chart, a gauge, a meter, a bar a reader decodes by its marks. */
const READING_PRIMITIVES = [
  "BarRow",
  "BenchArc",
  "BenchmarkChart",
  "CareerBands",
  "CompareMatrix",
  "CountdownRing",
  "Distribution",
  "Diverging",
  "FanChart",
  "Hemicycle",
  "Meter",
  "MonthGrid",
  "PairedBars",
  "PositionRidges",
  "RollChart",
  "Segments",
  "ShareBar",
  "Sparkline",
  "StackBar",
  "StackedBar",
  "StatuteClock",
  "TermTimeline",
  "ThresholdBar",
  "TieMap",
  "Track",
  "TrackRow",
  "VoteCount",
  "WeekColumns",
];

const current = {};
let uses = 0;
for (const file of playerFiles(ROOTS)) {
  const code = codeOf(file);
  const imported = designImports(code);
  const framed = /<ReadingFrame(?=[\s/>])/.test(code);
  for (const [local, name] of imported) {
    if (!READING_PRIMITIVES.includes(name)) continue;
    for (const tag of openTags(code, local)) {
      uses++;
      if (framed || /\shelp=/.test(tag) || /\skeyed(?=[\s/>=])(?!=\{false\})/.test(tag)) continue;
      const key = `${path.relative(base, file)}::${name}`;
      current[key] = (current[key] ?? 0) + 1;
    }
  }
}

if (uses === 0) {
  console.error("verify-reading-keys: FAIL — found no drawn-reading use at all; the scan roots or the import pattern moved and this gate is checking nothing.");
  process.exit(1);
}

const held = holdRatchet({
  label: "verify-reading-keys",
  repoRoot: root,
  file: BASELINE,
  comment:
    "Uses of a drawn-reading primitive in apps/player outside a ReadingFrame and without help=. Written by " +
    "`node scripts/verify-reading-keys.mjs --update-baseline`; it may only shrink.",
  current,
  update: process.argv.includes("--update-baseline"),
});

if (!held) {
  console.error("verify-reading-keys: FAIL — put the reading in a ReadingFrame (title, unit and period, legend, help, pressHint) or pass help= to a primitive that draws its own head.");
  process.exit(1);
}
const unframed = Object.values(current).reduce((sum, n) => sum + n, 0);
console.log(`verify-reading-keys: OK — ${uses} drawn reading(s) in the player, ${unframed} still without a frame or help (forgiven, and shrinking).`);
