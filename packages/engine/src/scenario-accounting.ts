import { bookUsDebt } from "./national-books.js";
import { costMultiplier } from "./scenario-cost-draw.js";
import type { Campaign } from "./state.js";
import type { Effect, EffectPacket } from "./effect-types.js";

/** USD millions. The source is a pricing claim, never a claim of fitted uncertainty. */
export type ScenarioEstimate = {
  readonly key: string;
  readonly source: string;
  readonly method: "arithmetic" | "band";
  readonly spread: number;
};

export type ScenarioAccounting = {
  readonly estimated: number;
  readonly booked: number;
  readonly variance: number;
  readonly source: string;
  readonly method: "arithmetic" | "band";
  readonly calibration: "planning";
};

/** A separate stream keeps previewing, refusing or retrying from consuming the outcome. */
function outturn(campaign: Campaign, amount: number, estimate: ScenarioEstimate): number {
  const factor = costMultiplier(`${campaign.seed}|${estimate.key}|booked`, estimate.spread);
  return Math.round(amount * factor * 1_000_000) / 1_000_000;
}

/** Only tagged authored borrowing is uncertain; other obligations keep their existing contract. */
export function settleScenarioAccounting(campaign: Campaign, packet: EffectPacket): EffectPacket {
  const accounting: ScenarioAccounting[] = [];
  let debt = campaign.nations[campaign.founding.nation]!.stats.economy.debt;
  const effects: readonly Effect[] = packet.effects.map((effect) => {
    if (effect.kind !== "choiceBorrowing") return effect;
    if (!effect.estimate) { debt = bookUsDebt(debt, 0, effect.amount); return effect; }
    if (!Number.isFinite(effect.amount) || effect.amount < 0 || !Number.isFinite(effect.estimate.spread) || effect.estimate.spread < 0) {
      throw new Error("Invalid scenario financial estimate");
    }
    const after = bookUsDebt(debt, 0, outturn(campaign, effect.amount, effect.estimate));
    const booked = after - debt;
    debt = after;
    accounting.push({ estimated: effect.amount, booked, variance: booked - effect.amount,
      source: effect.estimate.source, method: effect.estimate.method, calibration: "planning" });
    return { kind: "choiceBorrowing", amount: booked };
  });
  return accounting.length === 0 ? packet : { ...packet, effects, accounting };
}
