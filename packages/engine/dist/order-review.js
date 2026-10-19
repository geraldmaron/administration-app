import { selectChairRunner } from "./appointments.js";
import { orderDepartment, orderReviewer } from "./department-ownership.js";
import { axisLean } from "./person-disposition.js";
import { stampOf, weigh } from "./willingness.js";
// Whether the Attorney General clears an order for form and legality, or puts
// an objection in writing first.
//
// Every proposed order goes to the Attorney General before the President signs
// it, and most come back cleared. An Attorney General who will not put their
// name to one does not stop it: the President can sign over the objection, and
// some have. What the objection does is make the order easier to take to court,
// because the government's own lawyer has said on paper what the challengers
// will say, and it puts the Attorney General on the record against the
// President, which the room remembers like any other overruling.
//
// Decided without a draw. The President reads the answer on the order before
// signing, and an objection that could appear only after the signature would
// be a hidden veto rather than a priced one.
/** Below this reach an order is ordinary business, and nobody writes a memorandum about it. */
export const REVIEW_REACH_FLOOR = 0.15;
/** How much a written objection raises the odds that somebody takes the order to court. */
export const OBJECTION_CHALLENGE_FACTOR = 1.3;
/**
 * Where an Attorney General at the cabinet's middle on principle and deference
 * starts objecting with a clean record: an order reaching past the office by
 * more than this, on silence from Congress.
 */
const CERTIFY_THRESHOLD = -0.45;
const OVERREACH_WEIGHT = 1;
const PRINCIPLE_WEIGHT = 0.8;
const DEFERENCE_WEIGHT = 0.5;
const RECORD_WEIGHT = 0.5;
/** An act of Congress behind the order is a statute the Attorney General can cite in its defense. */
const STATUTE_RELIEF = 0.15;
const round4 = (value) => Math.round(value * 10000) / 10000 + 0;
/**
 * The Attorney General's terms, signed toward clearing the order.
 *
 * Deference is left out when the order is the Justice Department's own to
 * carry out: whether the Attorney General defers to the President on it is
 * then the question of carrying it out, and weighing it here as well would
 * count one reading of the same person twice in the President's week.
 */
export function certifyTerms(person, input, ownsOrder) {
    return [
        { key: "overreach", source: "situation", value: round4(-OVERREACH_WEIGHT * input.reach) },
        { key: "principle", source: "trait", value: round4(-PRINCIPLE_WEIGHT * axisLean(person, "principle")) },
        ...(ownsOrder ? [] : [{ key: "deference", source: "obligation", value: round4(DEFERENCE_WEIGHT * axisLean(person, "deference")) }]),
        { key: "refusal-record", source: "situation", value: round4(-RECORD_WEIGHT * input.accumulated) },
        { key: "statute", source: "situation", value: input.ground === "authorized" ? STATUTE_RELIEF : 0 },
    ];
}
export function certifyOrder(person, input, ownsOrder) {
    return weigh("certify-order", certifyTerms(person, input, ownsOrder), { threshold: CERTIFY_THRESHOLD, noiseBound: 0, noise: 0 });
}
/**
 * The review this order will get, or nothing: no reviewer in the charter, an
 * empty chair with nobody acting in it, or an order too ordinary to review.
 */
export function reviewOrder(campaign, order, input) {
    if (input.reach < REVIEW_REACH_FLOOR)
        return undefined;
    const role = orderReviewer(campaign.founding.charter);
    if (role === undefined || role === campaign.founding.leadRole)
        return undefined;
    const reviewer = selectChairRunner(campaign, role);
    if (!reviewer)
        return undefined;
    const ownsOrder = orderDepartment(campaign.founding.charter, order.id) === role;
    const willingness = certifyOrder(reviewer.base, input, ownsOrder);
    return {
        reviewer,
        role,
        objects: !willingness.acts,
        // Public: an objection from the Attorney General is the kind of paper that
        // reaches the courts and the press, and a clearance is the ordinary record.
        decision: stampOf(willingness, reviewer.base.id, order.id, "public"),
    };
}
/** The challenge odds once the review is in: an objection on file is the challengers' first exhibit. */
export function reviewedChance(chance, review, ceiling) {
    return review?.objects ? Math.min(ceiling, chance * OBJECTION_CHALLENGE_FACTOR) : chance;
}
/**
 * What signing over an objection puts on the record: the Attorney General
 * against, which the room's regard for the President reads like any other
 * overruling. A clearance writes nothing, so signing orders cannot buy a
 * cabinet's loyalty.
 */
export function overruledReview(review) {
    if (!review?.objects)
        return undefined;
    return { role: review.role, person: review.reviewer.base.id, stance: "against" };
}
