#!/usr/bin/env node
// No screen prints a person's scored attribute as a figure.
//
// Loyalty is the least observable quantity in the game. Nothing in the fiction
// of the office hands a president a minister's loyalty, integrity, ambition,
// charisma or competence as a number, and a percentage invites the five-way
// comparison the simulation never makes. The phone app kept the dossier's
// figures behind a "Show the figures" toggle and a gate held every other
// surface to the word. The web port dropped the gate, and the cabinet roster
// and the office file went back to printing the stored ratio unconditionally.
// Exact figures give way to bands and confidence, so the word is the reading.
//
// What counts as printing one, in apps/web/src and packages/player-core/src:
//
//   - formatRatio(...), formatPercent(...) or Math.round(...) over an argument
//     that reads `.loyalty`, `.integrity`, `.ambition`, `.charisma` or
//     `.competence`;
//   - the same call over a local that was read from one, or from a person
//     indexed by attribute key (`const value = person[key]`), which is how the
//     dossier's assessment reading builds its figure;
//   - `.toFixed(` straight off one of the five.
//
// Today's prints are forgiven per file in scripts/baselines/disclosure.json, a
// ratchet that may only shrink (scripts/baselines/ratchet.mjs). A new print
// anywhere fails; a print removed has to come out of the baseline with it.
//
//   node scripts/verify-disclosure.mjs                    the gate
//   node scripts/verify-disclosure.mjs --update-baseline  shrink the baseline
//   node scripts/verify-disclosure.mjs <fixture-dir>      the proof's trees
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const SCAN_ROOTS = fixture ? ["web", "player-core"] : ["apps/web/src", "packages/player-core/src"];
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/disclosure.json");

const ATTRIBUTES = ["loyalty", "integrity", "ambition", "charisma", "competence"];
const MEMBER = new RegExp(`\\.(?:${ATTRIBUTES.join("|")})\\b`);
/** A person indexed by an attribute key, the way a reading loops over all five. */
const INDEXED = /\b(?:person|holder|chair|candidate|minister|nominee|mate|official)\s*\[\s*[A-Za-z_$][\w$]*\s*\]/;
const FIGURE_CALLS = ["formatRatio", "formatPercent", "Math.round"];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist", "__fixtures__"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** Comments blanked line for line, so a doc comment naming `.loyalty` is not a print and line numbers hold. */
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, "")).replace(/(^|[^:])\/\/.*$/gm, "$1");

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** Every call to `name(`, with its argument list balanced on parentheses. */
function callsTo(text, name) {
  const calls = [];
  for (const match of text.matchAll(new RegExp(`\\b${name.replace(".", "\\.")}\\(`, "g"))) {
    let depth = 1;
    let end = match.index + match[0].length;
    while (end < text.length && depth > 0) {
      if (text[end] === "(") depth += 1;
      else if (text[end] === ")") depth -= 1;
      end += 1;
    }
    calls.push({ index: match.index, args: text.slice(match.index + match[0].length, end - 1) });
  }
  return calls;
}

/** Locals read from a scored attribute: `const value = person[key]`, `const loyal = seat.holder.loyalty`. */
function attributeLocals(text) {
  const names = new Set();
  for (const match of text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g)) {
    if (MEMBER.test(match[2]) || INDEXED.test(match[2])) names.add(match[1]);
  }
  return names;
}

/** Every place one file prints a scored attribute as a figure. */
function printsIn(text) {
  const locals = attributeLocals(text);
  const readsLocal = (args) => [...locals].some((name) => new RegExp(`(^|[^.\\w$])${name}\\b`).test(args));
  const hits = [];
  for (const name of FIGURE_CALLS) {
    for (const call of callsTo(text, name)) {
      if (MEMBER.test(call.args) || readsLocal(call.args)) hits.push({ line: lineOf(text, call.index), what: `${name}(${call.args.trim()})` });
    }
  }
  for (const match of text.matchAll(new RegExp(`\\.(?:${ATTRIBUTES.join("|")})\\s*\\.toFixed\\(`, "g"))) {
    hits.push({ line: lineOf(text, match.index), what: match[0] });
  }
  return hits;
}

const files = SCAN_ROOTS.flatMap((dir) => walk(path.join(base, dir))).filter(
  (file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file),
);
let corpus = 0;
const current = {};
const detail = new Map();
for (const file of files) {
  const text = stripComments(readFileSync(file, "utf8"));
  if (MEMBER.test(text) || INDEXED.test(text)) corpus += 1;
  const hits = printsIn(text);
  if (hits.length === 0) continue;
  const rel = path.relative(base, file);
  current[rel] = hits.length;
  detail.set(rel, hits);
}

if (corpus === 0) {
  console.error(
    "verify-disclosure: FAIL — no scanned file reads a scored person attribute at all, so no print of one could be judged. " +
      "The scan roots or the attribute names moved; this is a disarmed rule, not a clean tree.",
  );
  process.exit(1);
}

const held = holdRatchet({
  label: "verify-disclosure",
  repoRoot: root,
  file: BASELINE,
  comment:
    "Files that print a person's scored attribute (loyalty, integrity, ambition, charisma, competence) as a figure, " +
    "with how many prints each is forgiven. Written by `node scripts/verify-disclosure.mjs --update-baseline`; it may only shrink.",
  current,
  update: process.argv.includes("--update-baseline"),
  describe: (key) => `${key}${detail.has(key) ? `  ${detail.get(key).map((hit) => `:${hit.line} ${hit.what}`).join("; ")}` : ""}`,
});

const total = Object.values(current).reduce((sum, count) => sum + count, 0);
if (!held) {
  console.error(
    "\nverify-disclosure: FAIL — print the word for the reading (the dossier's attributeVerdict, the roster's loyaltyWord) " +
      "and put any figure behind a disclosure the player opens, never the stored ratio unconditionally.",
  );
  process.exit(1);
}
console.log(
  `verify-disclosure: OK — ${corpus} file(s) read a scored person attribute; ${total} figure print(s) in ` +
    `${Object.keys(current).length} file(s), none beyond what the baseline forgives.`,
);
