import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { STANDING_CONDITIONS } from "./condition-kinds.js";
import {
  RATE_CONDITIONS,
  STANDING_PRESSURE,
  claimOnsetSlots,
  onsetCandidates,
  standingHold,
  standingPressure,
  type OnsetCandidate,
} from "./condition-onset.js";
import type { CyclePhase } from "./business-cycle.js";
import { selectConditions, type Campaign, type NationRuntime } from "./state.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { advanceTurn } from "./turn-loop.js";
import { stancesForDomain } from "./policy.js";

const { campaign: FOUNDED, charter: CHARTER } = foundedForBalance("condition-onset");
const ARG = "ARG" as NationId;
const USA = "USA" as NationId;

function withEconomy(runtime: NationRuntime, economy: Partial<NationRuntime["stats"]["economy"]>): NationRuntime {
  return { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, ...economy } } };
}

describe("a country at rest opens nothing for being itself", () => {
  // The economy now rests on each country's published figures, so Argentina
  // sits at the 200% the model reads and South Africa at a third of its
  // workforce out of work. Read against an absolute line, both would be in a
  // standing crisis on the morning of the oath.
  it("reads zero on every rate row for every nation on the founding morning", () => {
    for (const [id, runtime] of Object.entries(FOUNDED.nations)) {
      for (const kind of ["recession", "inflation-shock", "unemployment-shock", "housing-crunch"] as const) {
        expect(STANDING_PRESSURE[kind](runtime), `${id} ${kind}`).toBe(0);
      }
    }
  });

  it("opens a price shock in Argentina only when its prices run past its own normal", () => {
    const argentina = FOUNDED.nations[ARG]!;
    expect(argentina.stats.economy.inflation).toBeGreaterThan(1);
    expect(standingPressure(argentina, "inflation-shock", false)).toBe(0);
    const surge = withEconomy(argentina, { inflation: argentina.stats.economy.inflation - 0.4 });
    expect(standingPressure(surge, "inflation-shock", false)).toBe(0);
    const risen = withEconomy(FOUNDED.nations[USA]!, { inflation: FOUNDED.nations[USA]!.stats.economy.inflation + 0.1 });
    expect(standingPressure(risen, "inflation-shock", false)).toBeGreaterThan(0.3);
  });
});

describe("a rate condition's hysteresis", () => {
  const us = FOUNDED.nations[USA]!;
  const rest = us.stats.economy.inflation;
  const row = RATE_CONDITIONS["inflation-shock"];

  it("opens past its line and holds until the country is back to its own normal", () => {
    const between = withEconomy(us, { inflation: rest + row.opens / 2 });
    expect(standingPressure(between, "inflation-shock", false)).toBe(0);
    expect(standingHold(between, "inflation-shock", false)).toBeGreaterThan(0);
    expect(standingHold(us, "inflation-shock", false)).toBe(0);
  });

  it("opens the United States' price shock near 8% inflation and its jobs shock near 8% unemployment", () => {
    expect(rest + row.opens).toBeGreaterThan(0.075);
    expect(rest + row.opens).toBeLessThan(0.085);
    const jobs = us.stats.economy.unemployment + RATE_CONDITIONS["unemployment-shock"].opens;
    expect(jobs).toBeGreaterThan(0.075);
    expect(jobs).toBeLessThan(0.085);
  });
});

/** Standing conditions opened anywhere in the world after the oath, per thousand nation-weeks. */
function onsetsPerThousand(campaign: Campaign, weeks: number): Readonly<Record<string, number>> {
  const nationWeeks = Object.keys(campaign.nations).length * weeks;
  const counts: Record<string, number> = Object.fromEntries(STANDING_CONDITIONS.map((kind) => [kind, 0]));
  for (const condition of selectConditions(campaign)) {
    if (condition.startedTurn <= FOUNDED.turn || !(condition.kind in counts)) continue;
    counts[condition.kind] = counts[condition.kind]! + 1;
  }
  return Object.fromEntries(Object.entries(counts).map(([kind, n]) => [kind, Math.round((n / nationWeeks) * 10_000) / 10]));
}

