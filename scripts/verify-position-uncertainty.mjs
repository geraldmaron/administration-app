#!/usr/bin/env node
// A decision has to say what could go wrong with it, on every course.
//
// Nine replies in ten in the shipped pool are positions — spoken answers with
// no roll behind them — and the decision card gated its whole "if it goes
// wrong" reading on a success chance, which a position does not have. Measured
// against the pool the app actually builds, 6.2% of replies drew a single term
// under the price: the uncertainty pillar was off-screen four weeks in five.
//
// The fix is not an invented probability. A position carries a projected
// exposure instead — the war it moves, the debt the country borrows, the force
// it spends and for how long, the capital that keeps the sentence, the states
// and cohorts that carry it — and every entry names an effect the commit really
// applies. This gate holds the resulting coverage.
//
// Runs against the built packages, not the sources, so what is measured is what
// would ship. Requires `pnpm run build` first.
import { foundOpeningCampaign, livePool, loadRuntime, measure } from "./lib/position-uncertainty.mjs";

/**
 * The share of live-pool replies that must draw at least one term.
 *
 * 73.4% at the time this landed, and the floor is set below it rather than at
 * it because the corpus moves and this gate is not a corpus lock — what it
 * exists to catch is the mechanism being removed or gated back behind a roll,
 * which takes the figure to single digits.
 *
 * The remaining quarter is honest and named: a position whose whole effect is
 * an authored metric cost and a movement in public opinion has nothing to say
 * that the price line does not already say, and inventing a line for it would
 * put words on a card that no part of the simulation answers for. Raising this
 * floor is a content change — more replies that reach for an instrument, carry
 * a financial impact, route a domestic signature, or move a foreign capital —
 * not an engine one.
 */
const FLOOR = 0.7;

const failures = [];
const pass = (message) => console.log(`OK: ${message}`);
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  failures.push(message);
};

const runtime = await loadRuntime();
const campaign = foundOpeningCampaign(runtime);
const pool = livePool(runtime);
const result = measure(runtime, campaign, pool);

// A run that measured nothing is not a pass. Every other check below divides by
// this, and a broken bake reader or a casting failure would otherwise report a
// clean sheet over an empty corpus.
if (result.replies === 0) {
  fail(`projected no replies at all from ${pool.length} scenario(s) — the pool reader or the casting path is broken, and this run checked nothing.`);
} else if (result.share < FLOOR) {
  fail(
    `only ${(result.share * 100).toFixed(1)}% of ${result.replies} live-pool replies draw a term under the price ` +
      `(${result.empty} draw none), below the ${(FLOOR * 100).toFixed(0)}% floor. ` +
      "A decision that states a price and a cabinet stance and nothing about what could go wrong is the uncertainty pillar off-screen.",
  );
} else {
  pass(
    `${(result.share * 100).toFixed(1)}% of ${result.replies} live-pool replies draw at least one term ` +
      `(${result.cast} scenarios cast; ${JSON.stringify(result.byKind)}).`,
  );
}

// The doctrine the exposure model exists to respect: a position is words, it is
// true the moment it is said, and nothing rolls against it. A success chance on
// one would be a figure the resolver never produced.
if (result.rolledPositions.length > 0) {
  fail(
    `${result.rolledPositions.length} position repl(ies) carry a success chance, which nothing rolls against: ` +
      result.rolledPositions.slice(0, 5).join(", "),
  );
} else {
  pass("no position reply quotes odds — what a spoken answer exposes is stated, never estimated.");
}

console.log(`\nProjected ${result.replies} replies across ${result.cast} cast scenarios from a ${pool.length}-scenario pool.`);
process.exitCode = failures.length === 0 ? 0 : 1;
