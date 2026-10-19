// Fit the bloc constants to Gallup's approval-by-party record. Pure arithmetic.
// node docs/audits/2026-10-12-approval-model/probes/design-fit.mjs
import { blocApprovals, gallupView, gallup2025Shares, sigma, logit, r1, r3, caucusBreak } from "./design-blocs.mjs";

// Sources (all opened 2026-10-12):
//  G245996 news.gallup.com/poll/245996  annual Republican/Democratic approval by year in office
//  APP     presidency.ucsb.edu Gallup series (Peters), annual means computed by design (yr.mjs method: mean of polls in each year from inauguration)
//  G284156 Jan 16-29 2020; G328637 Jan 4-15 2021; G354872 Sep 1-17 2021; G655298 Biden term averages
const OBS = [
  { id: "Bush yr4", party: "R", own: 91, opp: 15, overall: 50.3 },
  { id: "Bush yr5", party: "R", own: 86, opp: 14, overall: 45.4 },
  { id: "Bush yr6", party: "R", own: 79, opp: 9, overall: 37.3 },
  { id: "Bush yr7", party: "R", own: 73, opp: 7, overall: 33.3 },
  { id: "Bush yr8", party: "R", own: 67, overall: 29.9 },
  { id: "Obama yr1", party: "D", own: 88, opp: 23 },
  { id: "Obama yr2", party: "D", own: 81, opp: 13 },
  { id: "Obama yr3", party: "D", own: 80, opp: 12 },
  { id: "Obama yr4", party: "D", own: 86, opp: 10 },
  { id: "Obama yr6", party: "D", own: 79, opp: 9 },
  { id: "Obama yr8", party: "D", own: 89, opp: 12 },
  { id: "Trump yr1", party: "R", own: 83, opp: 8, overall: 38.3 },
  { id: "Trump yr2", party: "R", own: 87, opp: 8, ind: 36, overall: 40.5 },
  { id: "Trump Jan20", party: "R", own: 94, opp: 7, ind: 42, overall: 49 },
  { id: "Trump Jan21", party: "R", own: 82, opp: 4, ind: 30, overall: 34 },
  { id: "Biden Sep21", party: "D", own: 90, opp: 6, ind: 37, overall: 43 },
  { id: "Biden avg", party: "D", own: 85, opp: 6, ind: 39, overall: 42.2 },
];
const CLINTON = { id: "Clinton yr4", party: "D", own: 85, opp: 24, overall: 55.9 };

function predict(obs, V, fit, P = 1) {
  const shares = gallup2025Shares(obs.party);
  return gallupView(shares, blocApprovals({ V, P, fit }));
}
function err(obs, V, fit, P = 1) {
  const g = predict(obs, V, fit, P);
  let e = 0;
  for (const k of ["own", "opp", "ind", "overall"]) if (obs[k] !== undefined) e += (100 * g[k] - obs[k]) ** 2;
  return e;
}
function bestV(obs, fit, P = 1) {
  let lo = -5, hi = 5;
  for (let i = 0; i < 80; i++) {
    const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
    if (err(obs, a, fit, P) < err(obs, b, fit, P)) hi = b; else lo = a;
  }
  return (lo + hi) / 2;
}
function total(fit) {
  return OBS.reduce((s, o) => s + err(o, bestV(o, fit), fit), 0);
}
let best = { loss: Infinity };
for (let G0 = 1.2; G0 <= 3.2001; G0 += 0.05)
  for (let kappa = 0; kappa <= 0.8001; kappa += 0.05)
    for (let lambda = 0.2; lambda <= 1.0001; lambda += 0.05) {
      const fit = { G0, kappa, lambda };
      const loss = total(fit);
      if (loss < best.loss) best = { loss, fit };
    }
const bestFit = { G0: r3(best.fit.G0), kappa: r3(best.fit.kappa), lambda: r3(best.fit.lambda) };
// kappa is weakly identified (see the profile printed below), so the design holds it at 0.6 with
// lambda re-fit, and rescales to the 2020s (P = 1 at the Trump-Biden era) at the end.
const fit = { G0: 2.0, kappa: 0.6, lambda: 0.65 };
const nPoints = OBS.reduce((s, o) => s + ["own", "opp", "ind", "overall"].filter((k) => o[k] !== undefined).length, 0);
console.log("BEST", JSON.stringify(bestFit), "rmse", r3(Math.sqrt(best.loss / nPoints)), "over", nPoints, "points");
console.log("CHOSEN (pooled 2004-21 scale)", JSON.stringify(fit), "rmse", r3(Math.sqrt(total(fit) / nPoints)));
console.log("obs | V | own pred/obs | ind pred/obs | opp pred/obs | overall pred/obs");
for (const o of OBS) {
  const V = bestV(o, fit);
  const g = predict(o, V, fit);
  const f = (k) => `${r1(g[k])}/${o[k] ?? "-"}`;
  console.log(o.id, "|", r3(V), "|", f("own"), "|", f("ind"), "|", f("opp"), "|", f("overall"));
}
// Era polarization: the P that best fits Clinton's fourth year with the 2020s constants.
let bestP = { loss: Infinity };
for (let P = 0.3; P <= 1.3001; P += 0.01) { const V = bestV(CLINTON, fit, P); const l = err(CLINTON, V, fit, P); if (l < bestP.loss) bestP = { loss: l, P, V }; }
const gc = predict(CLINTON, bestP.V, fit, bestP.P);
console.log("Clinton yr4 era P", r3(bestP.P), "V", r3(bestP.V), "own", r1(gc.own), "opp", r1(gc.opp), "overall", r1(gc.overall), "(obs 85/24/55.9)");
// Gap at V = 0 for identifiers, by P.
for (const P of [0.5, 0.7, 0.85, 1, 1.15]) { const a = blocApprovals({ V: 0, P, fit }); console.log("P", P, "identifier gap at V=0", r1(a[0] - a[4]), "own", r1(a[0]), "opp", r1(a[4])); }
// Valence slope by bloc at P = 1.
console.log("slopes at P=1: identifier", r3(1 - fit.kappa), "leaner", r3(1 - fit.kappa * fit.lambda), "pure 1");

