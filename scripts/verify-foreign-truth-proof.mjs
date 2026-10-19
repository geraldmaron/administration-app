#!/usr/bin/env node
// Proves verify-foreign-truth.mjs catches both ways the fog dies: the world
// stops hiding anything, or a screen prints what it hides.
//
// The fog half is judged on a census fixture (the counts founding produces)
// rather than by editing a built engine: the rule under proof is what the gate
// concludes from those counts, and the real founding runs last, on the real
// tree. The surface half is judged on miniature web and player-core trees,
// including the case every sweep must get right — a print inside a block that
// consults the fog is gated, not a finding.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.foreign-truth-proof-${process.pid}`);
const committedDir = path.join(root, `.foreign-truth-proof-${process.pid}-head`);
const READ_KEY = "engine:governments-read-at-founding";

function run(target, env = {}) {
  const argv = ["scripts/verify-foreign-truth.mjs", ...(target ? [target] : [])];
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

// Ten foreign governments: two of them compact partners, eight outside any
// standing body, four of those eight read. The ratchet counts the four.
const ids = (count, prefix) => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
const CENSUS = {
  foreign: 10,
  read: 6,
  ties: 40,
  fogged: 12,
  collectionFigure: "Sealed",
  compact: ids(2, "ALLY"),
  membershipReads: [],
  outside: ids(8, "OUT"),
  unread: ids(4, "HID"),
  readOutside: ids(4, "OUT"),
  adversariesRead: [],
};
const census = (overrides = {}) => JSON.stringify({ ...CENSUS, ...overrides });
const baseline = (entries) => JSON.stringify({ entries: { [READ_KEY]: 4, ...entries } });
const WORD_ONLY = 'export function Tension({ relationship }) {\n  return <p>{tensionVerdict(relationship.tension)}</p>;\n}\n';
const CLEAN = { "web/nation/Standing.tsx": WORD_ONLY, "census.json": census(), "baseline.json": baseline({}) };
const THREAT = "export function Threat({ relationship }) {\n  return <MiniReading figure={formatRatio(relationship.militaryThreat)} />;\n}\n";

const problems = [];
function expect(label, files, wantPass, pattern, env) {
  writeTree(fixtureDir, { ...CLEAN, ...files });
  const { passed, output } = run(fixtureDir, env);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

try {
  expect("a country file that reads tension as a word, over a fog that engages", {}, true, /4 of 8 governments outside a standing body/);
  expect("military threat printed to the percent for every government", { "web/nation/Threat.tsx": THREAT }, false, /NEW {2}web\/nation\/Threat\.tsx {2}:2 formatRatio\(relationship\.militaryThreat\)/);
  expect(
    "trust printed through a local, the way the country file does it",
    { "web/nation/Trust.tsx": "export function Trust({ relationship }) {\n  const trust = (relationship.trust + 1) / 2;\n  return <MiniReading figure={formatRatio(trust)} />;\n}\n" },
    false,
    /NEW {2}web\/nation\/Trust\.tsx {2}:3 formatRatio\(trust\)/,
  );
  expect(
    "the same figure behind the fog check",
    {
      "web/nation/Threat.tsx":
        'export function Threat({ campaign, id, relationship }) {\n  if (!hasIntelOnNation(campaign, id)) return <p>Not read</p>;\n  return <MiniReading figure={formatRatio(relationship.militaryThreat)} />;\n}\n',
    },
    true,
    / 0 file\(s\) print foreign scalars/,
  );
  expect(
    "a decision trait printed with toFixed",
    { "player-core/world/behavior.ts": "export function line(traits) {\n  return traits.aggression.toFixed(2);\n}\n" },
    false,
    /NEW {2}player-core\/world\/behavior\.ts/,
  );
  expect("a world where every government is read", { "census.json": census({ read: 10 }) }, false, /every foreign government is read/);
  expect(
    "more governments outside a standing body read than the baseline allows",
    { "census.json": census({ readOutside: ids(7, "OUT") }) },
    false,
    new RegExp(`NEW {2}${READ_KEY}`),
  );
  // Reading a compact partner is the ordinary business of an alliance and must
  // not move the ratchet: the same eight-outside count, with both partners read.
  expect(
    "a compact partner read at founding, which the floor must not count",
    { "census.json": census({ read: 8 }) },
    true,
    /4 of 8 governments outside a standing body/,
  );
  expect(
    "an adversary read at founding",
    { "census.json": census({ adversariesRead: ["CHN", "RUS"] }) },
    false,
    /read at founding: CHN, RUS/,
  );
  expect(
    "a compact partner unread at founding",
    { "census.json": census({ unread: [...ids(4, "HID"), "ALLY2"] }) },
    true,
    /membership alone grants no private access/,
  );
  expect(
    "membership alone exposes private government deliberations",
    { "census.json": census({ membershipReads: ["ALLY2"] }) },
    false,
    /membership alone changes private access: ALLY2/,
  );
  expect(
    "a missing membership comparison cannot pass",
    { "census.json": census({ membershipReads: undefined }) },
    false,
    /no membership-only access comparison/,
  );
  expect(
    "an unread share outside a standing body under a third",
    { "census.json": census({ readOutside: ids(6, "OUT") }), "baseline.json": baseline({ [READ_KEY]: 6 }) },
    false,
    /only 2 of 8 governments outside a standing body are unread at founding/,
  );
  expect(
    "a world where every government shares a standing body with the United States",
    { "census.json": census({ compact: ids(10, "ALLY"), outside: [], readOutside: [] }) },
    false,
    /the floor would count nothing/,
  );
  expect("the covert board printing counter-intelligence", { "census.json": census({ collectionFigure: "85%" }) }, false, /prints the target's counter-intelligence as "85%"/);
  expect("no third-party tie fogged", { "census.json": census({ fogged: 0 }) }, false, /all 40 third-party relationships are legible/);
  expect("a founding with no foreign government", { "census.json": census({ foreign: 0, read: 0 }) }, false, /checked nothing/);
  writeTree(committedDir, { [path.join(path.basename(fixtureDir), "baseline.json")]: baseline({}) });
  expect(
    "a baseline raised above the committed one to admit a print",
    { "web/nation/Threat.tsx": THREAT, "baseline.json": baseline({ "web/nation/Threat.tsx": 1 }) },
    false,
    /RAISED {2}web\/nation\/Threat\.tsx/,
    { RATCHET_COMMITTED_ROOT: committedDir },
  );
  expect("a tree that reads no foreign scalar at all", { "web/nation/Standing.tsx": "export const x = 1;\n" }, false, /scan roots or the scalar names moved/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
  rmSync(committedDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-foreign-truth-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run(undefined);
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
