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
// Rake each axis (IPF: columns to national bloc shares, rows renormalized) and measure the baseline drift.
for (const axis of COHORT_AXES) {
  const ids = cohortsOfAxis(axis).filter((c) => shares[c] !== undefined && blocsOf[c]);
  const mass = ids.reduce((s, c) => s + shares[c], 0);
  let rows = Object.fromEntries(ids.map((c) => [c, [...blocsOf[c]]]));
  const agg = () => [0,1,2,3,4].map((b) => ids.reduce((s, c) => s + shares[c] * rows[c][b], 0) / mass);
  const err0 = Math.max(...agg().map((x, b) => Math.abs(x - national[b])));
  for (let it = 0; it < 200; it++) {
    const g = agg();
    for (const c of ids) { const r = rows[c].map((x, b) => x * national[b] / g[b]); const t = r.reduce((a, b) => a + b, 0); rows[c] = r.map((x) => x / t); }
  }
  const err1 = Math.max(...agg().map((x, b) => Math.abs(x - national[b])));
  let worst = { d: 0 };
  for (const c of ids) { const d = Math.abs(vote(rows[c], V0) - eng.COHORT_PARTISAN_BASELINE[c].republican); if (d > worst.d) worst = { d, c }; }
  console.log(axis.padEnd(12), "re-agg err before", r1(err0), "after", r1(err1), "| worst baseline drift after raking", r1(worst.d), "pts", worst.c ?? "");
}
