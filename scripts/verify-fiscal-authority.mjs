#!/usr/bin/env node
// The Appropriations Clause, as a build gate.
//
// `player.metrics.treasury` was a $2.47T unappropriated wallet: founded at nine
// percent of GDP, 1.73 times the entire discretionary budget of the United
// States, credited by tariffs and seizures and debt-limit bills, replenished by
// no phase at all, and overdrawable into deficit. It is now budget authority —
// a carry share of the appropriation Congress enacted, released a week at a
// time, floored at zero because an obligation in excess of an appropriation is
// void rather than borrowed.
//
// Nothing in that sentence is enforced by the type system. A single authored
// `treasuryOfGdp: 0.004` on a new order puts the wallet back, quietly, and
// every test in the suite stays green. So the five properties are checked here,
// in the shape verify-person-consequence-alignment.mjs uses: read both sides out
// of source, and fail rather than skip when a side can no longer be found.
//
// Static on purpose. It reads the engine's own source rather than running a
// campaign, because the build state is shared and a gate that compiled the
// workspace would be a gate nobody could run beside another one.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENGINE_SRC = path.join(root, "packages/engine/src");

const failures = [];

function read(rel) {
  try {
    return readFileSync(path.join(root, rel), "utf8");
  } catch {
    failures.push(`could not read ${rel} — it was moved or renamed. Update this gate; do not delete the check.`);
    return null;
  }
}

/** Pull one `const NAME = <number>;` out of a source file, failing when it is gone. */
function constant(source, rel, name) {
  if (source === null) return null;
  const match = source.match(new RegExp(`(?:export )?const ${name}\\s*=\\s*(-?[0-9._]+)\\s*;`));
  if (!match) {
    failures.push(
      `could not find \`${name}\` in ${rel} — it was renamed, moved or reshaped. ` +
        `Update this gate's expectation; do not delete the check.`,
    );
    return null;
  }
  return Number(match[1].replace(/_/g, ""));
}

function requirePresent(source, rel, needle, why) {
  if (source === null) return false;
  if (source.includes(needle)) return true;
  failures.push(`${rel} no longer contains \`${needle}\`: ${why}`);
  return false;
}

const funding = read("packages/engine/src/funding.ts");
const fiscal = read("packages/engine/src/fiscal.ts");
const effects = read("packages/engine/src/effects.ts");
const opening = read("packages/engine/src/opening-position.ts");
const phases = read("packages/engine/src/turn-phases.ts");

// --- 1. The founding stock is a share of the appropriation, never above it ---

const discretionaryBase = constant(funding, "packages/engine/src/funding.ts", "DISCRETIONARY_BASE");
const carryShare = constant(funding, "packages/engine/src/funding.ts", "AUTHORITY_CARRY_SHARE");

if (discretionaryBase !== null && carryShare !== null) {
  if (!(carryShare > 0 && carryShare < 1)) {
    failures.push(
      `AUTHORITY_CARRY_SHARE is ${carryShare}: an administration may hold a share of the year's discretionary ` +
        `appropriation and never the whole of it, or more. At or above 1 the founding stock is the wallet again.`,
    );
  }
  // The two figures a reader of the code and the docs is entitled to.
  const gdp = 27_498_847;
  const discretionary = Math.round(gdp * discretionaryBase);
  const founding = Math.round(gdp * discretionaryBase * carryShare);
  if (founding > discretionary) {
    failures.push(
      `the founding stock (${founding.toLocaleString("en-US")}) exceeds the discretionary outlay the same ` +
        `campaign computes (${discretionary.toLocaleString("en-US")}). That is the defect this gate exists for.`,
    );
  }
}

requirePresent(
  opening,
  "packages/engine/src/opening-position.ts",
  "openingBudgetAuthority(nation.stats.economy.gdp)",
  "the founding must read the appropriation's own carry share rather than deriving a stock from the size of the economy",
);

// --- 2. No overdraft: the floor is zero, in the one place metrics are written -

requirePresent(
  effects,
  "packages/engine/src/effects.ts",
  'key === "treasury" ? Math.max(0, value)',
  "clampMetric must floor budget authority at zero — an obligation in excess of an appropriation is void, not borrowed",
);

// --- 3. A phase credits it, and it is the appropriation's own release --------

const CREDITING_PHASE = "apportionmentPhase";
if (phases !== null && !new RegExp(`id: "${CREDITING_PHASE}"`).test(phases)) {
  failures.push(
    `campaignPhaseSequence contains no ${CREDITING_PHASE}: the stock would be a pure endowment again, ` +
      `depleting for a whole term with nothing to replenish it.`,
  );
}
requirePresent(
  fiscal,
  "packages/engine/src/fiscal.ts",
  "{ kind: \"metric\", deltas: { treasury: credit } }",
  "the apportionment phase must actually credit the authority it releases",
);

// --- 4. A phase writes the country's own books ------------------------------

