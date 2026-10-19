#!/usr/bin/env node
// The player is built from the design system, and its text is set by role.
//
// Two kinds of one-off, counted per file:
//
//   shadow      apps/player defines a component under a name packages/ui
//               already exports (a local `Fact`, `Tile`, `Section`). Two
//               things answering to one name drift apart: the same role ends
//               up with a different label size, ink or spacing depending on
//               which screen drew it. Extend the shared piece instead, or
//               name the local one for what makes it different.
//   text-style  a `<Text>` in apps/player or packages/ui passes fontSize,
//               lineHeight, fontWeight, letterSpacing, textTransform or
//               fontFamily. The ramp (`variant`) and its modifiers (`weight`,
//               `tone`, `serif`, `mono`, `tabular`) are how text is set, so one
//               role reads the same size on every surface. The theme folder,
//               which defines the ramp, is not read.
//
// Today's are forgiven per file in scripts/baselines/shared-components.json,
// a ratchet that may only shrink (scripts/baselines/ratchet.mjs).
//
//   node scripts/verify-shared-components.mjs                    the gate
//   node scripts/verify-shared-components.mjs --update-baseline  shrink the baseline
//   node scripts/verify-shared-components.mjs <fixture-dir>      the proof's tree: player/, ui/, baseline.json
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";
import { codeOf, openTags, playerFiles } from "./lib/player-jsx.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const PLAYER = fixture ? [path.join(base, "player")] : [path.join(root, "apps/player/src"), path.join(root, "apps/player/app")];
const UI = fixture ? path.join(base, "ui") : path.join(root, "packages/ui/src");
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/shared-components.json");

const TEXT_STYLE = /\s(fontSize|lineHeight|fontWeight|letterSpacing|textTransform|fontFamily)=/;
const LOCAL_COMPONENT = /^(?:export\s+)?(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*=\s*(?:\([^)]*\)|\w+)\s*=>)/gm;

/** Every component name a design-system barrel exports, aliases resolved to the exported name. */
function sharedNames() {
  const names = new Set();
  for (const file of playerFiles([UI]).filter((f) => path.basename(f) === "index.ts")) {
    for (const match of readFileSync(file, "utf8").matchAll(/export\s*\{([^}]*)\}\s*from/g)) {
      for (const part of match[1].split(",")) {
        const spec = part.trim();
        if (!spec || spec.startsWith("type ")) continue;
        const name = spec.split(/\s+as\s+/).pop();
        if (/^[A-Z][a-z]/.test(name)) names.add(name);
      }
    }
  }
  return names;
}

const shared = sharedNames();
const current = {};
const count = (kind, file, n) => {
  if (n === 0) return;
  const key = `${kind}  ${path.relative(base, file)}`;
  current[key] = (current[key] ?? 0) + n;
};

const player = playerFiles(PLAYER);
for (const file of player) {
  const code = codeOf(file);
  const shadows = [...code.matchAll(LOCAL_COMPONENT)].filter((m) => shared.has(m[1] ?? m[2]));
  count("shadow", file, shadows.length);
  count("text-style", file, openTags(code, "Text").filter((tag) => TEXT_STYLE.test(tag)).length);
}
const ui = playerFiles([UI]).filter((file) => !file.includes(`${path.sep}theme${path.sep}`));
for (const file of ui) count("text-style", file, openTags(codeOf(file), "Text").filter((tag) => TEXT_STYLE.test(tag)).length);

if (player.length === 0 || shared.size === 0) {
  console.error("verify-shared-components: FAIL — found no player source or no design-system exports; the scan roots moved and this gate is checking nothing.");
  process.exit(1);
}

const held = holdRatchet({
  label: "verify-shared-components",
  repoRoot: root,
  file: BASELINE,
  comment: "Player components shadowing a design-system export, and <Text> style overrides in apps/player and packages/ui, per file. Written by `node scripts/verify-shared-components.mjs --update-baseline`; it may only shrink.",
  current,
  update: process.argv.includes("--update-baseline"),
});

if (!held) {
  console.error('verify-shared-components: FAIL — use the shared component (or name the local one for what makes it different), and set text with variant, weight and tone instead of fontSize or fontWeight.');
  process.exit(1);
}

const total = (kind) => Object.entries(current).filter(([key]) => key.startsWith(kind)).reduce((sum, [, n]) => sum + n, 0);
console.log(`verify-shared-components: OK — ${player.length + ui.length} file(s) read against ${shared.size} shared component(s); ${total("shadow")} shadowing component(s) and ${total("text-style")} text style override(s) left (forgiven, and shrinking).`);
