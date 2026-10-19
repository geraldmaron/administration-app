// Read-only probe: plays one seed/profile/party and summarizes approval and its readers.
// usage: node probe-approval.mjs <seed> <profile> <party> <weeks>
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { playCampaign } = await E("balance-harness");
const op = await E("opinion");
const { coalitionApproval, selectCoalitions } = await E("coalitions");
const { projectVote, turnoutShift } = await E("elections");
const { selectCohorts } = await E("demos");
const { stateApprovals } = await E("regional-opinion");
const [seed = "balance-0", profile = "prudent", party = "democrat", weeksArg = "208"] = process.argv.slice(2);
const r3 = (v) => Math.round(v * 1000) / 1000;
const rows = [];
const outcome = playCampaign(seed, profile, Number(weeksArg), party, undefined, {
  observeWeek(s) {
    const mood = s.player.opinion;
    const w = op.salientWeights(s);
    const raw = op.rawApproval(mood, w);
    const cohorts = selectCohorts(s);
    const sup = cohorts.map((c) => c.support);
    const st = Object.values(stateApprovals(s));
    const vote = projectVote(s);
    rows.push({
      t: s.turn, a: s.player.metrics.approval, raw, base: op.partisanBase(s), pol: mood.polarization,
      coal: coalitionApproval(s), vote: vote.share, turnout: turnoutShift(s),
      press: s.removal.pressure, beats: s.removal.beats.length,
      mood: Object.fromEntries(op.OPINION_DRIVERS.map((d) => [d, r3(mood[d])])),
      sal: op.selectSalience(s), honey: op.honeymoonBonus(s),
      cohMin: Math.min(...sup), cohMax: Math.max(...sup),
      stMin: Math.min(...st), stMax: Math.max(...st),
      metrics: { st: r3(s.player.metrics.stability), sd: r3(s.player.metrics.standing), rd: r3(s.player.metrics.militaryReadiness), tr: Math.round(s.player.metrics.treasury) },
      disp: s.congress.disposition,
      coalitions: selectCoalitions(s).map((c) => r3(c.support)),
    });
  },
});
const series = (k) => rows.map((r) => r[k]);
const stat = (xs) => ({ min: r3(Math.min(...xs)), max: r3(Math.max(...xs)), mean: r3(xs.reduce((a, b) => a + b, 0) / xs.length), first: r3(xs[0]), last: r3(xs.at(-1)) });
const weeklyMoves = rows.slice(1).map((r, i) => Math.abs(r.a - rows[i].a));
const salCount = {};
for (const r of rows) for (const k of r.sal) salCount[k] = (salCount[k] ?? 0) + 1;
const pick = (i) => rows[Math.min(i, rows.length - 1)];
console.log(JSON.stringify({
  seed, profile, party, weeks: rows.length, ending: outcome.ending, elections: outcome.elections?.map((e) => ({ kind: e.kind, turn: e.turn, share: e.share ?? e.result?.share, won: e.won ?? e.result?.won })),
  approval: stat(series("a")), raw: stat(series("raw")), partisanBase: stat(series("base")), polarization: stat(series("pol")),
  coalitionApproval: stat(series("coal")), headlineMinusCoalition: stat(rows.map((r) => r.a - r.coal)),
  projectedVote: stat(series("vote")), turnoutShift: stat(series("turnout")), removalPressure: stat(series("press")), maxBeats: Math.max(...series("beats")),
  weeklyAbsMove: { mean: r3(weeklyMoves.reduce((a, b) => a + b, 0) / weeklyMoves.length * 100) / 100, max: r3(Math.max(...weeklyMoves)) },
  cohortSpread: stat(rows.map((r) => r.cohMax - r.cohMin)), stateSpread: stat(rows.map((r) => r.stMax - r.stMin)),
  salienceWeeks: salCount, disposition: stat(series("disp")),
  snapshots: [1, 13, 26, 52, 104, 156, 207].map((i) => { const r = pick(i); return { t: r.t, a: r3(r.a), raw: r3(r.raw), pol: r3(r.pol), base: r3(r.base), coal: r3(r.coal), vote: r3(r.vote), press: r3(r.press), mood: r.mood, metrics: r.metrics, coalitions: r.coalitions }; }),
}, null, 1));
