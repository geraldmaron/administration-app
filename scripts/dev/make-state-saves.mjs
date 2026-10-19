// Writes importable saves for three screens no checked-in fixture reaches:
//
//   budget-building-toward  every statecraft ladder has a rung still to climb, so the
//                           Budget room's "building toward" rows render
//   budget-grace            the money ran out last week: the funding track's "Money ran
//                           out" stage, two weeks from shutdown
//   budget-grace-last       the last week of grace (a lapse a week from closing)
//   record-deep             60 weeks played, so the Record has hundreds of entries and the
//                           printed deep link names one far past the first page
//   war-powers-war          the United States joined Ukraine's war on Russia without a vote,
//                           so the sixty-day clock runs on the war screen
//   war-powers-strike       force committed against Ghana without a vote, and the war it
//                           was part of since settled, so the paper lives on Ghana's file
//   war-powers-extension    the same, seven weeks on, so the thirty-day extension can be certified
//
//   node scripts/dev/make-state-saves.mjs [--out <dir>] [--only budget-grace,record-deep]
//
// Needs the built dist (packages/engine, packages/player-core), like
// scripts/make-fixture-saves.mjs, whose resolver and fixture helpers it reuses. The
// default output directory is deliberately not apps/web/tests/.fixtures, which that
// generator clears of any name it does not own. Open one by importing it in the player.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import "../register-player-core.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dist = (path) => import(join(ROOT, path));
const { advanceWeeks, foundFixture } = await dist("scripts/fixtures/_campaign.mjs");
const { apply } = await dist("packages/engine/dist/effects.js");
const { createSave, loadSave } = await dist("packages/engine/dist/save.js");
const { SHUTDOWN_GRACE_TURNS, unfundedTurns, inShutdown } = await dist("packages/engine/dist/funding.js");
const { capabilityHorizons, foregroundLedger } = await dist("packages/player-core/dist/index.js");
const { selectBudget, joinConflict, openConflict } = await dist("packages/engine/dist/index.js");

function argValue(flag) {
  const at = process.argv.indexOf(flag);
  if (at === -1) return undefined;
  const value = process.argv[at + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value`);
  return value;
}

const opened = (seedText, weeks) => advanceWeeks(foundFixture({ seedText, leaderName: "Fixture President" }), weeks);

// Below every rung of every ladder in CAPABILITY_MILESTONES (packages/engine/src/budget.ts),
// so each account has a next rung to name. A real term reaches this only after years of
// neglect, which is why no played fixture shows the rows.
const WEAK = {
  softPower: { diplomaticReach: 0.1 },
  security: { intelCapability: 0.1 },
  military: { readiness: 0.2, branchStrength: { naval: 0.2, air: 0.3, land: 0.4 } },
};

function weakened(campaign) {
  const packet = {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: "Capabilities worn down for a fixture" },
    effects: [{ kind: "nationStat", nation: campaign.founding.nation, setStats: WEAK }],
  };
  return apply(campaign, packet);
}

// The date the government has been funded through, moved behind the current turn by `behind`
// weeks. Unfunded weeks are derived from it (`unfundedTurns`), never stored.
function funded(campaign, behind) {
  const throughTurn = campaign.turn - behind;
  return { ...campaign, congress: { ...campaign.congress, appropriation: { ...campaign.congress.appropriation, throughTurn } } };
}

// A war between two governments the United States then joins against `enemy`
// without a vote, which opens the War Powers report and its sixty-day clock.
function joinedAgainst(campaign, enemy, friend) {
  const conflict = openConflict(enemy, friend, campaign.turn, "A fixture war.");
  const open = { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
  const joined = joinConflict(open, open.founding.nation, conflict.id, "defender");
  if (!joined.ok) throw new Error(joined.reason);
  return { campaign: apply(open, joined.packet), war: conflict.id };
}

const STATES = {
  "budget-building-toward": () => {
    const campaign = weakened(opened("state-building-toward", 2));
    const rows = capabilityHorizons(campaign, selectBudget(campaign));
    if (rows.length === 0) throw new Error("no account is climbing toward a rung");
    return { campaign, note: `${rows.length} rows: ${rows.map((row) => `${row.accountName} -> ${row.milestone}`).join("; ")}. Open /budget` };
  },
  "budget-grace": () => {
    const campaign = funded(opened("state-grace", 2), 1);
    return { campaign, note: `unfunded ${unfundedTurns(campaign)} of ${SHUTDOWN_GRACE_TURNS} grace weeks. Open /budget` };
  },
  "budget-grace-last": () => {
    const campaign = funded(opened("state-grace", 2), SHUTDOWN_GRACE_TURNS);
    return { campaign, note: `unfunded ${unfundedTurns(campaign)} of ${SHUTDOWN_GRACE_TURNS} grace weeks. Open /budget` };
  },
  "war-powers-war": () => {
    const { campaign, war } = joinedAgainst(opened("state-war-powers", 2), "RUS", "UKR");
    return { campaign, note: `Open the Desk's War Powers row; it should land on /world/war/${encodeURIComponent(war)}#war-powers` };
  },
  "war-powers-strike": () => {
    const { campaign, war } = joinedAgainst(opened("state-war-powers", 2), "GHA", "TGO");
    const conflict = campaign.conflicts[war];
    const settled = { ...campaign, conflicts: { ...campaign.conflicts, [war]: { ...conflict, status: "settled" } } };
    return { campaign: settled, note: "Open the Desk's War Powers row; it should land on /world/nation/GHA?view=security#war-powers" };
  },
  "war-powers-extension": () => {
    const { campaign } = STATES["war-powers-strike"]();
    return { campaign: advanceWeeks(campaign, 7), note: "Open /world/nation/GHA?view=security#war-powers; the extension takes one of the fixed grounds" };
  },
  "record-deep": () => {
    const campaign = opened("state-record", 60);
    const newestFirst = [...foregroundLedger(campaign)].reverse();
    const target = newestFirst.slice(150).find((entry) => entry.causal?.eventId);
    if (!target) throw new Error("the ledger has no old entry with an event id to link to");
    return { campaign, note: `${newestFirst.length} entries. Open /record?event=${encodeURIComponent(target.causal.eventId)}` };
  },
};

function main() {
  const out = resolve(argValue("--out") ?? join(ROOT, "scripts", "dev", ".state-saves"));
  const only = argValue("--only")?.split(",").map((name) => name.trim()).filter(Boolean);
  const unknown = (only ?? []).filter((name) => !(name in STATES));
  if (unknown.length > 0) throw new Error(`unknown state(s): ${unknown.join(", ")}; known: ${Object.keys(STATES).join(", ")}`);
  mkdirSync(out, { recursive: true });
  for (const [name, build] of Object.entries(STATES)) {
    if (only && !only.includes(name)) continue;
    const { campaign, note } = build();
    const text = JSON.stringify(createSave(campaign));
    // The same call the vault's import makes, so a save the app would refuse fails here.
    loadSave(JSON.parse(text));
    const graceStage = !inShutdown(campaign) && unfundedTurns(campaign) > 0;
    writeFileSync(join(out, `${name}.json`), text);
    console.log(`${join(out, `${name}.json`)}  turn ${campaign.turn}${graceStage ? ", in grace" : ""}: ${note}`);
  }
}

main();
