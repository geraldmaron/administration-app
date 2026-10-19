#!/usr/bin/env node
// The failure-trajectory harness: does this game let a president fail, does it
// warn them first, and does it stay interesting while they do?
//
// The engine is pure and deterministic, so a whole presidency can be played
// programmatically through the player's running clock and campaign store. This
// script plays a hundred of them across five ways of governing and reports the
// numbers behind five claims: that failure is reachable, that it telegraphs,
// that the director does not low-ball a collapsing presidency, that a
// scenario's price is not the same in every political moment, and that doing
// nothing does not quietly work.
//
//   node scripts/sim-failure-trajectories.ts
//   node scripts/sim-failure-trajectories.ts --seeds 20 --horizon 104
//   node scripts/sim-failure-trajectories.ts --pool bundled --seeds 8
//   node scripts/sim-failure-trajectories.ts --coast          # the two-term horizon
//   node scripts/sim-failure-trajectories.ts --forecast-calibration --seeds 8 --archetype steady --json /tmp/forecast.json
//   node scripts/sim-failure-trajectories.ts --forecast-calibration --forecast-control hold --seeds 8 --archetype steady
//   node scripts/sim-failure-trajectories.ts --from run.json  # re-report a saved sweep
//
// Requires a built workspace: it imports the committed `dist/` of @admin/engine
// and @admin/content directly, the way every other script here reaches a
// package.
import { fork } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BEAT_THRESHOLDS, TERM_TURNS } from "../packages/engine/dist/index.js";
import { balanceSeeds, electoralSeeds } from "../packages/engine/dist/balance-harness.js";
import { loadPool } from "./sim/corpus-pool.ts";
import type { PoolName } from "./sim/corpus-pool.ts";
import { pressureBand } from "./sim/play.ts";
import type { AnsweredRecord, RunResult } from "./sim/play.ts";
import { ARCHETYPES } from "./sim/policies.ts";
import type { Archetype } from "./sim/policies.ts";
import type { Job } from "./sim/worker.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKER = path.join(HERE, "sim/worker.ts");
const SEVERITIES = ["routine", "serious", "critical"] as const;

// --- arguments ---------------------------------------------------------------

type Options = {
  readonly seeds: number;
  readonly horizon: number;
  readonly pool: PoolName;
  readonly workers: number;
  readonly archetypes: readonly Archetype[];
  readonly anyCharter: boolean;
  readonly calibration?: { readonly every: number; readonly members: number; readonly weeks: number; readonly control: "continue" | "hold" };
  readonly json?: string;
};

function parseArgs(argv: readonly string[]): Options {
  const flag = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const coast = argv.includes("--coast");
  const only = flag("archetype");
  const calibration = argv.includes("--forecast-calibration") ? {
    every: Number(flag("forecast-every") ?? 13),
    members: Number(flag("forecast-members") ?? 5),
    weeks: Number(flag("forecast-weeks") ?? 4),
    control: (flag("forecast-control") ?? "continue") as "continue" | "hold",
  } : undefined;
  if (calibration && (!Number.isInteger(calibration.every) || calibration.every < 1 || !Number.isInteger(calibration.members) || calibration.members < 2 || !Number.isInteger(calibration.weeks) || calibration.weeks < 1 || calibration.weeks > 20 || !["continue", "hold"].includes(calibration.control))) {
    throw new Error("Forecast calibration requires positive integer sampling intervals, at least two ensemble members, and a horizon of 1–20 weeks");
  }
  return {
    seeds: Number(flag("seeds") ?? (coast ? 8 : 20)),
    // Two in-game years by default: far enough past the removal window the arc
    // was tuned against to see whether pressure ever arrives, short enough that
    // a hundred campaigns finish while somebody is still watching.
    horizon: Number(flag("horizon") ?? (coast ? TERM_TURNS * 2 + 1 : 104)),
    pool: (flag("pool") ?? "corpus") as PoolName,
    workers: Number(flag("workers") ?? Math.max(2, Math.min(12, (globalThis.navigator?.hardwareConcurrency ?? 8) - 2))),
    archetypes: only ? [only as Archetype] : coast ? ["passive", "neglectful"] : ARCHETYPES,
    anyCharter: argv.includes("--any-charter"),
    ...(calibration ? { calibration } : {}),
    ...(flag("json") ? { json: flag("json")! } : {}),
  };
}

