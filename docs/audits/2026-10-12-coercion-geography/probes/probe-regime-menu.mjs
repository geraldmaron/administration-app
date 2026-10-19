// Read-only: what the engine offers today for changing another government.
// For each target: its regime-relevant stats, the coup hazard it carries this week,
// and the projection (cost, odds, exposure chance) of covert rung 4/5 and military rung 5.
// usage: node probe-regime-menu.mjs [seed]
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { foundedForBalance } = await E("balance-harness");
const { projectAction } = await E("resolution");
const { createRngStreams } = await E("rng");
const { coupTerms, incumbentStanding, selectForeignSeat } = await E("foreign-politics");
const { NATION_LEADER_CONSTRAINTS } = await import(`${root}packages/world/dist/index.js`);
const seed = process.argv[2] ?? "regime-0";
const { campaign: c } = foundedForBalance(seed);
const r = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const targets = ["VEN", "CUB", "NIC", "HTI", "IRN", "PRK", "SYR", "LBY", "AFG", "IRQ", "PAN", "GRD", "CHL", "GTM", "MLI", "RUS", "CHN", "CAN"];
for (const t of targets) {
  const n = c.nations[t];
  if (!n) { console.log(`${t}: not in roster`); continue; }
  const p = n.stats.politics, s = n.stats.security, m = n.stats.military;
  const seat = selectForeignSeat(c, t);
  const rival = null;
  const terms = coupTerms(c, t, n, seat?.person ? c.people[seat.person]?.base : undefined);
  const weekly = terms.reduce((a, x) => a + x.value, 0);
  const row = [];
  for (const [instrument, rung] of [["covert", 4], ["covert", 5], ["military", 5]]) {
    const pr = projectAction(c, { actor: "USA", target: t, instrument, rung }, createRngStreams(c.seed));
    row.push(pr.ok ? `${instrument}-${rung}: $${pr.projection.cost.treasury ?? 0}M odds ${r(pr.projection.successChance, 2)} exposeIfLanded ${pr.projection.successExposureChance ?? "-"} standing ${pr.projection.cost.standing ?? 0}` : `${instrument}-${rung}: refused (${pr.missingCapability.slice(0, 70)})`);
  }
  console.log(`${t} ${n.base.identity.name} regime=${NATION_LEADER_CONSTRAINTS[t]?.regime} stab=${r(p.regimeStability)} legit=${r(p.legitimacy)} fact=${r(p.factionalism)} protest=${r(p.protestPressure)} insurg=${r(s.insurgencyPressure)} cIntel=${r(s.counterIntel)} land=${r(m.branchStrength.land)} warheads=${m.arsenal.warheads} pop=${Math.round(n.stats.demography.population/1e6)}M gdp=${n.stats.economy.gdp} weeklyCoupHazard(stability-terms)=${r(weekly, 5)} electionHold=${r(incumbentStanding(n, t))}\n   ${row.join("\n   ")}`);
}