const FISCAL_PHASE = "fiscalPhase";
if (phases !== null && !new RegExp(`id: "${FISCAL_PHASE}"`).test(phases)) {
  failures.push(
    `campaignPhaseSequence contains no ${FISCAL_PHASE}: nothing accumulates the deficit into the debt or ` +
      `compounds output under it, so the fiscal statement is a picture rather than a thing being steered.`,
  );
}
if (fiscal !== null) {
  const writesBooks = /setStats: \{\s*economy: \{\s*debt:[\s\S]{0,200}gdp:/.test(fiscal);
  if (!writesBooks) {
    failures.push(
      "fiscal.ts writes no `economy.debt` and `economy.gdp` levels: `selectDebtTrajectory` would be projecting " +
        "a path off a balance the simulation never applies.",
    );
  }
}

// --- 5. No positive authority delta outside the three permitted files --------
//
// An appropriation, a supplemental act, and a declared-emergency drawdown are
// the only three ways money reaches a President. Everything else that raises
// money for the government — a tariff, a seizure, a saving, a tax bill — belongs
// in the country's books under 31 U.S.C. § 3302(b).

const PERMITTED = new Set(["fiscal.ts", "legislation.ts", "emergency.ts"]);

/**
 * The one exemption, and it is a table of magnitudes rather than of credits.
 *
 * `INSTRUMENT_UNIT_COST` states what a rung of the ladder costs as a positive
 * figure and the call site applies the sign. Named here with its file so a
 * second such table cannot appear without this gate being told about it.
 */
const MAGNITUDE_TABLES = [{ file: "resolution.ts", constName: "INSTRUMENT_UNIT_COST" }];

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return entry === "__fixtures__" ? [] : sourceFiles(full);
    if (!entry.endsWith(".ts") || entry.endsWith(".test.ts") || entry.endsWith(".d.ts")) return [];
    return [full];
  });
}

/** The character ranges a named magnitude table occupies in this file. */
function exemptRanges(file, source) {
  return MAGNITUDE_TABLES.filter((table) => file.endsWith(table.file)).flatMap((table) => {
    const start = source.indexOf(`const ${table.constName}`);
    if (start === -1) {
      failures.push(
        `${table.file} no longer declares \`${table.constName}\` — this gate's exemption points at nothing. ` +
          `Remove the exemption or update it; an exemption that matches no code silently widens the rule.`,
      );
      return [];
    }
    const end = source.indexOf("\n};", start);
    return end === -1 ? [] : [[start, end]];
  });
}

const CREDIT_PATTERNS = [
  { label: "treasury delta", regex: /\btreasury:\s*(\d[\d_.]*)/g },
  { label: "treasuryOfGdp share", regex: /\btreasuryOfGdp:\s*(\d[\d_.]*)/g },
];

const files = sourceFiles(ENGINE_SRC);
if (files.length === 0) {
  failures.push("scanned no engine source files at all — this run proved nothing about where money comes from");
}

let scannedCredits = 0;
for (const file of files) {
  const rel = path.relative(root, file);
  const name = path.basename(file);
  const source = readFileSync(file, "utf8");
  const exempt = exemptRanges(file, source);
  for (const { label, regex } of CREDIT_PATTERNS) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source)) !== null) {
      const value = Number(match[1].replace(/_/g, ""));
      if (!(value > 0)) continue;
      if (exempt.some(([start, end]) => match.index >= start && match.index <= end)) continue;
      scannedCredits += 1;
      if (PERMITTED.has(name)) continue;
      const line = source.slice(0, match.index).split("\n").length;
      failures.push(
        `${rel}:${line} credits budget authority (${label} ${match[1]}). Only an enacted appropriation ` +
          `(fiscal.ts), a supplemental act (legislation.ts) and a declared-emergency drawdown (emergency.ts) may. ` +
          `Money the government raises belongs in the country's books — a nationStat write on \`economy\` — and ` +
          `reaches the President only through an appropriation.`,
      );
    }
  }
}

// --- 6. No act catalogue prices money in the unit the engine retired --------
//
// `treasuryCost: 60` was a flat sum with no unit attached to anybody: against
// the founding stock it was 0.0024%, a price on an act of government no
// president could see and none would ever weigh. Every priced act states money
// as a share of output for the same reason the instrument ladder does.

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const match = source.match(/\btreasuryCost\b/);
  if (!match) continue;
  const line = source.slice(0, match.index).split("\n").length;
  failures.push(
    `${path.relative(root, file)}:${line} prices an act in \`treasuryCost\`, the flat unit orders.ts retired. ` +
      `State money as \`treasuryOfGdp\` and resolve it through \`playerGdp\`, the way every other priced act does.`,
  );
}

if (failures.length) {
  console.error(`verify-fiscal-authority: ${failures.length} problem(s) with where the President's money comes from:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\nThe rule in one sentence: the stock is a share of the enacted appropriation, released weekly, floored at " +
      "zero, and credited by nothing else. See docs/ARCHITECTURE.md §\"Two books for one government\".",
  );
  process.exit(1);
}

console.log(
  `verify-fiscal-authority: the founding, the floor, the apportionment and the country's books all hold; ` +
    `${files.length} engine sources scanned, ${scannedCredits} authored authority credit(s), none outside the ` +
    `three permitted files`,
);
