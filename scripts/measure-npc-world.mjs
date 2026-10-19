// What the world does while nobody is at the desk.
//
// The same measurement `packages/engine/src/npc-world.probe.test.ts` runs over
// source, run here over the built engine so it can be taken after a build
// without a test runner. Five seeds by a hundred and four weeks, the run the
// 2026-09-09 audit recorded its figures over, so the numbers printed here are
// directly comparable to that audit's baseline over the same run: 6 of 1,431
// NPC actions aimed at the President, and 17 of 25 ladder rungs never taken by
// any government.
//
//   node scripts/measure-npc-world.mjs
//
// `dist/` is tracked and stale until the workspace is rebuilt; a figure taken
// from a stale build is a figure about a build nobody is running.

import { foundedForBalance } from "../packages/engine/dist/balance-harness.js";
import { campaignTurnPhases } from "../packages/engine/dist/turn-phases.js";
import { advanceTurn } from "../packages/engine/dist/turn-loop.js";
import { initiativeRate, npcActorsThisTurn } from "../packages/engine/dist/npc-turn.js";
import { createRngStreams } from "../packages/engine/dist/rng.js";
import { expectedDwellWeeks } from "../packages/engine/dist/business-cycle.js";
import { outputGap } from "../packages/engine/dist/macro-state.js";
import { governmentShift } from "../packages/engine/dist/fiscal-impulse.js";
import { booksFor, stationaryPrimaryBalance, trendGrowth } from "../packages/engine/dist/national-books.js";
import { borrowingCapacity, nonErodibleShareOf } from "../packages/engine/dist/sovereign.js";
import { debtToGdp } from "../packages/world/dist/index.js";
import { durationReport, warRecords } from "./npc-world-report/durations.mjs";
import { npcShareOfSeed, npcShareReport } from "./npc-world-report/npc-share.mjs";
import { electionsOfSeed, electionsReport } from "./npc-world-report/elections.mjs";

const SEEDS = ["npc-world-1", "npc-world-2", "npc-world-3", "npc-world-4", "npc-world-5"];
const TURNS = 104;
const TURNS_PER_QUARTER = 13;

const bump = (into, key) => {
  into[key] = (into[key] ?? 0) + 1;
};


const edgesToward = (campaign, player) => Object.values(campaign.relationships).filter((r) => r.to === player);

const moved = (a, b) => Math.abs(a - b) >= 0.001;

const round = (value) => Math.round(value * 1000) / 1000;

function topShare(counts) {
  const values = Object.values(counts);
  if (values.length === 0) return 0;
  return Math.max(...values) / values.reduce((sum, n) => sum + n, 0);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : (sorted[mid] ?? 0);
}

// --- The world economy (every nation but the one the campaign is played from) ---
//
// What nothing measured before: whether the world's economies turn, how often
// they open the named economic conditions, what happens to their books and
// ratings, and which fiscal programs their governments choose. Each figure a
// band has been set for carries it beside the value; the rest are reported so
// the next change has a reference.

const PHASES = ["expansion", "peak", "contraction", "trough"];
const ECONOMIC_KINDS = ["recession", "inflation-shock", "unemployment-shock", "fiscal-crisis", "energy-shortage", "housing-crunch"];

function economyTally(campaign) {
  return { onsets: Object.fromEntries(ECONOMIC_KINDS.map((kind) => [kind, 0])), onsetsInSlump: 0, recessions: 0, phaseWeeks: [], opening: campaign };
}

function tallyWeek(tally, before, after) {
  for (const [id, condition] of Object.entries(after.conditions)) {
    if (before.conditions[id] !== undefined || !(condition.kind in tally.onsets)) continue;
    tally.onsets[condition.kind] += 1;
    if (condition.kind !== "recession") continue;
    tally.recessions += 1;
    const phase = after.cycles[condition.nation]?.phase;
    if (phase === "contraction" || phase === "trough") tally.onsetsInSlump += 1;
  }
  const counts = Object.fromEntries(PHASES.map((phase) => [phase, 0]));
  for (const cycle of Object.values(after.cycles)) counts[cycle.phase] += 1;
  tally.phaseWeeks.push(counts);
}

function fiscalPrograms(campaign) {
  const programs = {};
  for (const program of Object.values(campaign.governments)) bump(programs, program.fiscal ?? "none");
  return programs;
}

