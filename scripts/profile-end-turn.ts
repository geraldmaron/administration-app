#!/usr/bin/env node
// Profiles a single simulated turn's real cost across a campaign, to test the
// hypothesis that one end-turn packet is folded quadratically (about 430 of
// 450 ms) directly rather than trusting the test-suite wall time it was
// inferred from. Runs one seeded campaign through campaignTurnPhases,
// timing each advanceTurn call with process.hrtime and recording the ledger
// length and relationship-with-grudges count alongside it, so a quadratic
// trend (rather than a flat per-turn cost) shows up as a correlation between
// elapsed time and ledger length rather than turn number.
//
//   node scripts/profile-end-turn.ts
//   node scripts/profile-end-turn.ts --turns 208 --seed profiling-seed-1
import { foundedForBalance } from "../packages/engine/dist/balance-harness.js";
import { campaignTurnPhases } from "../packages/engine/dist/turn-phases.js";
import { advanceTurn } from "../packages/engine/dist/turn-loop.js";

function argValue(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  return idx === -1 ? fallback : (process.argv[idx + 1] ?? fallback);
}

const TURNS = Number(argValue("--turns", "208"));
const SEED = argValue("--seed", "profiling-seed-1");

const { campaign: founded, charter } = foundedForBalance(SEED);
const phases = campaignTurnPhases(charter);

console.log(`seed=${SEED} charter=${charter.id} turns=${TURNS} relationships=${Object.keys(founded.relationships).length}`);
console.log("turn\tms\tledgerLen\trelWithGrudges\tcumMs");

let working = founded;
let cumMs = 0;
const rows: { turn: number; ms: number; ledgerLen: number; relWithGrudges: number }[] = [];

for (let i = 0; i < TURNS; i++) {
  const start = process.hrtime.bigint();
  working = advanceTurn(working, phases);
  const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
  cumMs += ms;
  const relWithGrudges = Object.values(working.relationships).filter((r) => r.grudges.length > 0).length;
  rows.push({ turn: working.turn, ms, ledgerLen: working.ledger.length, relWithGrudges });
  if (i < 5 || i % 20 === 0 || i === TURNS - 1) {
    console.log(`${working.turn}\t${ms.toFixed(2)}\t${working.ledger.length}\t${relWithGrudges}\t${cumMs.toFixed(0)}`);
  }
}

// Cheap correlation check: does per-turn ms track ledger length (quadratic
// growth signature) or stay flat regardless of it (linear, ledger-independent)?
const n = rows.length;
const meanMs = rows.reduce((s, r) => s + r.ms, 0) / n;
const meanLedger = rows.reduce((s, r) => s + r.ledgerLen, 0) / n;
let cov = 0;
let varLedger = 0;
for (const r of rows) {
  cov += (r.ms - meanMs) * (r.ledgerLen - meanLedger);
  varLedger += (r.ledgerLen - meanLedger) ** 2;
}
const slopeMsPerLedgerEntry = cov / varLedger;

console.log(`\nfirst-10-turns mean ms: ${(rows.slice(0, 10).reduce((s, r) => s + r.ms, 0) / 10).toFixed(2)}`);
console.log(`last-10-turns mean ms: ${(rows.slice(-10).reduce((s, r) => s + r.ms, 0) / 10).toFixed(2)}`);
console.log(`final ledger length: ${rows[n - 1]!.ledgerLen}`);
console.log(`regression slope (ms per ledger entry, linear fit across the whole run): ${slopeMsPerLedgerEntry.toFixed(6)} ms/entry`);
console.log(`total wall time for ${TURNS} turns: ${cumMs.toFixed(0)} ms (mean ${(cumMs / TURNS).toFixed(2)} ms/turn)`);
