const P = "docs/audits/2026-10-12-approval-model/probes/";
const B = await import(P + "design-blocs.mjs"); const SIM = await import(P + "design-sim.mjs");
const { blocApprovals, headline, gallup2025Shares, r1 } = B;
const solve = (Pp, t) => { let lo=-8,hi=8; for (let i=0;i<60;i++){const m=(lo+hi)/2; if (headline(gallup2025Shares("D"),blocApprovals({V:m,P:Pp}))<t) lo=m; else hi=m;} return (lo+hi)/2; };
for (const [name, rho] of [["war launched 2.0",2.0],["war launched 2.4",2.4],["standoff 1.4",1.4],["decisive op 1.2",1.2]]) for (const Pp of [0.85,1,1.19]) {
  const a = blocApprovals({V:solve(Pp,0.45)+rho,P:Pp}); console.log("rally", name, "P", Pp, "own-opp id gap", r1(a[0]-a[4]));
}
for (const Pp of [0.85, 1]) {
  const run = SIM.simulate({ weeks: 52, P: Pp, party: "D", baseline: 0.45, schedule: [{ week: 2, story: 1 }, { week: 10, story: 1 }, { week: 18, story: 1 }, { week: 10, inquiry: true }] });
  const m = run.reduce((lo,x)=> (x.a[0]-x.a[4] < lo.a[0]-lo.a[4] ? x : lo)); console.log("grave 3-beat scandal P", Pp, "min id gap", r1(m.a[0]-m.a[4]), "week", m.w, "headline", r1(m.headline));
}
// plain failure at low V
for (const Pp of [0.85,1]) { const a = blocApprovals({V:-3.5,P:Pp}); console.log("V -3.5 P",Pp,"gap", r1(a[0]-a[4])); }
