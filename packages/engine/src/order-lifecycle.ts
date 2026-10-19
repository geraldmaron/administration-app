import { campaignDay } from "./clock.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { Campaign, ExecutiveOrderRecord } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";

export type OrderRescissionResult = { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

function endOrder(campaign: Campaign, record: ExecutiveOrderRecord, reason: "rescinded" | "sunset"): EffectPacket {
  const rule = campaign.pendingRules.find((entry) => entry.id === record.id);
  const activeRule = rule?.status === "in-effect";
  const blocked = (campaign.blockedAssets ?? []).filter((asset) => asset.orderRecordId === record.id && asset.status === "blocked");
  const effects: Effect[] = [
    { kind: "orderRescission", id: record.id, turn: campaign.turn, reason },
    ...blocked.flatMap((asset): Effect[] => [
      { kind: "blockedAsset", set: { ...asset, status: "released", releasedTurn: campaign.turn, releaseReason: "order-ended" } },
      { kind: "trade", lift: asset.tradeMeasureId },
    ]),
    ...(rule && (rule.status === "pending" || rule.status === "stayed" || activeRule)
      ? [{ kind: "pendingRule" as const, set: { ...rule,
        status: activeRule ? "rescinded" as const : "canceled" as const, resolvedTurn: campaign.turn } }] : []),
    ...(activeRule ? [{ kind: "orderRemedy" as const, ruleId: record.id }]
      : !rule ? [{ kind: "orderRemedy" as const, orderId: record.id }] : []),
  ];
  return { source: reason === "sunset" ? "simulate" : "action",
    actor: reason === "sunset" ? "world" : "player", turn: campaign.turn,
    narration: { summary: reason === "sunset"
      ? `The ninety-day authority for ${record.order} expires; its future operation ends.`
      : `${record.order} is rescinded; its future operation ends.` },
    effects };
}

/** Prospective withdrawal keeps the signature, court case, and sunk spending on record. */
export function rescindOrder(campaign: Campaign, recordId: string): OrderRescissionResult {
  const record = campaign.orders.find((entry) => entry.id === recordId);
  if (!record) return { ok: false, reason: "no signed order by that record id" };
  if (record.rescindedTurn !== undefined || record.review?.status === "struck-down")
    return { ok: false, reason: "this order has already ended" };
  return { ok: true, packet: endOrder(campaign, record, "rescinded") };
}

/** A ninety-day freeze ends on its recorded campaign day without a new choice. */
export const orderExpiryPhase: TurnPhase = (campaign) => campaign.orders
  .filter((record) => record.sunsetDay !== undefined && campaignDay(campaign) >= record.sunsetDay
    && record.rescindedTurn === undefined && record.review?.status !== "struck-down")
  .map((record) => endOrder(campaign, record, "sunset"));
