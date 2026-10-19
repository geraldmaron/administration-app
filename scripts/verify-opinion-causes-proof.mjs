#!/usr/bin/env node
// Proves verify-opinion-causes.mjs refuses a judgment drawn without its
// causes, and a cause the model reports without words, rather than passing
// because today's tree is already forgiven.
//
// Each fixture is a miniature decomposition plus web and player-core trees,
// written inside the checkout and removed in a finally block. The case that
// matters most is the one the web port shipped: the approval file drawing the
// level from the metric table with no cause reader anywhere in reach.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.opinion-causes-proof-${process.pid}`);

function run(target) {
  const argv = ["scripts/verify-opinion-causes.mjs", ...(target ? [target] : [])];
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
    if (body === null) continue;
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
}

const causesFile = ({ keys = ["base", "prices"], labels = keys, reported = keys } = {}) =>
  [
    `export type OpinionCauseKey =\n${keys.map((k) => `  | "${k}"`).join("\n")};`,
    `export const OPINION_CAUSE_LABELS = {\n${labels.map((k) => `  ${k}: "The ${k}",`).join("\n")}\n};`,
    `export function terms() {\n  return [\n${reported.map((k) => `    { key: "${k}", contribution: 0.1 },`).join("\n")}\n  ];\n}`,
  ].join("\n");

const APPROVAL_WITH_CAUSES = "export function Topline({ campaign }) {\n  return <Bars rows={selectOpinionCauses(campaign)} />;\n}\n";
const APPROVAL_LEVEL_ONLY = "export function Topline({ campaign }) {\n  return <p>{campaign.player.metrics.approval}</p>;\n}\n";
const CLEAN = {
  "engine/opinion-causes.ts": causesFile(),
  "web/nation/electorate/Topline.tsx": APPROVAL_WITH_CAUSES,
  "web/brief/NowStrip.tsx": "export function NowStrip({ reading }) {\n  return <p>{heaviestCause(reading)?.detail}</p>;\n}\n",
  "baseline.json": JSON.stringify({ entries: {} }),
};

const problems = [];
function expect(label, files, wantPass, pattern) {
  writeTree(fixtureDir, { ...CLEAN, ...files });
  const { passed, output } = run(fixtureDir);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

try {
  expect("approval and the Desk both drawn with causes", {}, true, /2 cause keys all named, 2 reported/);
  expect("a cause key with no label", { "engine/opinion-causes.ts": causesFile({ labels: ["base"] }) }, false, /cause key "prices" has no label/);
  expect("a label naming no key", { "engine/opinion-causes.ts": causesFile({ labels: ["base", "prices", "weather"] }) }, false, /names "weather", which is not an OpinionCauseKey/);
  expect("a term reported outside the union", { "engine/opinion-causes.ts": causesFile({ reported: ["base", "tariffs"] }) }, false, /reported under "tariffs"/);
  expect("the approval file drawing the level alone", { "web/nation/electorate/Topline.tsx": APPROVAL_LEVEL_ONLY }, false, /NEW {2}web\/nation\/electorate\/Topline\.tsx/);
  expect(
    "a new surface drawing the six judgments without a cause",
    { "web/record/Drivers.tsx": "export function Drivers({ campaign }) {\n  return <List rows={selectOpinionReading(campaign)} />;\n}\n" },
    false,
    /NEW {2}web\/record\/Drivers\.tsx/,
  );
  expect(
    "a surface that imports the cause reader and never uses it",
    {
      "web/record/Drivers.tsx":
        'import { selectOpinionCauses } from "@admin/engine";\nexport function Drivers({ campaign }) {\n  return <List rows={selectOpinionReading(campaign)} />;\n}\n',
    },
    false,
    /NEW {2}web\/record\/Drivers\.tsx/,
  );
  expect(
    "the same surface drawing causes through a player-core reading",
    {
      "player-core/desk/opinion-causes.ts": "export function causeRows(campaign) {\n  return selectOpinionCauses(campaign).slice(0, 3);\n}\n",
      "web/record/Drivers.tsx": "export function Drivers({ campaign }) {\n  return <List rows={selectOpinionReading(campaign)} causes={causeRows(campaign)} />;\n}\n",
    },
    true,
    /3 surface\(s\) draw a level, 0 still without/,
  );
  expect(
    "a surface drawing causes through a player-core reading built on another",
    {
      "player-core/desk/opinion-causes.ts": "export function causeRows(campaign) {\n  return selectOpinionCauses(campaign).slice(0, 3);\n}\n",
      "player-core/desk/breakdown.ts": "export function breakdown(campaign) {\n  return { rows: causeRows(campaign) };\n}\n",
      "web/record/Drivers.tsx": "export function Drivers({ campaign }) {\n  return <List rows={selectOpinionReading(campaign)} causes={breakdown(campaign)} />;\n}\n",
    },
    true,
    /3 surface\(s\) draw a level, 0 still without/,
  );
  expect(
    "a player-core reading that names a cause reader only in a comment",
    {
      "player-core/desk/breakdown.ts": "// built on selectOpinionCauses, once\nexport function breakdown(campaign) {\n  return { level: campaign.player.opinion };\n}\n",
      "web/record/Drivers.tsx": "export function Drivers({ campaign }) {\n  return <List rows={selectOpinionReading(campaign)} causes={breakdown(campaign)} />;\n}\n",
    },
    false,
    /NEW {2}web\/record\/Drivers\.tsx/,
  );
  expect("the approval file moved out from under the gate", { "web/nation/electorate/Topline.tsx": null }, false, /Topline\.tsx is gone/);
  expect(
    "a baseline still forgiving a file that now draws its causes",
    { "baseline.json": JSON.stringify({ entries: { "web/nation/electorate/Topline.tsx": 1 } }) },
    false,
    /STALE {2}web\/nation\/electorate\/Topline\.tsx/,
  );
  expect("a decomposition whose union cannot be read", { "engine/opinion-causes.ts": "export const nothing = 1;\n" }, false, /anchor needs updating/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-opinion-causes-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run(undefined);
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
