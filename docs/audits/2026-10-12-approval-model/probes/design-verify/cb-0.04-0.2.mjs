// Blocs as a grouping of the measured cohorts: tilt the national bloc shares per cohort so each cohort
// reproduces its CES two-party baseline, check that every axis re-aggregates to the national blocs,
// derive bloc turnout from cohort habits, and route a cohort strain to bloc turnout.
// Reads the committed engine/world dist (read-only). node docs/audits/2026-10-12-approval-model/probes/design-cohort-blocs.mjs
const root = "";
const { foundedForBalance } = await import(`${root}packages/engine/dist/balance-harness.js`);
const eng = await import(`${root}packages/engine/dist/index.js`);
const { COHORT_AXES, cohortsOfAxis } = await import(`${root}packages/world/dist/index.js`);
import { blocApprovals, gallup2025Shares, voteIntentions, FIT, HABIT, r1, r3 } from "docs/audits/2026-10-12-approval-model/probes/design-blocs.mjs";

const { campaign } = foundedForBalance("balance-0", "republican");
const shares = eng.nationalCohortShares(campaign);
const national = gallup2025Shares("R"); // own = R for this probe
const piR = [1, FIT.lambda, 0, -FIT.lambda, -1];

// Neutral valence: the V at which the five blocs, at habit turnout, split the two-party vote evenly
// (the pooled 2020+2024 baseline is near even, state-cohort-sensitivity.ts comment).
const vote = (sh, V) => { const a = blocApprovals({ V, P: 1 }); const v = voteIntentions(a); const mass = sh.reduce((s, x, i) => s + x * HABIT[i], 0); return sh.reduce((s, x, i) => s + x * HABIT[i] * v[i], 0) / mass; };
let lo = -5, hi = 5; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (vote(national, m) < 0.5) lo = m; else hi = m; }
const V0 = (lo + hi) / 2;
console.log("neutral V", r3(V0), "national R vote", r3(vote(national, V0)));

const tilt = (theta) => { const w = national.map((s, i) => s * Math.exp(theta * piR[i])); const t = w.reduce((a, b) => a + b, 0); return w.map((x) => x / t); };
const blocsOf = {};
for (const cohort of Object.keys(eng.COHORT_PARTISAN_BASELINE)) {
  const target = eng.COHORT_PARTISAN_BASELINE[cohort].republican;
  let l = -6, h = 6; for (let i = 0; i < 60; i++) { const m = (l + h) / 2; if (vote(tilt(m), V0) < target) l = m; else h = m; }
  blocsOf[cohort] = tilt((l + h) / 2);
}
console.log("cohort | baseline R | R id/R lean/pure/D lean/D id");
for (const c of ["race-black", "race-white", "rural", "urban", "veteran", "age-under-35", "degree", "no-degree"]) console.log(c, "|", eng.COHORT_PARTISAN_BASELINE[c].republican, "|", blocsOf[c].map(r1).join("/"));

console.log("axis re-aggregation (max abs error against national blocs, points), and bloc turnout habit from cohort habits");
const habitByAxis = [];
for (const axis of COHORT_AXES) {
  const ids = cohortsOfAxis(axis).filter((c) => shares[c] !== undefined && blocsOf[c]);
  const mass = ids.reduce((s, c) => s + shares[c], 0);
  const agg = [0, 1, 2, 3, 4].map((b) => ids.reduce((s, c) => s + shares[c] * blocsOf[c][b], 0) / mass);
  const err = Math.max(...agg.map((x, b) => Math.abs(x - national[b])));
  const hab = [0, 1, 2, 3, 4].map((b) => ids.reduce((s, c) => s + shares[c] * blocsOf[c][b] * eng.COHORT_MOTIVATION[c].baseTurnout, 0) / ids.reduce((s, c) => s + shares[c] * blocsOf[c][b], 0));
  habitByAxis.push(hab);
  console.log(axis.padEnd(12), "err", r1(err), "habit by bloc", hab.map(r3).join("/"));
}
console.log("Pew-derived habits (design-blocs HABIT)", HABIT.join("/"));

// A strain routed to cohorts reaches blocs through turnout, summed across axes (main effects), capped per bloc.
// Example: an act that hurts rural and goods-producing households under a Democratic President.
// Cohort turnout response: mobilization of a cohort whose blocs lean against the President, disillusion of one that leans with.
const CAP = 0.04;
function blocTurnoutShift(strains, presidentParty) {
  const sideSign = presidentParty === "R" ? 1 : -1; // own side is R when the President is R
  const shift = [0, 0, 0, 0, 0];
  for (const [cohort, hurt] of Object.entries(strains)) {
    const comp = blocsOf[cohort];
    for (let b = 0; b < 5; b++) {
      const ownSide = sideSign * piR[b] > 0, oppSide = sideSign * piR[b] < 0;
      const response = ownSide ? -0.2 * hurt : oppSide ? 0.2 * hurt : (0.2/4) * hurt; // today's TURNOUT_DISILLUSION / MOBILIZATION, 0.2
      shift[b] += (shares[cohort] * comp[b] * response) / national[b];
    }
  }
  return shift.map((x) => Math.max(-CAP, Math.min(CAP, x)));
}
function cohortAxisOf(c) { return COHORT_AXES.find((axis) => cohortsOfAxis(axis).includes(c)); }
const ex = blocTurnoutShift({ rural: 0.5, "goods-producing": 0.5 }, "D");
console.log("act hurting rural and goods-producing (strain 0.5 each), D President: bloc turnout shift (R id/R lean/pure/D lean/D id)", ex.map(r3).join("/"));
// Its effect on the vote: blocs ordered for a D President are own = D, so reverse.
{
  const dShares = gallup2025Shares("D");
  const toOwnOrder = (arr) => [arr[4], arr[3], arr[2], arr[1], arr[0]];
  const a = blocApprovals({ V: -0.6, P: 1 });
  const v = voteIntentions(a);
  const t0 = HABIT, t1 = HABIT.map((h, i) => h + toOwnOrder(ex)[i]);
  const share = (t) => dShares.reduce((s, x, i) => s + x * t[i] * v[i], 0) / dShares.reduce((s, x, i) => s + x * t[i], 0);
  console.log("vote share at V=-0.6: before", r1(share(t0)), "after", r1(share(t1)), "change", r1(share(t1) - share(t0)), "pts (today's whole turnout driver read 0.001)");
}
