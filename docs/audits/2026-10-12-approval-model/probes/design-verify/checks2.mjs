const P = "docs/audits/2026-10-12-approval-model/probes/";
const B = await import(P + "design-blocs.mjs");
const SIM = await import(P + "design-sim.mjs");
const { blocApprovals, headline, gallup2025Shares, gallupView, r1, r3 } = B;
const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);

// A. Joint fit: Gulf rally (rho, h) + an economy charge (prosperity, competence co-move) over Jan 1991-Jul 1992.
const start = "01/16/1991";
const data = [["01/17/1991",82],["01/23/1991",83],["02/07/1991",79],["02/21/1991",80],["02/28/1991",89],["03/14/1991",86],["03/28/1991",82],["04/11/1991",77],["05/02/1991",74],["05/30/1991",74],["06/27/1991",72],["07/25/1991",71],["8/23/1991",74],["09/26/1991",66],["11/21/1991",52],["01/03/1992",46],["02/19/1992",39],["04/09/1992",39],["06/12/1992",37],["07/31/1992",29]];
function run(rho, h, econ) {
  const sched = [{ week: 0, rally: rho, halfLife: h }];
  if (econ) { sched.push({ week: 30, target: { prosperity: -econ, competence: -econ / 2, services: -econ / 4 }, ramp: 40 }); for (let w = 40; w <= 84; w += 8) sched.push({ week: w, salient: "economicPain" }); }
  const r = SIM.simulate({ weeks: 85, P: 0.6, party: "R", baseline: 0.61, schedule: sched });
  return data.map(([d, v]) => 100 * r[Math.min(85, Math.max(0, SIM.weeksBetween(start, d)))].headline - v);
}
let best0 = { e: Infinity }, best1 = { e: Infinity };
for (let rho = 1.0; rho <= 4.0; rho += 0.1) for (let h = 4; h <= 60; h += 2) {
  const e0 = rms(run(rho, h, 0)); if (e0 < best0.e) best0 = { e: e0, rho, h };
  for (const econ of [0.2, 0.3, 0.4, 0.5, 0.6]) { const e1 = rms(run(rho, h, econ)); if (e1 < best1.e) best1 = { e: e1, rho, h, econ }; }
}
console.log("A rally-only fit over 1991-92:", JSON.stringify(best0));
console.log("A joint rally+economy fit:", JSON.stringify(best1));
console.log("A design's (2.36, 20) with design's econ 0.2 prosperity only -> see occasions 14.0; with joint-best econ:", r3(rms(run(2.36, 20, best1.econ))));

// B. Midterm differential with a wider grid
{
  const MID = [[33,-55],[39,-29],[61,-18],[57,-47],[61,-4],[44,-47],[58,-12],[54,-43],[49,-11],[42,-28],[63,-5],[58,-8],[46,-53],[66,5],[63,6],[38,-30],[45,-63],[44,-13]];
  const n = MID.length, mx = MID.reduce((s, r) => s + r[0], 0) / n, my = MID.reduce((s, r) => s + r[1], 0) / n;
  const b = MID.reduce((s, r) => s + (r[0] - mx) * (r[1] - my), 0) / MID.reduce((s, r) => s + (r[0] - mx) ** 2, 0);
  const solveV = (A) => { let lo=-10,hi=10; for (let i=0;i<60;i++){const m=(lo+hi)/2; if (headline(gallup2025Shares("D"),blocApprovals({V:m,P:1}))<A) lo=m; else hi=m;} return (lo+hi)/2; };
  const shareAt = (A, d) => { const a = blocApprovals({ V: solveV(A), P: 1 }); return B.ballotShare(B.pew2023VoterShares("D"), B.HABIT.map((h, i) => h + [-d, -d, -d / 2, d, d][i]), a); };
  let best = { e: Infinity };
  for (let d = 0; d <= 0.25; d += 0.005) for (let K = 0.05; K <= 1.5; K += 0.01) {
    const s40 = K * 870 * (shareAt(0.4, d) - 0.5), s60 = K * 870 * (shareAt(0.6, d) - 0.5);
    const e = (s40 - (my + b * (40 - mx))) ** 2 + (s60 - (my + b * (60 - mx))) ** 2; if (e < best.e) best = { e, d, K, s40, s60 };
  }
  console.log("B midterm wider grid: d", r3(best.d), "K", r3(best.K), "seats/pt", (best.K*8.7).toFixed(2), "s40", best.s40.toFixed(1), "s60", best.s60.toFixed(1), "share at 0.45", r1(shareAt(0.45,best.d)), "at 0.63", r1(shareAt(0.63,best.d)));
  console.log("B design's d=0.115: share at A 0.38/0.45/0.63/0.66", [0.38,0.45,0.63,0.66].map(A=>r1(shareAt(A,0.115))).join("/"));
}