// A recession is the name of a slump the cycle is in. Growth far under trend
// in an expansion is a disaster's or a war's, and is read under its own name.
describe("a recession opens only inside the cycle's slump", () => {
  const us = FOUNDED.nations[USA]!;
  const slumping = withEconomy(us, { growth: us.stats.economy.growth - 0.06 });
  const atPhase = (phase: CyclePhase): Campaign => ({
    ...FOUNDED,
    nations: { ...FOUNDED.nations, [USA]: slumping },
    cycles: { ...FOUNDED.cycles, [USA]: { phase, enteredTurn: FOUNDED.turn, amplitude: 0.02 } },
  });
  const recessionChance = (campaign: Campaign) =>
    onsetCandidates(campaign).find((candidate) => candidate.nation === USA && candidate.kind === "recession")?.chance ?? 0;

  it("offers no recession to a nation in an expansion or at a peak, however far under trend it runs", () => {
    expect(standingPressure(slumping, "recession", false)).toBeGreaterThan(0.9);
    expect(recessionChance(atPhase("expansion"))).toBe(0);
    expect(recessionChance(atPhase("peak"))).toBe(0);
  });

  it("offers one in a contraction and at the trough", () => {
    expect(recessionChance(atPhase("contraction"))).toBeGreaterThan(0);
    expect(recessionChance(atPhase("trough"))).toBeGreaterThan(0);
  });
});

describe("onset counts", () => {
  // Measured, and bounded well above what a year measures, so the gate is on
  // the defect (a country flickering into and out of a crisis every few weeks
  // at its own resting point) rather than on the dice.
  it("opens standing conditions at a legible rate over a year", () => {
    const phases = campaignTurnPhases(CHARTER);
    let state = FOUNDED;
    for (let week = 0; week < 52; week += 1) state = advanceTurn(state, phases);
    const rates = onsetsPerThousand(state, 52);
    console.info("standing onsets per 1,000 nation-weeks:", JSON.stringify(rates));
    for (const [kind, rate] of Object.entries(rates)) expect(rate, kind).toBeLessThan(10);
    const flickering = Object.values(state.nations).filter(
      (runtime) => selectConditions(state).filter((c) => c.nation === runtime.base.id && c.kind === "inflation-shock").length > 2,
    );
    expect(flickering.map((runtime) => runtime.base.id)).toEqual([]);
  });
});

// Onset and recovery used to disagree about whether governing matters: the
// recovery side (conditionAttention/programAttention, conditions.ts) already
// paid a governed civil-and-security brief back in a faster recovery, but
// unrest's onset read only the country's own protest pressure and legitimacy —
// terms that move in offsetting directions for a governing administration and
// left it reading a higher onset chance than one governing passively.
describe("unrest onset agrees with recovery about whether governing matters", () => {
  const unrestChanceOf = (campaign: Campaign) =>
    onsetCandidates(campaign).find((candidate) => candidate.nation === USA && candidate.kind === "unrest")?.chance ?? 0;

  it("reads a lower chance for an administration actually running civil and security than one that inherited both", () => {
    const civilStance = stancesForDomain("civil").find((stance) => !stance.inherited);
    const securityStance = stancesForDomain("security").find((stance) => !stance.inherited);
    expect(civilStance).toBeDefined();
    expect(securityStance).toBeDefined();
    const governing: Campaign = {
      ...FOUNDED,
      player: {
        ...FOUNDED.player,
        policies: { ...FOUNDED.player.policies, civil: civilStance!.id, security: securityStance!.id },
      },
    };
    expect(unrestChanceOf(governing)).toBeLessThan(unrestChanceOf(FOUNDED));
  });

  it("never discounts a foreign nation's onset chance off the player's own policy stances", () => {
    const civilStance = stancesForDomain("civil").find((stance) => !stance.inherited)!;
    const securityStance = stancesForDomain("security").find((stance) => !stance.inherited)!;
    const passive = FOUNDED;
    const governing: Campaign = {
      ...FOUNDED,
      player: {
        ...FOUNDED.player,
        policies: { ...FOUNDED.player.policies, civil: civilStance.id, security: securityStance.id },
      },
    };
    const foreignChance = (campaign: Campaign) =>
      onsetCandidates(campaign).find((candidate) => candidate.nation === ARG && candidate.kind === "unrest")?.chance ?? 0;
    expect(foreignChance(governing)).toBe(foreignChance(passive));
  });
});