// Whether a government's books demand consolidation, read from the credit
// readings rather than the purse that picks the program: shut out of the
// markets (B or worse, or in a fiscal crisis), or a structural primary balance
// more than a point of output below the one that holds its ratio at founding
// rates. The same reading `macro-balance.test.ts` bounds austerity by.
function consolidationDemanded(campaign, nation) {
  if (borrowingCapacity(campaign, nation) === 0) return true;
  const runtime = campaign.nations[nation];
  const books = booksFor(campaign, runtime);
  const us = campaign.founding.nation;
  const holding = stationaryPrimaryBalance({
    ratio: debtToGdp(runtime.stats),
    rate: books.anchor.rate,
    growth: trendGrowth(runtime),
    inflation: campaign.macro?.[nation]?.expectedInflation ?? runtime.base.stats.economy.inflation,
    usInflation: campaign.macro?.[us]?.expectedInflation ?? runtime.base.stats.economy.inflation,
    nonErodible: nonErodibleShareOf(runtime),
  });
  const program = governmentShift(campaign, nation);
  const structural = books.anchor.primaryBalance + (program.take - program.outlays) - (books.anchor.programBalance ?? 0);
  return holding - structural > 0.01;
}

function austerityByDemand(campaign) {
  const split = { demanded: { austerity: 0, all: 0 }, free: { austerity: 0, all: 0 } };
  for (const [nation, program] of Object.entries(campaign.governments)) {
    const group = consolidationDemanded(campaign, nation) ? split.demanded : split.free;
    group.all += 1;
    if (program.fiscal === "fiscal-austerity") group.austerity += 1;
  }
  return split;
}

function economyOf(tally, working) {
  const player = working.founding.nation;
  const foreign = Object.keys(working.nations).filter((id) => id !== player);
  const drift = foreign.map((id) => Math.abs(debtToGdp(working.nations[id].stats) - debtToGdp(tally.opening.nations[id].stats)));
  const reserves = foreign.map((id) => working.nations[id].stats.economy.reserves / Math.max(1, tally.opening.nations[id].stats.economy.reserves));
  const lettersMoved = foreign.filter((id) => working.nations[id].stats.economy.sovereignRating !== tally.opening.nations[id].stats.economy.sovereignRating).length;
  const gaps = foreign.map((id) => outputGap(working, id));
  return {
    nations: foreign.length,
    onsets: tally.onsets,
    recessions: tally.recessions,
    onsetsInSlump: tally.onsetsInSlump,
    phaseWeeks: tally.phaseWeeks,
    medianRatioDrift: median(drift),
    medianReservesRatio: median(reserves),
    lettersMoved,
    medianGap: median(gaps),
    programsAtFounding: fiscalPrograms(tally.opening),
    programsAtEnd: fiscalPrograms(working),
    austerityAtEnd: austerityByDemand(working),
  };
}

const band = (value, low, high) => ({ value: round(value), band: [low, high], within: value >= low && value <= high });

function economyReport(runs) {
  const economies = runs.map((run) => run.economy);
  const nationYears = economies.reduce((sum, e) => sum + e.nations * (TURNS / 52), 0);
  const recessions = economies.reduce((sum, e) => sum + e.recessions, 0);
  const inSlump = economies.reduce((sum, e) => sum + e.onsetsInSlump, 0);
  const total = PHASES.reduce((sum, phase) => sum + expectedDwellWeeks(phase), 0);
  const settled = economies.flatMap((e) => e.phaseWeeks.slice(52));
  const phaseShare = (phase) => median(settled.map((week) => week[phase] / Object.values(week).reduce((a, b) => a + b, 0)));
  const programs = merge(economies, (e) => e.programsAtEnd);
  const governments = Object.values(programs).reduce((a, b) => a + b, 0) || 1;
  return {
    phaseShareMedianAfterWeek52: Object.fromEntries(
      PHASES.map((phase) => [phase, band(phaseShare(phase), expectedDwellWeeks(phase) / total - 0.2, expectedDwellWeeks(phase) / total + 0.2)]),
    ),
    recessionOnsetsPerNationYear: band(recessions / nationYears, 0.05, 0.15),
    recessionOnsetsInsideContractionOrTrough: band(inSlump / Math.max(1, recessions), 1, 1),
    economicOnsetsPerNationYear: Object.fromEntries(
      ECONOMIC_KINDS.map((kind) => [kind, round(economies.reduce((sum, e) => sum + e.onsets[kind], 0) / nationYears)]),
    ),
    medianForeignRatioDrift: economies.map((e) => round(e.medianRatioDrift)),
    medianForeignReservesRatio: economies.map((e) => round(e.medianReservesRatio)),
    foreignLettersMoved: economies.map((e) => e.lettersMoved),
    medianForeignGap: economies.map((e) => round(e.medianGap)),
    fiscalProgramsAtFounding: merge(economies, (e) => e.programsAtFounding),
    fiscalProgramsAtEnd: programs,
    // From 192 of 195 on public investment to a majority at most.
    investmentShareAtEnd: band((programs["fiscal-investment"] ?? 0) / governments, 0, 0.5),
    austerityShareAtEnd: austerityShares(economies),
  };
}

