import type { Campaign, PressEngagement } from "./state.js";
import type { EffectPacket } from "./effects.js";
/** How much of a bad engagement the secretary's apology wins back. */
export declare const TAKE_THE_HIT_SHARE = 0.6;
/** How recent a bad cycle has to be for anyone to be able to take it: this week or last. */
export declare const TAKE_THE_HIT_WINDOW_TURNS = 1;
export type TakeTheHitProjection = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly secretary: {
        readonly id: string;
        readonly name: string;
    };
    readonly engagement: PressEngagement;
    /** Where the corps's standing lands once the apology is read. */
    readonly standingAfter: number;
    readonly packet: EffectPacket;
};
/**
 * The act, projected and ready to commit. Refused, with the reason, when there
 * is no secretary to send, the secretary has already spent their credibility,
 * or there is no recent bad cycle to take.
 */
export declare function secretaryTakesTheHit(campaign: Campaign): TakeTheHitProjection;
