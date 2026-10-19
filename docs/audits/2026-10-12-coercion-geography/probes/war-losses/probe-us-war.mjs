// Read-only: the United States orders an expeditionary invasion (military rung 5)
// of one target at week 0, and a control run on the same seed does nothing. An
// invasion is a contest that can fail before any war opens, so seeds war-0,
// war-1, ... are tried in order until N invasions have landed (at most 3N).
// Reports per seed: how the war ended and when, whether a successor was seated,
// US killed and wounded (band midpoints), the weekly rate, and approval against
// the control at the war's end and at week 52.
// usage: node probe-us-war.mjs <target=VEN> [weeks=104] [wars=12]
// ENGINE_ROOT points the probe at another checkout (the base commit, for a before-and-after).
const root = process.env.ENGINE_ROOT ?? new URL("../../../../../", import.meta.url).pathname;
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { playCampaign } = await E("balance-harness");
const { issueAction } = await E("instrument-issued");
const { createRngStreams } = await E("rng");
const { selectLeadershipChanges } = await E("foreign-politics");
const [target = "VEN", weeksArg = "104", seedsArg = "12"] = process.argv.slice(2);
const weeks = Number(weeksArg);
const wanted = Number(seedsArg);
const mid = (range) => (range ? (range.low + range.high) / 2 : 0);
const lossesOf = (band) => (band ? (band.killed ? { killed: mid(band.killed), wounded: mid(band.wounded) } : { killed: mid(band), wounded: 0 }) : { killed: 0, wounded: 0 });

function usWar(s) {
  return Object.values(s.conflicts ?? {}).find((c) => c.aggressor === "USA" && c.defender === target);
}

function run(seed, order) {
  const rows = [];
  let issued = "not issued";
  playCampaign(seed, "passive", weeks, "democrat", undefined, {
    decide(s, step) {
      if (!order || step !== 0) return [];
      const result = issueAction(s, { actor: "USA", target, instrument: "military", rung: 5 }, createRngStreams(s.seed));
      issued = result.ok ? "issued" : `refused: ${result.reason ?? JSON.stringify(result).slice(0, 160)}`;
      return result.ok ? [result.packet] : [];
    },
    observeWeek(s) {
      const war = usWar(s);
      rows.push({
        turn: s.turn,
        approval: s.player.metrics.approval,
        war: war && { status: war.status, started: war.startedTurn, ended: war.endedTurn, us: lossesOf(war.casualties?.aggressor), them: lossesOf(war.casualties?.defender) },
        newestChange: ((change) => (change ? `${change.kind}@${change.date.year}-${change.date.month}-${change.date.day}` : "none"))(selectLeadershipChanges(s, target)[0]),
      });
    },
  });
  return { rows, issued };
}

const r = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
const table = [];
let tried = 0;
let failed = 0;
for (let i = 0; table.length < wanted && i < wanted * 3; i += 1) {
  const seed = `war-${i}`;
  tried += 1;
  const { rows: act, issued } = run(seed, true);
  const last = [...act].reverse().find((row) => row.war);
  if (!last) {
    failed += 1;
    console.error(JSON.stringify({ seed, issued, war: issued.startsWith("refused") ? "never opened (refused at the gate)" : "never opened (the invasion failed its contest)" }));
    continue;
  }
  const control = run(seed, false).rows;
  const endIndex = act.findIndex((row) => row.war && row.war.status !== "active");
  const end = endIndex >= 0 ? act[endIndex] : act[act.length - 1];
  const duration = (end.war.ended ?? end.turn) - end.war.started;
  const at = (rows, index) => rows[Math.min(index, rows.length - 1)].approval;
  const endAt = endIndex >= 0 ? endIndex : act.length - 1;
  table.push({
    seed,
    status: end.war.status,
    weeks: duration,
    // A decisive defeat seats a successor through the succession rule, which
    // files a "succession" change the week the war ends.
    successor: endIndex > 0 && act[endIndex].newestChange !== act[endIndex - 1].newestChange && act[endIndex].newestChange.startsWith("succession"),
    usKilled: r(end.war.us.killed),
    usWounded: r(end.war.us.wounded),
    usKilledPerWeek: r(end.war.us.killed / Math.max(1, duration), 1),
    usLossesPerWeek: r((end.war.us.killed + end.war.us.wounded) / Math.max(1, duration), 1),
    theirKilled: r(end.war.them.killed),
    approvalEndDelta: r(at(act, endAt) - at(control, endAt), 3),
    approval52Delta: r(at(act, 52) - at(control, 52), 3),
  });
}
console.log(JSON.stringify({ target, weeks, wars: table.length, seedsTried: tried, invasionsFailed: failed }));
for (const row of table) console.log(JSON.stringify(row));