// Austerity is the answer to books that demand it, so its share is reported
// in both groups; among the governments free to choose it stays under half.
function austerityShares(economies) {
  const sum = (pick) => economies.reduce((total, e) => total + pick(e.austerityAtEnd), 0);
  const free = { austerity: sum((a) => a.free.austerity), all: sum((a) => a.free.all) };
  const demanded = { austerity: sum((a) => a.demanded.austerity), all: sum((a) => a.demanded.all) };
  return {
    whereBooksDoNotDemandIt: { ...band(free.austerity / Math.max(1, free.all), 0, 0.5), governments: free.all },
    whereBooksDemandIt: { value: round(demanded.austerity / Math.max(1, demanded.all)), governments: demanded.all },
    overall: round((free.austerity + demanded.austerity) / Math.max(1, free.all + demanded.all)),
  };
}

function conditionQuarterReport(runs) {
  const quarters = [0, 1, 2, 3].map((quarter) => runs.reduce((sum, run) => sum + run.conditionQuarters[quarter], 0));
  const total = quarters.reduce((a, b) => a + b, 0) || 1;
  return { quarters, smallestShare: band(Math.min(...quarters) / total, 0.15, 0.25) };
}

function emptyQuarters(turns) {
  const hit = new Set(turns.map((turn) => Math.floor((turn - 1) / TURNS_PER_QUARTER)));
  let empty = 0;
  for (let q = 0; q < Math.ceil(TURNS / TURNS_PER_QUARTER); q++) if (!hit.has(q)) empty += 1;
  return empty;
}

function runSeed(seedText) {
  const { campaign, charter } = foundedForBalance(seedText);
  const phases = campaignTurnPhases(charter);
  const player = campaign.founding.nation;
  const selections = {};
  const initiativeRates = {};
  for (const id of Object.keys(campaign.nations)) {
    if (id !== player) initiativeRates[id] = initiativeRate(campaign, id);
  }
  const opening = new Map(edgesToward(campaign, player).map((r) => [r.from, r]));

  let working = campaign;
  const economy = economyTally(campaign);
  for (let i = 0; i < TURNS; i++) {
    for (const id of npcActorsThisTurn(working, createRngStreams(working.seed))) bump(selections, id);
    const before = working;
    working = advanceTurn(working, phases);
    tallyWeek(economy, before, working);
  }

  const byInstrument = {};
  const byRung = {};
  const atPlayerByRung = {};
  const playerActionTurns = [];
  let actions = 0;
  let atPlayer = 0;
  for (const entry of working.ledger) {
    if (entry.actor !== "world" || !entry.commitment) continue;
    actions += 1;
    bump(byInstrument, entry.commitment.instrument);
    bump(byRung, `${entry.commitment.instrument}-${entry.commitment.rung}`);
    if (entry.commitment.target === player) {
      atPlayer += 1;
      playerActionTurns.push(entry.turn);
      bump(atPlayerByRung, `${entry.commitment.instrument}-${entry.commitment.rung}`);
    }
  }

  const pursuitPairs = {};
  const rungReached = {};
  const pursuitStatus = {};
  for (const pursuit of Object.values(working.pursuits)) {
    bump(pursuitPairs, `${pursuit.actor}->${pursuit.target}`);
    bump(rungReached, String(pursuit.rungReached));
    bump(pursuitStatus, pursuit.status);
  }

  let edgesTowardPlayerMoved = 0;
  let militaryThreatTowardPlayerMoved = 0;
  for (const edge of edgesToward(working, player)) {
    const before = opening.get(edge.from);
    if (!before) continue;
    if (
      moved(before.trust, edge.trust) ||
      moved(before.alignment, edge.alignment) ||
      moved(before.tension, edge.tension) ||
      moved(before.militaryThreat, edge.militaryThreat)
    ) {
      edgesTowardPlayerMoved += 1;
    }
    if (moved(before.militaryThreat, edge.militaryThreat)) militaryThreatTowardPlayerMoved += 1;
  }

  return {
    selections,
    initiativeRates,
    byInstrument,
    byRung,
    atPlayerByRung,
    actions,
    atPlayer,
    playerActionTurns,
    pursuitPairs,
    rungReached,
    pursuitStatus,
    npcConflicts: Object.values(working.conflicts).filter((c) => c.aggressor !== player && c.defender !== player)
      .length,
    edgesTowardPlayerMoved,
    militaryThreatTowardPlayerMoved,
    edgesTowardPlayer: edgesToward(working, player).length,
    wars: warRecords(working),
    npcShare: npcShareOfSeed(working),
    elections: electionsOfSeed(working),
    economy: economyOf(economy, working),
    conditionQuarters: rosterQuarters(working),
  };
}

