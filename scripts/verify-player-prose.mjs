#!/usr/bin/env node
// Player text reads as a person wrote it for a player, not as a template.
//
// docs/CONTENT_DOCTRINE.md §10.2 is the rule; this holds the part of it a
// machine can check. Insider words ("the room") leaked from the writers' room
// into counsel and the press office, em dashes and clause-joining colons gave
// half the game one cadence, and the words a model reaches for by default
// (crucial, seamless, quietly) mark a line as generated before its meaning
// lands. Plainness itself is judgment and stays with the review read.
//
// Strings come from scripts/player-text.mjs, which walks the syntax tree, so a
// comment, an import or a class name is never read as a sentence. Today's
// findings are forgiven per file and rule in scripts/baselines/player-prose.json,
// a ratchet that may only shrink (scripts/baselines/ratchet.mjs).
//
//   node scripts/verify-player-prose.mjs                    the gate
//   node scripts/verify-player-prose.mjs --update-baseline  shrink the baseline
//   node scripts/verify-player-prose.mjs --list [rule]      print every finding
//   node scripts/verify-player-prose.mjs --inventory <path>  print every prose string under a path prefix
//   node scripts/verify-player-prose.mjs --plain <path>      rank the strings most likely to need a plain-language rewrite
//   node scripts/verify-player-prose.mjs <fixture-dir>      the proof's trees: src/, baseline.json
import { fileURLToPath } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";
import { extractAll, PLAYER_ROOTS } from "./player-text.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const fixture = args.find((arg) => !arg.startsWith("--") && !["--list", "--inventory", "--plain"].includes(args[args.indexOf(arg) - 1]));
const base = fixture ? path.resolve(fixture) : root;
const roots = fixture ? ["src"] : PLAYER_ROOTS;
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/player-prose.json");

const REFUSED_WORDS = [
  "the rooms?", "delve", "delving", "tapestry", "landscape", "seamless(?:ly)?", "robust", "pivotal", "crucial",
  "leverag(?:e|es|ed|ing)", "elevat(?:e|es|ed|ing)", "empower(?:s|ed|ing)?", "testament", "ever-evolving", "at its core",
  "game-?changer", "journey", "realm", "bustling", "vibrant", "intricate", "nuanced", "multifaceted",
  "underscor(?:e|es|ed|ing)", "showcas(?:e|es|ed|ing)", "foster(?:s|ed|ing)?", "quietly", "simply", "truly", "genuinely",
  "deeply", "incredibly", "notably", "importantly", "ultimately", "in essence", "it'?s worth noting", "whether you",
  "here'?s the (?:thing|deal|catch|kicker)", "let'?s (?:dive|unpack|break (?:it )?down)", "dive into", "navigat(?:e|ing) the",
];

const LIST_AFTER_COLON = /^\s*(?:[^,.;:]{1,40}, )+(?:and |or )?[^,.;:]{1,40}\.?$/;
// Legal citation abbreviations are here because the player cites the law an act rests on (DECISIONS §8.12): "U.S. Const. art. II" is a citation, not two sentences.
const ABBREVIATION = /\b(?:vs|e\.g|i\.e|etc|U\.S|No|St|Mr|Mrs|Ms|Dr|approx|Const|art|amend|cl|Stat|Pub|tit|subch|ch)\.$/;

