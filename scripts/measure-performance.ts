#!/usr/bin/env node
// The performance record: what a turn costs, in time and in memory, measured
// rather than reasoned about.
//
// The living-world work added eleven combatant commands, eighteen intelligence
// elements, fifty-seven institutions, twenty-eight trade sectors and eleven
// more nations, and closed with "performance: not measured. No timing or
// memory numbers were taken, and nothing is claimed." This script is what
// replaces that sentence with figures.
//
// It measures four things, because they fail in different ways:
//
//   1. **Per-turn wall time**, as a distribution rather than a mean. A p50 of
//      four milliseconds with a p99 of two hundred is a game that stutters
//      once a season, and a mean hides it completely.
//   2. **Growth against the ledger**, not against the turn number. A campaign
//      that walks its own history every week is linear per turn and quadratic
//      per campaign, and only shows up as a correlation between elapsed time
//      and ledger length.
//   3. **Retained heap**, sampled after a forced collection. A campaign is an
//      immutable structure rebuilt every turn; what matters is not the garbage
//      it makes but what it keeps.
//   4. **Save size and round-trip cost**, because the save is the one artifact
//      that crosses a wire and a disk on a phone.
//
// Every seed founds the campaign the player actually founds: the United States
// under its own constitution, with the first-ranked candidate in every seat,
// which is what the founding screen's quick oath seals. The balance harness's
// founding draws a charter from the seed across every constitution in the
// dataset, so two of three perf seeds used to time a government no player can
// found.
//
//   node --expose-gc scripts/measure-performance.ts
//   node --expose-gc scripts/measure-performance.ts --turns 208 --seeds 3 --json
//
// `--expose-gc` is optional; without it the heap figures are reported as
// unforced and flagged as such rather than quietly reported as if they were
// settled.
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "../packages/engine/dist/founding.js";
import { defaultLeaderDraft } from "../packages/engine/dist/leader.js";
import { makeCampaignSeed } from "../packages/engine/dist/rng.js";
import { worldDataset } from "../packages/world/dist/index.js";
import { campaignTurnPhases } from "../packages/engine/dist/turn-phases.js";
import { advanceTurn } from "../packages/engine/dist/turn-loop.js";
import { createSave, loadSave } from "../packages/engine/dist/save.js";
import { gzipSync } from "node:zlib";
import { cpus, loadavg } from "node:os";
import { fileURLToPath } from "node:url";

// True when this file is run as a script (`node measure-performance.ts`),
// false when a test imports it for its pure helpers — the run itself is
// three seeds of two hundred turns and has no business happening on import.
const isEntryPoint = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

function argValue(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  return idx === -1 ? fallback : (process.argv[idx + 1] ?? fallback);
}

const TURNS = Number(argValue("--turns", "208"));
const SEED_COUNT = Number(argValue("--seeds", "3"));
const AS_JSON = process.argv.includes("--json");

type Gc = (() => void) | undefined;
const gc = (globalThis as { gc?: () => void }).gc as Gc;
const FORCED = typeof gc === "function";

function settledHeapBytes(): number {
  // Two passes: the first collects, the second collects what the first made
  // unreachable. One pass reliably over-reports on V8.
  if (gc) {
    gc();
    gc();
  }
  return process.memoryUsage().heapUsed;
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo]! : sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

// A turn-time figure means nothing on its own; it only means something next
// to another run's. Two runs whose machine load differed are not that pair —
// a quiet host reads as a "speedup" over a contended one, and no line of
// engine code moved. Reporting load unconditionally, the same way `FORCED`
// is reported unconditionally, is what stops a reader from taking a delta at
// face value without first checking whether it is even eligible to be one.
export function loadAverageLine(startLoad: number, endLoad: number, cpuCount: number): string {
  const perCoreStart = cpuCount > 0 ? startLoad / cpuCount : 0;
  const perCoreEnd = cpuCount > 0 ? endLoad / cpuCount : 0;
  return (
    `load average: ${startLoad.toFixed(2)} -> ${endLoad.toFixed(2)} across ${cpuCount} cores ` +
    `(${perCoreStart.toFixed(2)} -> ${perCoreEnd.toFixed(2)} per core) — only compare turn-time ` +
    "figures against another run measured at a similar load; rerun both interleaved before quoting a delta"
  );
}

