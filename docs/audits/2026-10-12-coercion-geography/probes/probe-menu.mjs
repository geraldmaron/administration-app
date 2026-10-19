// Read-only: which military rungs each actor can take against each target at founding, and what the blockade
// would cost and bite. Shows the menu is the same five rungs everywhere, gated rather than derived.
// usage: node probe-menu.mjs [seed]
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { foundedForBalance } = await E("balance-harness");
const { projectAction } = await E("resolution");
const { createRngStreams } = await E("rng");
const { chokepointExposure } = await E("geography");
const { specAgainst, specForRung } = await E("force-packages");
const seed = process.argv[2] ?? "coercion-0";
const { campaign: c } = foundedForBalance(seed);
const pairs = [["USA", "IRN"], ["USA", "LUX"], ["USA", "CHN"], ["USA", "CAN"], ["USA", "JPN"], ["USA", "YEM"], ["USA", "PAN"], ["IRN", "USA"], ["IRN", "ARE"], ["IRN", "OMN"], ["CHN", "TWN"], ["CHN", "USA"], ["YEM", "SAU"]];
for (const [actor, target] of pairs) {
  const row = [];
  for (const rung of [1, 2, 3, 4, 5]) {
    const p = projectAction(c, { actor, target, instrument: "military", rung }, createRngStreams(c.seed));
    row.push(p.ok ? `${rung}:ok $${p.projection.cost.treasury ?? 0}M p=${p.projection.successChance.toFixed(2)}` : `${rung}:no(${p.missingCapability.slice(0, 50)})`);
  }
  const t = c.nations[target]?.base;
  const exp = t ? chokepointExposure(t) : NaN;
  const pref = specAgainst(c, target, specForRung(3)).preferred;
  console.log(`${actor}->${target} exposure ${exp} blockadeBite ${(0.2 + 0.25 * exp).toFixed(3)} hulls ${pref}\n   ${row.join("\n   ")}`);
}
