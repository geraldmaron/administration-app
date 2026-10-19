// Read-only probe: found a campaign, order the military rung-3 blockade on a target in week 0,
// and compare N weeks against a control run with no order. Reads committed packages/engine/dist.
// usage: node probe-blockade.mjs <seed> <target> <weeks> [profile]
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { playCampaign } = await E("balance-harness");
const { projectAction } = await E("resolution");
const { issueAction } = await E("instrument-issued");
const { createRngStreams } = await E("rng");
const { selectCommodities } = await E("commodities");
const { commodityShocks } = await E("commodity-shocks");
const { selectPumpPrice } = await E("household-prices");
const [seed = "coercion-0", target = "IRN", weeksArg = "8", profile = "passive"] = process.argv.slice(2);
const r = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const US = "USA";
function snap(s) {
  const t = s.nations[target], us = s.nations[US];
  const c = Object.fromEntries(selectCommodities(s).filter((x) => ["crude", "lng", "natural-gas", "wheat"].includes(x.id)).map((x) => [x.id, r(x.index)]));
  const conflicts = Object.values(s.conflicts ?? {}).filter((k) => k.status !== "ended" && [k.aggressor, k.defender].includes(target)).map((k) => `${k.aggressor}-${k.defender}@${r(k.intensity, 2)}`);
  const rel = s.relationships?.[`${target}->${US}`] ?? Object.values(s.relationships ?? {}).find((x) => x.from === target && x.to === US);
  const commits = Object.values(s.commitments ?? {}).filter((m) => m.target?.id === target && m.status !== "closed").map((m) => `${m.kind}:${m.resource?.amountPerTurn}`);
  return {
    t: s.turn, approval: r(s.player.metrics.approval), treasury: Math.round(s.player.metrics.treasury), readiness: r(s.player.metrics.militaryReadiness),
    standing: r(s.player.metrics.standing), usInfl: r(us.stats.economy.inflation), usGrowth: r(us.stats.economy.growth),
    pump: (() => { try { const p = selectPumpPrice(s); return typeof p === "number" ? r(p, 3) : JSON.stringify(p).slice(0, 80); } catch (e) { return "n/a"; } })(),
    tgtImports: Math.round(t.stats.trade.imports), tgtGrowth: r(t.stats.economy.growth), tgtStab: r(t.stats.politics.regimeStability),
    commodities: c, crudeShocks: commodityShocks(s, "crude").map((x) => `${x.kind}:${r(x.loss)}/${r(x.risk)}`),
    conflicts, rel: rel ? { tension: r(rel.tension ?? rel.metrics?.tension ?? NaN), threat: r(rel.militaryThreat ?? rel.metrics?.militaryThreat ?? NaN), trust: r(rel.trust ?? rel.metrics?.trust ?? NaN) } : "?",
    commits,
    acts: Object.values(s.issuedActs ?? {}).filter((a) => a.kind === "instrument" && a.request?.target === target).map((a) => `${a.status}:${a.outcome ? (a.outcome.landed ? 'landed' : 'failed') : ''}:${(a.outcome?.account ?? '').slice(0, 220)}`),
    hist: (s.relationships?.[`${US}:${target}`]?.history ?? []).slice(-2).map((h) => `${h.turn}:${h.kind}`),
    allCommits: Object.values(s.commitments ?? {}).filter((m) => JSON.stringify(m).includes(target)).map((m) => `${m.kind}:${m.status ?? ''}:${m.resource?.amountPerTurn}`),
  };
}
function run(order) {
  const rows = []; let projection, issue;
  playCampaign(seed, profile, Number(weeksArg), "democrat", undefined, {
    decide(s, step) {
      if (!order || step !== 0) return [];
      const req = { actor: US, target, instrument: "military", rung: 3 };
      const p = projectAction(s, req, createRngStreams(s.seed));
      projection = p.ok ? { cost: p.projection.cost, basis: p.projection.costBasis, chance: r(p.projection.successChance), conflict: p.projection.conflict?.headline ?? null, timing: p.projection.timing?.label, capacity: p.projection.capacity, ripples: p.projection.ripples?.length } : { refused: p.missingCapability };
      const i = issueAction(s, req, createRngStreams(s.seed));
      issue = i.ok ? { pending: !!i.pending, summary: i.packet.narration.summary.slice(0, 160) } : { refused: i.missingCapability };
      return i.ok ? [i.packet] : [];
    },
    observeWeek(s) { rows.push(snap(s)); },
  });
  return { projection, issue, rows };
}
const base = run(false), act = run(true);
console.log(JSON.stringify({ seed, target, profile, projection: act.projection, issue: act.issue,
  weeks: act.rows.map((a, i) => ({ blockade: a, control: { approval: base.rows[i].approval, treasury: base.rows[i].treasury, readiness: base.rows[i].readiness, usInfl: base.rows[i].usInfl, tgtImports: base.rows[i].tgtImports, tgtGrowth: base.rows[i].tgtGrowth, commodities: base.rows[i].commodities, rel: base.rows[i].rel } })) }, null, 1));
