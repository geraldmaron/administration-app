#!/usr/bin/env node
// Every rule that reads a person's disposition is listed against the axis it
// reads, in `DISPOSITION_READERS` (packages/engine/src/person-disposition.ts).
//
// The failure this exists to prevent is a double count nobody can see: one
// outcome weighing a Secretary's loyalty through a deference term and again
// through a term of its own, so a loyal chair counts twice and the reason the
// player reads names only one of the two. The registry is the budget that makes
// that visible at review time, and it is only a budget if it is complete. So
// this gate finds every `dispositionOf(...)` and `axisLean(...)` call in the
// engine, works out which axis each one reads, and fails:
//
//   - a module reading an axis it is not registered under;
//   - a call whose axis cannot be read off the call itself (destructuring the
//     whole reading, or passing the axis in a variable), because a reader the
//     gate cannot attribute is a reader the budget cannot hold;
//   - a registered module that no longer reads that axis, so the list cannot
//     go stale and pass for a budget it no longer is.
//
// It reads source rather than the built engine, so it needs no build. The
// engine's own lint forbids file reads inside packages/engine, tests included,
// which is why this scan is a gate and not a test beside the reader.
//
//   node scripts/verify-disposition-readers.mjs            the gate
//   node scripts/verify-disposition-readers.mjs <dir>      the same over another engine tree
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const ENGINE = fixture ? path.resolve(fixture) : path.join(root, "packages/engine/src");
const READER = "person-disposition.ts";

const failures = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist", "__fixtures__"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") ? [full] : [];
  });
}

const readerPath = path.join(ENGINE, READER);
if (!existsSync(readerPath)) {
  console.error(`verify-disposition-readers: no ${READER} in ${path.relative(root, ENGINE) || ENGINE}`);
  process.exit(1);
}
const readerText = readFileSync(readerPath, "utf8");

/** The axis union, read from the reader so a new axis cannot slip past the registry. */
function axesOf(text) {
  const union = text.match(/export type DispositionAxis\s*=([^;]*);/);
  if (!union) return [];
  return [...union[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

/** `DISPOSITION_READERS`, read as written: axis → the module file names listed under it. */
function registryOf(text) {
  const block = text.match(/export const DISPOSITION_READERS[^=]*=\s*\{([\s\S]*?)\};/);
  if (!block) return undefined;
  const entries = [...block[1].matchAll(/(\w+)\s*:\s*\[([^\]]*)\]/g)];
  return new Map(entries.map((match) => [match[1], [...match[2].matchAll(/"([^"]+)"/g)].map((name) => name[1])]));
}

const axes = axesOf(readerText);
const registry = registryOf(readerText);
if (axes.length === 0 || !registry) {
  console.error(
    "verify-disposition-readers: could not read DispositionAxis or DISPOSITION_READERS out of person-disposition.ts — " +
      "they were renamed or reshaped. Update this gate's expectation; do not delete the check.",
  );
  process.exit(1);
}
for (const axis of axes) if (!registry.has(axis)) failures.push(`DISPOSITION_READERS has no entry for the axis "${axis}"`);
for (const axis of registry.keys()) if (!axes.includes(axis)) failures.push(`DISPOSITION_READERS lists "${axis}", which is not a DispositionAxis`);

/** The text between the call's opening parenthesis and its matching close, and where the call ends. */
function callAt(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return { args: text.slice(open + 1, i), end: i + 1 };
    }
  }
  return undefined;
}

/** The last argument at the top level of a call's argument text. */
function lastArgument(args) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < args.length; i += 1) {
    if ("([{".includes(args[i])) depth += 1;
    else if (")]}".includes(args[i])) depth -= 1;
    else if (args[i] === "," && depth === 0) start = i + 1;
  }
  return args.slice(start).trim();
}

/** Every axis a module reads, and every call the gate could not attribute. */
function readsOf(text) {
  const reads = new Set();
  const unresolved = [];
  for (const match of text.matchAll(/\b(dispositionOf|axisLean)\(/g)) {
    const line = text.slice(0, match.index).split("\n").length;
    const call = callAt(text, match.index + match[1].length);
    if (!call) {
      unresolved.push(line);
      continue;
    }
    const axis =
      match[1] === "axisLean"
        ? lastArgument(call.args).match(/^"(\w+)"$/)?.[1]
        : text.slice(call.end).match(/^\s*(?:\?\.|\.)\s*(\w+)/)?.[1] ?? text.slice(call.end).match(/^\s*\[\s*"(\w+)"\s*\]/)?.[1];
    if (axis && axes.includes(axis)) reads.add(axis);
    else unresolved.push(line);
  }
  return { reads, unresolved };
}

const found = new Map(axes.map((axis) => [axis, new Set()]));
for (const full of walk(ENGINE)) {
  const rel = path.relative(ENGINE, full).split(path.sep).join("/");
  if (rel === READER) continue;
  const { reads, unresolved } = readsOf(readFileSync(full, "utf8"));
  for (const line of unresolved) {
    failures.push(`${rel}:${line} reads a disposition without naming the axis at the call; read one axis by name so the budget can hold it`);
  }
  for (const axis of reads) {
    found.get(axis).add(rel);
    if (!(registry.get(axis) ?? []).includes(rel)) {
      failures.push(`${rel} reads the "${axis}" axis and is not listed under it in DISPOSITION_READERS`);
    }
  }
}
for (const [axis, files] of registry) {
  for (const file of files) {
    if (!found.get(axis)?.has(file)) failures.push(`DISPOSITION_READERS lists ${file} under "${axis}", and it does not read that axis`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`verify-disposition-readers: ${failures.length} failure(s)`);
  process.exit(1);
}
const counted = [...found.entries()].map(([axis, files]) => `${axis} ${files.size}`).join(", ");
console.log(`verify-disposition-readers: ok (${axes.length} axes; readers: ${counted})`);
