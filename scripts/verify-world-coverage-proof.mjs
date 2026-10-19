#!/usr/bin/env node
// Proves verify-world-coverage.mjs refuses what it claims to. A gate that has
// only ever run against a dataset that passes it is a gate nobody has tested.
//
// The gate reads a census, so each fixture here is a census: a small roster
// that satisfies every rule, and copies of it that break exactly one thing, so
// the verdict is about that break and nothing else. The baseline must pass,
// which proves the gate does not over-fire; every break must fail. The temp
// file is removed in a finally block, and the last thing this script does is
// run the gate on the real dataset and exit with its answer.
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = path.join(root, "scripts/verify-world-coverage.mjs");
const fixturePath = path.join(tmpdir(), `world-coverage-proof-${process.pid}.json`);

const covered = (id) => ({
  id, shape: true, pin: true, flag: id.slice(0, 2).toLowerCase(), flagArtwork: true,
  nameCulture: true, heritage: true, schools: true, partySystem: true, command: true,
});

/** 160 whole governments, one territory each way, and a shape for every government. */
function baseline() {
  const ids = Array.from({ length: 160 }, (_, i) => `N${String(i).padStart(3, "0")}`);
  const nations = ids.map(covered);
  return {
    nations,
    shapes: [...ids, "TER", "DSP"],
    territories: { TER: ids[0], DSP: null },
  };
}

const edit = (mutate) => {
  const census = structuredClone(baseline());
  mutate(census);
  return census;
};

const CASES = [
  ["the untouched baseline", baseline(), true],
  ["a government with no shape and no pin", edit((c) => Object.assign(c.nations[3], { shape: false, pin: false })), false],
  ["a government drawn only as a pin", edit((c) => Object.assign(c.nations[3], { shape: false })), true],
  ["a government missing from the flag table", edit((c) => Object.assign(c.nations[4], { flag: null })), false],
  ["a flag code with no artwork", edit((c) => Object.assign(c.nations[5], { flagArtwork: false })), false],
  ["a government with no name culture", edit((c) => Object.assign(c.nations[6], { nameCulture: false })), false],
  ["a government with no heritage mix", edit((c) => Object.assign(c.nations[7], { heritage: false })), false],
  ["a government with no schools", edit((c) => Object.assign(c.nations[8], { schools: false })), false],
  ["a government with no party system", edit((c) => Object.assign(c.nations[9], { partySystem: false })), false],
  ["a government with no combatant command", edit((c) => Object.assign(c.nations[10], { command: false })), false],
  ["a map shape nobody accounts for", edit((c) => c.shapes.push("ZZZ")), false],
  ["a territory whose administrator is off the roster", edit((c) => { c.territories.TER = "NOPE"; }), false],
  ["a census too small to mean anything", edit((c) => { c.nations = c.nations.slice(0, 20); c.shapes = c.nations.map((n) => n.id); c.territories = {}; }), false],
];

function run(census) {
  writeFileSync(fixturePath, JSON.stringify(census));
  try {
    execFileSync("node", [gate], { env: { ...process.env, WORLD_COVERAGE_FIXTURE_PATH: fixturePath }, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

let wrong = 0;
try {
  for (const [label, census, shouldPass] of CASES) {
    const passed = run(census);
    const ok = passed === shouldPass;
    if (!ok) wrong += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${label}: gate ${passed ? "passed" : "refused"} (expected ${shouldPass ? "pass" : "refusal"})`);
  }
} finally {
  rmSync(fixturePath, { force: true });
}
if (wrong > 0) {
  console.error(`\nverify-world-coverage-proof: ${wrong} case(s) did not get the verdict they should.`);
  process.exit(1);
}
console.log("\nEvery break refused, the baseline passed. Running the gate on the real dataset:");
execFileSync("node", [gate], { stdio: "inherit" });
