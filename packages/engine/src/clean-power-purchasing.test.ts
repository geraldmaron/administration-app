import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { buyFederalCleanPower, cleanPowerPurchasePhase, deliveredCleanPowerPurchase } from "./clean-power-purchasing.js";
import { selectFiscalStatement } from "./fiscal.js";
import { signOrder } from "./orders.js";
import { rulemakingPhase } from "./rulemaking.js";
import { createRngStreams } from "./rng.js";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import type { Campaign } from "./state.js";

function withFinalRule(campaign: Campaign): Campaign {
  const signed = signOrder(campaign, CHARTER_PRESIDENTIAL_REPUBLIC, "order-clean-energy", createRngStreams(campaign.seed));
  if (!signed.ok) throw new Error(signed.reason);
  const ordered = apply(campaign, signed.packet);
  expect(buyFederalCleanPower(ordered).ok).toBe(false);
  const rule = ordered.pendingRules.find((entry) => entry.id === signed.record.id)!;
  const due = { ...ordered, turn: rule.effectiveTurn };
  const final = rulemakingPhase(due).reduce(apply, due);
  expect(final.pendingRules.find((entry) => entry.id === rule.id)?.status).toBe("in-effect");
  return final;
}

describe("federal clean-power purchasing", () => {
  it("requires a final rule, funded portfolio capacity, and two years of measured delivery", () => {
    const opened = foundedForBalance("clean-purchase-delivery").campaign;
    expect(buyFederalCleanPower(opened).ok).toBe(false);
    const authorized = withFinalRule(opened);
    const award = buyFederalCleanPower(authorized);
    if (!award.ok) throw new Error(award.reason);
    const contracted = apply(authorized, award.packet);
    expect(contracted.player.metrics.treasury).toBe(authorized.player.metrics.treasury - award.purchase.amountUsdMillions);
    expect(contracted.cleanPowerPurchases?.[0]?.paidUsdMillions).toBe(0);
    expect(deliveredCleanPowerPurchase(contracted)).toBe(false);
    expect(buyFederalCleanPower(contracted).ok).toBe(false);
    const due = { ...contracted, turn: contracted.turn + 1 };
    const home = due.founding.nation;
    const runtime = due.nations[home]!;
    const delayed: Campaign = { ...due, nations: { ...due.nations, [home]: { ...runtime,
      stats: { ...runtime.stats, energy: { ...runtime.stats.energy,
        mix: { ...runtime.stats.energy.mix, "energy-renewables": 0 } } } } } };
    expect(cleanPowerPurchasePhase(delayed)).toEqual([]);
    expect(delayed.cleanPowerPurchases?.[0]?.paidUsdMillions).toBe(0);
    const oldPurchase = { ...contracted.cleanPowerPurchases![0]!, deliveredMwh: 100_000,
      paidUsdMillions: undefined, paymentTrackingStartMwh: undefined };
    const legacy: Campaign = { ...due, cleanPowerPurchases: [oldPurchase] };
    const observed = cleanPowerPurchasePhase(legacy).reduce(apply, legacy).cleanPowerPurchases![0]!;
    expect(observed.paymentTrackingStartMwh).toBe(100_000);
    expect(observed.paidUsdMillions).toBeLessThan(2);
    const first = cleanPowerPurchasePhase(due).reduce(apply, due);
    expect(first.cleanPowerPurchases?.[0]?.deliveredMwh).toBeGreaterThan(0);
    expect(first.cleanPowerPurchases?.[0]?.paidUsdMillions).toBeGreaterThan(0);
    expect(selectFiscalStatement(first).cleanPowerPaymentsRecorded).toBe(first.cleanPowerPurchases?.[0]?.paidUsdMillions);
    expect(selectFiscalStatement(first).outlay.discretionary).toBe(selectFiscalStatement(contracted).outlay.discretionary);
    expect(first.cleanPowerPurchases?.[0]?.lastDeliveryTurn).toBe(due.turn);
    const reloaded = JSON.parse(JSON.stringify(first)) as Campaign;
    const retried = cleanPowerPurchasePhase(reloaded).reduce(apply, reloaded);
    expect(retried.cleanPowerPurchases?.[0]).toEqual(first.cleanPowerPurchases?.[0]);
    expect(deliveredCleanPowerPurchase(first)).toBe(false);
    let delivered = first;
    for (let week = 1; week < 104; week += 1) {
      const next = { ...delivered, turn: delivered.turn + 1 };
      delivered = cleanPowerPurchasePhase(next).reduce(apply, next);
    }
    expect(delivered.cleanPowerPurchases?.[0]?.status).toBe("delivered");
    expect(delivered.cleanPowerPurchases?.[0]?.deliveredMwh).toBe(700_000);
    expect(delivered.cleanPowerPurchases?.[0]?.paidUsdMillions).toBe(94);
    expect(deliveredCleanPowerPurchase(delivered)).toBe(true);
    const rescinded = { ...delivered, orders: delivered.orders.map((order) => order.id === award.purchase.orderRecordId
      ? { ...order, rescindedTurn: delivered.turn } : order) };
    expect(deliveredCleanPowerPurchase(rescinded)).toBe(true);
    expect(buyFederalCleanPower(rescinded).ok).toBe(false);
    const us = authorized.nations[authorized.founding.nation]!;
    const short = { ...authorized, nations: { ...authorized.nations, [authorized.founding.nation]: { ...us,
      stats: { ...us.stats, energy: { ...us.stats.energy,
        mix: { ...us.stats.energy.mix, "energy-renewables": 0 } } } } } };
    expect(buyFederalCleanPower(short).ok).toBe(false);
  });
});
