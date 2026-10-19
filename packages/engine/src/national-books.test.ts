import { debtToGdp, type NationId } from "@admin/world";
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { fiscalPhase, projectFiscalCost, selectDebtTrajectory, selectFiscalStatement } from "./fiscal.js";
import {
  bookUsDebt,
  booksFor,
  foreignRatioStep,
  foreignWeek,
  openingBooks,
  outputStep,
  stationaryPrimaryBalance,
  usPosition,
  WEEK_OF_YEAR,
} from "./national-books.js";
import { FISCAL_PROGRAM_SHIFTS } from "./fiscal-impulse.js";
import { nonErodibleShareOf, selectSovereign } from "./sovereign.js";
import type { Campaign } from "./state.js";

// The national books: one ratio, a truthful inheritance, and one way debt is
// booked. Every figure here is read off a real founding, because the claims are
// about the country the President takes over, not about a toy economy.

const { campaign: FOUNDED } = foundedForBalance("national-books");
const US = FOUNDED.founding.nation;
const nation = (campaign: Campaign, id: string) => campaign.nations[id as NationId]!;

function withStats(campaign: Campaign, id: NationId, economy: Partial<Campaign["nations"][NationId]["stats"]["economy"]>): Campaign {
  const runtime = campaign.nations[id]!;
  return {
    ...campaign,
    nations: { ...campaign.nations, [id]: { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, ...economy } } } },
  };
}