type SeedMeasurement = {
  readonly seed: string;
  readonly charter: string;
  readonly nations: number;
  readonly relationships: number;
  readonly turnsRun: number;
  readonly foundingMs: number;
  readonly p50Ms: number;
  readonly p90Ms: number;
  readonly p99Ms: number;
  readonly maxMs: number;
  readonly totalMs: number;
  /** Milliseconds of turn cost added per ledger entry. A quadratic campaign shows up here. */
  readonly msPerLedgerEntry: number;
  readonly firstTenMeanMs: number;
  readonly lastTenMeanMs: number;
  readonly ledgerLength: number;
  readonly retainedHeapMb: number;
  readonly heapPerTurnKb: number;
  readonly saveBytes: number;
  readonly storedBytes: number;
  readonly compressMs: number;
  readonly saveWriteMs: number;
  readonly saveReadMs: number;
};

/**
 * The quick-oath founding: the playable nation under the constitution it
 * names, and the first-ranked candidate per seat. Leaving the nation, charter,
 * cradle and flag out of the choices is what makes the seal resolve them the
 * way the founding screen does.
 */
function foundAsThePlayerDoes(seedText: string) {
  const seed = makeCampaignSeed(seedText);
  const leader = { ...defaultLeaderDraft(), name: "Performance President" };
  const nation = worldDataset.nations.find((entry) => entry.playable);
  const charter = worldDataset.charters.find((entry) => entry.id === nation?.identity.government);
  if (!nation || !charter) throw new Error("The dataset names no playable nation and charter to found under.");
  const pool = generateFoundingPool(seed, worldDataset);
  const slate = draftCabinetCandidates(charter, nation.id, pool);
  const cabinet = Object.fromEntries(Object.entries(slate).flatMap(([role, people]) => (people[0] ? [[role, people[0].id]] : [])));
  return { campaign: sealFounding(seed, worldDataset, { cabinet, leader }), charter };
}

function measureSeed(seed: string): SeedMeasurement {
  const foundingStart = process.hrtime.bigint();
  const { campaign: founded, charter } = foundAsThePlayerDoes(seed);
  const foundingMs = Number(process.hrtime.bigint() - foundingStart) / 1_000_000;
  const phases = campaignTurnPhases(charter);

  const baselineHeap = settledHeapBytes();

  let working = founded;
  const perTurnMs: number[] = [];
  const ledgerAt: number[] = [];
  for (let i = 0; i < TURNS; i++) {
    const start = process.hrtime.bigint();
    working = advanceTurn(working, phases);
    perTurnMs.push(Number(process.hrtime.bigint() - start) / 1_000_000);
    ledgerAt.push(working.ledger.length);
  }

  // Sampled while the campaign is still referenced, so this is what the
  // structure retains rather than what the run allocated.
  const retainedHeap = settledHeapBytes() - baselineHeap;

  const writeStart = process.hrtime.bigint();
  const save = createSave(working);
  const serialized = JSON.stringify(save);
  const saveWriteMs = Number(process.hrtime.bigint() - writeStart) / 1_000_000;
  // What a slot holds on disk: the save store gzips the JSON and keeps it as
  // base64 behind a four-character marker (player-core's payload codec).
  const compressStart = process.hrtime.bigint();
  const storedBytes = 4 + Math.ceil(gzipSync(serialized).length / 3) * 4;
  const compressMs = Number(process.hrtime.bigint() - compressStart) / 1_000_000;

  const readStart = process.hrtime.bigint();
  loadSave(JSON.parse(serialized));
  const saveReadMs = Number(process.hrtime.bigint() - readStart) / 1_000_000;

  const sorted = [...perTurnMs].sort((a, b) => a - b);
  const n = perTurnMs.length;
  const meanMs = perTurnMs.reduce((s, v) => s + v, 0) / n;
  const meanLedger = ledgerAt.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let varLedger = 0;
  for (let i = 0; i < n; i++) {
    cov += (perTurnMs[i]! - meanMs) * (ledgerAt[i]! - meanLedger);
    varLedger += (ledgerAt[i]! - meanLedger) ** 2;
  }

  return {
    seed,
    charter: String(charter.id),
    nations: Object.keys(working.nations).length,
    relationships: Object.keys(working.relationships).length,
    turnsRun: n,
    foundingMs: round(foundingMs),
    p50Ms: round(quantile(sorted, 0.5)),
    p90Ms: round(quantile(sorted, 0.9)),
    p99Ms: round(quantile(sorted, 0.99)),
    maxMs: round(sorted[sorted.length - 1] ?? 0),
    totalMs: round(perTurnMs.reduce((s, v) => s + v, 0)),
    msPerLedgerEntry: varLedger === 0 ? 0 : round4(cov / varLedger),
    firstTenMeanMs: round(perTurnMs.slice(0, 10).reduce((s, v) => s + v, 0) / 10),
    lastTenMeanMs: round(perTurnMs.slice(-10).reduce((s, v) => s + v, 0) / 10),
    ledgerLength: working.ledger.length,
    retainedHeapMb: round(retainedHeap / 1_048_576),
    heapPerTurnKb: round(retainedHeap / n / 1024),
    saveBytes: Buffer.byteLength(serialized, "utf8"),
    storedBytes,
    compressMs: round(compressMs),
    saveWriteMs: round(saveWriteMs),
    saveReadMs: round(saveReadMs),
  };
}

