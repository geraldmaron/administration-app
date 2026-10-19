import type { NationId } from "@admin/world";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply, type Effect } from "./effects.js";
import { discretionaryAppropriation, projectFiscalCost, selectFiscalStatement } from "./fiscal.js";
import { EXECUTIVE_ORDERS, executiveOrder, orderFiscalEffects, signOrder } from "./orders.js";
import { createRngStreams } from "./rng.js";
import { addDays } from "./clock.js";
import { openingMunitions } from "./munitions.js";
import type { Campaign } from "./state.js";

// The President's own borrowing, booked on the founding nation's stock and
// nowhere else, and charged to the President's authority through the stock the
// President added; and the part of an order the books read.

const { campaign: FOUNDED } = foundedForBalance("choice-borrowing");
const US = FOUNDED.founding.nation;
const borrow = (effects: readonly Effect[], campaign: Campaign = FOUNDED) =>
  apply(campaign, { source: "simulate", actor: "player", turn: campaign.turn, narration: { summary: "Borrowed." }, effects });

describe("choice borrowing", () => {
  it("adds the amount to the founding nation's stock", () => {
    const after = borrow([{ kind: "choiceBorrowing", amount: 41_000 }]);
    expect(after.nations[US]!.stats.economy.debt).toBe(Math.round(FOUNDED.nations[US]!.stats.economy.debt + 41_000));
  });

  it("moves no other nation", () => {
    const after = borrow([{ kind: "choiceBorrowing", amount: 41_000 }]);
    for (const id of Object.keys(FOUNDED.nations) as NationId[]) {
      if (id !== US) expect(after.nations[id]).toBe(FOUNDED.nations[id]);
    }
  });

  it("counts the amount as the President's own added stock", () => {
    const after = borrow([{ kind: "choiceBorrowing", amount: 41_000 }]);
    const added = after.nations[US]!.stats.economy.debt - FOUNDED.nations[US]!.stats.economy.debt;
    expect(after.books![US]!.choiceDebt! - (FOUNDED.books![US]!.choiceDebt ?? 0)).toBe(added);
  });

  it("charges the interest on it to the President's authority, and leaves the deficit where it was", () => {
    const after = borrow([{ kind: "choiceBorrowing", amount: 41_000 }]);
    const books = FOUNDED.books![US]!;
    const price = FOUNDED.nations[US]!.stats.economy.costOfLiving;
    const interest = (books.rates.effective * 41_000) / price;
    expect(discretionaryAppropriation(FOUNDED) - discretionaryAppropriation(after)).toBeCloseTo(interest, -1);
    expect(selectFiscalStatement(after).outlay.debtService).toBeGreaterThan(selectFiscalStatement(FOUNDED).outlay.debtService);
    expect(Math.abs(selectFiscalStatement(after).balance - selectFiscalStatement(FOUNDED).balance)).toBeLessThanOrEqual(1);
  });

  it("is priced as debt up by the amount, the deficit unchanged, and a year's interest at today's market rate", () => {
    const cost = projectFiscalCost(FOUNDED, [{ kind: "choiceBorrowing", amount: 41_000 }]);
    expect(cost.debt).toBe(41_000);
    expect(Math.abs(cost.deficit)).toBeLessThanOrEqual(1);
    expect(cost.interest).toBe(Math.round(41_000 * FOUNDED.books![US]!.rates.market!));
  });
});

describe("a funded defense priority", () => {
  const priority = executiveOrder("order-defense-production")!;
  const signed = (): Campaign => {
    const stock = openingMunitions();
    const ready: Campaign = { ...FOUNDED, munitions: { ...stock, us: { ...stock.us,
      "precision-fires": { ...stock.us["precision-fires"]!,
        onOrder: [{ arrives: addDays(FOUNDED.calendar, 156 * 7), count: 0.05 }] } } } };
    const result = signOrder(ready, CHARTER_PRESIDENTIAL_REPUBLIC, priority.id, createRngStreams(ready.seed));
    if (!result.ok) throw new Error(`the order was refused: ${result.reason}`);
    return apply(ready, result.packet);
  };

  it("does not borrow for a priority designation on an existing federal order", () => {
    const economy = FOUNDED.nations[US]!.stats.economy;
    const after = signed();
    expect(after.nations[US]!.stats.economy.debt).toBe(economy.debt);
    expect(after.books![US]!.choiceDebt).toBe(FOUNDED.books![US]!.choiceDebt);
  });

  it("records the named priority in the existing order book", () => {
    const after = signed();
    expect(after.munitions?.us["precision-fires"]?.onOrder[0]?.priorityContractId).toBe(after.orders.at(-1)?.id);
  });
});

describe("an order's fiscal effects", () => {
  it("keeps the funded priority out of new national fiscal movements", () => {
    expect(orderFiscalEffects(FOUNDED, executiveOrder("order-defense-production")!)).toEqual([]);
  });

  it("does not borrow again for relief already funded by an enacted act", () => {
    const relief = executiveOrder("order-relief-program")!;
    const cost = projectFiscalCost(FOUNDED, orderFiscalEffects(FOUNDED, relief));
    expect(cost.debt).toBe(0);
    expect(cost.deficit).toBe(0);
  });

  it("gives an order that never touches the economy nothing to price", () => {
    const order = EXECUTIVE_ORDERS.find((entry) => !Object.keys(entry.nationEffects).some((path) => path.startsWith("economy.")));
    expect(order).toBeDefined();
    expect(orderFiscalEffects(FOUNDED, order!)).toEqual([]);
  });
});