// A debt crisis is a loss of market access, not a debt level. Japan owes two
// and a half years of its output in its own currency; Argentina owes less than
// one, mostly in dollars, and has defaulted within living memory.
describe("a fiscal crisis opens on market access", () => {
  const JPN = "JPN" as NationId;

  it("reads Japan as less prone than Argentina on the founding morning", () => {
    const pressure = (id: NationId) => standingPressure(FOUNDED.nations[id]!, "fiscal-crisis", false, FOUNDED);
    expect(pressure(JPN)).toBeLessThan(pressure(ARG));
    expect(pressure(ARG)).toBeGreaterThan(0.3);
    expect(pressure(USA)).toBeLessThan(0.1);
  });

  it("reads the rating, the currency and the structural gap, never the debt level alone", () => {
    const us = FOUNDED.nations[USA]!;
    const heavier = withEconomy(us, { debt: us.stats.economy.debt * 1.5 });
    const weaker = withEconomy(us, { sovereignRating: "BB" });
    const heavy = { ...FOUNDED, nations: { ...FOUNDED.nations, [USA]: heavier } };
    const weak = { ...FOUNDED, nations: { ...FOUNDED.nations, [USA]: weaker } };
    // At founding rates below growth plus inflation a larger stock erodes faster,
    // so it needs no larger surplus to hold: the level alone opens nothing.
    expect(standingPressure(heavier, "fiscal-crisis", false, heavy)).toBeLessThanOrEqual(standingPressure(us, "fiscal-crisis", false, FOUNDED));
    expect(standingPressure(weaker, "fiscal-crisis", false, weak)).toBeGreaterThan(standingPressure(us, "fiscal-crisis", false, FOUNDED) * 2);
  });

  it("holds on the structural balance at founding rates, so neither the premium nor the stress keeps it open", () => {
    const id = ARG;
    const runtime = FOUNDED.nations[id]!;
    const books = FOUNDED.books![id]!;
    const repriced = { ...FOUNDED, books: { ...FOUNDED.books, [id]: { ...books, rates: { ...books.rates, effective: books.rates.effective + 0.04 }, stress: 3 } } };
    expect(standingHold(runtime, "fiscal-crisis", false, repriced)).toBeCloseTo(standingHold(runtime, "fiscal-crisis", false, FOUNDED), 12);
    expect(standingPressure(runtime, "fiscal-crisis", false, repriced)).toBeGreaterThan(standingHold(runtime, "fiscal-crisis", false, repriced));
  });

  it("lets a government at a balance that holds its ratio come out of a crisis, whatever its letter", () => {
    for (const [id, runtime] of Object.entries(FOUNDED.nations)) {
      if (id === USA) continue;
      expect(standingHold(runtime, "fiscal-crisis", false, FOUNDED), id).toBeCloseTo(0, 9);
    }
    // A structural deficit past the holding balance is what holds one open.
    const us = FOUNDED.nations[USA]!;
    const investing = { ...FOUNDED, player: { ...FOUNDED.player, policies: { ...FOUNDED.player.policies, fiscal: "fiscal-investment" } } };
    expect(standingHold(us, "fiscal-crisis", false, investing)).toBeGreaterThan(standingHold(us, "fiscal-crisis", false, FOUNDED));
  });

  it("opens none for a United States rated AA or better whose market has not turned", () => {
    const us = FOUNDED.nations[USA]!;
    const books = FOUNDED.books![USA]!;
    // A structural deficit well past the holding balance, so the reading alone would fire.
    const investing = { ...FOUNDED, player: { ...FOUNDED.player, policies: { ...FOUNDED.player.policies, fiscal: "fiscal-investment" } } };
    expect(standingPressure(us, "fiscal-crisis", false, investing)).toBeGreaterThan(0);
    const usCrisis = (campaign: Campaign) => onsetCandidates(campaign).some((candidate) => candidate.nation === USA && candidate.kind === "fiscal-crisis");
    expect(books.rating.score).toBeGreaterThanOrEqual(19);
    expect(usCrisis(investing)).toBe(false);
    const cut = { ...investing, books: { ...investing.books, [USA]: { ...books, rating: { ...books.rating, score: 18 } } } };
    const stressed = { ...investing, books: { ...investing.books, [USA]: { ...books, stress: 0.5 } } };
    const repriced = { ...investing, books: { ...investing.books, [USA]: { ...books, rates: { ...books.rates, market: books.anchor!.market + 0.01 } } } };
    const pastXDate = { ...investing, debtLimit: { ...investing.debtLimit!, xDateTurn: investing.turn } };
    for (const strained of [cut, stressed, repriced, pastXDate]) expect(usCrisis(strained)).toBe(true);
  });

  it("opens only ever on the whole nation", () => {
    let state: Campaign = FOUNDED;
    const phases = campaignTurnPhases(CHARTER);
    for (let week = 0; week < 26; week += 1) state = advanceTurn(state, phases);
    const crises = selectConditions(state).filter((condition) => condition.kind === "fiscal-crisis");
    expect(crises.length).toBeGreaterThan(0);
    for (const crisis of crises) expect(crisis.scope, crisis.id).toBe("nation");
  });
});

