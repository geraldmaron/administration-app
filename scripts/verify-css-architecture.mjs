#!/usr/bin/env node
// One style system, with precedence declared rather than fought for.
//
// The player's stylesheets once settled conflicts by weight: a room sheet
// loaded lazily, after the shared parts, so every author out-specified
// whoever might load later (`:root:root body`, written 2,768 times across 46
// sheets) or reached for `!important`, and a "foundation" sheet was loaded
// last to settle the rest. Which rule won depended on which route the player
// had visited first. The cascade layers declared in
// packages/design/src/layers.css replace all of that: a later layer wins over
// an earlier one whatever the selectors weigh and whenever the sheet arrives.
//
// This gate holds that architecture. In every sheet under apps/web/src,
// packages/ui-web/src and packages/design/src it counts:
//
//   weight     a `:root:root` selector, the specificity hack layers replace;
//   important  `!important` outside the states layer, where only a user
//              preference (reduced motion, forced colors) may insist;
//   unlayered  a rule in no layer, which would outrank every layer at once;
//   layer      a layer name the declaration does not list;
//   legacy     a rule in rooms.legacy, the sublayer that holds room rules
//              written before the order existed (layers.css says why); it
//              empties as each room is reconciled with the shared parts;
//   color      a literal color (hex, rgb(), hsl(), oklch() and the like, or a
//              named color) outside the tokens layer, so a hue lives in one
//              place and every other sheet names it;
//   surface    a rooms-layer rule that sets a surface (background, border,
//              radius, shadow, color) on a shared part's own class (`.ui-*`),
//              which is a room restyling a part instead of asking the part for
//              a variant.
//
// It is a ratchet (scripts/baselines/ratchet.mjs): today's findings are
// forgiven per file and kind in scripts/baselines/css-architecture.json, which
// may only shrink until it is empty.
//
//   node scripts/verify-css-architecture.mjs                    the gate
//   node scripts/verify-css-architecture.mjs --update-baseline  shrink the baseline
//   node scripts/verify-css-architecture.mjs <fixture-dir>      the proof's trees:
//        layers.css, sheets/**.css, baseline.json
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { holdRatchet } from "./baselines/ratchet.mjs";
import { layerOf, readRules } from "./lib/css-rules.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const LAYERS_FILE = fixture ? path.join(base, "layers.css") : path.join(root, "packages/design/src/layers.css");
const SCAN_ROOTS = fixture ? ["sheets"] : ["apps/web/src", "packages/ui-web/src", "packages/design/src"];
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/css-architecture.json");

const SURFACE = /^(background(-color|-image)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-(color|width|style))?|border-radius|border-(top|bottom)-(left|right)-radius|border-(start|end)-(start|end)-radius|box-shadow|color|outline(-color)?)$/;
const COLOR_FUNCTION = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const HEX = /#[0-9a-f]{3,8}\b/i;
// Named colors this tree has used. `transparent`, `currentColor`, `inherit`
// and the forced-colors system colors (Canvas, CanvasText, Highlight...) are
// not literals: they defer to something else.
const NAMED = /(^|[\s,(])(black|white|red|green|blue|yellow|orange|gray|silver|gold|navy|purple|pink|brown|cyan|magenta|teal)(?=$|[\s,)])/i;

function sheets(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === "node_modules" || name === "dist") return [];
    if (statSync(full).isDirectory()) return sheets(full);
    return name.endsWith(".css") ? [full] : [];
  });
}

function declaredLayers() {
  if (!existsSync(LAYERS_FILE)) return undefined;
  const statement = readRules(readFileSync(LAYERS_FILE, "utf8")).find((rule) => rule.statement?.startsWith("@layer"));
  return statement?.statement.replace(/^@layer\s+/, "").split(",").map((name) => name.trim());
}

/** Whether a selector's subject (its last compound) carries a shared part's own class. */
function targetsSharedPart(selector) {
  return selector.split(",").some((one) => {
    const compounds = one.trim().split(/\s*[\s>+~]\s*/);
    return /\.ui-[a-z0-9_-]+/i.test(compounds.at(-1) ?? "");
  });
}

