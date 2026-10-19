import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effect-types.js";
import type { TurnPhase } from "./turn-loop.js";
export type OffshoreLeaseBid = {
    readonly id: string;
    readonly bidder: string;
    readonly qualified: boolean;
    /** Game valuation in USD millions, not an actual BOEM tract appraisal. */
    readonly amountUsdMillions: number;
};
export type OffshoreLeaseSale = {
    readonly id: string;
    readonly areaId: string;
    readonly planningRuleId: string;
    readonly saleNumber: string;
    /** A bounded fictional parcel for this simulation, not a BOEM tract number. */
    readonly tract: {
        readonly id: string;
        readonly name: string;
        readonly modeled: true;
    };
    readonly stage: "environmental-analysis" | "consultation" | "proposed-notice" | "final-notice" | "bid-collection" | "bid-review" | "decision" | "awarded" | "no-sale" | "expired";
    readonly openedTurn: number;
    /** The existing discretionary appropriation obligated for this sale review. */
    readonly reviewObligationUsdMillions: number;
    readonly interiorCapacityAtStart: number;
    readonly stageTurn: number;
    /** Lost staff weeks shift the work clock; they do not complete review while paused. */
    readonly pausedWeeks?: number;
    readonly lastPausedTurn?: number;
    readonly environmentalCompletedTurn?: number;
    readonly consultationCompletedTurn?: number;
    readonly proposedNoticeTurn?: number;
    readonly finalNoticeTurn?: number;
    readonly saleHeldTurn?: number;
    readonly fairValueReviewedTurn?: number;
    readonly bids: readonly OffshoreLeaseBid[];
    /** Game reserve, USD millions. The agency may reject every bid below it. */
    readonly modeledFairValueUsdMillions: number;
    readonly acceptedBidId?: string;
    readonly awardedTurn?: number;
    /** Accepted bid becomes a due bonus, then a dated federal receipt. */
    readonly bonusReceipt?: {
        readonly id: string;
        readonly amountUsdMillions: number;
        readonly dueTurn: number;
        readonly receivedTurn?: number;
    };
    readonly reason?: string;
    readonly exploration?: {
        readonly status: "awaiting-plan" | "under-review" | "permitted" | "refused" | "no-plan";
        readonly submittedTurn?: number;
        readonly resolvedTurn?: number;
        readonly reason?: string;
        readonly reviewPausedWeeks?: number;
        readonly lastPausedTurn?: number;
    };
};
export type OffshoreLeaseSaleEffect = {
    readonly kind: "offshoreLeaseSale";
    readonly set: OffshoreLeaseSale;
};
export type OffshoreLeaseAction = "initiate-sale" | "accept-bid" | "decline-bid";
export type OffshoreLeaseActionResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare const OFFSHORE_REVIEW_OBLIGATION_USD_MILLIONS = 5;
export declare function selectOffshoreLeaseSale(campaign: Campaign, areaId: string): OffshoreLeaseSale | undefined;
export declare function applyOffshoreLeaseSale(campaign: Campaign, effect: OffshoreLeaseSaleEffect): Campaign;
/** Planning must still be operative until the actual sale is held. */
export declare function operativeLeasePlanningRule(campaign: Campaign, areaId: string): string | undefined;
export declare function offshoreLeaseSaleAction(campaign: Campaign, areaId: string, action: OffshoreLeaseAction): OffshoreLeaseActionResult;
export declare function availableOffshoreLeaseActions(campaign: Campaign, areaId: string): readonly OffshoreLeaseAction[];
export declare function hasOffshoreExplorationPermit(campaign: Campaign): boolean;
export declare const offshoreLeaseSalePhase: TurnPhase;
/** A dated receipt enters the national books once, not the President's spendable authority. */
export declare function pendingOffshoreLeaseBonus(campaign: Campaign): {
    readonly ids: readonly string[];
    readonly amountUsdMillions: number;
};