// --- statistics --------------------------------------------------------------

function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function share(count: number, total: number): string {
  return total === 0 ? "—" : `${Math.round((count / total) * 100)}%`;
}

const fmt = (value: number, places = 2) => (Number.isFinite(value) ? value.toFixed(places) : "—");

/** Pearson's r, for the two questions that are about a relationship rather than a level. */
function correlation(pairs: ReadonlyArray<readonly [number, number]>): number {
  if (pairs.length < 3) return Number.NaN;
  const n = pairs.length;
  const meanX = pairs.reduce((s, p) => s + p[0], 0) / n;
  const meanY = pairs.reduce((s, p) => s + p[1], 0) / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (const [x, y] of pairs) {
    cov += (x - meanX) * (y - meanY);
    varX += (x - meanX) ** 2;
    varY += (y - meanY) ** 2;
  }
  return varX === 0 || varY === 0 ? Number.NaN : cov / Math.sqrt(varX * varY);
}

// --- the sweep ---------------------------------------------------------------

function runJobs(jobs: readonly Job[], workers: number): Promise<readonly RunResult[]> {
  return new Promise((resolve, reject) => {
    const results: RunResult[] = [];
    let next = 0;
    let live = 0;
    const started = Date.now();
    const pool = Array.from({ length: Math.min(workers, jobs.length) }, () => fork(WORKER));

    const feed = (child: ReturnType<typeof fork>) => {
      const job = jobs[next];
      if (!job) {
        child.disconnect();
        return;
      }
      next += 1;
      live += 1;
      child.send(job);
    };

    for (const child of pool) {
      child.on("message", (result: RunResult) => {
        results.push(result);
        live -= 1;
        const done = results.length;
        process.stderr.write(
          `\r  ${done}/${jobs.length} campaigns  (${Math.round((Date.now() - started) / 1000)}s)   `,
        );
        if (done === jobs.length) {
          process.stderr.write("\n");
          for (const other of pool) if (other.connected) other.disconnect();
          resolve(results);
          return;
        }
        feed(child);
      });
      child.on("error", reject);
      feed(child);
    }
    if (jobs.length === 0) resolve(results);
    if (live === 0 && jobs.length > 0) reject(new Error("no worker accepted a job"));
  });
}

// --- reporting ---------------------------------------------------------------

