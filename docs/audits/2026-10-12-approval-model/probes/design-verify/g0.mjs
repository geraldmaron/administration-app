const P = "docs/audits/2026-10-12-approval-model/probes/";
const { blocApprovals, gallupView, gallup2025Shares, r3 } = await import(P + "design-blocs.mjs");
const OBS = [["R",91,null,15,50.3],["R",86,null,14,45.4],["R",79,null,9,37.3],["R",73,null,7,33.3],["R",67,null,null,29.9],["D",88,null,23,null],["D",81,null,13,null],["D",80,null,12,null],["D",86,null,10,null],["D",79,null,9,null],["D",89,null,12,null],["R",83,null,8,38.3],["R",87,36,8,40.5],["R",94,42,7,49],["R",82,30,4,34],["D",90,37,6,43],["D",85,39,6,42.2]];
function err(o, V, fit) { const g = gallupView(gallup2025Shares(o[0]), blocApprovals({ V, P: 1, fit })); let e = 0; [["own",1],["ind",2],["opp",3],["overall",4]].forEach(([k,i]) => { if (o[i] != null) e += (100*g[k]-o[i])**2; }); return e; }
function bestV(o, fit) { let lo=-6,hi=6; for (let i=0;i<70;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3; if (err(o,a,fit)<err(o,b,fit)) hi=b; else lo=a;} return (lo+hi)/2; }
const tot = (fit) => OBS.reduce((s,o)=>s+err(o,bestV(o,fit),fit),0);
for (const G0 of [1.6,1.8,1.9,2.0,2.1,2.2,2.4]) { let b={l:Infinity}; for (let k=0;k<=1.0001;k+=0.05) for (let l=0;l<=1.0001;l+=0.05){const L=tot({G0,kappa:k,lambda:l}); if(L<b.l)b={l:L,k,l2:l};} console.log("G0",G0,"rmse",r3(Math.sqrt(b.l/49)),"kappa",r3(b.k),"lambda",r3(b.l2)); }
// own-ID slope sign at the data's best kappa, scaled to the 2020s
for (const k of [0.6,0.75,0.8]) { const ks=k*1.13; console.log("pooled kappa",k,"2020s",r3(ks),"identifier slope at P=1.19:",r3(1-ks*1.19),"at P=1.25:",r3(1-ks*1.25)); }
