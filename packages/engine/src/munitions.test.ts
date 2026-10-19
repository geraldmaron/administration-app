/**
 * Munitions stay levels. The United States is held by class, every other
 * government as one index; a war week draws them down, what the United States
 * draws goes on order behind the general lead, and a class at zero limits the
 * rung it supports.
 */
import { describe, expect, it } from "vitest";
import { US_MUNITIONS, type NationId } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { openConflict } from "./conflicts.js";
import { executiveOrder, orderAvailability } from "./orders.js";
import { addDays } from "./clock.js";
import {
  CLASS_RESTOCK_RANK,
  DRAW_PER_WAR_WEEK,
  GENERAL_RESTOCK_LEAD,
  MUNITION_CLASS_IDS,
  MUNITIONS_LINES,
  DEFENSE_PRIORITY_WEEKLY_INDEX,
  RESTOCK_PER_WEEK,
  activeDefensePriorityContractId,
  hasLiveDefensePriorityContract,
  munitionLevel,
  munitionsOf,
  munitionsPhase,
  munitionsShortfall,
  openingMunitions,
  selectMunitions,
} from "./munitions.js";
import type { Campaign, MunitionsState } from "./state.js";

const USA = nationA.id;
const ALP = nationB.id as NationId;

function atWar(campaign: Campaign, intensity: number): Campaign {
  const war = { ...openConflict(ALP, USA, campaign.turn, "Alpland attacks."), intensity };
  return { ...campaign, conflicts: { [war.id]: war } };
}

function week(campaign: Campaign): Campaign {
  const next = munitionsPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
  return { ...next, turn: next.turn + 1, calendar: addDays(next.calendar, 7) };
}

function withStocks(campaign: Campaign, set: (state: MunitionsState) => MunitionsState): Campaign {
  return { ...campaign, munitions: set(openingMunitions()) };
}

describe("the opening stocks", () => {
  it("opens every US class below full, at the seeded planning level, and labels it planning", () => {
    const reading = selectMunitions(buildCampaign());
    expect(reading.classes.map((row) => row.id)).toEqual([...MUNITION_CLASS_IDS]);
    expect(reading.provenance).toBe("planning value");
    for (const row of reading.classes) {
      const seeded = US_MUNITIONS.find((entry) => entry.munitionClass === row.id);
      expect(seeded?.provenance).toBe("planning value");
      expect(row.index).toBe(seeded?.openingIndex);
      expect(row.index).toBeLessThan(1);
    }
  });

  it("carries no count anywhere in the seed, only an index and its derivation", () => {
    for (const row of US_MUNITIONS) {
      expect(row.openingIndex === null || (row.openingIndex >= 0 && row.openingIndex <= 1)).toBe(true);
      expect(row.systems.join(" ")).not.toMatch(/javelin|stinger|himars|tpy/);
    }
  });

  it("holds every other government at full until a war draws it", () => {
    expect(munitionLevel(buildCampaign(), ALP)).toBe(1);
  });
});

