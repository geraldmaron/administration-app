import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { borrowingCeiling, fiscalPhase, selectFiscalStatement } from "./fiscal.js";
import { billsOnTheAgenda, legislationPhase } from "./legislation.js";
import { usPosition } from "./national-books.js";
import { openingDebtLimit, selectDebtLimit, subjectToLimit, type DebtLimitState } from "./debt-limit.js";
import type { Bill, Campaign } from "./state.js";

// The debt limit binds on a date. These are the four things that make it a
// limit rather than a line on a chart: the ceiling is whatever the laws on the
// books say, the Treasury has a few months of room past it, past that it pays
// interest and holds back the rest, and what it held back is paid on the lift.

const { campaign: FOUNDED } = foundedForBalance("debt-limit");
const US = FOUNDED.founding.nation;

function liftLaw(turn: number): Bill {
  return {
    id: `bill:act-debt-limit-increase:${turn}`,
    act: "act-debt-limit-increase",
    title: "The Debt Limit Increase Act",
    sponsor: "administration",
    introducedTurn: turn,
    status: "law",
    passage: [],
  };
}

function withLaw(campaign: Campaign, bill: Bill): Campaign {
  return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
}

function withLimit(campaign: Campaign, limit: DebtLimitState): Campaign {
  return { ...campaign, debtLimit: limit };
}

function week(campaign: Campaign): Campaign {
  const next = { ...campaign, turn: campaign.turn + 1 };
  return fiscalPhase(next).reduce(apply, next);
}

/** A campaign whose limit has bound and whose measures are spent, as the X-date week finds it. */
function atTheXDate(): Campaign {
  const limit = FOUNDED.debtLimit!;
  const debt = FOUNDED.nations[US]!.stats.economy.debt;
  return withLimit(FOUNDED, { ...limit, base: subjectToLimit(limit, debt), bindingSince: FOUNDED.turn - 26, measuresLeft: 0, measuresUsed: 0, headroomWeeks: 0 });
}

describe("the ceiling is derived from the laws", () => {
  it("opens a year and a half of the inherited deficit above what is owed, trust funds counted", () => {
    const limit = openingDebtLimit(FOUNDED);
    const debt = FOUNDED.nations[US]!.stats.economy.debt;
    const deficit = -selectFiscalStatement(FOUNDED).balance;
    expect(limit.intragovernmental! / debt).toBeCloseTo(7.72 / 32.38, 3);
    expect(limit.base - subjectToLimit(limit, debt)).toBeCloseTo(1.5 * deficit, -3);
    expect(limit.headroomWeeks).toBeGreaterThanOrEqual(52 + 26);
  });

  it("rises by a tenth of output when the lift is enacted, and falls back when the law is gone", () => {
    const output = usPosition(FOUNDED)!.output;
    const enacted = withLaw(FOUNDED, liftLaw(FOUNDED.turn));
    expect(borrowingCeiling(enacted) - borrowingCeiling(FOUNDED)).toBeCloseTo(0.1 * output, -1);
    const booked = week(enacted);
    expect(booked.debtLimit!.lifts[liftLaw(FOUNDED.turn).id]).toBe(Math.round(0.1 * usPosition(enacted)!.output));
    const repealed = { ...booked, bills: { ...booked.bills, [liftLaw(FOUNDED.turn).id]: { ...liftLaw(FOUNDED.turn), status: "dead" as const } } };
    expect(borrowingCeiling(repealed)).toBe(borrowingCeiling({ ...booked, bills: FOUNDED.bills }));
    expect(borrowingCeiling(repealed)).toBeLessThan(borrowingCeiling(booked));
  });
});

describe("the limit binds on a date", () => {
  it("starts the measures the week the debt reaches it and projects when they run out", () => {
    const limit = FOUNDED.debtLimit!;
    const debt = FOUNDED.nations[US]!.stats.economy.debt;
    const reached = week(withLimit(FOUNDED, { ...limit, base: subjectToLimit(limit, debt) + 1 }));
    expect(reached.debtLimit!.bindingSince).toBe(reached.turn);
    expect(reached.debtLimit!.measuresLeft!).toBeGreaterThan(0);
    const reading = selectDebtLimit(reached);
    expect(reading.binding).toBe(true);
    expect(reading.xDateTurn! - reached.turn).toBeGreaterThanOrEqual(24);
    expect(reading.xDateTurn! - reached.turn).toBeLessThanOrEqual(27);
    // Debt subject to the limit sits at the ceiling while the measures carry the borrowing.
    expect(subjectToLimit(reached.debtLimit!, reached.nations[US]!.stats.economy.debt)).toBeCloseTo(reading.ceiling, -1);
  });

  it("puts the lift on Congress's agenda a quarter before the Treasury runs out, and not before", () => {
    const onAgenda = (campaign: Campaign) => billsOnTheAgenda(campaign).some((act) => act.id === "act-debt-limit-increase");
    expect(onAgenda(FOUNDED)).toBe(false);
    expect(onAgenda(withLimit(FOUNDED, { ...FOUNDED.debtLimit!, headroomWeeks: 13 }))).toBe(true);
    expect(onAgenda(withLimit(FOUNDED, { ...FOUNDED.debtLimit!, headroomWeeks: 14 }))).toBe(false);
  });
});

