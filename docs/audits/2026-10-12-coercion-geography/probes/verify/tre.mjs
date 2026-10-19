const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { foundedForBalance } = await E("balance-harness");
const f = await E("fiscal");
const { campaign: c } = foundedForBalance(process.argv[2] ?? "coercion-1");
console.log("treasury", c.player.metrics.treasury, "ceiling", f.authorityCeiling(c), "weeklyApportionment", f.weeklyApportionment(c));
