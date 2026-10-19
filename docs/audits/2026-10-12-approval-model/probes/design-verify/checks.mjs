const P = "docs/audits/2026-10-12-approval-model/probes/";
const B = await import(P + "design-blocs.mjs");
const { blocApprovals, headline, gallup2025Shares, gallupView, sigma, logit, FIT, r1, r3 } = B;
const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);

// 1. bin Laden: May-average-equivalent bloc moves (rho 1.22, half-life 2 wk, averaged over weeks 0..4)
{
  const sh = gallup2025Shares("D"); const solve = (t) => { let lo=-6,hi=6; for (let i=0;i<60;i++){const m=(lo+hi)/2; if (headline(sh, blocApprovals({V:m,P:0.8}))<t) lo=m; else hi=m;} return (lo+hi)/2; };
  const V0 = solve(0.44); let acc = [0,0,0,0,0], n=0;
  for (let d=0; d<=30; d++){ const a=blocApprovals({V:V0+1.22*0.5**(d/14),P:0.8}); acc=acc.map((x,i)=>x+a[i]); n++; }
  const a0 = blocApprovals({V:V0,P:0.8}); const avg = acc.map(x=>x/n);
  console.log("1 binLaden May-avg moves by bloc (ownId..oppId):", avg.map((x,i)=>r1(x-a0[i])).join(" "), "headline", r1(headline(sh,avg)-headline(sh,a0)));
}
// 2. naive baselines for the replays (constant at the series mean, and constant at the start)
const series = {
  Watergate: [67,57,45,44,31,33,27,29,25,26,26,24],
  IranContra: [63,47,48,43,48,47,49,49,51,49],
  Lewinsky: [60,69,66,63,60,62,63,66,63,73,69,68,64,60],
  Katrina: [45,46,40,44,39,41,37,42],
  Pandemic: [49,43,49,49,39,38],
};
for (const [k, s] of Object.entries(series)) {
  const m = s.reduce((a,b)=>a+b,0)/s.length;
  console.log("2", k, "constant-mean RMSE", r3(rms(s.map(x=>x-m))), "constant-start RMSE", r3(rms(s.map(x=>x-s[0]))));
}
// Iran-Contra step: 63 then the post-break mean
{ const s=series.IranContra; const m=s.slice(1).reduce((a,b)=>a+b,0)/(s.length-1); console.log("2 IranContra step-function RMSE", r3(rms(s.map((x,i)=>i===0?0:x-m)))); }

// 3. headline-only test: solve V from the overall reading alone (2020s-scaled FIT, era P), predict own/ind/opp
const OBS = [
  ["Bush yr4","R",0.82,91,null,15,50.3],["Bush yr5","R",0.82,86,null,14,45.4],["Bush yr6","R",0.82,79,null,9,37.3],["Bush yr7","R",0.82,73,null,7,33.3],["Bush yr8","R",0.82,67,null,null,29.9],
  ["Trump yr1","R",1,83,null,8,38.3],["Trump yr2","R",1,87,36,8,40.5],["Trump Jan20","R",1,94,42,7,49],["Trump Jan21","R",1,82,30,4,34],["Biden Sep21","D",1,90,37,6,43],["Biden avg","D",1,85,39,6,42.2]];
{
  const errs = { own: [], ind: [], opp: [] };
  for (const [id, party, Pe, own, ind, opp, overall] of OBS) {
    const sh = gallup2025Shares(party); let lo=-8,hi=8; for (let i=0;i<60;i++){const m=(lo+hi)/2; if (headline(sh,blocApprovals({V:m,P:Pe}))<overall/100) lo=m; else hi=m;}
    const g = gallupView(sh, blocApprovals({V:(lo+hi)/2,P:Pe}));
    const line = [id, "own", r1(g.own)+"/"+own, "ind", r1(g.ind)+"/"+(ind??"-"), "opp", r1(g.opp)+"/"+(opp??"-")];
    errs.own.push(100*g.own-own); if (ind!=null) errs.ind.push(100*g.ind-ind); if (opp!=null) errs.opp.push(100*g.opp-opp);
    console.log("3", line.join(" "));
  }
  console.log("3 headline-only RMSE own", r3(rms(errs.own)), "ind", r3(rms(errs.ind)), "opp", r3(rms(errs.opp)));
}
// 4. consensus act: every bloc +0.15 (the per-act cap) and all blocs at the 0.30 cap, from 45 at P=1
{
  const sh = gallup2025Shares("D"); let lo=-8,hi=8; for (let i=0;i<60;i++){const m=(lo+hi)/2; if (headline(sh,blocApprovals({V:m,P:1}))<0.45) lo=m; else hi=m;} const V=(lo+hi)/2;
  for (const c of [0.15, -0.15, 0.30, -0.30]) console.log("4 uniform I_b", c, "headline 45 ->", r1(headline(sh, blocApprovals({V,P:1,I:[c,c,c,c,c]}))));
  console.log("4 pure+leaners +0.15, ids 0:", r1(headline(sh, blocApprovals({V,P:1,I:[0,0.15,0.15,0.15,0]}))));
}
// 5. Pew 2020 identifiers vs leaners at the tau fit (Pew: identifiers 94/95, R+lean 92)
{
  const sh = gallup2025Shares("R"); let lo=-8,hi=8; for (let i=0;i<60;i++){const m=(lo+hi)/2; if (headline(sh,blocApprovals({V:m,P:1}))<0.46) lo=m; else hi=m;}
  const v = B.voteIntentions(blocApprovals({V:(lo+hi)/2,P:1}));
  console.log("5 vote for incumbent by bloc ownId ownLean pure oppLean oppId:", v.map(r1).join(" "), "(Pew: R ids 94 Trump, D ids 95 Biden => 5 Trump?, independents/other 43 Trump)");
}
