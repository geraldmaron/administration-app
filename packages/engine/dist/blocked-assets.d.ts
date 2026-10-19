import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
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
export type BlockedAssetEffect = {
    readonly kind: "blockedAsset";
    readonly set: BlockedAsset;
};
export declare function applyBlockedAsset(campaign: Campaign, effect: BlockedAssetEffect): Campaign;
export declare function blockableAccount(campaign: Campaign, owner: NationId): string | undefined;
export declare function blockedAssetForOrder(campaign: Campaign, owner: NationId, orderRecordId: string): BlockedAsset | undefined;
/** The linked trade restriction is the operational bar on dealings in this account. */
export declare function assetBlockingEffects(campaign: Campaign, asset: BlockedAsset): readonly Effect[];
/** The block ceases when its order or specific emergency no longer stands. */
export declare const blockedAssetPhase: TurnPhase;
