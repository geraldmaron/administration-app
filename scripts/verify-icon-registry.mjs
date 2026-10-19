#!/usr/bin/env node
// Every glyph in the icon set has a production binder, and every binder names
// a glyph the set has.
//
// A glyph only the registry mentions is dead weight a designer keeps drawing
// to: it is sized, stroked and reviewed, and no player ever sees it. The phone
// app swept for these; the web port dropped the sweep while the set moved to
// packages/ui-web, and ad hoc maps from domain words to glyph names grew in
// three places (the Record, the nation acts, the sidebar) with nothing holding
// them to the set.
//
// A binder is a place in apps/web/src, packages/ui-web/src (outside the set's
// own table) or packages/player-core/src that hands a glyph name to the icon
// surface: `name="x"` or `icon="x"` on a component,
// either side of a ternary in one, `icon: "x"` in an object, a map row
// `key: "x"` in a file that deals in icons, `return "x"` from a glyph chooser,
// or a default `icon = "x"`. Tests, the set's own modules and development-only
// routes (`import.meta.env.DEV ? Page : NotFoundPage`) do not count.
//
// Two rules, one ratchet. A glyph nothing binds, and an `icon:` or `<Icon
// name=` binding to a name the set lacks (the TypeScript union catches most,
// but not a player-core string typed as `string`), are both counted; today's
// are forgiven in scripts/baselines/icon-registry.json, which may only shrink
// (scripts/baselines/ratchet.mjs).
//
//   node scripts/verify-icon-registry.mjs                    the gate
//   node scripts/verify-icon-registry.mjs --update-baseline  shrink the baseline
//   node scripts/verify-icon-registry.mjs <fixture-dir>      the proof's trees:
//        ui-web/assets/icons/icon-data.ts, web/, player-core/, baseline.json
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const SCAN_ROOTS = fixture ? ["web", "player-core"] : ["apps/web/src", "packages/ui-web/src", "packages/player-core/src"];
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/icon-registry.json");

/** The set's names: the keys of the `ICONS` table. */
function iconNames() {
  const file = fixture ? path.join(base, "ui-web/assets/icons/icon-data.ts") : path.join(root, "packages/ui-web/src/assets/icons/icon-data.ts");
  if (!existsSync(file)) return [];
  const src = readFileSync(file, "utf8");
  const body = src.slice(src.indexOf("export const ICONS = {"), src.indexOf("} as const satisfies"));
  return [...body.matchAll(/^ {2}([A-Za-z][A-Za-z0-9]*):/gm)].map((m) => m[1]);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist", "__fixtures__", "assets"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/** Comments blanked line for line, so a glyph named in prose binds nothing and line numbers hold. */
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, "")).replace(/(^|[^:])\/\/.*$/gm, "$1");

const isDevOnly = (text) => /component:\s*import\.meta\.env\.DEV\s*\?/.test(text);

function binderSources() {
  return SCAN_ROOTS.flatMap((dir) => walk(path.join(base, dir)))
    .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => ({ rel: path.relative(base, file), text: stripComments(readFileSync(file, "utf8")) }))
    .filter(({ text }) => /icon|glyph/i.test(text) && !isDevOnly(text));
}

const q = `["'\`]`;
function binds(text, name) {
  return [
    new RegExp(`\\b(?:name|icon)=${q}${name}${q}`),
    new RegExp(`\\b(?:name|icon)=\\{[^}]{0,160}${q}${name}${q}`),
    new RegExp(`\\b(?:name|icon|glyph):\\s*${q}${name}${q}`),
    new RegExp(`\\breturn\\s+${q}${name}${q}`),
    new RegExp(`^\\s*${q}?[A-Za-z0-9_.-]+${q}?:\\s*${q}${name}${q}\\s*,?\\s*$`, "m"),
    new RegExp(`\\b(?:name|icon)\\s*=\\s*${q}${name}${q}`),
  ].some((pattern) => pattern.test(text));
}

/** `icon: "x"` and `<Icon name="x"` bindings to a name the set does not carry, per file. */
function unknownBindings(sources, names) {
  const known = new Set(names);
  const found = new Map();
  for (const { rel, text } of sources) {
    const literal = [...text.matchAll(/\bicon:\s*"([A-Za-z][A-Za-z0-9]*)"/g), ...text.matchAll(/<Icon\b[^>]*?\bname="([A-Za-z][A-Za-z0-9]*)"/g)];
    const misses = literal
      .filter((match) => !known.has(match[1]))
      .map((match) => `:${text.slice(0, match.index).split("\n").length} "${match[1]}"`);
    if (misses.length > 0) found.set(`unknown:${rel}`, misses);
  }
  return found;
}

const names = iconNames();
if (names.length === 0) {
  console.error("verify-icon-registry: FAIL — read no glyph names from the icon set; the table moved or changed shape, and a sweep of nothing is not a pass.");
  process.exit(1);
}
const sources = binderSources();
const unbound = names.filter((name) => !sources.some(({ text }) => binds(text, name)));
const unknown = unknownBindings(sources, names);
const held = holdRatchet({
  label: "verify-icon-registry",
  repoRoot: root,
  file: BASELINE,
  comment:
    "A bare key is a glyph in packages/ui-web's icon set that no production binder hands to the icon surface. An " +
    "`unknown:<file>` key counts that file's bindings to glyph names the set does not draw. Written by " +
    "`node scripts/verify-icon-registry.mjs --update-baseline`; it may only shrink.",
  current: {
    ...Object.fromEntries(unbound.map((name) => [name, 1])),
    ...Object.fromEntries([...unknown].map(([key, misses]) => [key, misses.length])),
  },
  update: process.argv.includes("--update-baseline"),
  describe: (key) => `${key}${unknown.has(key) ? `  ${unknown.get(key).join("; ")}` : ""}`,
});
if (!held) {
  console.error("\nverify-icon-registry: FAIL — bind every glyph the set draws, and bind only glyphs it draws.");
  process.exit(1);
}
console.log(
  `verify-icon-registry: OK — ${names.length} glyph(s) in the set, ${names.length - unbound.length} bound across ` +
    `${sources.length} binder file(s); ${unbound.length} unbound glyph(s) and ${unknown.size} file(s) binding unknown ` +
    "names, all forgiven and shrinking.",
);