describe("a war week", () => {
  it("draws every US class down by intensity and places the draw on order after the general lead", () => {
    const campaign = atWar(withStocks(buildCampaign(), (state) => state), 1);
    const after = week(campaign);
    for (const id of MUNITION_CLASS_IDS) {
      const before = munitionsOf(campaign).us[id]!.count;
      const now = after.munitions!.us[id]!;
      expect(now.count).toBeCloseTo(before - DRAW_PER_WAR_WEEK + RESTOCK_PER_WEEK[CLASS_RESTOCK_RANK[id]], 4);
      expect(now.onOrder).toEqual([{ arrives: addDays(campaign.calendar, GENERAL_RESTOCK_LEAD.weeks * 7), count: Math.round((DRAW_PER_WAR_WEEK - RESTOCK_PER_WEEK[CLASS_RESTOCK_RANK[id]]) * 10000) / 10000 }]);
    }
  });

  it("replaces a drawn stock once: what the line delivers comes off the order, and the order lands only what is still owed", () => {
    const campaign = atWar(withStocks(buildCampaign(), (state) => state), 1);
    const drawn = week(campaign);
    const peace: Campaign = { ...drawn, conflicts: {} };
    let state = peace;
    const weeks = GENERAL_RESTOCK_LEAD.weeks + 1;
    for (let index = 0; index < weeks; index += 1) state = week(state);
    for (const id of MUNITION_CLASS_IDS) {
      const start = munitionsOf(campaign).us[id]!.count;
      const line = RESTOCK_PER_WEEK[CLASS_RESTOCK_RANK[id]];
      // The line's pace alone over the whole stretch, with the draw taken off once: never more.
      expect(state.munitions?.us[id]?.count ?? 1).toBeLessThanOrEqual(Math.min(1, start - DRAW_PER_WAR_WEEK + line * (weeks + 1)) + 1e-9);
      expect(state.munitions?.us[id]?.onOrder ?? []).toEqual([]);
    }
  });

  it("draws the other side's single index too", () => {
    const after = week(atWar(buildCampaign(), 1));
    expect(after.munitions!.index[ALP]).toBeLessThan(1);
  });

  it("lands an order the week it comes due, and files the delivery", () => {
    const due = buildCampaign().calendar;
    const campaign = withStocks(buildCampaign(), (state) => ({
      ...state,
      us: { ...state.us, "cruise-standoff": { count: 0.1, onOrder: [{ arrives: due, count: 0.3 }] } },
    }));
    const packets = munitionsPhase(campaign);
    const after = packets.reduce((state, packet) => apply(state, packet), campaign);
    expect(after.munitions!.us["cruise-standoff"]!.count).toBeGreaterThan(0.39);
    expect(after.munitions!.us["cruise-standoff"]!.onOrder).toEqual([]);
    expect(after.feed.some((item) => item.headline === MUNITIONS_LINES.restocked("cruise and standoff missiles"))).toBe(true);
  });

  it("refills slowly with no war, and never past full", () => {
    const full = withStocks(buildCampaign(), (state) => ({ ...state, us: { ...state.us, "artillery-155": { count: 0.999, onOrder: [] } } }));
    expect(week(full).munitions!.us["artillery-155"]!.count).toBe(1);
  });
});

