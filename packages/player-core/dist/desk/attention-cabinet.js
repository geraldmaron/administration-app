/**
 * The one department proposal for this week, as a Desk row.
 *
 * The engine chooses the department. This file only says how that choice
 * reads: a soft matter from the government, or nothing when the week has
 * no trigger.
 */
import { agendaItemLive, proposeThisWeek, selectDateOfTurn, triageBar, } from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { formatRatio, roleTitle } from "../format/figures";
import { PLACES } from "../navigation/places";
import { roleActionsHref } from "../shell/office-of";
const REASON_LINE = {
    vacancy: "The seat is empty.",
    delivery: "The department isn't getting its work done.",
};
function chairTitle(campaign, proposal) {
    return roleTitle(proposal.role, charterOf(campaign).roleTitles);
}
/**
 * The one proposal a week reached the Desk because it cleared the Chief of
 * Staff's own bar (`triageBar`, `cabinet-week.ts`) — the reading that orders
 * the building's requests before either of them is a row. Printed beside the
 * proposal rather than folded into its reason, so the pinned reason text
 * (`REASON_LINE`) stays the department's own words and this stays the
 * chief's.
 */
function triageFigure(campaign) {
    return `Passed staff cutoff ${formatRatio(triageBar(campaign))}`;
}
/** One proposal, as the row the Desk already draws from title and reason. */
export function cabinetProposalItem(campaign, proposal) {
    return {
        id: `cabinet-proposal:${proposal.role}:${proposal.week}`,
        source: "agency-request",
        urgency: "soft",
        subject: `cabinet-proposal:${proposal.role}`,
        title: chairTitle(campaign, proposal),
        reason: REASON_LINE[proposal.reason],
        href: roleActionsHref(proposal.role),
        stance: proposal.reason === "delivery" ? "adverse" : "caution",
        icon: PLACES.washington.icon,
        figure: triageFigure(campaign),
    };
}
/**
 * A Secretary's own act, as the Desk draws it. The engine wrote the sentence
 * from the decision it made, so the row repeats it rather than paraphrasing:
 * who proposes what, why it suits them, and what taking it does. It is an
 * opening rather than a problem, and it lapses at the week's end if nobody
 * answers it.
 */
export function ministerInitiativeItem(campaign, proposal) {
    return {
        id: `cabinet-initiative:${proposal.id}`,
        source: "agency-request",
        urgency: "soft",
        subject: `cabinet-initiative:${proposal.role}`,
        title: `${roleTitle(proposal.role, charterOf(campaign).roleTitles)} brings you a proposal`,
        reason: proposal.summary,
        href: roleActionsHref(proposal.role),
        stance: "favorable",
        icon: PLACES.washington.icon,
        ...(proposal.expiresTurn !== undefined ? { dueDate: selectDateOfTurn(campaign, proposal.expiresTurn) } : {}),
    };
}
/** Every act a Secretary has brought and the President has not yet answered. */
export function ministerInitiativeItems(campaign) {
    return (campaign.cabinetAgenda?.proposals ?? [])
        .filter((proposal) => proposal.act !== undefined && agendaItemLive(proposal, campaign.turn - 1))
        .map((proposal) => ministerInitiativeItem(campaign, proposal));
}
/** The week's department proposal, or no row, then any act a Secretary brought. The engine's choice is the only selection. */
export function cabinetProposalItems(campaign) {
    const proposal = proposeThisWeek(campaign);
    return [...(proposal ? [cabinetProposalItem(campaign, proposal)] : []), ...ministerInitiativeItems(campaign)];
}
/** One resignation offer, as the Desk draws it: the officer's own stamped reason (CAB-8 12a). */
export function resignationOfferItem(campaign, offer) {
    return {
        id: `resignation-offer:${offer.id}`,
        source: "resignation-offer",
        urgency: "soft",
        subject: `resignation-offer:${offer.role}`,
        title: `${roleTitle(offer.role, charterOf(campaign).roleTitles)} has offered to resign`,
        reason: offer.reason,
        href: roleActionsHref(offer.role),
        stance: "adverse",
        icon: PLACES.washington.icon,
        // The offer stands three weeks (`OFFER_STANDS_TURNS`); this is what the
        // "wait" default's last call (`applyAttentionPolicy`) counts against.
        ...(offer.expiresTurn !== undefined ? { dueDate: selectDateOfTurn(campaign, offer.expiresTurn) } : {}),
    };
}
/** Every resignation offer standing on the cabinet's agenda. */
export function resignationOfferItems(campaign) {
    return (campaign.cabinetAgenda?.offers ?? []).map((offer) => resignationOfferItem(campaign, offer));
}
