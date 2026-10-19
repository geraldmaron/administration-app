const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { foundedForBalance } = await E("balance-harness");
const { commodityShocks } = await E("commodity-shocks");
const { selectActiveConflicts } = await E("state");
for (const world of [{}, { openingPreset: "world-2026" }]) for (const seed of ["coercion-0","coercion-1","coercion-2","balance-0","balance-1"]) {
  const { campaign: c } = foundedForBalance(seed, "democrat", {}, world);
  const act = selectActiveConflicts(c).map(k=>`${k.aggressor}-${k.defender}@${k.intensity}`);
  console.log(world.openingPreset ?? "seeded", seed, "active", act.join(" ")||"-", "crude shocks", commodityShocks(c,"crude").map(s=>`${s.kind}:${s.loss.toFixed(3)}/${s.risk.toFixed(3)}`).join(" "));
}
