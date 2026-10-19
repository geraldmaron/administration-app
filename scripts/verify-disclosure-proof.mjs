#!/usr/bin/env node
// Proves verify-disclosure.mjs fails the prints it exists to catch, rather than
// passing because today's tree is already forgiven.
//
// Each fixture is a miniature web + player-core tree with its own baseline,
// written inside the checkout (so the ratchet's path to a staged HEAD resolves)
// and removed in a finally block. The regressions are the ones the web port
// actually shipped: the roster's `formatRatio(seat.holder.loyalty)`, the same
// figure through Math.round, the dossier's `person[key]` loop, and a toFixed.
// The innocent case matters as much: a formatRatio over a figure that is not a
// person attribute, in a file that reads loyalty as a word, must pass.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.disclosure-proof-${process.pid}`);
const committedDir = path.join(root, `.disclosure-proof-${process.pid}-head`);

function run(target, env = {}) {
  const argv = ["scripts/verify-disclosure.mjs", ...(target ? [target] : [])];
  try {
    return { passed: true, output: execFileSync("node", argv, { cwd: root, stdio: "pipe", env: { ...process.env, ...env } }).toString() };
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

const problems = [];
function expect(label, files, wantPass, pattern, env) {
  writeTree(fixtureDir, files);
  const { passed, output } = run(fixtureDir, env);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

const baseline = (entries) => JSON.stringify({ entries });
const WORDS_ONLY = "export function loyaltyLine(seat) {\n  return loyaltyWord(seat.holder.loyalty);\n}\n";
const ROSTER = "export function Seat({ seat }) {\n  return <MiniReading figure={formatRatio(seat.holder.loyalty)} />;\n}\n";

try {
  expect("a tree that reads loyalty only as a word", { "web/government/Roster.tsx": WORDS_ONLY }, true, /OK — 1 file\(s\)/);
  expect("the roster's formatRatio(seat.holder.loyalty), reintroduced", { "web/government/Roster.tsx": ROSTER }, false, /NEW {2}web\/government\/Roster\.tsx {2}:2 formatRatio\(seat\.holder\.loyalty\)/);
  expect(
    "the same figure through Math.round",
    { "web/oversight/Board.tsx": "export function line(row) {\n  return `Competence ${Math.round(row.chair.competence * 100)}`;\n}\n" },
    false,
    /NEW {2}web\/oversight\/Board\.tsx/,
  );
  expect(
    "the dossier's person[key] loop, printed through a local",
    { "player-core/dossier/profile.ts": "export function reading(person, key) {\n  const value = person[key];\n  return { figure: formatRatio(value) };\n}\n" },
    false,
    /NEW {2}player-core\/dossier\/profile\.ts {2}:3 formatRatio\(value\)/,
  );
  expect(
    "a toFixed straight off the attribute",
    { "web/dossier/Row.tsx": "export function Row({ person }) {\n  return <span>{person.integrity.toFixed(2)}</span>;\n}\n" },
    false,
    /NEW {2}web\/dossier\/Row\.tsx/,
  );
  expect(
    "an unrelated formatRatio beside a loyalty word",
    { "web/government/Roster.tsx": `${WORDS_ONLY}export function odds(entry) {\n  return formatRatio(entry.challengeChance);\n}\n` },
    true,
    /0 figure print\(s\)/,
  );
  expect("a print the baseline forgives", { "web/government/Roster.tsx": ROSTER, "baseline.json": baseline({ "web/government/Roster.tsx": 1 }) }, true, /1 figure print\(s\) in 1 file/);
  expect(
    "a baseline that forgives more than the tree still prints",
    { "web/government/Roster.tsx": ROSTER, "baseline.json": baseline({ "web/government/Roster.tsx": 2 }) },
    false,
    /STALE {2}web\/government\/Roster\.tsx/,
  );
  writeTree(committedDir, { [path.join(path.basename(fixtureDir), "baseline.json")]: baseline({}) });
  expect(
    "a baseline raised above the committed one to admit a new print",
    { "web/government/Roster.tsx": ROSTER, "baseline.json": baseline({ "web/government/Roster.tsx": 1 }) },
    false,
    /RAISED {2}web\/government\/Roster\.tsx/,
    { RATCHET_COMMITTED_ROOT: committedDir },
  );
  expect("a tree with no person attribute in it", { "web/Empty.tsx": "export const x = 1;\n" }, false, /disarmed rule/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
  rmSync(committedDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-disclosure-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run(undefined);
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