function literalColor(value) {
  const stripped = value.replace(/url\([^)]*\)/g, "").replace(/var\(--[a-z0-9-]+/gi, "var(");
  return HEX.test(stripped) || COLOR_FUNCTION.test(stripped.replace(/color-mix\(/gi, "mix(")) || NAMED.test(stripped);
}

const layers = declaredLayers();

// The order holds only if it is the first thing the bundle says: a component's
// own stylesheet is bundled where its module is first imported, and the first
// sheet to name a layer fixes that layer's place. So the entry imports the
// declaration before anything else, the route tree included.
const ENTRY = fixture ? path.join(base, "main.tsx") : path.join(root, "apps/web/src/main.tsx");
if (existsSync(ENTRY)) {
  const firstImport = readFileSync(ENTRY, "utf8").match(/^import\s+(?:[^"';]+from\s+)?["']([^"']+)["']/m)?.[1];
  if (firstImport !== "@admin/design/layers.css") {
    console.error(`verify-css-architecture: FAIL — ${path.relative(root, ENTRY)} must import "@admin/design/layers.css" first, before any module that brings a stylesheet; its first import is "${firstImport ?? "nothing"}".`);
    process.exit(1);
  }
} else if (!fixture) {
  console.error(`verify-css-architecture: FAIL — no entry at ${path.relative(root, ENTRY)} to check the layer order against.`);
  process.exit(1);
}
if (!layers || layers.length === 0) {
  console.error(`verify-css-architecture: FAIL — read no layer order from ${path.relative(root, LAYERS_FILE)}; precedence has to be declared before it can be held.`);
  process.exit(1);
}

const files = SCAN_ROOTS.flatMap((dir) => sheets(path.join(base, dir))).filter((file) => file !== LAYERS_FILE);
if (files.length === 0) {
  console.error("verify-css-architecture: FAIL — found no stylesheets; a sweep of nothing is not a pass.");
  process.exit(1);
}

const counts = {};
const examples = {};
const note = (file, kind, line) => {
  const key = `${path.relative(base, file)}::${kind}`;
  counts[key] = (counts[key] ?? 0) + 1;
  examples[key] ??= `line ${line}`;
};

let ruleCount = 0;
for (const file of files) {
  let rules;
  try {
    rules = readRules(readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`verify-css-architecture: FAIL — ${path.relative(base, file)} does not parse: ${err.message}`);
    process.exit(1);
  }
  for (const rule of rules) {
    if (rule.statement) continue;
    const layer = layerOf(rule);
    if (layer === undefined) {
      note(file, "unlayered", rule.line);
      continue;
    }
    if (!layers.includes(layer.split(".")[0])) note(file, "layer", rule.line);
    else if (layer.includes(".")) note(file, layer === "rooms.legacy" ? "legacy" : "layer", rule.line);
    if (!rule.selector) continue;
    ruleCount += 1;
    if (rule.selector.includes(":root:root")) note(file, "weight", rule.line);
    for (const declaration of rule.declarations) {
      if (declaration.property.startsWith("--") && layer === "tokens") continue;
      if (declaration.important && layer !== "states") note(file, "important", rule.line);
      // A mask's black is coverage, not a color anyone sees.
      if (layer !== "tokens" && !declaration.property.startsWith("mask") && literalColor(declaration.value)) note(file, "color", rule.line);
      if (layer === "rooms" && SURFACE.test(declaration.property) && targetsSharedPart(rule.selector)) note(file, "surface", rule.line);
    }
  }
}

const held = holdRatchet({
  label: "verify-css-architecture",
  repoRoot: root,
  file: BASELINE,
  comment:
    "Each key is <sheet>::<kind>: weight (:root:root), important (outside the states layer), unlayered, layer " +
    "(a name layers.css does not declare), legacy (a rule in rooms.legacy), color (a literal outside the tokens " +
    "layer) or surface (a rooms rule restyling a .ui-* part). Written by `node scripts/verify-css-architecture.mjs --update-baseline`; it may only shrink.",
  current: counts,
  update: process.argv.includes("--update-baseline"),
  describe: (key) => `${key}  (first at ${examples[key] ?? "?"})`,
});
if (!held) {
  console.error(
    "\nverify-css-architecture: FAIL — put every rule in a declared layer, let the layer order decide precedence, keep " +
      "literal colors in the tokens and leave shared parts' surfaces to the parts.",
  );
  process.exit(1);
}
const forgiven = Object.values(counts).reduce((sum, count) => sum + count, 0);
console.log(
  `verify-css-architecture: OK — ${files.length} sheet(s), ${ruleCount} rule(s) in the order ${layers.join(", ")}; ` +
    `${forgiven} finding(s) forgiven and shrinking.`,
);
