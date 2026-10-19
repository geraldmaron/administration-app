// Read-only: for each nation, whether the coup hazard has an armed rival to seat, and the
// hazard's weekly rate at stability 0 (the most a covert campaign can buy today).
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { foundedForBalance } = await E("balance-harness");
const { coupTerms, selectForeignSeat } = await E("foreign-politics");
const { campaign: c } = foundedForBalance(process.argv[2] ?? "regime-0");
const armed = ["role-defense-minister", "role-intelligence-director", "role-junta-chairman"];
let withRival = 0, total = 0; const none = []; const rates = [];
for (const id of Object.keys(c.nations).filter((x) => x !== "USA").sort()) {
  total++;
  const seat = selectForeignSeat(c, id);
  const pool = Object.values(c.people).filter((p) => p.alive && p.base.nationality === id && p.base.id !== seat?.person && p.currentRole === undefined && p.base.eligibleRoles.some((r) => armed.includes(r)));
  const rival = pool.sort((a, b) => b.base.ambition - a.base.ambition)[0]?.base;
  if (rival) withRival++; else none.push(id);
  const n = c.nations[id];
  const zero = { ...n, stats: { ...n.stats, politics: { ...n.stats.politics, regimeStability: 0 } } };
  const w = coupTerms(c, id, zero, rival).reduce((a, t) => a + t.value, 0);
  rates.push([id, Math.round(w * 1e5) / 1e5, Math.round((1 - (1 - w) ** 52) * 1000) / 1000]);
}
console.log({ total, withRival, noRival: none.length, noRivalSample: none.slice(0, 40) });
for (const id of ["VEN", "HTI", "IRN", "MLI", "SYR", "IRQ", "CUB", "NIC", "PAN", "CHL", "GTM", "LBY"]) console.log(rates.find((x) => x[0] === id), "← [id, weekly hazard at stability 0, chance within 52 weeks]");
