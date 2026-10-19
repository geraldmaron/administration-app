#!/usr/bin/env node
// Every part the design system exports is drawn somewhere a player can stand.
//
// A component nothing renders is not a component; it is a plan. The phone app
// had this gate after seven parts sat exported and unrendered while every
// other gate reported green. The web port dropped it, and the pattern came
// straight back: primitives built, tested and drawn only on /showcase.
//
// A part counts as drawn when a `<Name` render site exists in apps/web/src,
// or inside another design-system part that is itself drawn. What does not
// count: the part's own module, a test, or a route that renders only in a
// development build (`import.meta.env.DEV ? Page : NotFoundPage`) — /showcase
// is not a place a player can stand.
//
// Today's undrawn parts are forgiven in scripts/baselines/unused-primitives.json,
// a ratchet that may only shrink (scripts/baselines/ratchet.mjs): draw a part
// or delete it, and the baseline comes down with it; a new part must be drawn
// in the change that adds it.
//
//   node scripts/verify-unused-primitives.mjs                    the gate
//   node scripts/verify-unused-primitives.mjs --update-baseline  shrink the baseline
//   node scripts/verify-unused-primitives.mjs <fixture-dir>      the proof's trees:
//        ui-web/index.ts (+ modules), web/, baseline.json
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const at = (fixturePath, realPath) => path.join(base, fixture ? fixturePath : realPath);
const UI = at("ui-web", "packages/ui-web/src");
const WEB = at("web", "apps/web/src");
const BASELINE = at("baseline.json", "scripts/baselines/unused-primitives.json");

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist"].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const read = (file) => readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const moduleFile = (spec) => [".tsx", ".ts"].map((ext) => path.join(UI, spec.replace(/^\.\//, "").replace(/\.js$/, "") + ext)).find(existsSync);
/** A component name, not a constant: PascalCase with a lowercase letter in it. */
const isComponentName = (name) => /^[A-Z]/.test(name) && /[a-z]/.test(name);

/** Every component the barrel exports, with the module that defines it. */
function exportedComponents() {
  const barrel = path.join(UI, "index.ts");
  if (!existsSync(barrel)) return new Map();
  const text = read(barrel);
  const found = new Map();
  for (const [, names, spec] of text.matchAll(/export\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    const file = moduleFile(spec);
    for (const raw of names.split(",")) {
      const name = raw.trim().split(/\s+as\s+/).pop();
      if (file && name && isComponentName(name)) found.set(name, file);
    }
  }
  for (const [, spec] of text.matchAll(/export\s*\*\s*from\s*["']([^"']+)["']/g)) {
    const file = moduleFile(spec);
    if (!file) continue;
    for (const [, name] of read(file).matchAll(/export\s+(?:function|const)\s+([A-Za-z_$][\w$]*)/g)) {
      if (isComponentName(name)) found.set(name, file);
    }
  }
  return found;
}

/** A route that renders only in a development build answers a shipped build with the not-found room. */
const isDevOnly = (text) => /component:\s*import\.meta\.env\.DEV\s*\?/.test(text);
const drawsIn = (text, name) => new RegExp(`<${name}[\\s/>]`).test(text);

/** The parts drawn, to a fixed point: a part drawn only inside another part counts once that part is drawn. */
function drawnParts(components) {
  const sites = walk(WEB)
    .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => read(file))
    .filter((text) => !isDevOnly(text));
  const drawn = new Set([...components.keys()].filter((name) => sites.some((text) => drawsIn(text, name))));
  const modules = new Map([...new Set(components.values())].map((file) => [file, read(file)]));
  for (let grew = true; grew; ) {
    grew = false;
    for (const [name, owner] of components) {
      if (drawn.has(name)) continue;
      const hosts = [...modules].filter(([file, text]) => file !== owner && drawsIn(text, name));
      const hostDrawn = hosts.some(([file]) => [...components].some(([other, home]) => home === file && drawn.has(other)));
      if (hostDrawn) { drawn.add(name); grew = true; }
    }
  }
  return drawn;
}

const components = exportedComponents();
if (components.size === 0) {
  console.error("verify-unused-primitives: FAIL — the design system's barrel exports no components. A sweep with nothing to sweep is not a green run.");
  process.exit(1);
}
const drawn = drawnParts(components);
const undrawn = [...components.keys()].filter((name) => !drawn.has(name)).sort();
const held = holdRatchet({
  label: "verify-unused-primitives",
  repoRoot: root,
  file: BASELINE,
  comment:
    "Design-system parts the barrel exports and no player-reachable surface draws. Written by " +
    "`node scripts/verify-unused-primitives.mjs --update-baseline`; it may only shrink. Draw a part or delete it.",
  current: Object.fromEntries(undrawn.map((name) => [name, 1])),
  update: process.argv.includes("--update-baseline"),
  describe: (name) => `${name}${components.has(name) ? ` (${path.relative(base, components.get(name))})` : ""}`,
});
if (!held) {
  console.error(
    "\nverify-unused-primitives: FAIL — exported, tested, drawn by nobody is this repo's oldest defect class. " +
      "Draw the part on the surface it was built for, or delete it.",
  );
  process.exit(1);
}
console.log(
  `verify-unused-primitives: OK — ${components.size} exported part(s); ${drawn.size} drawn where a player can stand, ` +
    `${undrawn.length} forgiven and shrinking${undrawn.length ? ` (${undrawn.join(", ")})` : ""}.`,
);
