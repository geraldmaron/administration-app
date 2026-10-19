#!/usr/bin/env node
// Every anchor a matter's href names is an id the player draws.
//
// A notification deep-links to the component that shows it: the href ends in
// `#<anchor>`, and that component carries `id="<anchor>"`. Rename or delete the
// id and the link still opens the page, lands at the top, and nobody notices.
// This gate reads each anchor player-core appends to an href and fails when no
// id with that name exists in apps/web/src.
//
// An anchor is appended with `anchored(href, anchor)` from navigation/places.ts,
// or written as a `...#anchor` string tail. The anchor may be a string literal or
// a constant holding one. A template-built anchor (`measure-${id}`) cannot be
// read statically; it is skipped and reported so it stays visible.
//
// An id counts when it is written `id="x"`, `id={"x"}`, `id: "x"` or with a
// constant holding "x" in either spot. Test files never count, on either side.
//
//   node scripts/verify-attention-anchors.mjs                the gate
//   node scripts/verify-attention-anchors.mjs <fixture-dir>  the proof's trees:
//        player-core/ and web/
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const at = (fixturePath, realPath) => path.join(base, fixture ? fixturePath : realPath);
const PLAYER_CORE = at("player-core", "packages/player-core/src");
// The universal player is the product (DECISIONS §8.1); the frozen legacy app no longer decides whether a link lands.
const PLAYER = [at("player/src", "apps/player/src"), at("player/app", "apps/player/app"), at("ui", "packages/ui/src")];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const isSource = (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) && !/\.d\.ts$/.test(file);
const read = (file) => readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const sources = (dir) => walk(dir).filter(isSource).map((file) => ({ file, text: read(file) }));

const coreFiles = sources(PLAYER_CORE);
const webFiles = PLAYER.flatMap(sources);

/** Constants that hold one kebab-case string, which is what an anchor or an id is spelled as. */
const constants = new Map();
for (const { text } of [...coreFiles, ...webFiles]) {
  for (const [, name, value] of text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*(?::\s*[\w<>\[\]]+\s*)?=\s*["']([a-z][a-z0-9-]*)["']/g)) constants.set(name, value);
}

/** The text of a call's arguments, split at top-level commas, from the index just past its open paren. */
function callArguments(text, start) {
  const args = [];
  let depth = 0;
  let current = "";
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      for (let nested = 0; j < text.length; j++) {
        if (text[j] === "\\") { j++; continue; }
        if (ch === "`" && text[j] === "$" && text[j + 1] === "{") { nested++; j++; continue; }
        if (ch === "`" && nested > 0 && text[j] === "}") { nested--; continue; }
        if (text[j] === ch && nested === 0) break;
      }
      current += text.slice(i, j + 1);
      i = j;
      continue;
    }
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) {
      if (depth === 0) { args.push(current.trim()); return args; }
      depth--;
    }
    if (ch === "," && depth === 0) { args.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  return args;
}

/** What one anchor argument names: its string, or why it cannot be read. */
function resolve(argument) {
  const literal = /^(["'])([a-z][a-z0-9-]*)\1$/.exec(argument);
  if (literal) return { anchor: literal[2] };
  if (/^[A-Za-z_$][\w$]*$/.test(argument) && constants.has(argument)) return { anchor: constants.get(argument) };
  return { skipped: argument };
}

const anchors = new Map();
const skipped = [];
const note = (anchor, file) => anchors.set(anchor, [...(anchors.get(anchor) ?? []), path.relative(base, file)]);

for (const { file, text } of coreFiles) {
  for (const match of text.matchAll(/(?<!function\s)\banchored\(/g)) {
    const argument = callArguments(text, match.index + match[0].length)[1] ?? "";
    const { anchor, skipped: why } = resolve(argument);
    if (anchor) note(anchor, file);
    else skipped.push(`${path.relative(base, file)}: ${why}`);
  }
  for (const [, anchor] of text.matchAll(/[}\w/]#([a-z][a-z0-9-]*)(?=["'`])/g)) note(anchor, file);
}

const drawn = new Set();
for (const { text } of webFiles) {
  for (const [, , id] of text.matchAll(/(?<![\w-])id=\{?\s*(["'`])([a-z][a-z0-9-]*)\1\s*\}?/g)) drawn.add(id);
  for (const [, , id] of text.matchAll(/(?<![\w-])id:\s*(["'])([a-z][a-z0-9-]*)\1/g)) drawn.add(id);
  for (const [, name] of text.matchAll(/(?<![\w-])id(?:=\{|:\s*)([A-Za-z_$][\w$]*)\s*\}?/g)) if (constants.has(name)) drawn.add(constants.get(name));
}

if (anchors.size === 0) {
  console.error("verify-attention-anchors: FAIL — player-core names no anchor. A sweep with nothing to sweep is not a green run.");
  process.exit(1);
}

const missing = [...anchors].filter(([anchor]) => !drawn.has(anchor)).sort(([a], [b]) => a.localeCompare(b));
for (const line of skipped) console.log(`skipped (built at run time, not checked): ${line}`);
if (missing.length > 0) {
  for (const [anchor, files] of missing) console.error(`MISSING  #${anchor}  named in ${[...new Set(files)].join(", ")}`);
  console.error(
    "\nverify-attention-anchors: FAIL — a notification links to a component no page draws. " +
      "Give the component that shows the matter this id, or point the link at one that exists.",
  );
  process.exit(1);
}
console.log(`verify-attention-anchors: OK — ${anchors.size} anchor(s) named by player-core hrefs, each drawn as an id in the web player; ${skipped.length} skipped.`);
