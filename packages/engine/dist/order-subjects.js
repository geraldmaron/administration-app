import { FEDERAL_SITES, STATE_IDS } from "@admin/world";
import { selectActiveConflicts, selectCurrentLaws } from "./state.js";
import { activeExternalEmergency, eligibleExternalThreats } from "./external-emergency.js";
import { conditionFamily } from "./condition-kinds.js";
import { reliefSignature } from "./obligations.js";
import { underDeclaredEmergency } from "./emergency.js";
import { campaignDay } from "./clock.js";
import { energyLeasingOrderSubjects, regulatoryReviewOrderSubjects } from "./order-authority-subjects.js";
import { blockableAccount } from "./blocked-assets.js";
import { prospectiveOrderAuthority } from "./order-authority.js";
export { energyLeasingOrderSubjects, regulatoryReviewOrderSubjects, leasePlanningArea, LEASE_PLANNING_AREAS } from "./order-authority-subjects.js";
/** §2808(c)(2): this catalogue offers domestic emergency projects only (USD millions). */
export const DOMESTIC_EMERGENCY_CONSTRUCTION_CAP = 100;
export function constructionTransferAmount(campaign, sourceId, declarationId) {
    const source = campaign.militaryConstructionProjects?.find((project) => project.id === sourceId);
    if (!source?.hostState || source.status !== "active")
        return 0;
    const used = campaign.orders.reduce((sum, record) => sum + (record.order === "order-emergency-construction"
        && record.subject?.kind === "construction" && record.subject.declarationId === declarationId ? record.subject.amount : 0), 0);
    return Math.max(0, Math.min(source.appropriated - source.obligated, DOMESTIC_EMERGENCY_CONSTRUCTION_CAP - used));
}
/** The Defense Secretary's dated notice precedes the first destination contract. */
export function constructionNotice(campaign, sourceId, declarationId, amount, contractId) {
    const source = campaign.militaryConstructionProjects.find((project) => project.id === sourceId);
    const declaration = campaign.emergencies[declarationId];
    const receivedDay = campaignDay(campaign);
    return { receivedDay, mayContractDay: receivedDay + 5, destinationState: source.hostState,
        destinationProject: `Emergency military staging and logistics facilities in ${campaign.states[source.hostState].base.name}`,
        directSupport: `Staging and logistics for armed forces used in conflict ${declaration.armedForcesConflictId}.`,
        sourceImpact: `Canceling ${source.name} defers its remaining planned work; ${source.obligated} million dollars of prior commitments remains payable.`,
        estimatedCost: amount, contractId };
}
/** A grant condition administers the program terms Congress enacted. */
export function grantOrderSubjects(campaign) {
    return selectCurrentLaws(campaign).filter((bill) => bill.act === "act-police-accountability"
        && !campaign.orders.some((record) => record.order === "order-grant-conditions"
            && record.subject?.kind === "grant" && record.subject.billId === bill.id
            && !record.remedyApplied && prospectiveOrderAuthority(campaign, record.id) !== "ended"))
        .map((bill) => ({ kind: "grant", billId: bill.id }));
}
export function constructionOrderSubjects(campaign) {
    const conflicts = new Set(selectActiveConflicts(campaign).filter((conflict) => conflict.aggressor === campaign.founding.nation || conflict.defender === campaign.founding.nation).map((conflict) => conflict.id));
    const declarations = Object.values(campaign.emergencies).filter((record) => record.scope.kind === "nation" && record.cause === "armed-conflict" && record.endedTurn === undefined && record.armedForcesConflictId &&
        conflicts.has(record.armedForcesConflictId) && campaign.turn - record.renewedTurn < 52);
    return (campaign.militaryConstructionProjects ?? []).filter((project) => project.status === "active" && project.hostState).flatMap((project) => declarations.filter((declaration) => constructionTransferAmount(campaign, project.id, declaration.id) > 0)
        .map((declaration) => ({ kind: "construction", sourceId: project.id, declarationId: declaration.id })));
}
/** §1315 reaches a sourced federal building or grounds, not a nearby street or state capitol. */
export function federalSiteOrderSubjects(campaign) {
    const protectedSites = new Set(campaign.orders.filter((record) => record.order === "order-force-protection"
        && record.subject?.kind === "federal-site" && record.rescindedTurn === undefined
        && record.review?.status !== "struck-down").map((record) => record.subject?.kind === "federal-site" ? record.subject.institutionId : ""));
    return FEDERAL_SITES.filter((site) => site.location === "sourced" && !protectedSites.has(site.institution))
        .map((site) => ({ kind: "federal-site", institutionId: site.institution }));
}
/** A §1182(f) class is tied to a recent, overt security campaign and reaches first entry only. */
export function entryClassOrderSubjects(campaign) {
    const standing = new Set(campaign.orders.filter((record) => record.order === "order-entry-suspension"
        && record.subject?.kind === "entry-class" && record.rescindedTurn === undefined
        && record.review?.status !== "struck-down").map((record) => record.subject?.kind === "entry-class" ? record.subject.nation : ""));
    return eligibleExternalThreats(campaign).filter((pursuit) => pursuit.aim === "security" && !standing.has(pursuit.actor))
        .map((pursuit) => ({ kind: "entry-class", nation: pursuit.actor, pursuitId: pursuit.id }));
}
/** Unallocated statutory relief authority, in the same USD millions as GDP. */
export function reliefAllocation(campaign, billId) {
    const bill = selectCurrentLaws(campaign).find((entry) => entry.id === billId && entry.act === "act-disaster-recovery");
    const authority = bill?.recoveryAuthority;
    const gdp = campaign.nations[campaign.founding.nation]?.stats.economy.gdp ?? 0;
    if (!authority || campaign.turn >= authority.throughTurn || authority.appropriated <= 0 || gdp <= 0)
        return 0;
    const total = authority.appropriated;
    const allocated = campaign.orders.reduce((sum, record) => sum + (record.order === "order-relief-program"
        && record.subject?.kind === "state" && record.subject.billId === billId ? record.subject.amount : 0), 0);
    return Math.max(0, Math.min(Math.round(0.0015 * gdp), total - allocated));
}
/** Declared disasters with a current appropriation and unallocated authority. */
export function reliefOrderSubjects(campaign) {
    const bills = selectCurrentLaws(campaign).filter((bill) => bill.act === "act-disaster-recovery"
        && reliefAllocation(campaign, bill.id) > 0);
    return STATE_IDS.flatMap((state) => {
        const runtime = campaign.states[state];
        const request = runtime?.staffordRequest;
        const declaration = runtime?.staffordDeclaration;
        if (!request || !declaration || declaration.requestId !== request.id)
            return [];
        return Object.values(campaign.conditions)
            .filter((condition) => condition.id === request.conditionId && condition.status === "active"
            && condition.nation === campaign.founding.nation && (condition.state === state || condition.state === undefined)
            && conditionFamily(condition.kind) === "acute" &&
            runtime.claims.some((claim) => claim.signature === reliefSignature(condition.kind)))
            .flatMap((condition) => bills.map((bill) => ({ kind: "state", state,
            cause: condition.kind, declarationId: declaration.id, billId: bill.id })));
    });
}
/** Catalogue status asks whether any legal subject exists; signing still requires the chosen one. */
export function firstOrderSubject(campaign, orderId) {
    if (orderId === "order-border-controls")
        return { kind: "ports-of-entry", scope: "all-federal-ports" };
    if (orderId === "order-entry-suspension")
        return entryClassOrderSubjects(campaign)[0];
    if (orderId === "order-force-protection")
        return federalSiteOrderSubjects(campaign)[0];
    if (orderId === "order-regulatory-review")
        return regulatoryReviewOrderSubjects(campaign)[0];
    if (orderId === "order-energy-leasing")
        return energyLeasingOrderSubjects(campaign)[0];
    if (orderId === "order-relief-program")
        return reliefOrderSubjects(campaign)[0];
    if (orderId === "order-grant-conditions")
        return grantOrderSubjects(campaign)[0];
    if (orderId === "order-emergency-construction")
        return constructionOrderSubjects(campaign)[0];
    if (orderId === "order-asset-seizure") {
        const declaration = Object.values(campaign.externalEmergencies ?? {}).find((record) => activeExternalEmergency(campaign, record.target)?.id === record.id && blockableAccount(campaign, record.target));
        return declaration ? { kind: "foreign", nation: declaration.target } : undefined;
    }
    return undefined;
}
/** The direct resolver and the desk use the same target-specific refusals. */
export function orderSubjectRefusal(campaign, orderId, subject) {
    if (subject && ["order-price-controls", "order-clean-energy", "order-defense-production"].includes(orderId))
        return "an order that takes no separate target";
    if (orderId === "order-border-controls" && subject !== undefined && (subject.kind !== "ports-of-entry" || subject.scope !== "all-federal-ports"))
        return "the federal ports-of-entry scope, excluding interior population enforcement";
    if (orderId === "order-entry-suspension" && (subject?.kind !== "entry-class" || !entryClassOrderSubjects(campaign).some((candidate) => candidate.nation === subject.nation && candidate.pursuitId === subject.pursuitId)))
        return "a recent observed security threat supporting a finding about first-time entrants from the named country";
    if (orderId === "order-force-protection" && (subject?.kind !== "federal-site" || !federalSiteOrderSubjects(campaign).some((candidate) => candidate.institutionId === subject.institutionId)))
        return "an identified federal building or grounds still available for protection, not a state capitol or surrounding street";
    if (orderId === "order-regulatory-review" && (subject?.kind !== "rule-review" || !regulatoryReviewOrderSubjects(campaign).some((candidate) => candidate.ruleId === subject.ruleId)))
        return "an identified, operative agency rule not already under this administration's review";
    if (orderId === "order-energy-leasing" && (subject?.kind !== "lease-planning" || !energyLeasingOrderSubjects(campaign).some((candidate) => candidate.areaId === subject.areaId)))
        return "a current, identified federal offshore program area available for planning and review";
    if (orderId === "order-asset-seizure" && (subject?.kind !== "foreign" || !activeExternalEmergency(campaign, subject.nation)
        || !blockableAccount(campaign, subject.nation)))
        return "a current national emergency declared over this named foreign threat and a modeled U.S.-custodied account tied to its trade exposure";
    if (orderId === "order-relief-program" && (subject?.kind !== "state" || !reliefOrderSubjects(campaign).some((candidate) => candidate.state === subject.state && candidate.cause === subject.cause
        && candidate.declarationId === subject.declarationId && candidate.billId === subject.billId)))
        return "a live disaster, documented governor request, Stafford declaration, and unallocated enacted recovery funds";
    if (orderId === "order-grant-conditions" && (subject?.kind !== "grant" || !grantOrderSubjects(campaign).some((candidate) => candidate.billId === subject.billId)))
        return "an enacted policing-grant program whose statutory conditions this order administers";
    if (orderId === "order-emergency-construction" && (subject?.kind !== "construction" || !constructionOrderSubjects(campaign).some((candidate) => candidate.sourceId === subject.sourceId && candidate.declarationId === subject.declarationId)))
        return "an armed-forces national declaration and unspent money released from a named military-construction project";
    return undefined;
}
export function inEmergency(campaign) {
    const player = campaign.founding.nation;
    return underDeclaredEmergency(campaign) || selectActiveConflicts(campaign).some((conflict) => conflict.aggressor === player || conflict.defender === player);
}
