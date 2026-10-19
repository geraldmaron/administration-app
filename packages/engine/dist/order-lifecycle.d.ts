import type { EffectPacket } from "./effects.js";
import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
export type OrderRescissionResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Prospective withdrawal keeps the signature, court case, and sunk spending on record. */
export declare function rescindOrder(campaign: Campaign, recordId: string): OrderRescissionResult;
/** A ninety-day freeze ends on its recorded campaign day without a new choice. */
export declare const orderExpiryPhase: TurnPhase;
