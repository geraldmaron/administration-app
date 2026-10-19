#!/usr/bin/env node
// The proof for verify-position-uncertainty: the coverage rule fails a
// deliberately bare pool, catches a position that acquired odds, and refuses a
// run that measured nothing.
//
// Same reason every gate in this repo has one. A check that only ever runs
// against a tree that already passes is a check nobody has seen work, and the
// failure mode here is quiet: strip the exposure model out and the gate reports
// a share it computed from an empty reading rather than an error.
//
// Runs against the built packages. Requires `pnpm run build` first.
import { foundOpeningCampaign, livePool, loadRuntime, measure, termsFor } from "./lib/position-uncertainty.mjs";

const FLOOR = 0.7;

const failures = [];
const pass = (message) => console.log(`OK: ${message}`);
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  failures.push(message);
};

const runtime = await loadRuntime();
const campaign = foundOpeningCampaign(runtime);
const home = campaign.founding.nation;

/**
 * A scenario whose every answer is words that move nothing but the
 * administration's own readings — no financial impact, no domestic routing, no
 * foreign counterpart, no force spent. This is exactly the shape the whole
 * corpus had before the exposure model existed, so a gate that passes it is a
 * gate that would have passed the defect.
 */
function bareScenario(id) {
  const words = (suffix, tone, standing) => ({
    id: `${id}-${suffix}`,
    tone,
    text: `We answer ${suffix}.`,
    commitment: {
      kind: "position",
      cost: { standing },
      remembered: `The administration answered ${suffix}.`,
    },
  });
  return {
    id,
    counterpart: home,
    subject: "A week with nothing in it",
    opening: [{ speaker: { kind: "narrator" }, text: "The room waits." }],
    options: [words("plainly", "principled", -0.02), words("carefully", "evasive", -0.01)],
  };
}

// These fixtures are already bound to the board, so the casting step is the
// identity — everything after it is the gate's own reading, unmodified.
const alreadyCast = (_campaign, script) => ({ script });

// --- 1. A bare pool must fail the floor -------------------------------------

const bare = measure(runtime, campaign, [bareScenario("proof-bare-a"), bareScenario("proof-bare-b")], alreadyCast);
if (bare.replies === 0) {
  fail("the bare fixture projected no replies, so the floor was never exercised.");
} else if (bare.share >= FLOOR) {
  fail(
    `a pool of position replies that expose nothing measured ${(bare.share * 100).toFixed(1)}% coverage, at or above the ` +
      `${(FLOOR * 100).toFixed(0)}% floor — the gate cannot detect the defect it was written for.`,
  );
} else {
  pass(`a pool whose replies expose nothing measures ${(bare.share * 100).toFixed(1)}%, below the floor, and would fail the gate.`);
}

// --- 2. A real reply must still be read as covered ---------------------------

const real = measure(runtime, campaign, livePool(runtime));
if (real.share < FLOOR) {
  fail(
    `the live pool measures ${(real.share * 100).toFixed(1)}%, below the floor — either the exposure model regressed or this ` +
      "proof is comparing against a broken reading. Both halves must be checkable, or a gate that fails everything looks strict.",
  );
} else {
  pass(`the live pool measures ${(real.share * 100).toFixed(1)}%, so the rule distinguishes a covered pool from a bare one.`);
}

// --- 3. An empty corpus must not read as a pass ------------------------------

const nothing = measure(runtime, campaign, []);
if (nothing.replies !== 0) {
  fail("measuring an empty pool produced replies, so the checked-nothing guard cannot be trusted.");
} else if (nothing.share !== 0) {
  fail(`measuring an empty pool reported a ${(nothing.share * 100).toFixed(1)}% share rather than refusing — a run that checked nothing must never read as coverage.`);
} else {
  pass("an empty pool measures zero replies and zero coverage, which the gate refuses rather than passes.");
}

// --- 4. Odds on a spoken answer must be caught -------------------------------

const rolled = { available: true, cost: {}, successChance: 0.4, risks: [], ripples: [], rippleVisibility: "always" };
if (termsFor(rolled).length !== 0) {
  fail("the term reading counts a bare odds figure as a term, so a card with nothing but a percentage would read as covered.");
} else {
  pass("odds alone are not a term: the reading counts what could go wrong, not what the chance of it is.");
}

process.exitCode = failures.length === 0 ? 0 : 1;
