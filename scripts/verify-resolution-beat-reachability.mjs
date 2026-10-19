#!/usr/bin/env node
// Every authored resolution sequence must be producible by a real
// instrument x rung band x risk combination.
//
// This is the same defect class `verify-engine-reachability.mjs` catches one
// layer up: a document that clears every static schema rule and describes a
// situation no campaign can ever draw. A step sequence is keyed rather than
// conditioned, so the question has an exact answer — `unreachableSequences`
// enumerates the keys a resolution can actually emit and refuses any document
// that answers to none of them. This script is a thin wrapper around that
// function; the enumeration itself lives in
// packages/content/src/resolution-beat-reachability.ts and is not
// reimplemented here.
//
// Runs against the built package, not the sources, so what is checked is what
// would ship. Requires `pnpm run build` first.
import { loadContentModule, sequencesFromModule } from "./lib/resolution-sequence-bank.mjs";

const failures = [];
const pass = (message) => console.log(`OK: ${message}`);
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  failures.push(message);
};

const mod = await loadContentModule();
const { ResolutionSequenceDef, FIXTURE_RESOLUTION_SEQUENCES, unreachableSequences, uncoveredSituationKeys, SITUATION_KEYS } = mod;

// --- 1. Every sequence actually shipped answers to a real situation --------

const shipped = sequencesFromModule(mod);
if (shipped.length === 0) fail("found no resolution sequences at all, not even the reference fixtures — the bank scan is broken.");

const unreachable = unreachableSequences(shipped);
if (unreachable.length > 0) {
  fail(`${unreachable.length} sequence(s) claim a key no resolution can ever produce:`);
  for (const finding of unreachable) console.error(`    ${finding.id}: ${finding.claimed.join(", ")}`);
} else {
  pass(`all ${shipped.length} shipped resolution sequence(s) are reachable from a real instrument x rung band x risk combination.`);
}

const uncovered = uncoveredSituationKeys(shipped);
console.log(
  `INFO: ${uncovered.length} of ${SITUATION_KEYS.length} situation(s) have no sequence yet — informational, not a gate failure ` +
    "until the authored bank is meant to cover the full matrix.",
);

// --- 2. The proof: a deliberate branch the instrument has no such thing as -

// diplomatic resolutions carry no failure branches (RISK_IDS.diplomatic is
// empty), so naming one anyway is exactly the defect this gate exists to
// catch — the schema author's own recommended fixture for this rule.
const orphan = ResolutionSequenceDef.parse({ ...FIXTURE_RESOLUTION_SEQUENCES[0], id: "fixture-orphan-branch", instrument: "diplomatic" });
const caught = unreachableSequences([orphan]);
const proven = caught.length === 1 && caught[0].id === "fixture-orphan-branch";

if (proven) pass("the reachability rule correctly flagged a sequence naming a branch its instrument does not have.");
else fail("the reachability rule did not flag a deliberately unreachable sequence — the gate is not actually gating.");

process.exitCode = failures.length === 0 && proven ? 0 : 1;
