#!/usr/bin/env node
// The SEC-28 battery: who joins a staged war, and when, measured the same way
// on every tree the wave produces so each join change is read against the one
// before it.
//
// Four staged wars — Russia against Estonia, Russia against Ukraine, China
// against Taiwan, and India against Pakistan — each opened on a fresh founding
// for seeds war-1 to war-12 and fought for 52 weeks by the war phase alone,
// the shape W3's staged battery took so its saved figures stay comparable.
// India against Pakistan is the fourth because a treaty the wave may model and
// neighbors in no alliance decide it.
//
// `--carried-world off` founds with the harness-only `carriedWorld: false`
// option, so the four wars are staged on an empty board and every cluster
// measures the same thing. `--carried-world on` founds the shipped world: a war
// the board already carries between the same pair is read from the board
// rather than staged a second time.
//
// `--mode draw` reports the joins as the tree decides them. `--mode peer` adds,
// for every government that stayed out, how its own weighing of the war would
// have gone (`joinCounterfactual`), printed "n/a" while the join is not
// weighed.
//
//   node scripts/probes/sec28-battery.mjs --mode draw --carried-world off --out <file>
//
// It imports the built engine, so a figure is only as fresh as the last build.
// Placed before the wave's baseline and held by the integrator; a workstream
// runs it and never edits it.
import { writeFileSync } from "node:fs";
import { foundedForBalance } from "../../packages/engine/dist/balance-harness.js";
import { openConflict } from "../../packages/engine/dist/conflicts.js";
import { conflictPhase } from "../../packages/engine/dist/war-tick.js";
import { apply } from "../../packages/engine/dist/effects.js";
import { joinCounterfactual } from "../../packages/engine/dist/war-join.js";

const WARS = [
  { key: "RUS-EST", aggressor: "RUS", defender: "EST" },
  { key: "RUS-UKR", aggressor: "RUS", defender: "UKR" },
  { key: "CHN-TWN", aggressor: "CHN", defender: "TWN" },
  { key: "IND-PAK", aggressor: "IND", defender: "PAK" },
];
const SEEDS = Array.from({ length: 12 }, (_, index) => `war-${index + 1}`);
const WEEKS = 52;

function option(name, allowed, fallback) {
  const at = process.argv.indexOf(name);
  const value = at >= 0 ? process.argv[at + 1] : fallback;
  if (allowed && !allowed.includes(value)) {
    console.error(`sec28-battery: ${name} must be one of ${allowed.join(", ")} (got ${value})`);
    process.exit(2);
  }
  return value;
}

const MODE = option("--mode", ["draw", "peer"], "draw");
const CARRIED = option("--carried-world", ["off", "on"], "off");
const OUT = option("--out", undefined, undefined);
const LABEL = option("--label", undefined, `${MODE}-carried-${CARRIED}`);

/** The war between the pair on the board at founding, or a freshly staged one. */
function stage(campaign, war) {
  const carried = Object.values(campaign.conflicts).find(
    (conflict) => conflict.status === "active" && conflict.aggressor === war.aggressor && conflict.defender === war.defender,
  );
  if (carried) return { campaign, conflictId: carried.id, carried: true };
  const conflict = openConflict(war.aggressor, war.defender, campaign.turn, `Staged for the battery: ${war.key}.`);
  const staged = apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: `The battery stages ${war.key}.` },
    effects: [{ kind: "conflict", set: conflict }],
  });
  return { campaign: staged, conflictId: conflict.id, carried: false };
}

/** Fifty-two weeks of the war phase alone, with the week advanced between them so each draw is its own week's. */
function fight(campaign, conflictId) {
  const joined = new Map();
  let working = campaign;
  let endedWeek;
  for (let week = 1; week <= WEEKS; week++) {
    for (const packet of conflictPhase(working)) working = apply(working, packet);
    working = { ...working, turn: working.turn + 1 };
    const conflict = working.conflicts[conflictId];
    for (const side of ["aggressor", "defender"]) {
      for (const nation of conflict.joined[side]) if (!joined.has(nation)) joined.set(nation, { nation, side, week });
    }
    if (conflict.status !== "active") {
      endedWeek = week;
      break;
    }
  }
  return { working, joiners: [...joined.values()], endedWeek, outcome: working.conflicts[conflictId].status };
}

function peers(working, conflictId, joiners) {
  const conflict = working.conflicts[conflictId];
  const inside = new Set([conflict.aggressor, conflict.defender, ...joiners.map((joiner) => joiner.nation)]);
  return Object.keys(working.nations)
    .filter((nation) => nation !== working.founding.nation && !inside.has(nation))
    .sort()
    .map((nation) => {
      const counterfactual = joinCounterfactual(working, conflictId, nation);
      return counterfactual ? { nation, side: counterfactual.side, margin: counterfactual.margin } : { nation, margin: "n/a" };
    });
}

function runOne(seed, war) {
  const { campaign } = foundedForBalance(seed, "democrat", {}, { carriedWorld: CARRIED === "on" });
  const staged = stage(campaign, war);
  const result = fight(staged.campaign, staged.conflictId);
  const us = campaign.founding.nation;
  return {
    seed,
    war: war.key,
    carried: staged.carried,
    joiners: result.joiners.filter((joiner) => joiner.nation !== us),
    usDraftWeek: result.joiners.find((joiner) => joiner.nation === us)?.week,
    endedWeek: result.endedWeek,
    outcome: result.outcome,
    ...(MODE === "peer" ? { peers: peers(result.working, staged.conflictId, result.joiners) } : {}),
  };
}

function nearestRank(values, share) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(share * sorted.length) - 1)];
}

function median(values) {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function summarize(runs) {
  const counts = runs.map((run) => run.joiners.length);
  const ended = runs.filter((run) => run.endedWeek !== undefined).map((run) => run.endedWeek);
  const drafts = runs.filter((run) => run.usDraftWeek !== undefined).map((run) => run.usDraftWeek);
  const joinWeeks = runs.flatMap((run) => run.joiners.map((joiner) => joiner.week));
  const frequency = {};
  for (const run of runs) for (const joiner of run.joiners) frequency[joiner.nation] = (frequency[joiner.nation] ?? 0) + 1;
  return {
    seeds: runs.length,
    carried: runs.some((run) => run.carried),
    usDrafts: drafts.length,
    usDraftWeeks: drafts,
    npcJoiners: {
      min: counts.length ? Math.min(...counts) : 0,
      p10: nearestRank(counts, 0.1),
      p50: nearestRank(counts, 0.5),
      p90: nearestRank(counts, 0.9),
      max: counts.length ? Math.max(...counts) : 0,
    },
    medianJoinWeek: median(joinWeeks),
    mostFrequentJoiners: Object.entries(frequency)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10),
    ended: { count: ended.length, medianWeek: median(ended) },
  };
}

const runs = WARS.flatMap((war) => SEEDS.map((seed) => runOne(seed, war)));
const report = {
  label: LABEL,
  spec: `openConflict + conflictPhase x${WEEKS}, seeds ${SEEDS[0]}..${SEEDS.at(-1)}, founded via foundedForBalance, carriedWorld ${CARRIED}, mode ${MODE}`,
  summary: Object.fromEntries(WARS.map((war) => [war.key, summarize(runs.filter((run) => run.war === war.key))])),
  runs,
};
const text = `${JSON.stringify(report, null, 1)}\n`;
if (OUT) writeFileSync(OUT, text);
else process.stdout.write(text);