describe("a lift for a President with no caucus", () => {
  // An Independent's lift is nobody's party's bill, and counted like one it
  // never carried: the Treasury ran past its X-date and withheld payments for
  // most of a term. Congress has never let that happen to any President.
  const { campaign: INDEPENDENT } = foundedForBalance("debt-limit-independent", "independent");
  const liftSent = (campaign: Campaign) =>
    legislationPhase(campaign)
      .flatMap((packet) => packet.effects)
      .some((effect) => effect.kind === "bill" && effect.set.act === "act-debt-limit-increase");

  it("is not carried on the Treasury's warning alone, and is carried once the measures are running", () => {
    const warned = withLimit(INDEPENDENT, { ...INDEPENDENT.debtLimit!, headroomWeeks: 13 });
    const binding = withLimit(warned, { ...warned.debtLimit!, bindingSince: warned.turn - 1 });
    expect(liftSent(warned)).toBe(false);
    expect(liftSent(binding)).toBe(true);
  });
});

describe("past the X-date", () => {
  it("pays interest in full, borrows nothing, and owes what it held back", () => {
    const state = week(atTheXDate());
    const statement = selectFiscalStatement(state);
    expect(statement.balance).toBeGreaterThanOrEqual(0);
    expect(statement.unpaid).toBeGreaterThan(0);
    expect(statement.outlay.debtService).toBeGreaterThan(0);
    expect(state.debtLimit!.xDateTurn).toBe(state.turn);
    expect(state.debtLimit!.arrears).toBeGreaterThan(0);
    const later = week(state);
    expect(later.nations[US]!.stats.economy.debt).toBeLessThanOrEqual(state.nations[US]!.stats.economy.debt);
    expect(later.debtLimit!.arrears).toBeGreaterThan(state.debtLimit!.arrears);
  });

  it("calls the agencies in the same week and counts the brush with default against the rating", () => {
    const before = atTheXDate();
    const after = week(before);
    expect(after.debtLimit!.governanceUntil).toBe(after.turn + 104);
    const rating = after.books![US]!.rating;
    expect(rating.lastActionTurn).toBe(after.turn);
    expect(rating.outlook).toBe("negative");
  });

  it("pays the arrears the week the limit is lifted and stops holding payments back", () => {
    const withheld = week(week(atTheXDate()));
    const arrears = withheld.debtLimit!.arrears;
    const lifted = week(withLaw(withheld, liftLaw(withheld.turn)));
    expect(lifted.debtLimit!.arrears).toBe(0);
    expect(lifted.debtLimit!.bindingSince).toBeUndefined();
    expect(lifted.debtLimit!.xDateTurn).toBeUndefined();
    const statement = selectFiscalStatement(withheld);
    const debtMoved = lifted.nations[US]!.stats.economy.debt - withheld.nations[US]!.stats.economy.debt;
    expect(debtMoved).toBeGreaterThan(arrears);
    expect(selectFiscalStatement(lifted).unpaid).toBe(0);
    expect(statement.unpaid).toBeGreaterThan(0);
  });
});

describe("what the limit writes on the Record", () => {
  it("keeps the week's accrual in the background and gives each event its own entry", () => {
    const packets = fiscalPhase({ ...atTheXDate(), turn: FOUNDED.turn + 1 });
    const [accrual, ...foreground] = packets;
    expect(accrual!.background).toBe(true);
    expect(foreground.every((packet) => packet.background !== true)).toBe(true);
    const limit = foreground.find((packet) => /^The Treasury/.test(packet.narration.summary))!;
    expect(limit.narration.summary).toMatch(/run out of room under the debt limit/);
    expect(limit.effects).toContainEqual({ kind: "metric", deltas: { stability: -0.04 } });
    const rating = foreground.find((packet) => /rating agencies/.test(packet.narration.summary))!;
    expect(rating.narration.summary).toMatch(/debt limit/);
  });
});

