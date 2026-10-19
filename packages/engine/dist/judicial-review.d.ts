import type { Charter } from "@admin/world";
import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
/** Court steps are autonomous and recorded one at a time; only a final judgment changes the order's review status. */
export declare function judicialReviewPhase(charter: Charter): TurnPhase;
/** Answer the dated lower-court review choice without changing the court's merits or grant decision. */
export declare function answerLowerOrderReview(campaign: Campaign, proceedingId: string, choice: "seek" | "seek-with-stay" | "accept"): {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
