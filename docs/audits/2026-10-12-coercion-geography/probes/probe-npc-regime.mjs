// Read-only: over one passive run, count the regime-relevant acts NPC governments take
// (covert 4-5, military 5) and the changes of government the world sees, by kind.
// usage: node probe-npc-regime.mjs <seed> <weeks>
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { playCampaign } = await E("balance-harness");
const [seed = "regime-0", weeks = "104"] = process.argv.slice(2);
let last;
const changes = [];
playCampaign(seed, "passive", Number(weeks), "democrat", undefined, { observeWeek(s) { last = s; } });
const acts = last.ledger.filter((e) => e.commitment && e.actor !== "player");
const tally = {};
for (const e of acts) {
  const k = `${e.commitment.instrument}-${e.commitment.rung}`;
  tally[k] = (tally[k] ?? 0) + 1;
}
const regime = acts.filter((e) => (e.commitment.instrument === "covert" && e.commitment.rung >= 4) || (e.commitment.instrument === "military" && e.commitment.rung === 5))
  .map((e) => `${e.turn}:${e.causal?.entities?.[0] ?? "?"}->${e.commitment.target}:${e.commitment.instrument}-${e.commitment.rung}:${e.commitment.landed ? "landed" : "failed"}`);
const recent = (last.foreignPolitics?.recent ?? []).filter((c) => !c.projected);
const byKind = recent.reduce((m, c) => ({ ...m, [c.kind]: (m[c.kind] ?? 0) + 1 }), {});
console.log(JSON.stringify({ seed, weeks, npcActsByRung: tally, regimeActs: regime, changesInRecentWindow: byKind, recentWindow: recent.length, coups: recent.filter((c) => c.kind === "coup").map((c) => `${c.nation}@${c.date.year}-${c.date.month}`) }, null, 1));
