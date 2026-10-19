#!/usr/bin/env node
// Proves verify-american-spelling.mjs fails the ways it is supposed to, rather
// than passing because today's tree happens to be clean.
//
// The register family is the half this proof exists for. The stem family has
// been in the tree long enough that its shape is obvious from a grep; the
// register rule is the one with judgment in it — it is matched in code only, in
// named roots only, and "cyclone" only in its prose forms — and every one of
// those three carves out a way for the rule to go quiet without anybody
// noticing. So each carve-out has a case that must be refused and a case that
// must pass.
//
//   1. "autumn" in a string a player would read
//   2. "a fortnight" in the same place
//   3. "a cyclone" on US ground
//   4. "cyclones", the plural, which is never an identifier
//   5. all three in a line comment, which must PASS: a doc comment is not copy
//   6. `cyclone` as the hazard identifier, which must PASS in every form the
//      enum, the exposure field and the exhaustive tables actually use it in
//   7. a British stem, so the older family is proven to still fire, and a
//      stem straddling a camelCase hump, which must PASS
//   8. the same violation outside the register roots, which must PASS
//   9. a run that reports clean while having scanned nothing
//
// Every case is scoped to its own fixture path, so the proof answers for the
// gate rather than for whatever the working tree owes today.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = "scripts/verify-american-spelling.mjs";

const failures = [];

function run(target) {
  try {
    const out = execFileSync("node", target ? [gate, target] : [gate], { cwd: root, stdio: "pipe" });
    return { ok: true, out: String(out) };
  } catch (err) {
    if (err.status && err.status !== 0) return { ok: false, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

/**
 * Runs the gate with one fixture file in place, and always removes it.
 *
 * The fixture goes inside a real scanned root rather than a temp directory
 * outside the tree, because which roots are scanned is exactly what half these
 * cases are about.
 */
function withFixture(dir, name, body, check) {
  const full = path.join(root, dir);
  mkdirSync(full, { recursive: true });
  try {
    writeFileSync(path.join(full, name), body);
    // Scoped to the fixture directory, so the case answers for the gate and not
    // for whatever a sibling workstream's file owes the tree today.
    check(run(dir));
  } finally {
    rmSync(full, { recursive: true, force: true });
  }
}

const ENGINE_FIXTURE = "packages/engine/src/__spelling_fixture_tmp__";
const SCRIPT_FIXTURE = "scripts/__spelling_fixture_tmp__";

function refuses(label, dir, body, word) {
  withFixture(dir, "fixture.ts", body, (result) => {
    if (result.ok) failures.push(`did not refuse ${label}`);
    else if (!result.out.includes(word)) failures.push(`refused ${label} without naming "${word}"`);
  });
}

function accepts(label, dir, body) {
  withFixture(dir, "fixture.ts", body, (result) => {
    if (!result.ok) failures.push(`refused ${label}, which is correct English or a correct identifier`);
  });
}

// 1-4. The register, in copy.
refuses("\"autumn\" in player-facing copy", ENGINE_FIXTURE, 'export const line = "The Secretary was charged in autumn.";\n', "autumn");
refuses("\"a fortnight\" in player-facing copy", ENGINE_FIXTURE, 'export const line = "The bill sat for a fortnight.";\n', "fortnight");
refuses("\"a cyclone\" on US ground", ENGINE_FIXTURE, 'export const line = "Florida is struck by a cyclone.";\n', "cyclone");
refuses("the plural \"cyclones\"", ENGINE_FIXTURE, 'export const line = "Two cyclones made landfall.";\n', "cyclones");

// 5. The same words where an engineer wrote them to another engineer.
accepts(
  "the register in a comment",
  ENGINE_FIXTURE,
  `// A bad fortnight in autumn, and a cyclone is not what we call it here.
/* Two cyclones, a fortnight apart, in autumn. */
export const rate = 0.5;
`,
);

// 6. The identifier, in every shape the codebase actually holds it in.
accepts(
  "cyclone as the hazard identifier",
  ENGINE_FIXTURE,
  `export const exposure = { cyclone: 0.25 } as const;
export const kinds = ["cyclone", "wildfire"] as const;
export const eligibility: Record<string, readonly string[]> = { cyclone: ["FL"] };
export function isCyclone(kind: string) { return kind === "cyclone"; }
`,
);

// 7. The older family, proven to still fire through the same run.
refuses("a British stem", ENGINE_FIXTURE, 'export const token = "colour-ground-base";\n', "colour");

// 7b. A stem the case-blind pattern finds across a camelCase hump is two words, not a misspelling;
// the same stem capitalized at the start of a word still is one.
accepts("a stem straddling a camelCase hump", ENGINE_FIXTURE, 'export const kind = "crimeTrend";\nexport function crimeTrendOf() { return 0; }\n');
refuses("a capitalized British stem", ENGINE_FIXTURE, 'export const line = "Metres of fence went up overnight.";\n', "Metre");

// 8. Out of the register roots: test scaffolding nobody reads is not copy.
accepts("the register outside the player-facing roots", SCRIPT_FIXTURE, 'export const line = "in autumn, a fortnight after the cyclone";\n');

// 9. The way this class of gate goes quiet: a clean report over nothing.
const empty = run("scripts/__spelling_empty_tmp__");
if (empty.ok) failures.push("reported clean after reading no files at all");
else if (!/scanned nothing/.test(empty.out)) failures.push("refused an empty run without saying it read nothing");

if (failures.length > 0) {
  console.error(`verify-american-spelling-proof: ${failures.length} failure(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("OK: verify-american-spelling refuses the register and the stems, and leaves comments and identifiers alone.");
