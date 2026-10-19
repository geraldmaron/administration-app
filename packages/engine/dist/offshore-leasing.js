import { compareDates } from "./clock.js";
import { hashFraction } from "./rng.js";
import { leasePlanningArea } from "./order-authority-subjects.js";
import { obligationAvailability, inShutdown } from "./funding.js";
import { prospectiveOrderAuthority } from "./order-authority.js";
import { selectWorkDelivery, workIsLawful } from "./executive-work.js";
const STAGE_WEEKS = { "environmental-analysis": 1, consultation: 1, "proposed-notice": 4,
    "final-notice": 5, "bid-collection": 1, "bid-review": 2 };
const MODELED_FAIR_VALUE = 120;
export const OFFSHORE_REVIEW_OBLIGATION_USD_MILLIONS = 5;
const INTERIOR_LEASING = { id: "offshore-lease-sale", name: "Offshore lease sale",
    owner: "INST-INTERIOR", authority: "leasing", dependencies: [] };
function interiorCanWork(campaign) {
    return workIsLawful(INTERIOR_LEASING) && !inShutdown(campaign)
        && selectWorkDelivery(campaign, INTERIOR_LEASING).capacity >= 0.25;
}
export function selectOffshoreLeaseSale(campaign, areaId) {
    return campaign.offshoreLeaseSales?.find((sale) => sale.areaId === areaId);
}
export function applyOffshoreLeaseSale(campaign, effect) {
    const sales = campaign.offshoreLeaseSales ?? [];
    return { ...campaign, offshoreLeaseSales: sales.some((sale) => sale.id === effect.set.id)
            ? sales.map((sale) => sale.id === effect.set.id ? effect.set : sale) : [...sales, effect.set] };
}
/** Planning must still be operative until the actual sale is held. */
export function operativeLeasePlanningRule(campaign, areaId) {
    const area = leasePlanningArea(areaId);
    if (!area || compareDates(campaign.calendar, area.programThrough) > 0)
        return undefined;
    const signature = campaign.orders.find((order) => order.order === "order-energy-leasing"
        && order.subject?.kind === "lease-planning" && order.subject.areaId === areaId);
    return signature && planningRuleDisposition(campaign, signature.id) === "active" ? signature.id : undefined;
}
function planningRuleDisposition(campaign, ruleId) {
    const signature = campaign.orders.find((order) => order.id === ruleId);
    const rule = campaign.pendingRules.find((entry) => entry.id === ruleId);
    if (!signature || signature.rescindedTurn !== undefined || signature.review?.status === "struck-down"
        || !rule || (rule.status !== "in-effect" && rule.status !== "stayed"))
        return "invalid";
    return prospectiveOrderAuthority(campaign, ruleId) === "operative" ? "active" : "paused";
}
function actionPacket(campaign, summary, sale, obligate = false) {
    return { source: "action", actor: "player", turn: campaign.turn,
        narration: { summary },
        provenance: { origin: "decision", entities: [sale.id, sale.planningRuleId], systems: ["executive-order"] },
        effects: [{ kind: "offshoreLeaseSale", set: sale },
            ...(obligate ? [{ kind: "metric", deltas: { treasury: -sale.reviewObligationUsdMillions } }] : [])] };
}
export function offshoreLeaseSaleAction(campaign, areaId, action) {
    const area = leasePlanningArea(areaId);
    if (!area)
        return { ok: false, reason: "No approved offshore program area is identified." };
    const existing = selectOffshoreLeaseSale(campaign, areaId);
    if (action === "initiate-sale") {
        if (existing)
            return { ok: false, reason: "This area already has a sale record." };
        const planningRuleId = operativeLeasePlanningRule(campaign, areaId);
        if (!planningRuleId)
            return { ok: false, reason: "A final, operative planning rule and open program window are required." };
        if (!interiorCanWork(campaign))
            return { ok: false, reason: "Interior lacks funded delivery capacity for a sale review." };
        const authority = obligationAvailability(campaign, OFFSHORE_REVIEW_OBLIGATION_USD_MILLIONS);
        if (!authority.ok)
            return { ok: false, reason: authority.missing };
        const interiorCapacityAtStart = selectWorkDelivery(campaign, INTERIOR_LEASING).capacity;
        const sale = { id: `offshore-sale:${areaId}:${campaign.turn}`, areaId, planningRuleId,
            saleNumber: area.scheduledSale,
            tract: { id: `${areaId}:model-tract-a`, name: "Modeled Gulf program tract A", modeled: true },
            stage: "environmental-analysis", openedTurn: campaign.turn, stageTurn: campaign.turn,
            reviewObligationUsdMillions: OFFSHORE_REVIEW_OBLIGATION_USD_MILLIONS, interiorCapacityAtStart,
            bids: [], modeledFairValueUsdMillions: MODELED_FAIR_VALUE };
        return { ok: true, packet: actionPacket(campaign, "Interior obligates its sale-review appropriation and begins environmental analysis for a bounded modeled tract; no lease or permit exists.", sale, true) };
    }
    if (!existing || existing.stage !== "decision")
        return { ok: false, reason: "No reviewed bid awaits a sale decision." };
    if (action === "decline-bid")
        return { ok: true, packet: actionPacket(campaign, "Interior declines the offshore bids; no lease or permit is issued.", { ...existing, stage: "no-sale", stageTurn: campaign.turn, reason: "The administration declined the reviewed bids." }) };
    const eligible = eligibleBids(existing);
    if (eligible.length === 0)
        return { ok: false, reason: "No qualified bid meets the modeled fair-value finding." };
    if (planningRuleDisposition(campaign, existing.planningRuleId) !== "active") {
        return { ok: false, reason: "The planning rule must operate before Interior may award a new lease." };
    }
    const accepted = eligible[0];
    return { ok: true, packet: actionPacket(campaign, `Interior accepts ${accepted.bidder}'s qualified bid for ${existing.tract.name}; exploration still requires separate review.`, { ...existing, stage: "awarded", stageTurn: campaign.turn, acceptedBidId: accepted.id,
            awardedTurn: campaign.turn, bonusReceipt: { id: `${existing.id}:bonus:${accepted.id}`,
                amountUsdMillions: accepted.amountUsdMillions, dueTurn: campaign.turn + 1 },
            exploration: { status: "awaiting-plan" } }) };
}
export function availableOffshoreLeaseActions(campaign, areaId) {
    const sale = selectOffshoreLeaseSale(campaign, areaId);
    if (!sale)
        return operativeLeasePlanningRule(campaign, areaId) ? ["initiate-sale"] : [];
    return sale.stage === "decision" ? planningRuleDisposition(campaign, sale.planningRuleId) === "active"
        ? ["accept-bid", "decline-bid"] : ["decline-bid"] : [];
}
export function hasOffshoreExplorationPermit(campaign) {
    return (campaign.offshoreLeaseSales ?? []).some((sale) => sale.stage === "awarded"
        && sale.acceptedBidId !== undefined && sale.exploration?.status === "permitted");
}
function eligibleBids(sale) {
    return sale.bids.filter((bid) => bid.qualified && bid.amountUsdMillions >= sale.modeledFairValueUsdMillions)
        .sort((a, b) => b.amountUsdMillions - a.amountUsdMillions || a.id.localeCompare(b.id));
}
function bidsFor(campaign, sale) {
    return ["Bidder A", "Bidder B"].flatMap((bidder, index) => {
        const key = `${campaign.seed}:offshore-bid:${sale.id}:${index}`;
        if (hashFraction(`${key}:participation`) < 0.32)
            return [];
        return [{ id: `${sale.id}:bid-${index + 1}`, bidder,
                qualified: hashFraction(`${key}:qualification`) >= 0.16,
                amountUsdMillions: 75 + Math.floor(hashFraction(`${key}:amount`) * 101) }];
    });
}
function pauseSale(sale, turn) {
    if (sale.lastPausedTurn === turn)
        return undefined;
    return { ...sale, stageTurn: sale.stageTurn + 1,
        pausedWeeks: (sale.pausedWeeks ?? 0) + 1, lastPausedTurn: turn };
}
function advanceSale(campaign, sale) {
    if (sale.stage === "awarded")
        return advanceExploration(campaign, sale);
    if (sale.stage === "no-sale" || sale.stage === "expired")
        return undefined;
    const rule = planningRuleDisposition(campaign, sale.planningRuleId);
    if (sale.saleHeldTurn === undefined && compareDates(campaign.calendar, leasePlanningArea(sale.areaId).programThrough) > 0) {
        return { ...sale, stage: "expired", stageTurn: campaign.turn,
            reason: "The approved program ended before the sale was held." };
    }
    if (rule === "paused")
        return sale.stage === "decision" ? undefined : pauseSale(sale, campaign.turn);
    if (rule === "invalid")
        return { ...sale, stage: sale.saleHeldTurn === undefined ? "expired" : "no-sale",
            stageTurn: campaign.turn, reason: "The planning rule ceased to operate before a lease could be awarded." };
    if (sale.stage === "decision")
        return undefined;
    if (!interiorCanWork(campaign))
        return pauseSale(sale, campaign.turn);
    if (campaign.turn - sale.stageTurn < STAGE_WEEKS[sale.stage])
        return undefined;
    if (sale.stage === "environmental-analysis")
        return { ...sale, stage: "consultation", stageTurn: campaign.turn,
            environmentalCompletedTurn: campaign.turn };
    if (sale.stage === "consultation")
        return { ...sale, stage: "proposed-notice", stageTurn: campaign.turn,
            consultationCompletedTurn: campaign.turn, proposedNoticeTurn: campaign.turn };
    if (sale.stage === "proposed-notice")
        return { ...sale, stage: "final-notice", stageTurn: campaign.turn,
            finalNoticeTurn: campaign.turn };
    if (sale.stage === "final-notice")
        return { ...sale, stage: "bid-collection", stageTurn: campaign.turn,
            saleHeldTurn: campaign.turn, bids: bidsFor(campaign, sale) };
    if (sale.stage === "bid-collection")
        return { ...sale, stage: "bid-review", stageTurn: campaign.turn };
    if (eligibleBids(sale).length === 0)
        return { ...sale, stage: "no-sale", stageTurn: campaign.turn,
            fairValueReviewedTurn: campaign.turn,
            reason: sale.bids.some((bid) => bid.qualified) ? "No qualified bid met modeled fair value."
                : "No qualified bidder submitted an acceptable bid." };
    return { ...sale, stage: "decision", stageTurn: campaign.turn, fairValueReviewedTurn: campaign.turn };
}
function advanceExploration(campaign, sale) {
    const dueReceipt = sale.bonusReceipt && sale.bonusReceipt.receivedTurn === undefined
        && campaign.turn >= sale.bonusReceipt.dueTurn;
    const received = dueReceipt ? { ...sale,
        bonusReceipt: { ...sale.bonusReceipt, receivedTurn: campaign.turn } } : sale;
    const exploration = sale.exploration;
    if (!exploration || exploration.status === "permitted" || exploration.status === "refused"
        || exploration.status === "no-plan")
        return dueReceipt ? received : undefined;
    if (!interiorCanWork(campaign)) {
        if (exploration.lastPausedTurn === campaign.turn)
            return dueReceipt ? received : undefined;
        return { ...received, exploration: { ...exploration,
                reviewPausedWeeks: (exploration.reviewPausedWeeks ?? 0) + 1, lastPausedTurn: campaign.turn } };
    }
    if (exploration.status === "awaiting-plan"
        && campaign.turn - sale.stageTurn - (exploration.reviewPausedWeeks ?? 0) >= 1) {
        const submitted = hashFraction(`${campaign.seed}:offshore-plan:${sale.id}`) >= 0.2;
        return { ...received, exploration: submitted ? { status: "under-review", submittedTurn: campaign.turn }
                : { status: "no-plan", resolvedTurn: campaign.turn,
                    reason: "The leaseholder did not file an exploration plan." } };
    }
    if (exploration.status !== "under-review"
        || campaign.turn - exploration.submittedTurn - (exploration.reviewPausedWeeks ?? 0) < 4)
        return dueReceipt ? received : undefined;
    const approved = hashFraction(`${campaign.seed}:offshore-permit:${sale.id}`) >= 0.24;
    return { ...received, exploration: { ...exploration, status: approved ? "permitted" : "refused",
            resolvedTurn: campaign.turn,
            reason: approved ? "Separate site-specific environmental and technical review approved exploration."
                : "Separate site-specific review did not support an exploration permit." } };
}
export const offshoreLeaseSalePhase = (campaign) => (campaign.offshoreLeaseSales ?? []).flatMap((sale) => {
    const next = advanceSale(campaign, sale);
    if (!next)
        return [];
    return [{ source: "simulate", actor: "world", turn: campaign.turn,
            narration: { summary: next.reason ?? `Interior advances the review of ${sale.tract.name} to ${next.stage}.` },
            provenance: { origin: "scheduled", entities: [sale.id, sale.planningRuleId], systems: ["executive-order"] },
            effects: [{ kind: "offshoreLeaseSale", set: next }] }];
});
/** A dated receipt enters the national books once, not the President's spendable authority. */
export function pendingOffshoreLeaseBonus(campaign) {
    const alreadyBooked = new Set(campaign.books?.[campaign.founding.nation]?.leaseBonusReceiptIds ?? []);
    const due = (campaign.offshoreLeaseSales ?? []).flatMap((sale) => sale.bonusReceipt
        && sale.bonusReceipt.receivedTurn !== undefined && sale.bonusReceipt.receivedTurn <= campaign.turn
        && !alreadyBooked.has(sale.bonusReceipt.id)
        ? [sale.bonusReceipt] : []);
    return { ids: due.map((receipt) => receipt.id),
        amountUsdMillions: due.reduce((total, receipt) => total + receipt.amountUsdMillions, 0) };
}
