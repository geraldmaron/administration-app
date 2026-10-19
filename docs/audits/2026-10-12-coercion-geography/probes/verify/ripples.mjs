const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { foundedForBalance } = await E("balance-harness");
const { projectAction } = await E("resolution");
const { createRngStreams } = await E("rng");
const { composeForcePackages, packageForce } = await E("force-packages");
const { campaign: c } = foundedForBalance("coercion-0");
for (const t of ["IRN","CAN","JPN"]) {
  const comp = composeForcePackages(c, "USA", t).find((e) => e.spec.rung === 3);
  const force = packageForce(comp, comp.defaultCount);
  const p = projectAction(c, { actor: "USA", target: t, instrument: "military", rung: 3, force }, createRngStreams(c.seed));
  const rs = p.projection.ripples ?? [];
  const byRel = {}; for (const r of rs) { byRel[r.relation] = (byRel[r.relation] ?? 0) + 1; }
  console.log(t, "ripples", rs.length, JSON.stringify(byRel), "keys", Object.keys(rs[0] ?? {}).join(","));
  console.log("  sample", JSON.stringify(rs.slice(0,3)).slice(0,600));
  console.log("  projection keys", Object.keys(p.projection).join(","));
}
{
const comp = composeForcePackages(c, "USA", "IRN").find((e) => e.spec.rung === 3);
const p = projectAction(c, { actor: "USA", target: "IRN", instrument: "military", rung: 3, force: packageForce(comp, comp.defaultCount) }, createRngStreams(c.seed));
console.log("contest", JSON.stringify(p.projection.contest).slice(0,1500));
console.log("risks", JSON.stringify(p.projection.risks).slice(0,1500));
console.log("domestic", JSON.stringify(p.projection.ripples.filter(r=>r.relation==="domestic")));
}
