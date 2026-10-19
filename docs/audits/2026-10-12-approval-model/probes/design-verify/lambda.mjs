const P = "docs/audits/2026-10-12-approval-model/probes/";
const { blocApprovals, gallupView, gallup2025Shares, r3 } = await import(P + "design-blocs.mjs");
const OBS = [["R",91,null,15,50.3],["R",86,null,14,45.4],["R",79,null,9,37.3],["R",73,null,7,33.3],["R",67,null,null,29.9],["D",88,null,23,null],["D",81,null,13,null],["D",80,null,12,null],["D",86,null,10,null],["D",79,null,9,null],["D",89,null,12,null],
["R",83,null,8,38.3],["R",87,36,8,40.5],["R",94,42,7,49],["R",82,30,4,34],["D",90,37,6,43],["D",85,39,6,42.2]];
const SYM = () => { const raw=[27,17.5,10,17.5,27]; const t=raw.reduce((a,b)=>a+b,0); return raw.map(v=>v/t); };
function err(o, V, fit, shares) { const g = gallupView(shares(o[0]), blocApprovals({ V, P: 1, fit })); let e = 0; [["own",1],["ind",2],["opp",3],["overall",4]].forEach(([k,i]) => { if (o[i] != null) e += (100*g[k]-o[i])**2; }); return e; }
function bestV(o, fit, sh) { let lo=-6,hi=6; for (let i=0;i<70;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3; if (err(o,a,fit,sh)<err(o,b,fit,sh)) hi=b; else lo=a;} return (lo+hi)/2; }
const tot = (fit, sh) => OBS.reduce((s,o)=>s+err(o,bestV(o,fit,sh),fit,sh),0);
for (const [name, sh] of [["gallup2025", gallup2025Shares], ["symmetric 27/17.5/10", SYM]]) {
  for (const lam of [0, 0.3, 0.65, 1.0, "free"]) {
    let b = { l: Infinity };
    for (let G0=1.4; G0<=3.0001; G0+=0.1) for (let k=0; k<=1.0001; k+=0.05) for (const l of (lam==="free"? Array.from({length:17},(_,i)=>0.2+0.05*i) : [lam])) {
      const L = tot({G0,kappa:k,lambda:l}, sh); if (L<b.l) b={l:L,G0,k,l2:l};
    }
    console.log(name, "lambda", lam, "best G0", r3(b.G0), "kappa", r3(b.k), "lambda", r3(b.l2), "rmse", r3(Math.sqrt(b.l/49)));
  }
}