// Habitual turnout, derived from Pew validated 2020: 66% turnout; voters D 50 R 48; nonvoters D 46 R 41.
const T = 0.66, NV = 0.34;
const d = { v: 0.5 * T, n: 0.46 * NV }, rr = { v: 0.48 * T, n: 0.41 * NV }, pure = { v: 0.02 * T, n: 0.13 * NV };
for (const [name, g] of [["D+lean", d], ["R+lean", rr], ["no lean", pure]]) console.log("turnout", name, r3(g.v / (g.v + g.n)), "share of eligible", r3(g.v + g.n));

// Caucus break, fitted through three anchors (ceiling 0.65 held from the engine's 1974 anchor).
// 2020: own-party approval 94 (G284156), 1 of 53 Republican senators guilty (Senate roll call 116-2 vote 33).
// 2021: own-party approval 82 (G328637), 7 of 50 guilty (roll call 117-1 vote 59).
const anchors = [[0.94, 1 / 53], [0.82, 7 / 50]];
const lg = anchors.map(([a, b]) => [a, logit(b / 0.65)]);
const k = (lg[1][1] - lg[0][1]) / (lg[0][0] - lg[1][0]);
const mid = lg[0][0] + lg[0][1] / k;
console.log("break fit k", r3(k), "mid", r3(mid));
for (const a of [0.95, 0.9, 0.85, 0.82, 0.75, 0.67, 0.62, 0.5]) console.log("own approval", a, "caucus breaking", r3(caucusBreak(a)));

// Identifiability: the loss when kappa is held at other values (G0, lambda re-fit on a coarser grid).
for (const kappa of [0.3, 0.45, 0.6, 0.75]) {
  let b = { loss: Infinity };
  for (let G0 = 1.4; G0 <= 3.0001; G0 += 0.1) for (let lambda = 0.3; lambda <= 1.0001; lambda += 0.05) {
    const l = total({ G0, kappa, lambda }); if (l < b.loss) b = { loss: l, G0, lambda };
  }
  console.log("kappa held", kappa, "rmse", r3(Math.sqrt(b.loss / nPoints)), "G0", r3(b.G0), "lambda", r3(b.lambda));
}
// Era polarization: the single P that best fits each group with the pooled constants.
const groups = { "Bush 2004-08": OBS.slice(0, 5), "Obama 2009-16": OBS.slice(5, 11), "Trump-Biden 2017-21": OBS.slice(11) };
for (const [name, list] of Object.entries(groups)) {
  let b = { loss: Infinity };
  for (let P = 0.6; P <= 1.5001; P += 0.01) { const l = list.reduce((s, o) => s + err(o, bestV(o, fit, P), fit, P), 0); if (l < b.loss) b = { loss: l, P }; }
  console.log("era", name, "P", r3(b.P));
}

// Rescale to P = 1 at the 2020s: G0 and kappa multiply by the Trump-Biden era P.
{
  const list = groups["Trump-Biden 2017-21"]; let b = { loss: Infinity };
  for (let P = 0.6; P <= 1.5001; P += 0.01) { const l = list.reduce((s, o) => s + err(o, bestV(o, fit, P), fit, P), 0); if (l < b.loss) b = { loss: l, P }; }
  const s = b.P; const f20 = { G0: r3(fit.G0 * s), kappa: r3(fit.kappa * s), lambda: fit.lambda };
  console.log("2020s-scaled constants", JSON.stringify(f20), "(era P", r3(s), ")");
  for (const P of [0.6, 0.8, 1, 1.2]) { const a = blocApprovals({ V: 0, P, fit: f20 }); console.log("2020s scale P", P, "identifier gap at V=0", r1(a[0] - a[4]), "own", r1(a[0]), "opp", r1(a[4]), "slopes id/lean", r3(1 - f20.kappa * P), r3(1 - f20.kappa * P * f20.lambda)); }
  for (const [name, list2] of Object.entries({ ...groups, "Clinton 1996": [CLINTON] })) {
    let c = { loss: Infinity };
    for (let P = 0.3; P <= 1.3001; P += 0.01) { const l = list2.reduce((t, o) => t + err(o, bestV(o, f20, P), f20, P), 0); if (l < c.loss) c = { loss: l, P }; }
    console.log("era on 2020s scale", name, "P", r3(c.P), "rmse", r3(Math.sqrt(c.loss / list2.reduce((t, o) => t + ["own","opp","ind","overall"].filter((k) => o[k] !== undefined).length, 0))));
  }
  for (const o of OBS.slice(11)) { const V = bestV(o, f20, 1); const g = predict(o, V, f20, 1); console.log("2020s", o.id, "V", r3(V), "own", r1(g.own), "/", o.own, "ind", r1(g.ind), "/", o.ind ?? "-", "opp", r1(g.opp), "/", o.opp, "overall", r1(g.overall), "/", o.overall); }
}
