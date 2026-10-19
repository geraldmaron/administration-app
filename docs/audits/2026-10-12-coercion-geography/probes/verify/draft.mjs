const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { foundedForBalance } = await E("balance-harness");
const { projectAction } = await E("resolution");
const { createRngStreams } = await E("rng");
const { composeForcePackages, packageForce } = await E("force-packages");
const { campaign: c } = foundedForBalance("coercion-0");
for (const t of ["IRN","CAN","CHN","LUX"]) for (const rung of [1,2,3,4,5]) {
  const comp = composeForcePackages(c, "USA", t).find((e) => e.spec.rung === rung);
  const force = comp ? packageForce(comp, comp.defaultCount) : undefined;
  const req = { actor: "USA", target: t, instrument: "military", rung, ...(force ? { force } : {}), support: { mode: "unilateral", partners: [] }, ...(rung===4?{civilianProtection:"standard",strikeObjective:"military-capacity"}:{}) };
  const p = projectAction(c, req, createRngStreams(c.seed));
  console.log(t, rung, "count", force?.count ?? "-", p.ok ? `upfront ${p.projection.cost.treasury} weekly ${p.projection.costBasis?.weekly} p=${p.projection.successChance.toFixed(3)} conflict=${p.projection.conflict?.headline ?? null}` : `refused ${p.missingCapability.slice(0,50)}`);
}
