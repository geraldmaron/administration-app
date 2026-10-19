// Fit rally size (valence units) and half-life to Gallup rally episodes, then price each class at P = 1.
// node docs/audits/2026-10-12-approval-model/probes/design-rallies.mjs
// Series: Gallup presidential job approval as compiled by the American Presidency Project
// (presidency.ucsb.edu/statistics/data/presidential-job-approval, the Google Sheet it links), opened 2026-10-12.
import { blocApprovals, headline, gallup2025Shares, r1, r3 } from "./design-blocs.mjs";
import { weeksBetween } from "./design-sim.mjs";

const EPISODES = [
  { id: "9/11 (2001)", party: "R", P: 0.8, event: "9/11/2001", baseline: 0.55, // mean of Jun-Aug 2001 readings
    data: [["09/14/2001",86],["09/21/2001",90],["10/05/2001",87],["10/19/2001",88],["11/08/2001",87],["12/06/2001",86],["01/07/2002",84],["02/04/2002",82],["03/01/2002",81],["04/05/2002",76],["05/06/2002",76],["06/07/2002",74],["07/09/2002",73],["08/05/2002",68],["09/05/2002",66]] },
  { id: "Gulf War (1991)", party: "R", P: 0.6, event: "01/16/1991", baseline: 0.61, // mean of Dec 1990-early Jan 1991
    data: [["01/17/1991",82],["01/23/1991",83],["02/07/1991",79],["02/21/1991",80],["02/28/1991",89],["03/14/1991",86],["03/28/1991",82],["04/11/1991",77],["05/02/1991",74],["05/30/1991",74],["06/27/1991",72],["07/25/1991",71],["8/23/1991",74],["09/26/1991",66]] },
  { id: "Iraq invasion (2003)", party: "R", P: 0.82, event: "03/19/2003", baseline: 0.58,
    data: [["03/22/2003",71],["03/29/2003",71],["04/14/2003",71],["05/05/2003",69],["05/19/2003",66],["06/09/2003",62],["06/27/2003",61],["07/18/2003",59],["08/04/2003",60]] },
  { id: "Iran hostages (1979)", party: "D", P: 0.55, event: "11/04/1979", baseline: 0.32,
    data: [["11/16/1979",38],["11/30/1979",51],["12/07/1979",54],["01/05/1980",56],["01/25/1980",58],["02/01/1980",55],["02/29/1980",52],["03/07/1980",43],["03/27/1980",39]] },
  { id: "Pandemic onset (2020)", party: "R", P: 1.0, event: "03/11/2020", baseline: 0.44,
    data: [["03/13/2020",49],["04/01/2020",43],["04/14/2020",49],["05/01/2020",49]] },
  // Gallup (news.gallup.com/poll/147920): April 2011 average 44, May 1-31 average 50; Gallup said it lasted about five weeks.
  { id: "bin Laden (2011)", party: "D", P: 0.8, event: "05/01/2011", baseline: 0.44,
    data: [["05/15/2011",50],["06/15/2011",45]] },
];

const H = (party, P, V) => headline(gallup2025Shares(party), blocApprovals({ V, P }));
function solveV(party, P, target) { let lo = -6, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (H(party, P, m) < target) lo = m; else hi = m; } return (lo + hi) / 2; }

const fitted = [];
for (const ep of EPISODES) {
  const V0 = solveV(ep.party, ep.P, ep.baseline);
  let best = { loss: Infinity };
  for (let rho = 0; rho <= 6; rho += 0.02) for (let h = 1; h <= 104; h += 1) {
    let loss = 0;
    for (const [d, v] of ep.data) { const t = weeksBetween(ep.event, d); loss += (100 * H(ep.party, ep.P, V0 + rho * 0.5 ** (t / h)) - v) ** 2; }
    if (loss < best.loss) best = { loss, rho, h };
  }
  const peak = H(ep.party, ep.P, V0 + best.rho) - ep.baseline;
  fitted.push({ ...ep, ...best, V0 });
  console.log(ep.id, "P", ep.P, "rho", r3(best.rho), "half-life wk", best.h, "rmse", r3(Math.sqrt(best.loss / ep.data.length)), "peak lift pts", r1(peak));
}

// The same impulses landing on a 2020s public at 45 percent (P = 1), and on a 2001 public (P = 0.8), D and R.
console.log("--- the fitted impulses on other publics, peak lift in points from 45%");
for (const ep of fitted) {
  const row = [1.0, 1.15, 0.8, 0.6].map((P) => {
    const V0 = solveV("R", P, 0.45);
    return `P${P}: +${r1(H("R", P, V0 + ep.rho) - 0.45)}`;
  });
  console.log(ep.id, row.join("  "));
}
// Bloc composition of the 9/11 rally at P = 0.8: who moved.
{
  const ep = fitted[0]; const sh = gallup2025Shares("R");
  const a0 = blocApprovals({ V: ep.V0, P: ep.P }), a1 = blocApprovals({ V: ep.V0 + ep.rho, P: ep.P });
  console.log("9/11 by bloc (ownId ownLean pure oppLean oppId) before", a0.map(r1).join(" "), "after", a1.map(r1).join(" "));
  const pB = gallup2025Shares("D"); const a2 = blocApprovals({ V: solveV("D", 0.8, 0.44), P: 0.8 }), a3 = blocApprovals({ V: solveV("D", 0.8, 0.44) + fitted[5].rho, P: 0.8 });
  console.log("bin Laden by bloc before", a2.map(r1).join(" "), "after", a3.map(r1).join(" "), "(Gallup: Republicans +4, conservative Republicans +2, overall +6)");
}
