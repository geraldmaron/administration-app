import type { Campaign } from "./state.js";
import type { Effect } from "./effects.js";
import type { MetricCost } from "./resolution.js";
import type { ReplyCommitment } from "./conversations.js";
export declare function reliefProjection(campaign: Campaign, subject: Extract<ReplyCommitment, {
    kind: "position";
}>["relief"]): {
    readonly ok: true;
    readonly cost: MetricCost;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function localeProjection(campaign: Campaign, request: Extract<ReplyCommitment, {
    kind: "position";
}>["locale"]): {
    readonly ok: true;
    readonly cost: MetricCost;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function collectionAction(campaign: Campaign, action: Extract<ReplyCommitment, {
    kind: "position";
}>["collection"]): {
    readonly ok: true;
    readonly effects: readonly Effect[];
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function transmissionAction(campaign: Campaign, actId: string | undefined): {
    readonly ok: true;
    readonly effects: readonly Effect[];
    readonly summary?: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function tariffAction(campaign: Campaign, request: Extract<ReplyCommitment, {
    kind: "position";
}>["tariff"]): {
    readonly ok: true;
    readonly effects: readonly Effect[];
    readonly summary?: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Lift this administration's tariff that a partner's retaliation answers, and
 * with `theirs` the retaliation as well, the two ending together as agreed.
 *
 * Ours goes through `liftMeasure`, the same lift the trade desk signs, so the
 * shelf price and the relationship move exactly as they would there. Their
 * answer added no American shelf price when it landed, so nothing comes off
 * the shelf when it ends.
 */
export declare function tariffLiftAction(campaign: Campaign, request: Extract<ReplyCommitment, {
    kind: "position";
}>["tariffLift"]): {
    readonly ok: true;
    readonly effects: readonly Effect[];
    readonly summary?: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function directiveAction(campaign: Campaign, request: Extract<ReplyCommitment, {
    kind: "position";
}>["directive"]): {
    readonly ok: true;
    readonly effects: readonly Effect[];
    readonly summary?: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function billTextAction(campaign: Campaign, request: Extract<ReplyCommitment, {
    kind: "position";
}>["billText"]): {
    readonly ok: true;
    readonly effects: readonly Effect[];
    readonly summary?: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Keep the announced candidate tied to the vacant seat that produced the case. */
export declare function judicialNominationAction(campaign: Campaign, request: Extract<ReplyCommitment, {
    kind: "position";
}>["judicialNomination"]): {
    readonly ok: true;
    readonly effects: readonly Effect[];
    readonly summary?: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Rescind prospectively without erasing the proceeding or any surviving injury. */
export declare function orderRescissionAction(campaign: Campaign, request: Extract<ReplyCommitment, {
    kind: "position";
}>["orderRescission"]): {
    readonly ok: true;
    readonly effects: readonly Effect[];
    readonly summary?: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Answer the pinned adverse lower judgment and close its existing dated court-response case. */
export declare function orderReviewAction(campaign: Campaign, request: Extract<ReplyCommitment, {
    kind: "position";
}>["orderReview"]): {
    readonly ok: true;
    readonly effects: readonly Effect[];
    readonly summary?: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Quote both authored and resolved metric costs, or the price of a typed report action. */
export declare function quotedPositionCost(campaign: Campaign, commitment: Extract<ReplyCommitment, {
    kind: "position";
}>): MetricCost;