describe("one ratio", () => {
  it("is taken nowhere but through debtToGdp", () => {
    // Read as source rather than asserted, so a reader who divides a stock by an
    // output inline anywhere in the engine or the player fails here.
    const read = {
      ...import.meta.glob("./**/*.ts", { query: "?raw", import: "default", eager: true }),
      ...import.meta.glob("../../player-core/src/**/*.ts", { query: "?raw", import: "default", eager: true }),
    } as Record<string, string>;
    const sources = Object.fromEntries(Object.entries(read).filter(([file]) => !file.endsWith(".test.ts")));
    expect(Object.keys(sources).length).toBeGreaterThan(100);
    const inline = /\bdebt\w*\s*\/\s*(?:Math\.max\([^)]*)?[\w.]*(?:gdp|output)\b/i;
    const offenders = Object.entries(sources).flatMap(([file, text]) =>
      text
        .split("\n")
        .filter((line) => inline.test(line))
        .map((line) => `${file}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });

  it("is the pattern the check above looks for", () => {
    const inline = /\bdebt\w*\s*\/\s*(?:Math\.max\([^)]*)?[\w.]*(?:gdp|output)\b/i;
    expect(inline.test("const ratio = economy.debt / economy.gdp;")).toBe(true);
    expect(inline.test("debtToGdp: round3(gdp > 0 ? debt / gdp : 0)")).toBe(true);
    expect(inline.test("const r = debt / Math.max(1, stats.gdp)")).toBe(true);
    expect(inline.test("const ratio = debtToGdp(runtime.stats);")).toBe(false);
  });
});

describe("the books the President inherits", () => {
  const statement = selectFiscalStatement(FOUNDED);

  it("carry debt held by the public at CBO's share of output", () => {
    expect(debtToGdp(nation(FOUNDED, US).stats)).toBeGreaterThanOrEqual(1.0);
    expect(debtToGdp(nation(FOUNDED, US).stats)).toBeLessThanOrEqual(1.02);
  });

  it("spend a fifth of revenue on interest and run a deficit near what the budget office projects", () => {
    const interestShare = statement.outlay.debtService / statement.revenueTotal;
    expect(interestShare).toBeGreaterThanOrEqual(0.2);
    expect(interestShare).toBeLessThanOrEqual(0.23);
    const deficit = -statement.balance / statement.gdp;
    expect(deficit).toBeGreaterThanOrEqual(0.058);
    expect(deficit).toBeLessThanOrEqual(0.072);
  });

  it("price new ten-year borrowing at the market's ten-year on the world's as-of date", () => {
    expect(selectSovereign(FOUNDED, US)!.marketRate).toBeCloseTo(0.0511, 3);
  });

  it("open every rating inside the letter it was authored with, and leave every default a default", () => {
    const letters: Record<string, readonly [number, number]> = {
      AAA: [21, 21], AA: [18, 20], A: [15, 17], BBB: [12, 14], BB: [9, 11], B: [6, 8], CCC: [2, 5], D: [1, 1],
    };
    const books = openingBooks(FOUNDED);
    let defaults = 0;
    for (const [id, runtime] of Object.entries(FOUNDED.nations)) {
      const letter = runtime.stats.economy.sovereignRating;
      const [lo, hi] = letters[letter]!;
      const score = books[id as NationId]!.rating.score;
      expect(score, id).toBeGreaterThanOrEqual(lo);
      expect(score, id).toBeLessThanOrEqual(hi);
      if (letter === "D") defaults += 1;
    }
    expect(defaults).toBe(14);
  });

  it("keep the fourteen defaults in default through a year of weeks", () => {
    let state = FOUNDED;
    for (let week = 0; week < 52; week += 1) state = fiscalPhase({ ...state, turn: state.turn + 1 }).reduce(apply, { ...state, turn: state.turn + 1 });
    const defaults = Object.values(state.nations).filter((runtime) => runtime.base.stats.economy.sovereignRating === "D");
    expect(defaults).toHaveLength(14);
    for (const runtime of defaults) expect(runtime.stats.economy.sovereignRating, runtime.base.id).toBe("D");
  });
});

describe("the identities", () => {
  it("book a week of the United States' balance into its debt and nothing else", () => {
    const statement = selectFiscalStatement(FOUNDED);
    const after = fiscalPhase(FOUNDED).reduce(apply, FOUNDED);
    const moved = nation(after, US).stats.economy.debt - nation(FOUNDED, US).stats.economy.debt;
    expect(Math.abs(moved - -statement.balance / 52)).toBeLessThanOrEqual(1);
  });

  it("carry a foreign ratio through the weekly identity exactly, whatever its prices have done", () => {
    for (const [id, costOfLiving] of [["ARG", 7_000], ["JPN", 1], ["DEU", 0.4], ["NGA", 250]] as const) {
      const priced = withStats(FOUNDED, id as NationId, { costOfLiving });
      const runtime = nation(priced, id);
      const books = booksFor(priced, runtime);
      const economy = runtime.stats.economy;
      const expected = foreignRatioStep({
        ratio: debtToGdp(runtime.stats),
        rate: books.rates.effective,
        growth: economy.growth,
        inflation: economy.inflation,
        usInflation: nation(priced, US).stats.economy.inflation,
        nonErodible: nonErodibleShareOf(runtime),
        primaryBalance: books.anchor.primaryBalance,
      });
      const after = fiscalPhase(priced).reduce(apply, priced);
      expect(Math.abs(debtToGdp(nation(after, id).stats) - expected), id).toBeLessThan(1e-9);
    }
  });

  it("writes the identity the design states, term by term", () => {
    // d' = d [(1 - phi)(1 + i)^w + phi (1 + i)^w ((1 + pi)/(1 + piUS))^w] / step(g) - pb w,
    // with the deflation by the country's own prices already in d: the index
    // moved before the books were kept.
    const inputs = { ratio: 0.8, rate: 0.09, growth: 0.03, inflation: 0.4, usInflation: 0.03, nonErodible: 0.55, primaryBalance: -0.01 };
    const w = 1 / 52;
    const by = (1 + inputs.rate) ** w;
    const hand =
      (0.8 * ((1 - 0.55) * by + 0.55 * by * (1.4 / 1.03) ** w)) / (1 + 0.03 * w) - -0.01 * w;
    expect(foreignRatioStep(inputs)).toBeCloseTo(hand, 12);
  });

  it("holds a government at rest where it was found, from its stationary balance", () => {
    const inputs = { ratio: 0.85, rate: 0.095, growth: 0.02, inflation: 2.2, usInflation: 0.03, nonErodible: 0.3 };
    const primaryBalance = stationaryPrimaryBalance(inputs);
    let ratio = inputs.ratio;
    for (let week = 0; week < 416; week += 1) {
      // A week of prices first, as the index moves before the books are kept.
      ratio = foreignRatioStep({ ...inputs, ratio: ratio / (1 + inputs.inflation) ** WEEK_OF_YEAR, primaryBalance });
    }
    expect(ratio).toBeCloseTo(inputs.ratio, 9);
  });

  it("dilutes output at the step potential compounds at", () => {
    expect(outputStep(0.052)).toBe(1 + 0.052 / 52);
  });
});

describe("where the market puts the ratio in ten years", () => {
  const week = (campaign: Campaign) => fiscalPhase(campaign).reduce(apply, campaign).books![US]!.rates.market!;

  it("prices a four-year tax cut for the four years it runs, not as if it ran for ever", () => {
    const bill = { id: "bill:cut", act: "act-tax-relief-and-growth", title: "cut", sponsor: "administration" as const, introducedTurn: FOUNDED.turn, status: "law" as const, passage: [] };
    const cut: Campaign = { ...FOUNDED, bills: { ...FOUNDED.bills, [bill.id]: bill } };
    const rise = week(cut) - week(FOUNDED);
    // Eight tenths of a point of revenue for ten years would add eight points
    // to the projected ratio and twenty basis points to the rate; for four of
    // the ten it adds about eight.
    expect(rise).toBeGreaterThan(0.0005);
    expect(rise).toBeLessThan(0.0012);
  });

  it("reads the stock against the output the economy returns to, so a slump's dent in output moves no rate", () => {
    const us = nation(FOUNDED, US);
    const dented = withStats(FOUNDED, US, { gdp: us.stats.economy.gdp * 0.95 });
    expect(week(dented)).toBeCloseTo(week(FOUNDED), 4);
  });
});

describe("one way to book the United States' debt", () => {
  it("books the same first week in the settlement, the path and the preview", () => {
    const after = fiscalPhase(FOUNDED).reduce(apply, FOUNDED);
    const settled = nation(after, US).stats.economy.debt;
    const [firstWeek] = selectDebtTrajectory(FOUNDED, { years: 1, everyWeeks: 1 });
    expect(firstWeek!.debt).toBe(settled);
    const position = usPosition(FOUNDED)!;
    expect(bookUsDebt(position.debt, selectFiscalStatement(FOUNDED).balance)).toBe(settled);
  });

  it("books the drafted program's first week in the path the settlement would book it in", () => {
    const draft = { fiscal: "fiscal-investment" };
    const adopted: Campaign = { ...FOUNDED, player: { ...FOUNDED.player, policies: { ...FOUNDED.player.policies, ...draft } } };
    const settled = nation(fiscalPhase(adopted).reduce(apply, adopted), US).stats.economy.debt;
    const [firstWeek] = selectDebtTrajectory(FOUNDED, { years: 1, everyWeeks: 1, draft });
    expect(firstWeek!.debt).toBe(settled);
    expect(firstWeek!.debt).toBeGreaterThan(selectDebtTrajectory(FOUNDED, { years: 1, everyWeeks: 1 })[0]!.debt);
    expect(selectDebtTrajectory(FOUNDED, { years: 4, draft }).at(-1)!.debt).toBeGreaterThan(selectDebtTrajectory(FOUNDED, 4).at(-1)!.debt);
  });

  it("carries a year's interest at each point, at the rate the stock is carried at then", () => {
    const [first] = selectDebtTrajectory(FOUNDED, { years: 1, everyWeeks: 1 });
    expect(first!.interest).toBe(Math.round(FOUNDED.books![US]!.rates.effective * first!.debt));
    const path = selectDebtTrajectory(FOUNDED, 4);
    for (const point of path) expect(point.interest).toBeGreaterThan(0);
    expect(path.at(-1)!.interest!).toBeGreaterThan(path[0]!.interest!);
  });

  it("prices what a program adds through that same week", () => {
    const investing = { kind: "policy" as const, domain: "fiscal", stance: "fiscal-investment" };
    const cost = projectFiscalCost(FOUNDED, [investing]);
    const shift = FISCAL_PROGRAM_SHIFTS["fiscal-investment"]!;
    const expected = ((shift.outlays ?? 0) - (shift.take ?? 0)) * selectFiscalStatement(FOUNDED).gdp;
    expect(cost.deficit / expected).toBeGreaterThan(0.9);
    expect(cost.deficit / expected).toBeLessThan(1.1);
    expect(cost.debt).toBeGreaterThan(0);
    expect(cost.interest).toBe(Math.round(cost.debt * selectSovereign(FOUNDED, US)!.marketRate));
    expect(projectFiscalCost(FOUNDED, [])).toEqual({ deficit: 0, debt: 0, interest: 0 });
  });

  it("prices a war the United States would join before it is joined: a joiner's outlays, half a point of output a year at full heat", () => {
    // Priced only afterward, as a line under "what moved the deficit", the
    // join's own preview showed readiness, order and standing and no money.
    const war = { ...openConflict("RUS" as NationId, "UKR" as NationId, FOUNDED.turn, "A war nobody here started."), intensity: 0.6 };
    const atWar: Campaign = { ...FOUNDED, conflicts: { ...FOUNDED.conflicts, [war.id]: war } };
    const joined = { ...war, joined: { aggressor: [], defender: [US] } };
    const cost = projectFiscalCost(atWar, [{ kind: "conflict", set: joined }]);
    const expected = 0.005 * 0.6 * selectFiscalStatement(atWar).gdp;
    expect(cost.deficit / expected).toBeGreaterThan(0.9);
    expect(cost.deficit / expected).toBeLessThan(1.1);
  });

  it("reopens a record kept before the books were anchored rather than reading a half-built one", () => {
    const id = "DEU" as NationId;
    const bare = { rates: { effective: 0.05 }, rating: { score: 10, outlook: "stable" as const }, stress: 0, impulse: 0, lastStructuralBalance: 0, aidSeen: 0 };
    const kept: Campaign = { ...FOUNDED, books: { ...FOUNDED.books, [id]: bare } };
    const read = booksFor(kept, nation(kept, id));
    expect(read.anchor).toBeDefined();
    expect(read.rates.market).toBeDefined();
    expect(foreignWeek(kept, nation(kept, id), read, { inflation: 0.03, expectedInflation: 0.03 }).books.anchor).toBe(read.anchor);
  });
});