// C. Holdout: fit G0,kappa,lambda on Bush+Obama only (P=1 pooled), then Trump-Biden: era P fit to Trump yr1 alone, V from the overall only, predict own/ind/opp.
{
  const OBS = [["R",91,null,15,50.3],["R",86,null,14,45.4],["R",79,null,9,37.3],["R",73,null,7,33.3],["R",67,null,null,29.9],["D",88,null,23,null],["D",81,null,13,null],["D",80,null,12,null],["D",86,null,10,null],["D",79,null,9,null],["D",89,null,12,null]];
  const err = (o, V, fit, Pp) => { const g = gallupView(gallup2025Shares(o[0]), blocApprovals({ V, P: Pp, fit })); let e = 0; [["own",1],["ind",2],["opp",3],["overall",4]].forEach(([k,i]) => { if (o[i] != null) e += (100 * g[k] - o[i]) ** 2; }); return e; };
  const bestV = (o, fit, Pp) => { let lo=-6,hi=6; for (let i=0;i<70;i++){const a=lo+(hi-lo)/3,b2=hi-(hi-lo)/3; if (err(o,a,fit,Pp)<err(o,b2,fit,Pp)) hi=b2; else lo=a;} return (lo+hi)/2; };
  let best = { l: Infinity };
  for (let G0 = 1.4; G0 <= 3.0001; G0 += 0.1) for (let kappa = 0.3; kappa <= 0.9001; kappa += 0.05) for (let lambda = 0.3; lambda <= 1.0001; lambda += 0.05) {
    const fit = { G0, kappa, lambda }; const l = OBS.reduce((s, o) => s + err(o, bestV(o, fit, 1), fit, 1), 0); if (l < best.l) best = { l, fit };
  }
  console.log("C train fit (Bush+Obama):", JSON.stringify(best.fit), "train rmse", r3(Math.sqrt(best.l / 31)));
  const TEST = [["Trump yr1","R",83,null,8,38.3],["Trump yr2","R",87,36,8,40.5],["Trump Jan20","R",94,42,7,49],["Trump Jan21","R",82,30,4,34],["Biden Sep21","D",90,37,6,43],["Biden avg","D",85,39,6,42.2]];
  // era P from Trump yr1 alone
  let bp = { l: Infinity }; for (let Pp = 0.6; Pp <= 1.6; Pp += 0.01) { const o = ["R",83,null,8,38.3]; const l = err(o, bestV(o, best.fit, Pp), best.fit, Pp); if (l < bp.l) bp = { l, Pp }; }
  const e = []; for (const [id, party, own, ind, opp, overall] of TEST.slice(1)) {
    const sh = gallup2025Shares(party); let lo=-8,hi=8; for (let i=0;i<60;i++){const m=(lo+hi)/2; if (headline(sh,blocApprovals({V:m,P:bp.Pp,fit:best.fit}))<overall/100) lo=m; else hi=m;}
    const g = gallupView(sh, blocApprovals({ V: (lo+hi)/2, P: bp.Pp, fit: best.fit }));
    e.push(100*g.own-own, 100*g.ind-ind, 100*g.opp-opp);
    console.log("C test", id, "own", r1(g.own)+"/"+own, "ind", r1(g.ind)+"/"+ind, "opp", r1(g.opp)+"/"+opp);
  }
  console.log("C holdout era P", r3(bp.Pp), "holdout rmse own/ind/opp pooled", r3(rms(e)));
}
