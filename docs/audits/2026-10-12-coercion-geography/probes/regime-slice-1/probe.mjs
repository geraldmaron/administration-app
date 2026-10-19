// Read-only probe for regime change's first slice.
//
// usage:
//   node probe.mjs player [weeks] [seeds]   US coup support / political action against fixed targets, against a control run
//   node probe.mjs npc [weeks] [seeds]      operations other governments start over a passive term
// Seeds are regime-0 upward, twelve unless a count is given. Reads this
// checkout's committed packages/engine/dist.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const [mode = "player", weeksArg, seedCountArg = "12"] = process.argv.slice(2);
const dist = path.resolve(path.join(here, "../../../../../packages/engine/dist"));
const E = (name) => import(pathToFileURL(path.join(dist, `${name}.js`)).href);

const { playCampaign } = await E("balance-harness");
const { issueAction } = await E("instrument-issued");
const { projectAction } = await E("resolution");
const { createRngStreams } = await E("rng");

const SEEDS = Array.from({ length: Number(seedCountArg) }, (_, i) => `regime-${i}`);
const US = "USA";
// A fragile autocracy, a fragile hybrid regime, a stable one-party state and a
// stable democracy and treaty ally: the four the design says should read apart.
const TARGETS = ["HTI", "VEN", "CUB", "CAN"];
const r = (value, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

function run(seed, weeks, target, act) {
  let issued = "control";
  let odds = null;
  let last;
  // The record keeps only the last two dozen changes worldwide, so coups are
  // collected as they happen rather than read off the final state.
  const coupDates = new Set();
  playCampaign(seed, "passive", weeks, "democrat", undefined, {
    decide(state, step) {
      if (!act || step !== 0) return [];
      const request = { actor: US, target, instrument: "covert", rung: 5, regimeAct: act };
      const projected = projectAction(state, request, createRngStreams(state.seed));
      odds = projected.ok ? r(projected.projection.successChance, 3) : `refused: ${projected.missingCapability}`;
      const result = issueAction(state, request, createRngStreams(state.seed));
      issued = result.ok ? "issued" : `refused: ${result.missingCapability}`;
      return result.ok ? [result.packet] : [];
    },
    observeWeek(state) {
      last = state;
      for (const change of state.foreignPolitics?.recent ?? []) {
        if (change.nation === target && change.kind === "coup") coupDates.add(JSON.stringify(change.date));
      }
    },
  });
  const ops = (last.regimeOperations?.operations ?? []).filter((op) => op.sponsor === US && op.target === target);
  const coups = coupDates.size;
  return { issued, odds, statuses: ops.map((op) => op.status).join("+") || "-", coups, approval: r(last.player.metrics.approval), coupDates };
}

function playerMode(weeks) {
  // One control run per seed serves every target: the control issues nothing.
  const controls = Object.fromEntries(SEEDS.map((seed) => [seed, run(seed, weeks, TARGETS[0], undefined)]));
  // A control issues nothing, so one per seed and target is enough.
  const controlRuns = Object.fromEntries(TARGETS.flatMap((target) => SEEDS.map((seed) => [`${seed}|${target}`, run(seed, weeks, target, undefined)])));
  const coupsIn = (seed, target) => controlRuns[`${seed}|${target}`].coups;
  const rows = [];
  for (const target of TARGETS) {
    for (const act of ["coup-support", "political-action"]) {
      const seeds = SEEDS.map((seed) => ({ seed, ...run(seed, weeks, target, act) }));
      const landed = seeds.filter((row) => row.issued === "issued");
      rows.push({
        target,
        act,
        issued: landed.length,
        refused: seeds.find((row) => row.issued !== "issued")?.issued ?? null,
        fell: landed.filter((row) => /fell/.test(row.statuses)).length,
        exposed: landed.filter((row) => /exposed/.test(row.statuses)).length,
        coupsWith: seeds.reduce((sum, row) => sum + row.coups, 0),
        coupsWithout: SEEDS.reduce((sum, seed) => sum + coupsIn(seed, target), 0),
        approvalVsControl: r(seeds.reduce((sum, row) => sum + row.approval - controls[row.seed].approval, 0) / seeds.length),
      });
    }
  }
  console.log(JSON.stringify({ mode: "player", weeks, seeds: SEEDS.length, rows }, null, 1));
}

function npcMode(weeks) {
  const out = SEEDS.map((seed) => {
    let last;
    playCampaign(seed, "passive", weeks, "democrat", undefined, { observeWeek(state) { last = state; } });
    const ops = (last.regimeOperations?.operations ?? []).filter((op) => op.sponsor !== US);
    return {
      seed,
      started: ops.length,
      byAct: Object.fromEntries(["political-action", "coup-support", "capture", "kill"].map((act) => [act, ops.filter((op) => op.act === act).length])),
      fell: ops.filter((op) => op.status === "fell").length,
      exposed: ops.filter((op) => op.status === "exposed").length,
      againstUS: ops.filter((op) => op.target === US).length,
      pairs: ops.map((op) => `${op.sponsor}>${op.target}`).join(" "),
    };
  });
  const started = out.map((row) => row.started);
  console.log(JSON.stringify({ mode: "npc", weeks, perTerm: { min: Math.min(...started), max: Math.max(...started), mean: r(started.reduce((a, b) => a + b, 0) / started.length, 2) }, seeds: out }, null, 1));
}

if (mode === "npc") npcMode(Number(weeksArg ?? 208));
else playerMode(Number(weeksArg ?? 104));
