import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effect-types.js";
import type { TurnPhase } from "./turn-loop.js";
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
export type CleanPowerPurchaseEffect = {
    readonly kind: "cleanPowerPurchase";
    readonly set: CleanPowerPurchase;
};
export declare function applyCleanPowerPurchase(campaign: Campaign, effect: CleanPowerPurchaseEffect): Campaign;
export declare function deliveredCleanPowerPurchase(campaign: Campaign): boolean;
/**
 * Weekly domestic renewable output, scaled from EIA's 2025 4.43 trillion kWh
 * utility-scale total by the game's live renewable mix. One percent is the
 * modeled procurement headroom; it does not assert a measured spot surplus.
 * https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php
 */
export declare function renewableSupplyMwh(campaign: Campaign): number;
/** A final purchasing rule authorizes one funded two-year federal portfolio contract. */
export declare function buyFederalCleanPower(campaign: Campaign): {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly purchase: CleanPowerPurchase;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare const cleanPowerPurchasePhase: TurnPhase;
