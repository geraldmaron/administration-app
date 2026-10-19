// Read-only: drive the committed crude market kernel with constant supply losses and report the weekly index path.
// Compares the engine's existing war-driven Hormuz shock (route + war) with losses the size observed in 2026.
// usage: node probe-kernel.mjs
const root = "";
const { stepMarket } = await import(`${root}packages/engine/dist/commodity-kernel.js`);
const { COMMODITY_DEFS, referenceIndex, supplierShare, ROUTE_CLOSURE, ROUTE_RISK, WAR_OUTPUT_LOSS } = await import(`${root}packages/engine/dist/commodities.js`);
const p = COMMODITY_DEFS.crude.params, ref = referenceIndex("crude");
const hormuz = COMMODITY_DEFS.crude.routes[0];
const irn = supplierShare("crude", "IRN");
console.log("crude params", JSON.stringify(p), "reference", ref, "Hormuz route share", hormuz.share, "IRN crude supplier share", irn);
const engineMax = { loss: hormuz.share * 1 * ROUTE_CLOSURE + irn * 1 * WAR_OUTPUT_LOSS.defender, risk: hormuz.share * 1 * ROUTE_RISK };
console.log("engine's largest Hormuz shock today (IRN a party at intensity 1):", JSON.stringify(engineMax));
function path(loss, risk, weeks = 26) {
  let q = { index: ref, norm: ref, inventory: 1 }; const out = [];
  for (let w = 1; w <= weeks; w++) { q = stepMarket({ quote: q, reference: ref, params: p, loss, risk, inputPush: 0, draw: 0.5 }); if ([1, 2, 4, 6, 8, 12, 17, 26].includes(w)) out.push(`w${w}:${q.index.toFixed(3)}($${(69 * q.index).toFixed(0)})/inv${q.inventory.toFixed(2)}`); }
  return out.join(" ");
}
for (const [label, loss, risk] of [["engine max war shock", engineMax.loss, engineMax.risk], ["loss 0.05 (blockade of Iran's own exports, inferred)", 0.05, 0], ["loss 0.11 (2026 May shut-in peak, 10.9 mb/d of ~100)", 0.11, 0.06], ["loss 0.167 (2026 Q2 Hormuz flow drop, 21.6->4.9 mb/d)", 0.167, 0.06]]) console.log(label.padEnd(58), path(loss, risk));
