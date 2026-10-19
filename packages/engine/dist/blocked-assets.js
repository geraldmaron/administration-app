import { activeExternalEmergency } from "./external-emergency.js";
import { coerciveMeasureEffect, tradeEdgesWith } from "./trade.js";
export function applyBlockedAsset(campaign, effect) {
    const assets = campaign.blockedAssets ?? [];
    return { ...campaign, blockedAssets: assets.some((asset) => asset.id === effect.set.id)
            ? assets.map((asset) => asset.id === effect.set.id ? effect.set : asset) : [...assets, effect.set] };
}
export function blockableAccount(campaign, owner) {
    if (owner === campaign.founding.nation || !campaign.nations[owner])
        return undefined;
    if (!tradeEdgesWith(campaign, owner).some((edge) => edge.imports > 0))
        return undefined;
    if ((campaign.blockedAssets ?? []).some((asset) => asset.owner === owner && asset.status === "blocked"))
        return undefined;
    return `modeled-us-account:${owner}`;
}
export function blockedAssetForOrder(campaign, owner, orderRecordId) {
    const id = blockableAccount(campaign, owner);
    const emergency = activeExternalEmergency(campaign, owner);
    if (!id || !emergency)
        return undefined;
    return { id: `${id}:${orderRecordId}`, owner, custodian: "modeled-us-clearing-account", modeled: true,
        orderRecordId, emergencyId: emergency.id, tradeMeasureId: `asset-restriction:${orderRecordId}`,
        blockedTurn: campaign.turn, status: "blocked" };
}
/** The linked trade restriction is the operational bar on dealings in this account. */
export function assetBlockingEffects(campaign, asset) {
    const template = coerciveMeasureEffect(campaign, campaign.founding.nation, asset.owner, "asset-restriction");
    if (template?.kind !== "trade" || !template.measure)
        return [];
    return [{ kind: "blockedAsset", set: asset }, { ...template,
            measure: { ...template.measure, id: asset.tradeMeasureId } }];
}
/** The block ceases when its order or specific emergency no longer stands. */
export const blockedAssetPhase = (campaign) => {
    const released = (campaign.blockedAssets ?? []).flatMap((asset) => {
        if (asset.status !== "blocked")
            return [];
        const order = campaign.orders.find((entry) => entry.id === asset.orderRecordId);
        const orderEnded = !order || order.rescindedTurn !== undefined || order.review?.status === "struck-down";
        const emergency = campaign.externalEmergencies?.[asset.emergencyId];
        const emergencyEnded = !emergency || emergency.endedTurn !== undefined || campaign.turn >= emergency.expiresTurn;
        if (!orderEnded && !emergencyEnded)
            return [];
        return [{ kind: "blockedAsset", set: { ...asset, status: "released",
                    releasedTurn: campaign.turn, releaseReason: orderEnded ? "order-ended" : "emergency-ended" } },
            { kind: "trade", lift: asset.tradeMeasureId }];
    });
    return released.length === 0 ? [] : [{ source: "simulate", actor: "world", turn: campaign.turn,
            narration: { summary: "A foreign-property block ends when its order or emergency authority ends; ownership remains with the account holder." },
            effects: released }];
};
