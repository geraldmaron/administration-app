#!/usr/bin/env node
// verify-fiscal-authority.mjs passing on a clean tree proves only that it ran.
// This runs it against deliberately broken copies of the engine and fails
// unless the gate catches each break — including the two cases where the gate
// can no longer see one of the things it compares, which must fail rather than
// quietly check nothing.
//
// The fixtures are written to a scratch directory laid out like the repo, so a
// crashed run can never leave a planted tariff credit behind in the real tree.
import { cpSync, mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENGINE_REL = "packages/engine/src";
const GATE_REL = "scripts/verify-fiscal-authority.mjs";

/** Lay the engine's source and the gate out inside a throwaway root. */
function stage() {
  const dir = mkdtempSync(path.join(tmpdir(), "fiscal-authority-proof-"));
  mkdirSync(path.join(dir, ENGINE_REL), { recursive: true });
  cpSync(path.join(root, ENGINE_REL), path.join(dir, ENGINE_REL), { recursive: true });
  mkdirSync(path.join(dir, "scripts"), { recursive: true });
  copyFileSync(path.join(root, GATE_REL), path.join(dir, GATE_REL));
  return dir;
}

function edit(dir, rel, from, to) {
  const file = path.join(dir, rel);
  const before = readFileSync(file, "utf8");
  if (!before.includes(from)) {
    throw new Error(`proof fixture could not apply its edit to ${rel}: ${from} not present`);
  }
  writeFileSync(file, before.replace(from, to));
}

/** Run the staged gate. Returns true when it FAILED, which is what a fixture wants. */
function gateRejects(dir) {
  try {
    execFileSync(process.execPath, [path.join(dir, GATE_REL)], { stdio: "pipe" });
    return false;
  } catch {
    return true;
  }
}

const cases = [
  {
    name: "a tariff rung that credits the President's own account again",
    apply: (dir) =>
      edit(
        dir,
        `${ENGINE_REL}/instruments-economic.ts`,
        // The rung's own return, since W3 replaced the general-fund helper
        // with imposeTariff plus a debt-effect filter. The plant makes the
        // tariff pay the President directly, which is the defect class.
        "  return [dependence, ...imposed.packet.effects.filter((effect) => !dropsDebt(effect))];",
        "  return [dependence, { kind: \"metric\", deltas: { treasury: 13749 } }];",
      ),
  },
  {
    name: "an authored order that raises money for the presidency instead of costing it",
    apply: (dir) => edit(dir, `${ENGINE_REL}/orders.ts`, "treasuryOfGdp: -0.0002,", "treasuryOfGdp: 0.0002,"),
  },
  {
    name: "a carry share that hands over the whole year's appropriation on day one",
    apply: (dir) =>
      edit(dir, `${ENGINE_REL}/funding.ts`, "export const AUTHORITY_CARRY_SHARE = 0.25;", "export const AUTHORITY_CARRY_SHARE = 1.5;"),
  },
  {
    name: "an overdraft permitted at the one place metrics are written",
    apply: (dir) =>
      edit(dir, `${ENGINE_REL}/effects.ts`, 'key === "treasury" ? Math.max(0, value)', 'key === "treasury" ? value'),
  },
  {
    name: "a founding that derives the stock from the size of the economy again",
    apply: (dir) =>
      edit(
        dir,
        `${ENGINE_REL}/opening-position.ts`,
        "treasury: openingBudgetAuthority(nation.stats.economy.gdp),",
        "treasury: Math.round(nation.stats.economy.gdp * 0.09),",
      ),
  },
  {
    name: "a sequence with nothing left to replenish the authority",
    apply: (dir) =>
      edit(dir, `${ENGINE_REL}/turn-phases.ts`, '{ id: "apportionmentPhase", run: apportionmentPhase },', ""),
  },
  {
    name: "a sequence in which the deficit never reaches the debt",
    apply: (dir) => edit(dir, `${ENGINE_REL}/turn-phases.ts`, '{ id: "fiscalPhase", run: fiscalPhase },', ""),
  },
  {
    name: "a renamed constant the gate can no longer see (must fail, not skip)",
    apply: (dir) =>
      edit(dir, `${ENGINE_REL}/funding.ts`, "export const DISCRETIONARY_BASE", "export const DISCRETIONARY_LINE"),
  },
  {
    name: "an act catalogue that goes back to a flat money figure",
    apply: (dir) =>
      edit(dir, `${ENGINE_REL}/locale-acts.ts`, "    treasuryOfGdp: -0.00025,", "    treasuryCost: 60,"),
  },
  {
    name: "an exemption pointing at a magnitude table that no longer exists (must fail, not widen)",
    apply: (dir) => edit(dir, `${ENGINE_REL}/resolution.ts`, "const INSTRUMENT_UNIT_COST", "const LADDER_UNIT_COST"),
  },
];

const failures = [];

// The clean staging must PASS, or every rejection below proves nothing about
// the fixture and only that the gate fails on everything.
{
  const dir = stage();
  if (gateRejects(dir)) {
    failures.push("the gate rejects an UNMODIFIED tree — it is failing for some reason other than the fixtures");
  }
  rmSync(dir, { recursive: true, force: true });
}

for (const testCase of cases) {
  const dir = stage();
  try {
    testCase.apply(dir);
    if (!gateRejects(dir)) failures.push(`the gate accepted ${testCase.name}`);
  } catch (error) {
    failures.push(`could not stage "${testCase.name}": ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (failures.length) {
  console.error(`verify-fiscal-authority-proof: ${failures.length} problem(s) with the gate itself:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\nA gate that passes a planted wallet is a gate that will pass the next one. Fix " +
      "scripts/verify-fiscal-authority.mjs rather than this file.",
  );
  process.exit(1);
}

console.log(
  `verify-fiscal-authority-proof: the gate rejects all ${cases.length} deliberate breaks and accepts a clean tree`,
);
