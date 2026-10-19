import { projectConfirmation } from "@admin/engine";
import { roleTitle } from "../format/figures";
// Under this much either side of exactly-as-asked, the difference is not worth
// a figure: the row reads as doing what it was told.
const DELIVERY_PLAIN_FLOOR = 0.03;
/**
 * A delivery multiplier as a bare signed share, for a row that has already
 * named the fact in its own label.
 *
 * One unit. A row that printed a share beside the raw multiplier said the same
 * thing twice, once as a percentage the player can read and once as a figure
 * centered on 1.00 that they cannot, so the row had two figures and no reading.
 * The multiplier stays where its scale is actually explained (the policy
 * surface, which draws the caretaker floor and the ceiling around it); a
 * roster row gets the share.
 */
export function deliveryShare(quality) {
    const shortfall = Math.round(Math.abs(1 - quality) * 100);
    if (Math.abs(1 - quality) < DELIVERY_PLAIN_FLOOR)
        return "As ordered";
    return `${quality > 1 ? "+" : "−"}${shortfall}%`;
}
/** Vacant chairs, with a failing confirmation ranked ahead of a quiet vacancy. */
export function cabinetNeeds(campaign, seats, titles) {
    return seats
        .filter((seat) => !seat.isPlayer && seat.holder === undefined)
        .map((seat) => vacancyNeed(campaign, seat, titles))
        .slice()
        .sort((a, b) => Number(b.stance === "adverse") - Number(a.stance === "adverse"));
}
function vacancyNeed(campaign, seat, titles) {
    const chair = roleTitle(seat.role, titles);
    const lead = seat.candidates[0];
    if (!lead) {
        return {
            id: `vacant:${seat.role}`,
            role: seat.role,
            title: `${chair} is vacant`,
            reason: "Nobody available can fill this seat, so it stays empty.",
            stance: "adverse",
            figure: "0",
        };
    }
    // The count, not only the verdict. The chair's own row already carries the
    // bench depth and what the headless building is delivering, so the one thing
    // left for this line is the Senate's read on the leading name — and a read
    // without its numbers is an assertion.
    const projection = projectConfirmation(campaign, seat.role, lead.id);
    const count = `${projection.vote.yeas}–${projection.vote.nays}, ${projection.vote.required} needed`;
    if (projection.wouldConfirm === false) {
        return {
            id: `vacant:${seat.role}`,
            role: seat.role,
            title: `${chair} pick would be rejected`,
            reason: `${lead.name} is your best choice, but the Senate would likely vote them down (${count}).`,
            stance: "adverse",
            figure: `${projection.vote.yeas}–${projection.vote.nays}`,
        };
    }
    return {
        id: `vacant:${seat.role}`,
        role: seat.role,
        title: `${chair} is vacant`,
        reason: `${lead.name} is your best choice, and the Senate would confirm them (${count}).`,
        stance: "caution",
        figure: String(seat.candidates.length),
    };
}
