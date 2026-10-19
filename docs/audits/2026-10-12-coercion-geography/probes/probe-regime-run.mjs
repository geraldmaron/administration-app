// Read-only: order a regime-relevant act against a target at week 0 (and optionally every K weeks),
// run N weeks, and compare the target's government, stability and the US side against a control run.
// usage: node probe-regime-run.mjs <seed> <target> <instrument> <rung> <weeks> [repeatEvery=0]
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { playCampaign } = await E("balance-harness");
const { issueAction } = await E("instrument-issued");
const { createRngStreams } = await E("rng");
const { selectForeignSeat, selectLeadershipChanges } = await E("foreign-politics");
const [seed = "regime-0", target = "VEN", instrument = "covert", rungArg = "5", weeksArg = "52", everyArg = "0"] = process.argv.slice(2);
const rung = Number(rungArg), every = Number(everyArg), weeks = Number(weeksArg);
const r = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
function snap(s) {
  const n = s.nations[target], seat = selectForeignSeat(s, target);
  const rel = s.relationships?.[`${target}:USA`], relUs = s.relationships?.[`USA:${target}`];
  const wars = Object.values(s.conflicts ?? {}).filter((k) => [k.aggressor, k.defender].includes(target));
  return {
    t: s.turn,
    stab: r(n.stats.politics.regimeStability), legit: r(n.stats.politics.legitimacy), insurg: r(n.stats.security.insurgencyPressure),
    seat: `${seat?.person ?? "table"}/${seat?.party ?? "-"}/${seat?.provenance}`,
    changes: selectLeadershipChanges(s, target).map((c) => `${c.kind}@${c.date.year}-${c.date.month}`).join(","),
    trustToUS: rel ? r(rel.trust) : null, alignToUS: rel ? r(rel.alignment ?? NaN) : null,
    wars: wars.map((k) => `${k.aggressor}-${k.defender}:${k.status}:i${r(k.intensity, 2)}:ex${r(k.exhaustion.aggressor, 2)}/${r(k.exhaustion.defender, 2)}:cas${JSON.stringify(k.casualties ?? {}).slice(0, 120)}`),
    approval: r(s.player.metrics.approval), standing: r(s.player.metrics.standing), treasury: Math.round(s.player.metrics.treasury),
    unfounded: s.security?.covert?.unfounded?.length ?? 0,
    scandals: (s.scandals ?? []).filter?.((x) => JSON.stringify(x).includes("covert")).length ?? "?",
    acts: Object.values(s.issuedActs ?? {}).filter((a) => a.request?.target === target).map((a) => `${a.status}:${a.outcome ? (a.outcome.landed ? "landed" : "failed") : ""}`).join(","),
  };
}
function run(order) {
  const rows = [];
  playCampaign(seed, "passive", weeks, "democrat", undefined, {
    decide(s, step) {
      if (!order) return [];
      if (!(step === 0 || (every > 0 && step % every === 0))) return [];
      const i = issueAction(s, { actor: "USA", target, instrument, rung }, createRngStreams(s.seed));
      return i.ok ? [i.packet] : [];
    },
    observeWeek(s) { rows.push(snap(s)); },
  });
  return rows;
}
const ctl = run(false), act = run(true);
const pick = [0, 1, 2, 4, 8, 13, 26, 39, 52, 78, 104, 156, 207].filter((i) => i < act.length);
for (const i of pick) console.log(JSON.stringify({ act: act[i], ctl: { stab: ctl[i].stab, seat: ctl[i].seat, changes: ctl[i].changes, approval: ctl[i].approval, standing: ctl[i].standing, treasury: ctl[i].treasury } }));