// The plain-language worklist: strings most likely to read like an expert wrote them. Not a gate on its own; the jargon rule below is.
const JARGON = ["disposition", "merits", "landmarks?", "salience", "cohorts?", "vote commitment", "economic-position", "granular", "holistic", "paradigm", "utili[sz]e", "pursuant to", "commence", "ascertain", "in order to", "prior to", "does not establish", "heretofore"];
const JARGON_RE = new RegExp(`\\b(?:${JARGON.join("|")})\\b`, "gi");
const syllables = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) ?? []).length);
};
const gradeLevel = (text) => {
  const clean = text.replace(/\{…\}/g, "thing");
  const sentences = clean.split(/(?<=[.?!])\s+/).filter((x) => /[a-z]/i.test(x));
  const words = clean.split(/\s+/).filter((x) => /[a-z]/i.test(x));
  if (words.length < 8 || sentences.length === 0) return null;
  const sy = words.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (words.length / sentences.length) + 11.8 * (sy / words.length) - 15.59;
};
const isCitation = (t) => /§|U\.S\.C|C\.F\.R|Const\./.test(t) || /<svg|^M-?\d/.test(t);
/** Each rule takes one string and returns how many times it breaks the rule. */
const RULES = {
  "refused-word": (t) => (t.match(new RegExp(`\\b(?:${REFUSED_WORDS.join("|")})\\b`, "gi")) ?? []).length,
  "em-dash": (t) => (t.trim() === "—" ? 0 : (t.match(/—/g) ?? []).length),
  "spaced-en-dash": (t) => (t.match(/ – /g) ?? []).length,
  "colon-joins-clauses": (t) => {
    let count = 0;
    for (const sentence of t.split(/(?<=[.?])\s+/)) {
      const at = sentence.indexOf(": ");
      if (at < 0) continue;
      const before = sentence.slice(0, at).trim().split(/\s+/);
      const after = sentence.slice(at + 2).trim();
      if (before.length >= 4 && after.split(/\s+/).length >= 4 && !LIST_AFTER_COLON.test(after)) count += 1;
    }
    return count;
  },
  // A short label, a colon and then a full sentence ("Why it matters: it moves slowly") is the lead-in pattern that reads as generated; a value after a label ("Odds: 40%") and a list are fine.
  "label-colon-sentence": (t) => {
    let count = 0;
    for (const sentence of t.split(/(?<=[.?])\s+/)) {
      const at = sentence.indexOf(": ");
      if (at < 0) continue;
      const before = sentence.slice(0, at).trim().split(/\s+/);
      const after = sentence.slice(at + 2).trim();
      if (before.length <= 3 && after.split(/\s+/).length >= 6 && /[a-z]{3}/.test(after) && /[.]$/.test(after) === false && !LIST_AFTER_COLON.test(after) && /\b(?:is|are|was|were|can|will|does|do|has|have|moves?|means?)\b/.test(after)) count += 1;
    }
    return count;
  },
  "jargon-word": (t) => (isCitation(t) ? 0 : (t.match(JARGON_RE) ?? []).length),
  semicolon: (t) => (t.split(/\s+/).length >= 6 ? (t.match(/; /g) ?? []).length : 0),
  exclamation: (t) => (t.match(/!(?!=)/g) ?? []).length,
  "staged-contrast": (t) =>
    (t.match(/\b(?:it'?s|it is|this is|that'?s|that is) not (?:just |only |merely )?[^.,;]{1,40}[,;] (?:it'?s|it is)\b|\bnot (?:just|only|merely) [^.]{1,40},? but (?:also )?\b/gi) ?? []).length,
  "repeated-word": (t) => (/<svg/.test(t) ? 0 : (t.match(/\b([A-Za-z]{2,}) \1\b/gi) ?? []).filter((m) => !/^(that that|had had)$/i.test(m)).length),
  "double-space": (t) => (t.match(/\S {2,}\S/g) ?? []).length,
  "space-before-punctuation": (t) => (t.match(/\w [,.;:?](?=\s|$)/g) ?? []).length,
  "lowercase-after-stop": (t) =>
    t.split(/(?<=\.) (?=[a-z])/).slice(0, -1).filter((head) => !ABBREVIATION.test(head) && /[a-z]{2}\.$/.test(head)).length,
};

const strings = extractAll(base, roots);
const findings = strings.flatMap((s) =>
  Object.entries(RULES).flatMap(([rule, check]) => {
    const n = check(s.text);
    return n > 0 ? [{ ...s, rule, n }] : [];
  }),
);

if (args.includes("--plain")) {
  const prefix = args[args.indexOf("--plain") + 1] ?? "";
  const rows = strings
    .filter((entry) => entry.file.startsWith(prefix) && /[a-z]{3}/.test(entry.text) && !isCitation(entry.text))
    .map((entry) => ({ entry, grade: gradeLevel(entry.text), jargon: (entry.text.match(JARGON_RE) ?? []).length, words: entry.text.split(/\s+/).length }))
    .filter((row) => row.jargon > 0 || (row.grade !== null && row.grade >= 8) || row.words >= 7)
    .sort((a, b) => b.jargon - a.jargon || (b.grade ?? 0) - (a.grade ?? 0));
  for (const row of rows) console.log(`${row.jargon ? "JARGON " : ""}g${(row.grade ?? 0).toFixed(1)}  ${row.entry.file}:${row.entry.line}  ${row.entry.text}`);
  process.exit(0);
}

// The strings a reviewer reads for one area: every prose-like string under a path prefix, with its file and line, so a rewrite works from the list and not from a search.
if (args.includes("--inventory")) {
  const prefix = args[args.indexOf("--inventory") + 1] ?? "";
  const prose = (t) => /[a-z]{3}/.test(t) && !/^[A-Za-z0-9_.\-/#:]+$/.test(t) && !/^M-?\d/.test(t) && !/<svg/.test(t);
  for (const row of strings.filter((entry) => entry.file.startsWith(prefix) && prose(entry.text))) console.log(`${row.file}:${row.line}  ${row.text}`);
  process.exit(0);
}

if (args.includes("--list")) {
  const only = args[args.indexOf("--list") + 1];
  for (const f of findings.filter((row) => !only || only.startsWith("--") || row.rule === only)) {
    console.log(`${f.file}:${f.line}  [${f.rule}]  ${f.text}`);
  }
  process.exit(0);
}

if (strings.length === 0) {
  console.error("verify-player-prose: read no player text at all; the extractor or the roots are wrong.");
  process.exit(1);
}

// Two ratchets. The first is the original baseline for the original rules in the code that shipped under them. The second holds the teaching-voice rules and everything in the universal player's directories, which are held to the full standard from the day they joined, so a rewrite wave shrinks it toward zero.
const VOICE_RULES = new Set(["label-colon-sentence", "semicolon"]);
const PLAIN_RULES = new Set(["jargon-word"]);
const LEGACY_ROOTS = ["apps/web/", "packages/ui-web/", "packages/player-core/"];
const inFirst = (f) => !VOICE_RULES.has(f.rule) && !PLAIN_RULES.has(f.rule) && (fixture || LEGACY_ROOTS.some((root) => f.file.startsWith(root)));
const tally = (rows) => {
  const out = {};
  for (const f of rows) {
    const key = `${f.file} :: ${f.rule}`;
    out[key] = (out[key] ?? 0) + f.n;
  }
  return out;
};
const VOICE_BASELINE = fixture ? null : path.join(root, "scripts/baselines/player-voice.json");
const first = holdRatchet({
  label: "verify-player-prose",
  repoRoot: fixture ? base : root,
  file: BASELINE,
  comment:
    "Player-text findings forgiven per file and rule (docs/CONTENT_DOCTRINE.md §10.2). A ratchet: it may only shrink. Rewrite the line, then run node scripts/verify-player-prose.mjs --update-baseline",
  current: tally(findings.filter(inFirst)),
  update: args.includes("--update-baseline"),
});
const second = VOICE_BASELINE
  ? holdRatchet({
      label: "verify-player-prose (teaching voice and the universal player)",
      repoRoot: root,
      file: VOICE_BASELINE,
      comment:
        "Teaching-voice findings (label-colon-sentence, semicolon) and every finding in apps/player and packages/ui, forgiven per file and rule. A ratchet: it may only shrink toward zero as the rewrite waves land (skills/player-tips). Run node scripts/verify-player-prose.mjs --update-baseline after rewriting.",
      current: tally(findings.filter((f) => !inFirst(f) && !PLAIN_RULES.has(f.rule))),
      update: args.includes("--update-baseline"),
    })
  : true;
const third = VOICE_BASELINE
  ? holdRatchet({
      label: "verify-player-prose (plain language)",
      repoRoot: root,
      file: path.join(root, "scripts/baselines/player-plain.json"),
      comment:
        "Expert and abstract words the doctrine replaces with everyday ones (docs/CONTENT_DOCTRINE.md §10.2, Plain language), forgiven per file. A ratchet: it may only shrink toward zero as the plain-language wave lands. Run node scripts/verify-player-prose.mjs --update-baseline after rewriting.",
      current: tally(findings.filter((f) => PLAIN_RULES.has(f.rule))),
      update: args.includes("--update-baseline"),
    })
  : true;
const ok = first && second && third;
const total = findings.reduce((sum, f) => sum + f.n, 0);
console.log(`verify-player-prose: ${strings.length} player string(s) read; ${total} finding(s).`);
process.exit(ok ? 0 : 1);