// Every foreign condition the run opened, by which quarter of the roster its
// country sits in. Two open slots a week against a hundred and ninety-five
// governments is a queue, and a queue walked in nation order gives the slots
// to the start of the alphabet.
function rosterQuarters(working) {
  const roster = Object.keys(working.nations).filter((id) => id !== working.founding.nation).sort();
  const quarters = [0, 0, 0, 0];
  for (const condition of Object.values(working.conditions)) {
    const index = roster.indexOf(condition.nation);
    if (index >= 0) quarters[Math.floor((index * 4) / roster.length)] += 1;
  }
  return quarters;
}

function merge(runs, pick) {
  const merged = {};
  for (const run of runs) {
    for (const [key, count] of Object.entries(pick(run))) merged[key] = (merged[key] ?? 0) + count;
  }
  return merged;
}

/** Share of all selections that went to each fidelity. */
function selectionsByFidelity(counts) {
  const { nations } = foundedForBalance(SEEDS[0]).campaign;
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const sums = {};
  for (const [id, n] of Object.entries(counts)) {
    const fidelity = nations[id]?.base.fidelity ?? "full";
    sums[fidelity] = (sums[fidelity] ?? 0) + n;
  }
  return Object.fromEntries(Object.entries(sums).map(([fidelity, n]) => [fidelity, round(n / total)]));
}

const runs = SEEDS.map(runSeed);
const selections = merge(runs, (r) => r.selections);
const pursuitPairs = merge(runs, (r) => r.pursuitPairs);
const actions = runs.reduce((sum, r) => sum + r.actions, 0);
const atPlayer = runs.reduce((sum, r) => sum + r.atPlayer, 0);

console.log(
  JSON.stringify(
    {
      seeds: SEEDS.length,
      turns: TURNS,
      actions,
      atPlayer,
      atPlayerShare: round(atPlayer / Math.max(1, actions)),
      selectionsTopShare: round(topShare(selections)),
      selectionsNonZero: Object.values(selections).filter((n) => n > 0).length,
      // Whose weeks they are: the three slots are meant to stay with the
      // capitals the dataset researched, not go to its thin records.
      selectionsByFidelity: selectionsByFidelity(selections),
      // A government that rolls initiative often and was never once given a
      // week: the alphabetical queue's own signature.
      starvedAboveRate: Object.entries(runs[0].initiativeRates)
        .filter(([id, rate]) => rate > 0.15 && (selections[id] ?? 0) === 0)
        .map(([id]) => id),
      // The condition queue's own signature: the smallest quarter's share of
      // every foreign condition opened, where an even spread reads a quarter.
      conditionsByRosterQuarter: conditionQuarterReport(runs),
      byInstrument: merge(runs, (r) => r.byInstrument),
      byRung: merge(runs, (r) => r.byRung),
      rungsEverTaken: Object.keys(merge(runs, (r) => r.byRung)).length,
      atPlayerByRung: merge(runs, (r) => r.atPlayerByRung),
      rungReached: merge(runs, (r) => r.rungReached),
      pursuitStatus: merge(runs, (r) => r.pursuitStatus),
      pursuitPairsTopShare: round(topShare(pursuitPairs)),
      topPursuitPairs: Object.entries(pursuitPairs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      npcConflicts: runs.map((r) => r.npcConflicts),
      medianNpcConflicts: median(runs.map((r) => r.npcConflicts)),
      edgesTowardPlayer: runs.map((r) => r.edgesTowardPlayer),
      edgesTowardPlayerMoved: runs.map((r) => r.edgesTowardPlayerMoved),
      militaryThreatTowardPlayerMoved: runs.map((r) => r.militaryThreatTowardPlayerMoved),
      quartersWithNoActionAtPlayer: runs.map((r) => emptyQuarters(r.playerActionTurns)),
      // The war-duration measurement the owner sets the duration band from:
      // median and p90 length in weeks, and how the wars ended.
      warDurations: durationReport(runs),
      // Owned by the waves that fill them; undefined is left out of the JSON.
      npcShare: npcShareReport(runs),
      foreignElections: electionsReport(runs),
      economy: economyReport(runs),
    },
    null,
    2,
  ),
);
