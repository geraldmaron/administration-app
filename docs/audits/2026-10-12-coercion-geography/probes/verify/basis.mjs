const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { foundedForBalance } = await E("balance-harness");
const { projectAction } = await E("resolution");
const { createRngStreams } = await E("rng");
const { campaign: c } = foundedForBalance("coercion-0");
for (const [a,t] of [["USA","CAN"],["USA","IRN"],["USA","LUX"]]) for (const rung of [1,2,3,4,5]) {
  const p = projectAction(c, { actor:a, target:t, instrument:"military", rung }, createRngStreams(c.seed));
  if (!p.ok) { console.log(a,t,rung,"refused"); continue; }
  console.log(a,t,rung, JSON.stringify(p.projection.cost), JSON.stringify(p.projection.costBasis), "conflict:", p.projection.conflict?.headline ?? null);
}
