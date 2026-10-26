import type { Charter } from "@admin/world";
import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import type { ExecutiveOrder } from "./orders.js";
import type { MetricDeltas } from "./effect-types.js";
/**
 * What losing costs follows what was lost: a loud act more than a quiet one,
 * and a remedy that undoes something already in effect more than one that
 * cancels a rule before it landed.
 */
export declare function strikeDownCost(order: ExecutiveOrder, undoesLanded: boolean): MetricDeltas;
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