describe("a named defense priority contract", () => {
  function contracted(due = addDays(buildCampaign().calendar, 7)): Campaign {
    const base = buildCampaign();
    const stock = openingMunitions();
    const id = "order-defense-production:1";
    return { ...base, orders: [{ id, order: "order-defense-production", turn: base.turn,
      contested: false, challengeChance: 0, defenseContract: { supplier: "Potomac Precision Works",
        munitionClass: "precision-fires", initialIndex: 0.05, due, provenance: "planning value" } }],
      munitions: { ...stock, us: { ...stock.us, "precision-fires": { count: 0.45,
        onOrder: [{ arrives: due, count: 0.05, priorityContractId: id }] } } } };
  }

  it("adds bounded weekly production only to the contracted class and cannot replay it", () => {
    const before = contracted();
    expect(activeDefensePriorityContractId(before)).toBe(before.orders[0]?.id);
    const after = munitionsPhase(before).reduce(apply, before);
    expect(after.munitions!.us["precision-fires"]!.count - before.munitions!.us["precision-fires"]!.count)
      .toBeCloseTo(RESTOCK_PER_WEEK[CLASS_RESTOCK_RANK["precision-fires"]] + DEFENSE_PRIORITY_WEEKLY_INDEX, 4);
    expect(after.munitions!.us["air-defense"]!.count - before.munitions!.us["air-defense"]!.count)
      .toBeCloseTo(RESTOCK_PER_WEEK[CLASS_RESTOCK_RANK["air-defense"]], 4);
    expect(munitionsPhase(after)).toEqual([]);
  });

  it("keeps an overdue residual on the order book instead of minting it at the general lead", () => {
    const base = buildCampaign();
    const before = contracted(addDays(base.calendar, -7));
    const after = munitionsPhase(before).reduce(apply, before);
    const order = after.munitions!.us["precision-fires"]!.onOrder[0]!;
    expect(order.count).toBeGreaterThan(0);
    expect(order.count).toBeLessThan(0.05);
    expect(after.munitions!.us["precision-fires"]!.count).toBeLessThan(0.46);
  });

  it("stops priority output after rescission but continues ordinary fulfillment of the vested backlog", () => {
    const before = contracted();
    const ended = { ...before, orders: before.orders.map((order) => ({ ...order, rescindedTurn: before.turn })) };
    expect(activeDefensePriorityContractId(ended)).toBeUndefined();
    const after = munitionsPhase(ended).reduce(apply, ended);
    expect(after.munitions!.us["precision-fires"]!.count - before.munitions!.us["precision-fires"]!.count)
      .toBeCloseTo(RESTOCK_PER_WEEK[CLASS_RESTOCK_RANK["precision-fires"]], 4);
    expect(after.munitions!.us["precision-fires"]!.onOrder[0]?.priorityContractId).toBe(before.orders[0]?.id);
  });

  it("withholds priority during party-specific statutory relief without canceling the contract", () => {
    const before = contracted();
    const orderId = before.orders[0]!.id;
    const stayed: Campaign = { ...before, judiciary: { ...before.judiciary, proceedings: [{
      id: `statute:${orderId}`, subject: { kind: "statutory-authority", billId: "bill:defense",
        actId: "act-defense-authorization", orderId: "order-defense-production", recordId: orderId },
      filedTurn: before.turn, stage: "interim", nextTurn: before.turn + 1, history: [],
      partyRelief: { scope: "defense-industrial", fraction: 1, active: true, appliedOnce: true,
        outstanding: {} },
    }] } };
    expect(activeDefensePriorityContractId(stayed)).toBeUndefined();
    expect(hasLiveDefensePriorityContract(stayed)).toBe(true);
    const after = munitionsPhase(stayed).reduce(apply, stayed);
    expect(after.munitions!.us["precision-fires"]!.count - before.munitions!.us["precision-fires"]!.count)
      .toBeCloseTo(RESTOCK_PER_WEEK[CLASS_RESTOCK_RANK["precision-fires"]], 4);
    expect(after.munitions!.us["precision-fires"]!.onOrder[0]?.priorityContractId).toBe(orderId);
  });

  it("refuses a second live priority until the first contract is fulfilled or ended", () => {
    const before = contracted();
    const stock = before.munitions!.us["precision-fires"]!;
    const candidate = { ...before, turn: before.turn + 1, munitions: { ...before.munitions!,
      us: { ...before.munitions!.us, "precision-fires": { ...stock,
        onOrder: [...stock.onOrder, { arrives: stock.onOrder[0]!.arrives, count: 0.03 }] } } } };
    expect(hasLiveDefensePriorityContract(candidate)).toBe(true);
    expect(orderAvailability(candidate, executiveOrder("order-defense-production")!))
      .toMatchObject({ ok: false, missing: expect.stringContaining("existing named defense priority") });
    const fulfilled = { ...candidate, munitions: { ...candidate.munitions!, us: { ...candidate.munitions!.us,
      "precision-fires": { ...stock, onOrder: candidate.munitions!.us["precision-fires"]!.onOrder.filter((order) => !order.priorityContractId) } } } };
    const rescinded = { ...candidate, orders: candidate.orders.map((order) => ({ ...order, rescindedTurn: candidate.turn })) };
    const struck = { ...candidate, orders: candidate.orders.map((order) => ({ ...order,
      review: { dueTurn: candidate.turn, status: "struck-down" as const } })) };
    for (const released of [fulfilled, rescinded, struck]) {
      expect(hasLiveDefensePriorityContract(released)).toBe(false);
      const availability = orderAvailability(released, executiveOrder("order-defense-production")!);
      if (!availability.ok) expect(availability.missing).not.toContain("existing named defense priority");
    }
  });
});

describe("a class at zero limits its rung", () => {
  const spent = withStocks(buildCampaign(), (state) => ({ ...state, us: { ...state.us, "cruise-standoff": { count: 0, onOrder: [] } } }));

  it("refuses the strike rung while the standoff stocks are spent, and names them", () => {
    expect(munitionsShortfall(spent, USA, 4)).toContain("cruise and standoff missiles");
    expect(munitionsShortfall(spent, USA, 3)).toBeUndefined();
  });

  it("never refuses another government on the President's stocks", () => {
    expect(munitionsShortfall(spent, ALP, 4)).toBeUndefined();
  });

  it("reads the spent class as spent", () => {
    expect(selectMunitions(spent).classes.find((row) => row.id === "cruise-standoff")?.band).toBe("spent");
  });
});
