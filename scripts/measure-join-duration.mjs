// NPC war durations under the built engine's join, and under a no-join week.
//
// Imports only packages/engine/dist. Does not rebuild it. Today's draw is
// conflictPhase as shipped. No joins is the same phase handed a copy of the
// week whose trusts sit on the engine's own gate (trust <= 0.35), which skips
// the join roll before it is drawn. Wear is not a parameter of that phase, and
// the centered-join sketch is not a function the build exports, so those cells
// are reported as not measured.
//
//   node scripts/measure-join-duration.mjs
//   SEED_COUNT=1 node scripts/measure-join-duration.mjs
//   MODE=today node scripts/measure-join-duration.mjs

import { foundedForBalance } from "../packages/engine/dist/balance-harness.js";
import { campaignPhaseSequence, turnPhasesFrom } from "../packages/engine/dist/turn-phases.js";
import { advanceTurn } from "../packages/engine/dist/turn-loop.js";
import { conflictPhase } from "../packages/engine/dist/war-tick.js";

const TURNS = Number(process.env.WEEKS ?? 104);
const SEED_COUNT = Number(process.env.SEED_COUNT ?? 25);
const MODE = process.env.MODE ?? "both";
const JOIN_TRUST_GATE = 0.35;
const SEEDS = Array.from({ length: SEED_COUNT }, (_, index) => `npc-world-${index + 1}`);

function campaignAtJoinGate(campaign) {
  const relationships = {};
  for (const [key, rel] of Object.entries(campaign.relationships)) {
    relationships[key] = rel.trust > JOIN_TRUST_GATE ? { ...rel, trust: JOIN_TRUST_GATE } : rel;
  }
  return { ...campaign, relationships };
}

function conflictPhaseNoJoins(state) {
  return conflictPhase(campaignAtJoinGate(state));
}

function phasesFor(charter, mode) {
  const sequence = campaignPhaseSequence(charter).map((phase) =>
    phase.id === "conflictPhase" && mode === "no-joins" ? { id: phase.id, run: conflictPhaseNoJoins } : phase,
  );
  return turnPhasesFrom(sequence, false);
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(values, share) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(share * sorted.length) - 1)];
}

function warRow(conflict, endTurn, player) {
  const joiners = conflict.joined.aggressor.length + conflict.joined.defender.length;
  const entered = conflict.beats.filter((beat) => beat.description.includes("enters the war beside")).length;
  return {
    id: conflict.id,
    weeks: (conflict.endedTurn ?? endTurn) - conflict.startedTurn,
    outcome: conflict.status,
    ended: conflict.status !== "active",
    npc: conflict.aggressor !== player && conflict.defender !== player,
    joiners,
    entered,
  };
}

function summarize(rows) {
  const npc = rows.filter((row) => row.npc);
  const ended = npc.filter((row) => row.ended);
  const endedWeeks = ended.map((row) => row.weeks);
  const allWeeks = npc.map((row) => row.weeks);
  const outcomes = {};
  for (const row of npc) outcomes[row.outcome] = (outcomes[row.outcome] ?? 0) + 1;
  return {
    wars: npc.length,
    ended: ended.length,
    runningAtEnd: npc.length - ended.length,
    playerPrincipalWars: rows.length - npc.length,
    warsWithJoiners: npc.filter((row) => row.joiners > 0).length,
    joinEntries: npc.reduce((sum, row) => sum + row.entered, 0),
    endedWeeks: {
      median: median(endedWeeks),
      p90: percentile(endedWeeks, 0.9),
      min: endedWeeks.length ? Math.min(...endedWeeks) : null,
      max: endedWeeks.length ? Math.max(...endedWeeks) : null,
    },
    allWeeksRunningCountedToEnd: { median: median(allWeeks), p90: percentile(allWeeks, 0.9) },
    outcomes,
    endedWeekList: [...endedWeeks].sort((a, b) => a - b),
  };
}

function runSeed(seed, mode) {
  const { campaign, charter } = foundedForBalance(seed);
  const phases = phasesFor(charter, mode);
  let working = campaign;
  for (let week = 0; week < TURNS; week += 1) working = advanceTurn(working, phases);
  const player = working.founding.nation;
  return Object.values(working.conflicts).map((conflict) => warRow(conflict, working.turn, player));
}

function measure(mode) {
  const rows = [];
  for (const seed of SEEDS) {
    const wars = runSeed(seed, mode);
    rows.push(...wars);
    process.stderr.write(`${mode} ${seed} wars=${wars.length}\n`);
  }
  const summary = summarize(rows);
  if (mode === "no-joins" && summary.joinEntries !== 0) {
    throw new Error(`no-joins still recorded ${summary.joinEntries} join entries`);
  }
  return summary;
}

const notMeasured = {
  "centered-join":
    "probe-join-centered.mjs scores three set-piece wars once. The built conflictPhase has no joiner-list argument, and the sketch does not define a weekly join rule, so no duration was run.",
  "wear-halved":
    "Weekly wear is the private wornFront constant in packages/engine/dist/war-tick.js (0.04 + intensity * 0.06). conflictPhase takes no wear argument, so half wear was not run.",
};

const measured = {};
if (MODE === "both" || MODE === "today") measured["today-draw"] = measure("today");
if (MODE === "both" || MODE === "no-joins") measured["no-joins"] = measure("no-joins");

const report = {
  seeds: SEEDS,
  turns: TURNS,
  engine: "packages/engine/dist (not rebuilt)",
  medianDefinition: "even counts average the two middle weeks, matching scripts/measure-npc-world.mjs",
  p90Definition: "nearest-rank percentile",
  npcWars: "neither principal is the founding nation; a war still running is censored and kept out of endedWeeks",
  noJoinsMethod:
    "conflictPhase received a copy with every trust above 0.35 set to 0.35, the gate allyJoinEffects skips before drawing. The real relationship graph is what the rest of the week reads.",
  measured,
  notMeasured,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
