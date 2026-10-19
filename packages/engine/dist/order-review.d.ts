import type { Person, RoleId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import type { ActionCounsel } from "./state-ledger.js";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { ExecutiveOrder } from "./orders.js";
import { type DecisionStamp, type Term, type Willingness } from "./willingness.js";
/** Below this reach an order is ordinary business, and nobody writes a memorandum about it. */
export declare const REVIEW_REACH_FLOOR = 0.15;
/** How much a written objection raises the odds that somebody takes the order to court. */
export declare const OBJECTION_CHALLENGE_FACTOR = 1.3;
/** What the review reads off the order's own projection, so the two cannot disagree. */
export type ReviewInput = {
    /** The order's reach past the office after the charter's check and the ground it stands on. */
    readonly reach: number;
    /** The administration's record of contested orders, on the challenge's own scale. */
    readonly accumulated: number;
    readonly ground: ConstitutionalGround;
};
export type OrderReview = {
    readonly reviewer: PersonRuntime;
    readonly role: RoleId;
    /** True when the Attorney General will object in writing. */
    readonly objects: boolean;
    readonly decision: DecisionStamp;
};
/**
 * The Attorney General's terms, signed toward clearing the order.
 *
 * Deference is left out when the order is the Justice Department's own to
 * carry out: whether the Attorney General defers to the President on it is
 * then the question of carrying it out, and weighing it here as well would
 * count one reading of the same person twice in the President's week.
 */
export declare function certifyTerms(person: Person, input: ReviewInput, ownsOrder: boolean): readonly Term[];
export declare function certifyOrder(person: Person, input: ReviewInput, ownsOrder: boolean): Willingness;
/**
 * The review this order will get, or nothing: no reviewer in the charter, an
 * empty chair with nobody acting in it, or an order too ordinary to review.
 */
export declare function reviewOrder(campaign: Campaign, order: ExecutiveOrder, input: ReviewInput): OrderReview | undefined;
/** The challenge odds once the review is in: an objection on file is the challengers' first exhibit. */
export declare function reviewedChance(chance: number, review: OrderReview | undefined, ceiling: number): number;
/**
 * What signing over an objection puts on the record: the Attorney General
 * against, which the room's regard for the President reads like any other
 * overruling. A clearance writes nothing, so signing orders cannot buy a
 * cabinet's loyalty.
 */
export declare function overruledReview(review: OrderReview | undefined): ActionCounsel | undefined;
