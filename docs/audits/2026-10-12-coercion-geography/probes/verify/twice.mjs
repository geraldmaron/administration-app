// Read-only: blockade (or blockade then strike) twice and see whether the second act opens a war that reaches crude.
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { playCampaign } = await E("balance-harness");
const { issueAction } = await E("instrument-issued");
const { createRngStreams } = await E("rng");
const { selectCommodities } = await E("commodities");
const { commodityShocks } = await E("commodity-shocks");
const { selectPumpPrice } = await E("household-prices");
const [seed = "coercion-1", secondRung = "3", secondStep = "5", weeks = "16"] = process.argv.slice(2);
function run(order) {
  const rows = [];
  playCampaign(seed, "passive", Number(weeks), "democrat", undefined, {
    decide(s, step) {
      if (!order) return [];
      const rung = step === 0 ? 3 : step === Number(secondStep) ? Number(secondRung) : 0;
      if (!rung) return [];
      const i = issueAction(s, { actor: "USA", target: "IRN", instrument: "military", rung }, createRngStreams(s.seed));
      rows.push(`step${step} rung${rung} ${i.ok ? "issued" : "refused:" + i.missingCapability}`);
      return i.ok ? [i.packet] : [];
    },
    observeWeek(s) {
      const crude = selectCommodities(s).find((x) => x.id === "crude").index;
      const conf = Object.values(s.conflicts ?? {}).filter((k) => k.status !== "ended" && [k.aggressor, k.defender].includes("IRN")).map((k) => `${k.aggressor}-${k.defender}@${k.intensity.toFixed(2)}:${k.status}`);
      const acts = Object.values(s.issuedActs ?? {}).filter((a) => a.kind === "instrument" && a.request?.target === "IRN").map((a) => `r${a.request.rung}:${a.status}:${a.outcome ? (a.outcome.landed ? "L" : "F") : ""}`);
      let pump; try { pump = selectPumpPrice(s); } catch { pump = NaN; }
      rows.push(`t${s.turn} crude ${crude.toFixed(3)} ($${(69 * crude).toFixed(1)}) pump ${typeof pump === "number" ? pump.toFixed(2) : JSON.stringify(pump).slice(0,40)} infl ${s.nations.USA.stats.economy.inflation.toFixed(4)} appr ${s.player.metrics.approval.toFixed(4)} conf [${conf.join(",")}] shocks ${commodityShocks(s, "crude").map((x) => `${x.kind}:${x.loss.toFixed(3)}/${x.risk.toFixed(3)}`).join(" ")} acts ${acts.join(",")}`);
    },
  });
  return rows;
}
const ctl = run(false), act = run(true);
console.log("CONTROL"); console.log(ctl.filter((_, i) => i % 3 === 0 || i === ctl.length - 1).join("\n"));
console.log("ACT"); console.log(act.join("\n"));
