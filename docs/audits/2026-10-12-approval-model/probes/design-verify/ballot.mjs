const P = "docs/audits/2026-10-12-approval-model/probes/";
const B = await import(P + "design-blocs.mjs");
const { blocApprovals, headline, gallup2025Shares, pew2023VoterShares, ballotShare, HABIT, r1 } = B;
const solve = (party, t) => { let lo=-8,hi=8; for (let i=0;i<60;i++){const m=(lo+hi)/2; if (headline(gallup2025Shares(party),blocApprovals({V:m,P:1}))<t) lo=m; else hi=m;} return (lo+hi)/2; };
for (const A of [0.4, 0.45, 0.5]) {
  const row = ["D","R"].map((p) => { const a = blocApprovals({ V: solve(p, A), P: 1 }); return [r1(ballotShare(gallup2025Shares(p), HABIT, a)), r1(ballotShare(pew2023VoterShares(p), HABIT, a))]; });
  console.log("A", A, "D-pres gallup-shares/pew-shares", row[0].join("/"), " R-pres", row[1].join("/"));
}
// Same V (same record) for both parties, Gallup shares throughout as the equation specifies
for (const V of [-1, 0]) { const a = blocApprovals({V,P:1}); console.log("same V", V, "headline D/R", r1(headline(gallup2025Shares("D"),a)), r1(headline(gallup2025Shares("R"),a)), "ballot D/R", r1(ballotShare(gallup2025Shares("D"),HABIT,a)), r1(ballotShare(gallup2025Shares("R"),HABIT,a))); }
