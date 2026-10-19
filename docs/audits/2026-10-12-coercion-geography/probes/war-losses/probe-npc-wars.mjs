// Read-only: a passive President for a full term on N seeds, reading every war
// the United States is not party to. Reports per seed: wars fought, how each
// ended and when, whether the loser's government was replaced, and each side's
// killed and wounded (band midpoints) with the weekly killed rate.
// usage: node probe-npc-wars.mjs [weeks=208] [seeds=12]
// ENGINE_ROOT points the probe at another checkout (the base commit, for a before-and-after).
const root = process.env.ENGINE_ROOT ?? new URL("../../../../../", import.meta.url).pathname;
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { playCampaign } = await E("balance-harness");
const { selectLeadershipChanges } = await E("foreign-politics");
const [weeksArg = "208", seedsArg = "12"] = process.argv.slice(2);
const weeks = Number(weeksArg);
const seeds = Array.from({ length: Number(seedsArg) }, (_, i) => `war-${i}`);
const mid = (range) => (range ? (range.low + range.high) / 2 : 0);
const killedOf = (band) => (band ? (band.killed ? mid(band.killed) : mid(band)) : 0);
const woundedOf = (band) => (band?.wounded ? mid(band.wounded) : 0);
const r = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

function newest(s, nation) {
  const change = selectLeadershipChanges(s, nation)[0];
  return change ? `${change.kind}@${change.date.year}-${change.date.month}-${change.date.day}` : "none";
}

const all = [];
for (const seed of seeds) {
  const seen = new Map();
  let previous;
  playCampaign(seed, "passive", weeks, "democrat", undefined, {
    observeWeek(s) {
      for (const war of Object.values(s.conflicts ?? {})) {
        if ([war.aggressor, war.defender, ...war.joined.aggressor, ...war.joined.defender].includes("USA")) continue;
        const record = seen.get(war.id) ?? { seed, id: war.id, pair: `${war.aggressor}-${war.defender}`, inherited: war.inherited !== undefined, started: war.startedTurn };
        if (record.status === undefined && war.status !== "active") {
          const loser = war.status === "aggressor-victory" ? war.defender : war.status === "defender-victory" ? war.aggressor : undefined;
          record.status = war.status;
          record.weeks = (war.endedTurn ?? s.turn) - Math.max(war.startedTurn, 0);
          record.successor = loser !== undefined && previous !== undefined && newest(s, loser) !== newest(previous, loser) && newest(s, loser).startsWith("succession");
        }
        record.aggressorKilled = r(killedOf(war.casualties?.aggressor));
        record.aggressorWounded = r(woundedOf(war.casualties?.aggressor));
        record.defenderKilled = r(killedOf(war.casualties?.defender));
        record.defenderWounded = r(woundedOf(war.casualties?.defender));
        record.joined = war.joined.aggressor.length + war.joined.defender.length;
        seen.set(war.id, record);
      }
      previous = s;
    },
  });
  for (const record of seen.values()) {
    const fought = record.weeks ?? weeks - Math.max(record.started, 0);
    all.push({ ...record, status: record.status ?? "active at the end", weeks: fought, killedPerWeek: r((record.aggressorKilled + record.defenderKilled) / Math.max(1, fought), 1) });
  }
}
const ended = all.filter((war) => war.status !== "active at the end");
console.log(JSON.stringify({
  weeks,
  seeds: seeds.length,
  wars: all.length,
  ended: ended.length,
  victories: ended.filter((war) => war.status.endsWith("victory")).length,
  successorsSeated: ended.filter((war) => war.successor).length,
  medianWeeksEnded: ended.map((war) => war.weeks).sort((a, b) => a - b)[Math.floor(ended.length / 2)] ?? null,
}));
for (const war of all) console.log(JSON.stringify(war));