const round = (v: number) => Math.round(v * 100) / 100;
const round4 = (v: number) => Math.round(v * 10000) / 10000;

if (isEntryPoint) {
  const cpuCount = cpus().length;
  const loadAvgStart = loadavg()[0] ?? 0;
  const seeds = Array.from({ length: SEED_COUNT }, (_, i) => `perf-${i}`);
  const measurements = seeds.map(measureSeed);
  const loadAvgEnd = loadavg()[0] ?? 0;

  if (AS_JSON) {
    console.log(
      JSON.stringify({ forcedGc: FORCED, turns: TURNS, cpuCount, loadAvgStart: round(loadAvgStart), loadAvgEnd: round(loadAvgEnd), measurements }, null, 2),
    );
  } else {
    console.log(`turns=${TURNS} seeds=${SEED_COUNT} forcedGc=${FORCED}`);
    if (!FORCED) console.log("heap figures are UNFORCED — rerun with `node --expose-gc` before quoting them");
    console.log(loadAverageLine(loadAvgStart, loadAvgEnd, cpuCount));
    console.log(
      [
        "seed",
        "charter",
        "nations",
        "rels",
        "found ms",
        "p50",
        "p90",
        "p99",
        "max",
        "total ms",
        "ms/ledger",
        "first10",
        "last10",
        "ledger",
        "heap MB",
        "KB/turn",
        "save KB",
        "stored KB",
        "gzip ms",
        "write ms",
        "read ms",
      ].join("\t"),
    );
    for (const m of measurements) {
      console.log(
        [
          m.seed,
          m.charter,
          m.nations,
          m.relationships,
          m.foundingMs,
          m.p50Ms,
          m.p90Ms,
          m.p99Ms,
          m.maxMs,
          m.totalMs,
          m.msPerLedgerEntry,
          m.firstTenMeanMs,
          m.lastTenMeanMs,
          m.ledgerLength,
          m.retainedHeapMb,
          m.heapPerTurnKb,
          round(m.saveBytes / 1024),
          round(m.storedBytes / 1024),
          m.compressMs,
          m.saveWriteMs,
          m.saveReadMs,
        ].join("\t"),
      );
    }
    const growth = measurements.map((m) => m.lastTenMeanMs / Math.max(0.0001, m.firstTenMeanMs));
    console.log(
      `\nlast-ten / first-ten turn cost: ${growth.map((g) => g.toFixed(2)).join(", ")} ` +
        `— a campaign that walks its own history would climb with the ledger rather than sit near 1.`,
    );
  }
}
