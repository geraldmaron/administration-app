// Range, party asymmetry, ballot, turnout, midterms, removal, polarization and issue terms under the
// DESIGN.md model. Pure arithmetic. node docs/audits/2026-10-12-approval-model/probes/design-electorate.mjs
import { blocApprovals, headline, gallup2025Shares, pew2023VoterShares, ballotShare, voteIntentions, HABIT, caucusBreak, sigma, logit, r1, r3, FIT, BALLOT } from "./design-blocs.mjs";

const H = (party, P, V, extra = {}) => headline(gallup2025Shares(party), blocApprovals({ V, P, ...extra }));
const solveV = (party, P, target, extra = {}) => { let lo = -10, hi = 10; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (H(party, P, m, extra) < target) lo = m; else hi = m; } return (lo + hi) / 2; };

console.log("== 1. Range of the headline by valence (Gallup 2025 shares)");
for (const P of [0.85, 1, 1.19]) {
  const row = [-3.5, -3, -2, -1, 0, 1, 2, 2.5].map((V) => `${V}:${r1(H("D", P, V))}/${r1(H("R", P, V))}`);
  console.log("P", P, "V: D-pres/R-pres", row.join("  "));
}
console.log("Party asymmetry at V=0, P=1: D", r1(H("D", 1, 0)), "R", r1(H("R", 1, 0)), "(Gallup 2025: D+lean 47, R+lean 42)");
{ // mirrored shares: an R president with the D shares reads exactly what a D president reads
  const sD = gallup2025Shares("D"); const a = blocApprovals({ V: -0.7, P: 1 });
  console.log("mirror check: same shares, either party, V=-0.7:", r1(headline(sD, a)), "(identical by construction: the formula never reads party, only side)");
}

console.log("\n== 2. Ballot: party loyalty tau fitted to Pew 2020 validated vote");
// Pew (behind-bidens-2020-victory): R+lean voted 92% Trump, D+lean 94% Biden; independents/other 52-43 Biden.
// Gallup Oct 16-27 2020: Trump approval 46 (APP series). Find V for 46 at P=1 and fit tau.
{
  const V = solveV("R", 1, 0.46);
  const a = blocApprovals({ V, P: 1 });
  let best = { e: Infinity };
  for (let tau = 0; tau <= 4; tau += 0.05) {
    const v = voteIntentions(a, FIT, { tau });
    const s = gallup2025Shares("R");
    const own = (s[0] * v[0] + s[1] * v[1]) / (s[0] + s[1]);
    const opp = (s[3] * v[3] + s[4] * v[4]) / (s[3] + s[4]);
    const e = (100 * own - 92) ** 2 + (100 * opp - 6) ** 2;
    if (e < best.e) best = { e, tau, own, opp, pure: v[2] };
  }
  console.log("V", r3(V), "blocs", a.map(r1).join("/"), "tau", r3(best.tau), "own-party vote", r1(best.own), "/92", "opp-party vote for incumbent", r1(best.opp), "/6", "pure", r1(best.pure));
}
console.log("Vote share (turnout-weighted, Pew 2023 voter shares, habit turnout) by headline, P=1; today's formula 0.5+0.36(A-0.5)+0.03 for comparison");
for (const A of [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65]) {
  const cells = ["D", "R"].map((party) => { const V = solveV(party, 1, A); const a = blocApprovals({ V, P: 1 }); return r1(ballotShare(pew2023VoterShares(party), HABIT, a)); });
  console.log(`A ${A}: D-pres ${cells[0]}  R-pres ${cells[1]}  today ${r1(0.5 + 0.36 * (A - 0.5) + 0.03)}`);
}
{ // Turnout composition: +3 points on both opposition blocs' turnout, -3 on own (a mobilized opposition, a disillusioned base)
  const V = solveV("D", 1, 0.45); const a = blocApprovals({ V, P: 1 }); const s = pew2023VoterShares("D");
  const base = ballotShare(s, HABIT, a);
  const shifted = ballotShare(s, HABIT.map((h, i) => h + [-0.03, -0.03, 0, 0.03, 0.03][i]), a);
  const oppOnly = ballotShare(s, HABIT.map((h, i) => h + [0, 0, 0, 0.03, 0.03][i]), a);
  console.log("turnout: base", r1(base), "opp +3 own -3", r1(shifted), "(", r1(shifted - base), "pts )", "opp +3 only", r1(oppOnly), "(", r1(oppOnly - base), "pts) -- enters at full size, not inside a leverage");
}

