#!/usr/bin/env node
// Proves verify-attention-anchors.mjs rejects an anchor no page draws, reads
// the spellings a real tree uses (a literal, a constant, a raw tail, an id
// held in a constant), skips and reports a template-built anchor, and refuses
// to report green on a run that swept nothing.
//
// Every fixture is a miniature player-core and universal player written inside the
// checkout and removed in a finally block, so no real source file is touched.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.attention-anchors-proof-${process.pid}`);

function run(target) {
  const argv = ["scripts/verify-attention-anchors.mjs", ...(target ? [target] : [])];
  try {
    return { passed: true, output: execFileSync("node", argv, { cwd: root, stdio: "pipe" }).toString() };
  } catch (err) {
    return { passed: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function writeTree(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
}

const PLACES = "export function anchored(href: string, anchor: string): string {\n  return `${href}#${anchor}`;\n}\n";
const problems = [];
function expect(label, files, wantPass, pattern) {
  writeTree(fixtureDir, files);
  const { passed, output } = run(fixtureDir);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

try {
  expect(
    "a literal anchor a page draws",
    {
      "player-core/places.ts": PLACES,
      "player-core/desk/row.ts": 'export const href = anchored("/budget", "budget-status");\n',
      "player/src/Budget.tsx": 'export const Budget = () => <section id="budget-status" />;\n',
    },
    true,
    /1 anchor\(s\)/,
  );
  expect(
    "an anchor no page draws",
    {
      "player-core/places.ts": PLACES,
      "player-core/desk/row.ts": 'export const href = anchored("/budget", "budget-status");\n',
      "player/src/Budget.tsx": 'export const Budget = () => <section id="budget-funding" />;\n',
    },
    false,
    /MISSING {2}#budget-status/,
  );
  expect(
    "an id that only a test draws",
    {
      "player-core/places.ts": PLACES,
      "player-core/desk/row.ts": 'export const href = anchored("/budget", "budget-status");\n',
      "player/src/Budget.test.tsx": 'export const Budget = () => <section id="budget-status" />;\n',
    },
    false,
    /MISSING {2}#budget-status/,
  );
  expect(
    "a constant anchor, drawn through a constant id",
    {
      "player-core/places.ts": PLACES,
      "player-core/desk/row.ts": 'export const ANCHOR = "war-powers";\nexport const href = anchored("/war", ANCHOR);\n',
      "player/src/War.tsx": 'import { ANCHOR } from "x";\nexport const War = () => <section id={ANCHOR} />;\n',
    },
    true,
    /1 anchor\(s\)/,
  );
  expect(
    "a raw tail on a path and an object-literal id",
    {
      "player-core/desk/row.ts": 'export const href = `${base}#state-governor`;\n',
      "player/src/State.tsx": 'export const sections = [{ id: "state-governor" }];\n',
    },
    true,
    /1 anchor\(s\)/,
  );
  expect(
    "a call whose first argument holds commas and parens",
    {
      "player-core/places.ts": PLACES,
      "player-core/desk/row.ts": 'export const href = anchored(subjectHref({ kind: "war", id: war.id }), "war-state");\n',
      "player/src/War.tsx": 'export const War = () => <section id="other" />;\n',
    },
    false,
    /MISSING {2}#war-state/,
  );
  expect(
    "a template-built anchor is skipped and said so",
    {
      "player-core/places.ts": PLACES,
      "player-core/desk/row.ts": 'export const a = anchored("/x", "real-id");\nexport const b = anchored("/x", `measure-${kind}`);\n',
      "player/src/X.tsx": 'export const X = () => <section id="real-id" />;\n',
    },
    true,
    /skipped \(built at run time[^\n]*measure-\$\{kind\}[\s\S]*1 skipped/,
  );
  expect("a tree that names no anchor", { "player-core/places.ts": PLACES, "player/src/X.tsx": 'export const X = () => <section id="a" />;\n' }, false, /names no anchor/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-attention-anchors-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run(undefined);
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
