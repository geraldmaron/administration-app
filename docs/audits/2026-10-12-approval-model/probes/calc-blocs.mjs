// Pure calculation: proposed partisan-bloc headline vs current headline, on the probe snapshots.
import fs from "node:fs";
const dir = process.argv[2];
const sig = (x) => 1 / (1 + Math.exp(-x));
const S = { own: 0.3, ind: 0.4, opp: 0.3 }; // placeholder bloc shares, to be replaced by sourced party ID
const G = 2.4, B = 3, KAPPA = 0.6;
function blocs(raw, P, issue = { own: 0, ind: 0, opp: 0 }, erosion = 0) {
  const V = 2 * raw - 1;
  const bp = B * (1 - KAPPA * P);
  const a = { own: sig(G * P * (1 - erosion) + bp * V + issue.own), ind: sig(B * V + issue.ind), opp: sig(-G * P + bp * V + issue.opp) };
  return { a, headline: S.own * a.own + S.ind * a.ind + S.opp * a.opp };
}
const r3 = (v) => Math.round(v * 1000) / 1000;
console.log("raw -> proposed headline at P=1 (blocs own/ind/opp) | current approvalOf at pol 0.6 and pol 0");
const cur = (raw, pol) => raw + (0.45 - raw) * pol * 0.55;
for (const raw of [0.1, 0.2, 0.35, 0.5, 0.6, 0.7, 0.8, 0.9]) {
  const b = blocs(raw, 1);
  console.log(raw, "->", r3(b.headline), `(${r3(b.a.own)}/${r3(b.a.ind)}/${r3(b.a.opp)}, gap ${r3(b.a.own - b.a.opp)})`, "| current", r3(cur(raw, 0.6)), r3(cur(raw, 0)));
}
console.log("issue term example: redistribution, agreement own +0.3 logit, ind 0, opp -0.3 logit, at raw 0.6:",
  r3(blocs(0.6, 1).headline), "->", r3(blocs(0.6, 1, { own: 0.3, ind: 0, opp: -0.3 }).headline),
  "| same act, ind -0.2:", r3(blocs(0.6, 1, { own: 0.3, ind: -0.2, opp: -0.3 }).headline));
console.log("partisan erosion (gravity x exposure = 1) at raw 0.3:", r3(blocs(0.3, 1).headline), "->", r3(blocs(0.3, 1, undefined, 1).headline), "own", r3(blocs(0.3, 1, undefined, 1).a.own));
for (const f of fs.readdirSync(dir).filter((x) => x.startsWith("out-") || x === "out0.json")) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  console.log(f, j.snapshots.map((s) => `t${s.t}: cur ${s.a} new ${r3(blocs(s.raw, 1).headline)}`).join(" | "));
}