console.log("\n== 3. Midterms: Gallup 1946-2014 table (news.gallup.com/poll/242093)");
const MID = [[33,-55],[39,-29],[61,-18],[57,-47],[61,-4],[44,-47],[58,-12],[54,-43],[49,-11],[42,-28],[63,-5],[58,-8],[46,-53],[66,5],[63,6],[38,-30],[45,-63],[44,-13]];
{
  const n = MID.length, mx = MID.reduce((s, r) => s + r[0], 0) / n, my = MID.reduce((s, r) => s + r[1], 0) / n;
  const b = MID.reduce((s, r) => s + (r[0] - mx) * (r[1] - my), 0) / MID.reduce((s, r) => s + (r[0] - mx) ** 2, 0);
  const f1 = (v) => v.toFixed(1);
  const rr = Math.sqrt((MID.reduce((s, r) => s + (r[0] - mx) * (r[1] - my), 0) ** 2) / (MID.reduce((s, r) => s + (r[0] - mx) ** 2, 0) * MID.reduce((s, r) => s + (r[1] - my) ** 2, 0)));
  console.log("OLS seats =", f1(my - b * mx), "+", r3(b), "x approval (r =", r3(rr) + "); at 40:", f1(my + b * (40 - mx)), "at 50:", f1(my + b * (50 - mx)), "at 60:", f1(my + b * (60 - mx)));
  // Model: midterm turnout differential d (own -d, opp +d, pure -d/2) and seats = K * 435 * 2 * (share - 0.5); fit d and K to the OLS line at 40 and 60.
  const shareAt = (A, d) => { const V = solveV("D", 1, A); const a = blocApprovals({ V, P: 1 }); return ballotShare(pew2023VoterShares("D"), HABIT.map((h, i) => h + [-d, -d, -d / 2, d, d][i]), a); };
  let best = { e: Infinity };
  for (let d = 0; d <= 0.12; d += 0.005) for (let K = 0.05; K <= 1.2; K += 0.01) {
    const s40 = K * 435 * 2 * (shareAt(0.4, d) - 0.5), s60 = K * 435 * 2 * (shareAt(0.6, d) - 0.5);
    const e = (s40 - (my + b * (40 - mx))) ** 2 + (s60 - (my + b * (60 - mx))) ** 2;
    if (e < best.e) best = { e, d, K, s40, s60 };
  }
  console.log("fit: midterm turnout differential", r3(best.d), "seat sensitivity K", r3(best.K), "(House seats per point of share:", (best.K * 8.7).toFixed(2) + ") seats at 40:", f1(best.s40), "at 60:", f1(best.s60));
  for (const A of [0.38, 0.45, 0.5, 0.55, 0.63]) { const sh = shareAt(A, best.d); console.log(`  approval ${A}: midterm share ${r1(sh)} seats ${f1(best.K * 870 * (sh - 0.5))}`); }
}

console.log("\n== 4. Removal: caucus break on own-party (identifier) approval");
for (const [id, party, P, overall, senators, guilty, observedOwn] of [
  ["Nixon Aug 1974", "R", 0.5, 0.24, 42, "resigned before a count", "Roper: R disapproval 38"],
  ["Clinton Feb 1999", "D", 0.63, 0.66, 45, "0 of 45", "-"],
  ["Trump Feb 2020", "R", 1, 0.49, 53, "1 of 53", "94 (Jan 2020)"],
  ["Trump Feb 2021", "R", 1, 0.34, 50, "7 of 50", "82 (Jan 2021)"],
]) {
  const E = id.startsWith("Nixon") ? 1 : 0;
  const V = solveV(party, P, overall, { E });
  const own = blocApprovals({ V, P, E })[0];
  console.log(id, "P", P, "overall", overall, "model own-id", r1(own), "observed own", observedOwn, "-> breaking", r3(caucusBreak(own)), "x", senators, "=", (caucusBreak(own) * senators).toFixed(1), "(record:", guilty + ")");
}
{ // Plain failure without a scandal: Bush yr8 shape at P = 1
  const V = solveV("R", 1, 0.3); const a = blocApprovals({ V, P: 1 });
  console.log("Plain failure, P=1, overall 30: own-id", r1(a[0]), "breaking", r3(caucusBreak(a[0])), "(binding only if a charge is grave)");
}

console.log("\n== 5. Polarization stock: P = P* + D, dD = c*x*(Dmax - D) [x>0] or c*x*(D - Dmin)... minus decay");
{
  const c = 0.02, Dmax = 0.25, Dmin = -0.15, k = Math.LN2 / 104;
  const step = (D, x) => { const push = x > 0 ? c * x * (Dmax - D) : x < 0 ? c * x * (D - Dmin) : 0; return D + push - k * D; };
  for (const [name, x] of [["wedge every week (x=1)", 1], ["half the weeks divisive (x=0.5)", 0.5], ["quiet (x=0)", 0], ["unifier (x=-1)", -1]]) {
    let D = 0; const marks = [];
    for (let w = 1; w <= 416; w++) { D = step(D, x); if ([26, 104, 208, 416].includes(w)) marks.push(`w${w}:${r3(1 + D)}`); }
    console.log(name, marks.join(" "));
  }
  let D = 0.19; const back = []; for (let w = 1; w <= 208; w++) { D = step(D, 0); if ([52, 104, 208].includes(w)) back.push(`w${w}:${r3(1 + D)}`); }
  console.log("reversion from 1.19 when the wedge stops:", back.join(" "));
}
for (const P of [0.85, 1, 1.19]) {
  const fl = H("D", P, -3.5), ce = H("D", P, 2.5);
  const g = blocApprovals({ V: 0, P }); console.log("P", P, "headline at V -3.5 / +2.5:", r1(fl), "/", r1(ce), "identifier gap at V=0", r1(g[0] - g[4]));
}

console.log("\n== 6. Issue agreement I_b (contested issues)");
{
  const V = solveV("D", 1, 0.45); const s = gallup2025Shares("D");
  const base = H("D", 1, V);
  const cases = [
    ["ordinary culture act: own id +0.10, own lean +0.05, pure -0.05, opp lean -0.10, opp id -0.10", [0.1, 0.05, -0.05, -0.1, -0.1]],
    ["same act, independents opposed: pure -0.15, leans -0.15", [0.1, -0.05, -0.15, -0.15, -0.1]],
    ["a term-long agenda at the per-bloc cap 0.30, independents with it", [0.3, 0.3, 0.3, -0.3, -0.3]],
    ["a term-long agenda at the cap, independents against", [0.3, 0.0, -0.3, -0.3, -0.3]],
  ];
  for (const [name, I] of cases) console.log(name, ": headline", r1(base), "->", r1(headline(s, blocApprovals({ V, P: 1, I }))), "(", r1(headline(s, blocApprovals({ V, P: 1, I })) - base), "pts )");
}
