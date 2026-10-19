#!/usr/bin/env node
// Proves verify-scenario-arc-families.mjs fails the ways it has to, and — just
// as important — does not fail the ways it must not:
//
//   1. a `tensest` reader waiting on a `closest` setter, neither in a family
//   2. the same pair in one family, which must pass
//   3. a domestic (`pick: none`) setter with a foreign reader, which must pass:
//      the narrower rule is a decision, not an oversight, and a wider one would
//      pin a scenario written about home to a foreign country
//   4. two ends declaring different families — a pair that looks bound and is not
//   5. a stale ARC_DEBT entry
//   6. a corpus with no such pair in it at all
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = path.join(root, "scripts/verify-scenario-arc-families.mjs");
const fixtureDir = path.join(root, "scripts/__arc_family_fixture_tmp__");

// Every fixture run is against an empty debt list, so a case fails or passes
// for its own shape rather than for what the real corpus still owes.
const original = readFileSync(gate, "utf8");
const debtless = original.replace(/const ARC_DEBT = \{[\s\S]*?\n\};/, "const ARC_DEBT = {};");
if (debtless === original) {
  console.error("FAIL: the proof could not find ARC_DEBT to neutralize — the gate's shape changed.");
  process.exit(1);
}

function rejects() {
  try {
    execFileSync("node", ["scripts/verify-scenario-arc-families.mjs", path.relative(root, fixtureDir)], {
      cwd: root,
      stdio: "pipe",
    });
    return false;
  } catch (err) {
    if (err.status && err.status !== 0) return true;
    throw err;
  }
}

function scenario(id, pick, { sets, waitsOn, family } = {}) {
  return {
    id,
    class: "foreign-crisis",
    severity: "serious",
    cast: pick === "band" ? { pick, powerTier: "major" } : { pick },
    conditions: waitsOn ? [{ kind: "flag", flag: waitsOn, is: true, agedAtLeast: 6 }] : [],
    weight: 1,
    replies: sets ? [{ id: "r1", text: "Do it.", sets: [sets] }] : [],
    ...(family ? { family } : {}),
  };
}

function withCorpus(defs, run) {
  mkdirSync(fixtureDir, { recursive: true });
  try {
    writeFileSync(path.join(fixtureDir, "fixture-000.jsonl"), defs.map((d) => JSON.stringify(d)).join("\n"), "utf8");
    run();
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}

const failures = [];
writeFileSync(gate, debtless);
try {
  // 1. The family contract's own example, unbound.
  withCorpus(
    [
      scenario("opener", "closest", { sets: "sealed-the-border" }),
      scenario("reader", "tensest", { waitsOn: "sealed-the-border" }),
    ],
    () => {
      if (!rejects()) failures.push("did not reject a tensest reader waiting on a closest setter with no family");
    },
  );

  // 2. The same pair, bound.
  withCorpus(
    [
      scenario("opener", "closest", { sets: "sealed-the-border", family: { id: "arc-x", role: "opener" } }),
      scenario("reader", "tensest", { waitsOn: "sealed-the-border", family: { id: "arc-x", role: "close" } }),
    ],
    () => {
      if (rejects()) failures.push("rejected a pair that is correctly bound into one family");
    },
  );

  // 3. Trouble at home, answered abroad. No foreign country was claimed by the
  // setter, so there is none to contradict. Carries a correctly bound foreign
  // pair beside it, so this case is answering the rule rather than the
  // measured-nothing refusal.
  withCorpus(
    [
      scenario("opener", "none", { sets: "hunted-the-leak" }),
      scenario("reader", "tensest", { waitsOn: "hunted-the-leak" }),
      scenario("bound-opener", "closest", { sets: "sealed-the-border", family: { id: "arc-x", role: "opener" } }),
      scenario("bound-reader", "tensest", { waitsOn: "sealed-the-border", family: { id: "arc-x", role: "close" } }),
    ],
    () => {
      if (rejects()) failures.push("rejected a domestic setter with a foreign reader, which the rule deliberately allows");
    },
  );

  // 4. Two families is no family: the reader still re-ranks.
  withCorpus(
    [
      scenario("opener", "closest", { sets: "sealed-the-border", family: { id: "arc-x", role: "opener" } }),
      scenario("reader", "tensest", { waitsOn: "sealed-the-border", family: { id: "arc-y", role: "close" } }),
    ],
    () => {
      if (!rejects()) failures.push("did not reject a pair whose two ends name different families");
    },
  );

  // 6. Nothing of the shape at all. A check that measured nothing must say so.
  withCorpus([scenario("lonely", "none", {})], () => {
    if (!rejects()) failures.push("did not refuse a corpus with no rule-cast foreign flag pair in it");
  });
} finally {
  writeFileSync(gate, original);
}

// 5. Debt for a pair that is now in a family. Written against the fixture
// corpus so the entry is provably stale rather than merely unmatched.
try {
  writeFileSync(
    gate,
    debtless.replace("const ARC_DEBT = {};", 'const ARC_DEBT = { "opener -> reader": "already bound" };'),
  );
  withCorpus(
    [
      scenario("opener", "closest", { sets: "sealed-the-border", family: { id: "arc-x", role: "opener" } }),
      scenario("reader", "tensest", { waitsOn: "sealed-the-border", family: { id: "arc-x", role: "close" } }),
    ],
    () => {
      if (!rejects()) failures.push("did not reject an ARC_DEBT entry whose pair is already in a family");
    },
  );
} finally {
  writeFileSync(gate, original);
}

if (failures.length > 0) {
  console.error(`FAIL: verify-scenario-arc-families.mjs missed ${failures.length} deliberate fixture(s):`);
  for (const f of failures) console.error(`  - it ${f}.`);
  process.exitCode = 1;
} else {
  console.log(
    "OK: verify-scenario-arc-families.mjs rejected the unbound pair, the mismatched families, the stale debt entry and the empty corpus, " +
      "and passed the bound pair and the domestic setter.",
  );
}