// Who opens when more fire than a week allows. The rolls here come from a
// generator of the test's own, so the case does not lean on the engine's
// streams to make its point.
describe("the week's open slots", () => {
  function draws(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 2 ** 32;
    };
  }
  const roster = (chances: readonly number[]): readonly OnsetCandidate[] =>
    chances.map((chance, index) => ({ nation: `N${String(index).padStart(3, "0")}` as NationId, kind: "unrest", chance }));
  function slotsTaken(candidates: readonly OnsetCandidate[], budget: number, weeks: number): number[] {
    const next = draws(7);
    const taken = candidates.map(() => 0);
    for (let week = 0; week < weeks; week += 1) {
      const rolled = candidates.map((candidate) => ({ candidate, roll: next() }));
      for (const winner of claimOnsetSlots(rolled, budget)) taken[candidates.indexOf(winner)]! += 1;
    }
    return taken;
  }
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

  it("opens only what fired, and no more than the budget", () => {
    const candidates = roster([0.5, 0.5, 0.5]);
    const rolled = [
      { candidate: candidates[0]!, roll: 0.7 },
      { candidate: candidates[1]!, roll: 0.1 },
      { candidate: candidates[2]!, roll: 0.2 },
    ];
    expect(claimOnsetSlots(rolled, 5)).toEqual([candidates[1], candidates[2]]);
    expect(claimOnsetSlots(rolled, 1)).toEqual([candidates[1]]);
    expect(claimOnsetSlots(rolled, 0)).toEqual([]);
  });

  it("gives the end of the list the same share as its start when every candidate is alike", () => {
    // A hundred alike candidates against two slots, every one of them firing
    // half the time: walking the list and stopping at the budget handed every
    // slot to the first few.
    const taken = slotsTaken(roster(Array.from({ length: 100 }, () => 0.5)), 2, 2_000);
    const quarters = [0, 1, 2, 3].map((quarter) => sum(taken.slice(quarter * 25, quarter * 25 + 25)) / sum(taken));
    for (const share of quarters) expect(share).toBeGreaterThan(0.2);
    expect(sum(taken)).toBe(4_000);
  });

  it("gives more of the slots to the candidates more prone to open, wherever they sit", () => {
    // The prone half sits at the end of the list.
    const chances = [...Array.from({ length: 50 }, () => 0.02), ...Array.from({ length: 50 }, () => 0.2)];
    const taken = slotsTaken(roster(chances), 2, 2_000);
    expect(sum(taken.slice(50))).toBeGreaterThan(sum(taken.slice(0, 50)) * 5);
  });
});