function endingMix(runs: readonly RunResult[]): string {
  const counts = new Map<string, number>();
  for (const run of runs) counts.set(run.ending, (counts.get(run.ending) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([ending, count]) => `${ending} ${count}`)
    .join(", ");
}

function outcomeTable(runs: readonly RunResult[], archetypes: readonly Archetype[]): string[] {
  const rows = [
    "| archetype | n | ended | removed | median end turn | beats opened | peak pressure | telegraph (turns) |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const archetype of archetypes) {
    const mine = runs.filter((run) => run.archetype === archetype);
    if (mine.length === 0) continue;
    const ended = mine.filter((run) => run.ending !== "in-office");
    const removed = mine.filter((run) => run.ending === "removed");
    const telegraphs = ended.map((run) => run.telegraphTurns).filter((t): t is number => t !== undefined);
    rows.push(
      `| ${archetype} | ${mine.length} | ${share(ended.length, mine.length)} (${endingMix(mine)}) | ` +
        `${share(removed.length, mine.length)} | ${removed.length > 0 ? median(removed.map((r) => r.endTurn)) : "—"} | ` +
        `${fmt(median(mine.map((r) => r.beatTurns.length)), 1)} | ${fmt(median(mine.map((r) => r.peakPressure)), 3)} | ` +
        `${telegraphs.length > 0 ? fmt(median(telegraphs), 0) : "—"} |`,
    );
  }
  return rows;
}

function floorTable(runs: readonly RunResult[], archetypes: readonly Archetype[]): string[] {
  const rows = [
    "| archetype | min approval | min stability | min standing | min treasury (× opening) | turns insolvent |",
    "|---|---|---|---|---|---|",
  ];
  for (const archetype of archetypes) {
    const mine = runs.filter((run) => run.archetype === archetype);
    if (mine.length === 0) continue;
    rows.push(
      `| ${archetype} | ${fmt(median(mine.map((r) => r.floors.approval)), 3)} | ` +
        `${fmt(median(mine.map((r) => r.floors.stability)), 3)} | ${fmt(median(mine.map((r) => r.floors.standing)), 3)} | ` +
        `${fmt(median(mine.map((r) => r.floors.treasuryRatio)), 3)} | ${fmt(median(mine.map((r) => r.turnsInsolvent)), 0)} |`,
    );
  }
  return rows;
}

function beatLadderTable(runs: readonly RunResult[], archetypes: readonly Archetype[]): string[] {
  const rows = [
    `| archetype | reached beat 1 (${BEAT_THRESHOLDS[0]}) | beat 2 (${BEAT_THRESHOLDS[1]}) | beat 3 (${BEAT_THRESHOLDS[2]}) | median turn of beat 1 |`,
    "|---|---|---|---|---|",
  ];
  for (const archetype of archetypes) {
    const mine = runs.filter((run) => run.archetype === archetype);
    if (mine.length === 0) continue;
    const at = (index: number) => mine.filter((run) => run.beatTurns.length > index).length;
    const firsts = mine.map((run) => run.beatTurns[0]).filter((t): t is number => t !== undefined);
    rows.push(
      `| ${archetype} | ${share(at(0), mine.length)} | ${share(at(1), mine.length)} | ${share(at(2), mine.length)} | ` +
        `${firsts.length > 0 ? median(firsts) : "—"} |`,
    );
  }
  return rows;
}

/** The director's severity mix, cut by how much trouble the presidency was in. */
function severityByPressureTable(runs: readonly RunResult[]): string[] {
  const buckets = new Map<number, { total: number; counts: Record<string, number> }>();
  for (const run of runs) {
    for (const turn of run.turns) {
      const band = pressureBand(turn.pressure);
      const bucket = buckets.get(band) ?? { total: 0, counts: { routine: 0, serious: 0, critical: 0 } };
      for (const severity of turn.stagedSeverities) {
        bucket.counts[severity] = (bucket.counts[severity] ?? 0) + 1;
        bucket.total += 1;
      }
      buckets.set(band, bucket);
    }
  }
  const label = ["calm (no beat)", "beat 1 open", "beat 2 open", "beat 3 — removed"];
  const rows = ["| removal pressure | scenarios staged | routine | serious | critical |", "|---|---|---|---|---|"];
  for (const band of [...buckets.keys()].sort((a, b) => a - b)) {
    const bucket = buckets.get(band)!;
    rows.push(
      `| ${label[band] ?? band} | ${bucket.total} | ` +
        SEVERITIES.map((severity) => share(bucket.counts[severity] ?? 0, bucket.total)).join(" | ") +
        " |",
    );
  }
  const pairs = runs.flatMap((run) =>
    run.turns.flatMap((turn) =>
      turn.stagedSeverities.map(
        (severity) => [turn.pressure, SEVERITIES.indexOf(severity)] as readonly [number, number],
      ),
    ),
  );
  rows.push("", `Correlation between removal pressure and staged severity: **r = ${fmt(correlation(pairs), 3)}**.`);
  return rows;
}

/** Whether the same answer costs the same thing whatever week it is given in. */
function impactFlatnessTable(runs: readonly RunResult[]): string[] {
  const byReply = new Map<string, AnsweredRecord[]>();
  for (const run of runs) {
    for (const record of run.answered) {
      const key = `${record.scenario}#${record.replyId}`;
      byReply.set(key, [...(byReply.get(key) ?? []), record]);
    }
  }
  const repeated = [...byReply.entries()].filter(([, records]) => records.length >= 2);
  const spread = repeated.filter(([, records]) => new Set(records.map((r) => r.pressure.toFixed(1))).size >= 2);
  const identical = spread.filter(
    ([, records]) => new Set(records.map((r) => JSON.stringify(r.realized))).size === 1,
  );
  const pairs = runs.flatMap((run) =>
    run.answered.map((record) => [record.pressure, record.realizedHarm] as readonly [number, number]),
  );
  // The price tag the player weighs before deciding, as opposed to what the
  // packet turns out to move. If this never varies, the decision reads the same
  // whatever week it is taken in, which is the flatness the question is about.
  const quotedFlat = spread.filter(([, records]) => new Set(records.map((r) => r.projectedHarm)).size === 1);
  // Within one answer rather than across the corpus: pooling every reply mixes
  // "this answer is expensive" with "this week is bad" and reports neither.
  const within = spread
    .filter(([, records]) => records.length >= 4)
    .map(([, records]) => correlation(records.map((r) => [r.pressure, r.realizedHarm] as const)))
    .filter((r) => Number.isFinite(r));
  const projected = runs.flatMap((run) => run.answered.map((record) => record.projectedHarm));
  const realized = runs.flatMap((run) => run.answered.map((record) => record.realizedHarm));
  return [
    `- Distinct answers given: **${byReply.size}**; given more than once: **${repeated.length}**; given at two or more different pressure levels: **${spread.length}**.`,
    `- Of those, answers whose **quoted** cost — the figure on the reply the player weighs — was identical every time: **${quotedFlat.length}** (${share(quotedFlat.length, spread.length)}).`,
    `- Median within-answer correlation between pressure and realized cost, over the ${within.length} answers given four or more times: **r = ${fmt(median(within), 3)}**.`,
    `- Of those, answers whose charged metric movement was byte-identical every time: **${identical.length}** (${share(identical.length, spread.length)}).`,
    `- Correlation between removal pressure and what the answer actually cost: **r = ${fmt(correlation(pairs), 3)}**.`,
    `- Median projected cost the screen showed: **${fmt(median(projected), 3)}**; median cost actually charged: **${fmt(median(realized), 3)}**.`,
  ];
}

function deskTable(runs: readonly RunResult[], archetypes: readonly Archetype[]): string[] {
  const rows = [
    "| archetype | weekly offered documents | answered | offered but not answered at that sitting | weeks with an empty desk | replies refused |",
    "|---|---|---|---|---|---|",
  ];
  for (const archetype of archetypes) {
    const mine = runs.filter((run) => run.archetype === archetype);
    if (mine.length === 0) continue;
    const sum = (pick: (run: RunResult) => number) => mine.reduce((total, run) => total + pick(run), 0);
    const staged = sum((r) => r.scenariosStaged);
    const answered = sum((r) => r.scenariosAnswered);
    rows.push(
      `| ${archetype} | ${staged} | ${answered} | ${staged - answered - sum((r) => r.refusals)} | ` +
        `${sum((r) => r.emptyDeskTurns)} | ${sum((r) => r.refusals)} |`,
    );
  }
  return rows;
}

function answeredSeverityTable(runs: readonly RunResult[], archetypes: readonly Archetype[]): string[] {
  const rows = ["| archetype | scenarios answered | routine | serious | critical |", "|---|---|---|---|---|"];
  for (const archetype of archetypes) {
    const answered = runs.filter((run) => run.archetype === archetype).flatMap((run) => run.answered);
    if (answered.length === 0) continue;
    rows.push(
      `| ${archetype} | ${answered.length} | ` +
        SEVERITIES.map((severity) => share(answered.filter((r) => r.severity === severity).length, answered.length)).join(
          " | ",
        ) +
        " |",
    );
  }
  return rows;
}

function report(runs: readonly RunResult[], options: Options, poolSize: number, elapsed: number): string {
  const archetypes = options.archetypes;
  return [
    `# failure trajectories — ${runs.length} campaigns`,
    "",
    "Policy: one sampled decision per week, then seven days through the player's running clock. Case staging and lapse are active; this does not measure Continue attention-stop usability. Repeated offers can refer to the same pending occurrence.",
    "",
    ...diversityTable(runs),
    "",
    `pool **${options.pool}** (${poolSize} scenarios) · horizon **${options.horizon}** turns · ` +
      `seeds **${options.seeds}** · charters **${options.anyCharter ? "any" : "electoral only"}** · ${elapsed}s`,
    "",
    "## Outcomes",
    ...outcomeTable(runs, archetypes),
    "",
    "## The removal ladder",
    ...beatLadderTable(runs, archetypes),
    "",
    "## Metric floors",
    ...floorTable(runs, archetypes),
    "",
    "## What the desk offered",
    ...deskTable(runs, archetypes),
    "",
    ...answeredSeverityTable(runs, archetypes),
    "",
    "## Severity against pressure",
    ...severityByPressureTable(runs),
    "",
    "## Impact flatness",
    ...impactFlatnessTable(runs),
    ...(options.calibration ? ["", "## Forecast calibration", ...forecastCalibrationTable(runs, options)] : []),
    "",
  ].join("\n");
}

function forecastCalibrationTable(runs: readonly RunResult[], options: Options): string[] {
  const samples = runs.flatMap((run) => run.forecasts ?? []);
  const attempted = runs.reduce((sum, run) => sum + (run.forecastAttempts ?? 0), 0);
  const settled = samples.filter((sample) => sample.outcome === "settled");
  const odds = runs.flatMap((run) => run.actionOdds ?? []);
  const lines = [
    `Requested ${attempted} forecast samples, issued ${samples.length} displayed approval ranges across ${runs.length} campaigns and ${new Set(runs.map((run) => run.seed)).size} seeds; ${settled.length} settled, ${samples.length - settled.length} pending or unrecorded. Each range is the min–max of up to ${options.calibration!.members} belief-based ensemble members at ${options.calibration!.weeks} weeks. These are empirical displayed ranges, not nominal 90% intervals.`,
    `Control: ${options.calibration!.control === "hold" ? "no later player decisions before each target reading" : "the play policy continues acting"}. The sample is conditional on the listed play policies and decisions available every ${options.calibration!.every}th week; repeated forecasts in one campaign are correlated. No population calibration threshold is inferred from this batch.`,
    "| Staff confidence | settled / issued | inside displayed range | mean absolute approval miss |",
    "|---|---:|---:|---:|",
  ];
  for (const confidence of ["low", "moderate", "high"] as const) {
    const group = samples.filter((sample) => sample.confidence === confidence);
    const done = group.filter((sample) => sample.outcome === "settled");
    const hits = done.filter((sample) => sample.within).length;
    const miss = done.length ? done.reduce((sum, sample) => sum + Math.abs(sample.actual! - sample.band.median), 0) / done.length : Number.NaN;
    lines.push(`| ${confidence} | ${done.length} / ${group.length} | ${done.length ? `${hits}/${done.length} (${share(hits, done.length)})` : "—"} | ${fmt(miss, 3)} |`);
  }
  const withFollowUps = settled.filter((sample) => sample.followUps > 0);
  lines.push(`Follow-up decisions before target reading: ${withFollowUps.length}/${settled.length} settled forecasts; ${withFollowUps.filter((sample) => !sample.within).length} of those missed the displayed range. This is a control check, not causal attribution to one action.`);
  lines.push("", "Action execution odds, measured separately against the engine's projected success chance:", "| projected chance | outcomes | observed success | mean projected chance |", "|---|---:|---:|---:|");
  for (let bin = 0; bin < 5; bin++) {
    const group = odds.filter((entry) => Math.min(4, Math.floor(entry.chance * 5)) === bin);
    const hits = group.filter((entry) => entry.success).length;
    const mean = group.length ? group.reduce((sum, entry) => sum + entry.chance, 0) / group.length : Number.NaN;
    lines.push(`| ${bin * 20}–${(bin + 1) * 20}% | ${group.length} | ${group.length ? `${hits}/${group.length} (${share(hits, group.length)})` : "—"} | ${fmt(mean, 3)} |`);
  }
  const brier = odds.length ? odds.reduce((sum, entry) => sum + (entry.chance - Number(entry.success)) ** 2, 0) / odds.length : Number.NaN;
  lines.push(`Action odds Brier score: ${fmt(brier, 4)} over ${odds.length} executed actions. Small bins remain descriptive; no threshold is inferred from them.`);
  return lines;
}

function diversityTable(runs: readonly RunResult[]): string[] {
  return [
    "| seed / policy | answered | distinct templates | distinct classes | repeat-template answers |",
    "|---|---|---|---|---|",
    ...runs.map((run) => {
      const templates = new Set(run.answered.map((answer) => answer.scenario)).size;
      const classes = new Set(run.answered.map((answer) => answer.scenarioClass)).size;
      return `| ${run.seed} / ${run.archetype} | ${run.answered.length} | ${templates} | ${classes} | ${run.answered.length - templates} |`;
    }),
  ];
}

// --- entry -------------------------------------------------------------------

/**
 * Re-report a sweep that has already been played. Nine minutes of simulation
 * should not have to be spent again to add a column to a table, and a number in
 * the findings that came out of a saved run is the same number that came out of
 * the run — the `--json` file is the evidence, not a convenience.
 */
function reportFromFile(file: string): void {
  const saved = JSON.parse(readFileSync(file, "utf8")) as { options: Options; runs: RunResult[] };
  if (saved.runs.some((run) => run.floors.approval === undefined)) {
    throw new Error("This archive predates approval and the player-clock harness. Re-run it; old mandate measurements are not comparable.");
  }
  process.stdout.write(report(saved.runs, saved.options, loadPool(saved.options.pool).size, 0));
}

async function main(): Promise<void> {
  const fromIndex = process.argv.indexOf("--from");
  if (fromIndex >= 0) {
    reportFromFile(process.argv[fromIndex + 1]!);
    return;
  }
  const options = parseArgs(process.argv.slice(2));
  if (options.calibration && (!Number.isInteger(options.seeds) || options.seeds < 2)) {
    throw new Error("Forecast calibration needs at least two distinct seeds");
  }
  const loaded = loadPool(options.pool);
  if (loaded.unparseable > 0) {
    process.stderr.write(
      `warning: ${loaded.unparseable} shipped scenario line(s) fail the strict schema and were dropped, exactly as the app drops them.\n`,
    );
  }
  const seeds = options.anyCharter
    ? balanceSeeds(options.seeds)
    : electoralSeeds(options.seeds, options.seeds * 6);
  if (seeds.length < options.seeds) {
    process.stderr.write(`warning: only ${seeds.length} of ${options.seeds} seeds draw a charter that holds elections.\n`);
  }
  const jobs: Job[] = [];
  for (const archetype of options.archetypes) {
    for (const seed of seeds) jobs.push({ seed, archetype, poolName: options.pool, horizon: options.horizon, ...(options.calibration ? { calibration: options.calibration } : {}) });
  }
  process.stderr.write(
    `playing ${jobs.length} campaigns × ${options.horizon} turns on ${options.workers} workers ` +
      `(pool ${options.pool}, ${loaded.size} scenarios)\n`,
  );

  const started = Date.now();
  const runs = await runJobs(jobs, options.workers);
  const elapsed = Math.round((Date.now() - started) / 1000);
  process.stdout.write(report(runs, options, loaded.size, elapsed));
  if (options.json) {
    writeFileSync(options.json, JSON.stringify({ options, runs }, null, 2));
    process.stderr.write(`wrote ${options.json}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
