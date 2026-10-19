import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply, type EffectPacket } from "./effects.js";
import { createSave, loadSave } from "./save.js";
import { settleScenarioAccounting } from "./scenario-accounting.js";

const { campaign } = foundedForBalance("scenario-accounting");
const packet: EffectPacket = { source: "conversation", actor: "player", turn: campaign.turn,
  narration: { summary: "Authorized the existing recovery request." }, effects: [{ kind: "choiceBorrowing", amount: 25,
    estimate: { key: "recovery-occurrence", source: "Quantity times published unit cost; planning duration", method: "arithmetic", spread: 0.15 } }] };

describe("scenario estimate and outturn", () => {
  it("books a separate reproducible actual, preserves the estimate, and saves the variance", () => {
    const first = settleScenarioAccounting(campaign, packet);
    expect(settleScenarioAccounting(campaign, packet)).toEqual(first);
    expect(packet.effects[0]).toMatchObject({ amount: 25 });
    const receipt = first.accounting![0]!;
    expect(receipt.estimated).toBe(25);
    expect(receipt.booked).not.toBe(25);
    expect(receipt.variance).toBeCloseTo(receipt.booked - 25, 10);
    const after = apply(campaign, first);
    expect(after.nations[campaign.founding.nation]!.stats.economy.debt - campaign.nations[campaign.founding.nation]!.stats.economy.debt).toBeCloseTo(receipt.booked, 6);
    expect(loadSave(JSON.parse(JSON.stringify(createSave(after)))).ledger.at(-1)!.accounting).toEqual(first.accounting);
    expect(settleScenarioAccounting(campaign, first)).toEqual(first);
  });

  it("leaves contractual borrowing unchanged and refuses malformed uncertainty", () => {
    const fixed: EffectPacket = { ...packet, effects: [{ kind: "choiceBorrowing", amount: 25 }] };
    expect(settleScenarioAccounting(campaign, fixed)).toBe(fixed);
    expect(() => settleScenarioAccounting(campaign, { ...packet, effects: [{ kind: "choiceBorrowing", amount: -1,
      estimate: { key: "bad", source: "bad", method: "band", spread: 0.35 } }] })).toThrow("Invalid scenario");
  });
});
