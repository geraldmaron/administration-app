import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effect-types.js";
import type { TurnPhase } from "./turn-loop.js";
import { obligationAvailability } from "./funding.js";
import { hasProspectiveOrderAuthority } from "./order-authority.js";

/** A modeled two-year federal portfolio purchase, in MWh and USD millions. */
export type CleanPowerPurchase = {
  readonly id: string;
  readonly orderRecordId: string;
  readonly buyer: "federal-property-portfolio";
  readonly amountUsdMillions: number;
  /** A GSA-scale two-year electricity quantity, delivered across the federal property portfolio. */
  readonly quantityMwh: number;
  readonly deliveredMwh: number;
  /** Payments recorded since tracking began, USD millions, covered by ordinary discretionary budgets. */
  readonly paidUsdMillions?: number;
  /** A legacy purchase may have delivered before payments were tracked; its earlier cash history is unknown. */
  readonly paymentTrackingStartMwh?: number;
  readonly contractedTurn: number;
  /** Makes a replay of the same weekly phase idempotent after save/load. */
  readonly lastDeliveryTurn?: number;
  readonly status: "contracted" | "delivered";
  readonly deliveredTurn?: number;
};

export type CleanPowerPurchaseEffect = { readonly kind: "cleanPowerPurchase"; readonly set: CleanPowerPurchase };

export function applyCleanPowerPurchase(campaign: Campaign, effect: CleanPowerPurchaseEffect): Campaign {
  const purchases = campaign.cleanPowerPurchases ?? [];
  return { ...campaign, cleanPowerPurchases: purchases.some((purchase) => purchase.id === effect.set.id)
    ? purchases.map((purchase) => purchase.id === effect.set.id ? effect.set : purchase)
    : [...purchases, effect.set] };
}

export function deliveredCleanPowerPurchase(campaign: Campaign): boolean {
  return (campaign.cleanPowerPurchases ?? []).some((purchase) => purchase.status === "delivered"
    && purchase.deliveredMwh >= purchase.quantityMwh
    && campaign.orders.some((order) => order.id === purchase.orderRecordId && order.order === "order-clean-energy"));
}

/**
 * Weekly domestic renewable output, scaled from EIA's 2025 4.43 trillion kWh
 * utility-scale total by the game's live renewable mix. One percent is the
 * modeled procurement headroom; it does not assert a measured spot surplus.
 * https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php
 */
export function renewableSupplyMwh(campaign: Campaign): number {
  const share = campaign.nations[campaign.founding.nation]?.stats.energy.mix["energy-renewables"] ?? 0;
  return Math.max(0, Math.floor((4_430_000_000 * share / 52) * 0.01));
}

/** A final purchasing rule authorizes one funded two-year federal portfolio contract. */
export function buyFederalCleanPower(campaign: Campaign):
  { readonly ok: true; readonly packet: EffectPacket; readonly purchase: CleanPowerPurchase }
  | { readonly ok: false; readonly reason: string } {
  if ((campaign.cleanPowerPurchases ?? []).some((purchase) => purchase.status === "contracted" || purchase.status === "delivered"))
    return { ok: false, reason: "The federal portfolio already has a clean-power purchase on this record." };
  const rule = campaign.pendingRules.find((entry) => entry.order === "order-clean-energy" && entry.status === "in-effect"
    && hasProspectiveOrderAuthority(campaign, entry.id));
  if (!rule) return { ok: false, reason: "A final, operative federal purchasing rule is required before awarding a contract." };
  // GSA reported over 700,000 MWh of clean procurement since 2022. The model
  // uses that portfolio scale over two years, not at a single building.
  // https://www.gsa.gov/about-gsa/newsroom/news-releases/general-services-administration-announces-historic-purchase-of-carbonfree-elect-08022024
  const quantityMwh = 700_000;
  const weeklyMwh = Math.ceil(quantityMwh / 104);
  if (renewableSupplyMwh(campaign) < weeklyMwh)
    return { ok: false, reason: "The modeled domestic renewable-supply headroom cannot deliver this federal portfolio contract." };
  // EIA's 2025 commercial average was 13.41 cents/kWh; rounded for a game
  // planning obligation, not represented as a clean-energy bid price.
  // https://www.eia.gov/energyexplained/electricity/prices-and-factors-affecting-prices.php
  const amountUsdMillions = 94;
  const funding = obligationAvailability(campaign, amountUsdMillions);
  if (!funding.ok) return { ok: false, reason: funding.missing };
  const purchase: CleanPowerPurchase = { id: `clean-power:portfolio:${campaign.turn}`,
    orderRecordId: rule.id, buyer: "federal-property-portfolio", amountUsdMillions, quantityMwh,
    deliveredMwh: 0, paidUsdMillions: 0, paymentTrackingStartMwh: 0,
    contractedTurn: campaign.turn, status: "contracted" };
  return { ok: true, purchase, packet: { source: "action", actor: "player", turn: campaign.turn,
    narration: { summary: "The federal property portfolio awards a two-year clean-power supply contract; weekly deliveries now come due." },
    provenance: { origin: "decision", entities: [rule.id, purchase.id], systems: ["executive-order"] },
    effects: [{ kind: "metric", deltas: { treasury: -amountUsdMillions } }, { kind: "cleanPowerPurchase", set: purchase }] } };
}

export const cleanPowerPurchasePhase: TurnPhase = (campaign) => {
  let supply = renewableSupplyMwh(campaign);
  const due = (campaign.cleanPowerPurchases ?? []).filter((purchase) => purchase.status === "contracted"
    && campaign.turn > purchase.contractedTurn && campaign.turn > (purchase.lastDeliveryTurn ?? purchase.contractedTurn)).flatMap((purchase) => {
      const installment = Math.min(Math.ceil(purchase.quantityMwh / 104), purchase.quantityMwh - purchase.deliveredMwh);
      if (supply < installment) return [];
      supply -= installment;
      const deliveredMwh = purchase.deliveredMwh + installment;
      const paymentTrackingStartMwh = purchase.paymentTrackingStartMwh ?? purchase.deliveredMwh;
      const paidUsdMillions = Math.round(purchase.amountUsdMillions
        * (deliveredMwh - paymentTrackingStartMwh) / purchase.quantityMwh * 100) / 100;
      return [{ ...purchase, deliveredMwh, paidUsdMillions, paymentTrackingStartMwh,
        lastDeliveryTurn: campaign.turn,
        status: deliveredMwh >= purchase.quantityMwh ? "delivered" as const : "contracted" as const,
        ...(deliveredMwh >= purchase.quantityMwh ? { deliveredTurn: campaign.turn } : {}) }];
    });
  if (due.length === 0) return [];
  return [{ source: "simulate", actor: "world", turn: campaign.turn,
    narration: { summary: "Contracted clean power is delivered to the federal property portfolio." },
    effects: due.map((purchase) => ({ kind: "cleanPowerPurchase" as const,
      set: purchase })) }];
};
