import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { activeExternalEmergency } from "./external-emergency.js";
import { coerciveMeasureEffect, tradeEdgesWith } from "./trade.js";
import type { Effect } from "./effect-types.js";

/** A modeled U.S.-custodied government account; no property changes ownership. */
export type BlockedAsset = {
  readonly id: string;
  readonly owner: NationId;
  readonly custodian: "modeled-us-clearing-account";
  readonly modeled: true;
  readonly orderRecordId: string;
  readonly emergencyId: string;
  readonly tradeMeasureId: string;
  readonly blockedTurn: number;
  readonly status: "blocked" | "released";
  readonly releasedTurn?: number;
  readonly releaseReason?: "order-ended" | "emergency-ended";
};

export type BlockedAssetEffect = { readonly kind: "blockedAsset"; readonly set: BlockedAsset };

export function applyBlockedAsset(campaign: Campaign, effect: BlockedAssetEffect): Campaign {
  const assets = campaign.blockedAssets ?? [];
  return { ...campaign, blockedAssets: assets.some((asset) => asset.id === effect.set.id)
    ? assets.map((asset) => asset.id === effect.set.id ? effect.set : asset) : [...assets, effect.set] };
}

export function blockableAccount(campaign: Campaign, owner: NationId): string | undefined {
  if (owner === campaign.founding.nation || !campaign.nations[owner]) return undefined;
  if (!tradeEdgesWith(campaign, owner).some((edge) => edge.imports > 0)) return undefined;
  if ((campaign.blockedAssets ?? []).some((asset) => asset.owner === owner && asset.status === "blocked")) return undefined;
  return `modeled-us-account:${owner}`;
}

export function blockedAssetForOrder(campaign: Campaign, owner: NationId, orderRecordId: string): BlockedAsset | undefined {
  const id = blockableAccount(campaign, owner);
  const emergency = activeExternalEmergency(campaign, owner);
  if (!id || !emergency) return undefined;
  return { id: `${id}:${orderRecordId}`, owner, custodian: "modeled-us-clearing-account", modeled: true,
    orderRecordId, emergencyId: emergency.id, tradeMeasureId: `asset-restriction:${orderRecordId}`,
    blockedTurn: campaign.turn, status: "blocked" };
}

/**
 * The linked trade restriction is the operational bar on dealings in this
 * account. It is filed as listed: one modeled account is not the owner's whole
 * trade, so it reaches no sector and no third party until an account's own
 * scope is represented.
 */
export function assetBlockingEffects(campaign: Campaign, asset: BlockedAsset): readonly Effect[] {
  const template = coerciveMeasureEffect(campaign, campaign.founding.nation, asset.owner, "asset-restriction");
  if (template?.kind !== "trade" || !template.measure) return [];
  return [{ kind: "blockedAsset", set: asset }, { ...template,
    measure: { ...template.measure, id: asset.tradeMeasureId, scope: "listed" } }];
}

/** The block ceases when its order or specific emergency no longer stands. */
export const blockedAssetPhase: TurnPhase = (campaign) => {
  const released = (campaign.blockedAssets ?? []).flatMap((asset) => {
    if (asset.status !== "blocked") return [];
    const order = campaign.orders.find((entry) => entry.id === asset.orderRecordId);
    const orderEnded = !order || order.rescindedTurn !== undefined || order.review?.status === "struck-down";
    const emergency = campaign.externalEmergencies?.[asset.emergencyId];
    const emergencyEnded = !emergency || emergency.endedTurn !== undefined || campaign.turn >= emergency.expiresTurn;
    if (!orderEnded && !emergencyEnded) return [];
    return [{ kind: "blockedAsset" as const, set: { ...asset, status: "released" as const,
      releasedTurn: campaign.turn, releaseReason: orderEnded ? "order-ended" as const : "emergency-ended" as const } },
    { kind: "trade" as const, lift: asset.tradeMeasureId }];
  });
  return released.length === 0 ? [] : [{ source: "simulate", actor: "world", turn: campaign.turn,
    narration: { summary: "A foreign-property block ends when its order or emergency authority ends; ownership remains with the account holder." },
    effects: released }];
};
