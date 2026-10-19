import { selectBillsInProgress } from "./state.js";
import { actCost, actOf } from "./legislative-acts.js";
import { obligationAvailability } from "./funding.js";
import { openFavorsOwedByPresident } from "./ties.js";
function hasFiscalSubstance(act) {
    return act.treasuryOfGdp !== undefined || act.raisesCap !== undefined || act.funds !== undefined;
}
function reservedFor(campaign, act) {
    const cost = actCost(campaign, act).treasury;
    if (cost === undefined || cost >= 0)
        return 0;
    return Math.abs(cost);
}
/** Rebuild a fiscal matter from a stored bill id, if that bill still has substance. */
export function fiscalMatterForBill(campaign, billId) {
    const bill = selectBillsInProgress(campaign).find((entry) => entry.id === billId) ?? campaign.bills[billId];
    if (!bill)
        return undefined;
    const act = actOf(bill);
    if (!act || !hasFiscalSubstance(act))
        return undefined;
    return {
        billId: bill.id,
        title: bill.title,
        actId: act.id,
        reservedTreasury: reservedFor(campaign, act),
        ...(act.raisesCap ? { account: act.raisesCap.account } : {}),
    };
}
/** The first in-progress bill whose catalogue act spends, authorizes, or funds. */
export function eligibleFiscalMatter(campaign) {
    for (const bill of selectBillsInProgress(campaign)) {
        const act = actOf(bill);
        if (!act || !hasFiscalSubstance(act))
            continue;
        return {
            billId: bill.id,
            title: bill.title,
            actId: act.id,
            reservedTreasury: reservedFor(campaign, act),
            ...(act.raisesCap ? { account: act.raisesCap.account } : {}),
        };
    }
    return undefined;
}
function openReserveTotal(campaign) {
    return openFavorsOwedByPresident(campaign).reduce((sum, favor) => sum + (favor.reservedTreasury ?? 0), 0);
}
/**
 * Whether accepting a budget negotiation on this matter would overcommit the
 * authority on hand or stack a second claim on the same bill / member.
 */
export function lobbyFavorAvailability(campaign, matter, post) {
    const open = openFavorsOwedByPresident(campaign);
    if (open.some((favor) => favor.billId === matter.billId)) {
        return { ok: false, reason: "That bill already carries an open appropriation commitment from this administration." };
    }
    if (open.some((favor) => favor.post === post)) {
        return { ok: false, reason: "This member already holds an open appropriation commitment from this administration." };
    }
    if (matter.reservedTreasury <= 0)
        return { ok: true };
    const already = openReserveTotal(campaign);
    const needed = already + matter.reservedTreasury;
    const gate = obligationAvailability(campaign, needed);
    if (!gate.ok) {
        return {
            ok: false,
            reason: `Accepting this commitment would overcommit budget authority (${Math.round(needed).toLocaleString("en-US")} reserved against what is still apportioned).`,
        };
    }
    return { ok: true };
}
export function lobbyFavorId(post, turn, billId) {
    return `promise:lobby:${post}:${turn}:${billId}`;
}
/** What the member was promised, in the words the record keeps. */
export function lobbyFavorWhat(title) {
    return `A place in the appropriation path for ${title}`;
}
/** The favor a landed budget negotiation opens; callers must have already passed availability. */
export function draftLobbyFavor(campaign, post, matter, lobbyId) {
    return {
        id: lobbyFavorId(post, campaign.turn, matter.billId),
        direction: "owed-by-president",
        what: lobbyFavorWhat(matter.title),
        openedTurn: campaign.turn,
        status: "open",
        billId: matter.billId,
        actId: matter.actId,
        post,
        lobbyId,
        reservedTreasury: matter.reservedTreasury,
        ...(matter.account ? { account: matter.account } : {}),
    };
}
