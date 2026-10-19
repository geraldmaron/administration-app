// Read-only arithmetic for the worked example: drives the committed crude/LNG kernel with the proposed losses and
// reads the committed pump and CPI functions and the force price table. No campaign state is changed.
// usage: node probe-worked.mjs
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { stepMarket } = await E("commodity-kernel");
const { COMMODITY_DEFS, referenceIndex, supplierShare } = await E("commodities");
const hp = await E("household-prices");
const { US_FORCE_PRICES } = await E("force-costs");
const r = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const ref = referenceIndex("crude");
function run(id, loss, risk, weeks, spareOverride) {
  const params = { ...COMMODITY_DEFS[id].params, ...(spareOverride === undefined ? {} : { spare: spareOverride }) };
  const reference = referenceIndex(id); let q = { index: reference, norm: reference, inventory: 1 }; const s = [];
  for (let w = 1; w <= weeks; w++) { q = stepMarket({ quote: q, reference, params, loss: typeof loss === "function" ? loss(w) : loss, risk: typeof risk === "function" ? risk(w) : risk, inputPush: 0, draw: 0.5 }); s.push(q.index); }
  return s;
}
const show = (s, scale = 1) => [1, 2, 4, 8, 13, 26].map((w) => `w${w}:${r(s[w - 1] * scale, 1)}`).join(" ");
console.log("US prices per unit (USD M):", JSON.stringify(US_FORCE_PRICES));
console.log("CPI weights:", JSON.stringify(hp.CPI_WEIGHTS), "pump at reference crude:", r(hp.pumpPrice(ref), 2));
const irnCrude = supplierShare("crude", "IRN"), qatLng = supplierShare("lng", "QAT");
console.log("IRN crude share", irnCrude, "QAT lng share", qatLng);
// Stage A: blockade of Iran's oil exports, leak 0.3 (planning). Stage B from week 3: Iran contests Hormuz.
const leak = 0.3, aLoss = irnCrude * (1 - leak);
const hormuz = 0.2, closure = 1 - 4.9 / 21.6, bypass = 2.6 / 20;
const bLoss = hormuz * closure * (1 - bypass), bRisk = hormuz * 1 * 0.3;
console.log("A loss", r(aLoss, 4), "B closure", r(closure), "B loss", r(bLoss, 4), "B risk", r(bRisk, 3));
const A = run("crude", aLoss, 0.01, 26);
console.log("A only, Brent $ :", show(A, 69));
const AB = run("crude", (w) => (w < 3 ? aLoss : aLoss + bLoss), (w) => (w < 3 ? 0.01 : bRisk), 26);
console.log("A then B (spare 0.03) $:", show(AB, 69));
const ABlocked = run("crude", (w) => (w < 3 ? aLoss : aLoss + bLoss), (w) => (w < 3 ? 0.01 : bRisk), 26, 0.005);
console.log("A then B, Gulf spare stranded (spare 0.005) $:", show(ABlocked, 69));
const lngB = run("lng", (w) => (w < 3 ? 0 : 0.2 * closure), (w) => (w < 3 ? 0 : 0.2 * 0.3), 26);
console.log("LNG index, B from week 3:", show(lngB));
// Pump and the CPI gasoline term at week 8 and 13 for AB, against the reference, ignoring lag smoothing.
for (const w of [4, 8, 13]) { const p = hp.pumpPrice(AB[w - 1]); console.log(`pump w${w}: $${r(p, 2)} (+${r((p / hp.pumpPrice(ref) - 1) * 100, 1)}%), CPI gasoline term +${r(hp.CPI_WEIGHTS.gasoline * (p / hp.pumpPrice(ref) - 1) * 100, 2)} pts`); }
