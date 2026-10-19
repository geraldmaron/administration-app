import { compareDates } from "./clock.js";
import { hasProspectiveOrderAuthority } from "./order-authority.js";
/** A program area is a review subject, not a tract, awarded lease, or drilling permit. */
export const LEASE_PLANNING_AREAS = [{
        id: "ocs-gulf-program-2029",
        name: "Gulf OCS program area · proposed 2029 sale",
        scheduledSale: "264",
        programThrough: { year: 2029, month: 6, day: 30 },
        source: "https://www.boem.gov/oil-gas-energy/national-program/2024-2029-ocs-oil-and-gas-leasing-program",
        opened: "2026-10-12",
    }];
export function leasePlanningArea(areaId) {
    return LEASE_PLANNING_AREAS.find((area) => area.id === areaId);
}
/** Only an operative, identified rule can be sent back for review. */
export function regulatoryReviewOrderSubjects(campaign) {
    const operative = new Set(campaign.orders.filter((record) => hasProspectiveOrderAuthority(campaign, record.id))
        .map((record) => record.id));
    const reviewed = new Set(campaign.orders.flatMap((record) => record.order === "order-regulatory-review"
        && record.subject?.kind === "rule-review" && record.rescindedTurn === undefined ? [record.subject.ruleId] : []));
    return campaign.pendingRules.filter((rule) => rule.status === "in-effect"
        && rule.order !== "order-regulatory-review" && operative.has(rule.id) && !reviewed.has(rule.id))
        .map((rule) => ({ kind: "rule-review", ruleId: rule.id }));
}
/** The 2024–29 program supplies a planning area; it does not authorize a sale after it ends. */
export function energyLeasingOrderSubjects(campaign) {
    return LEASE_PLANNING_AREAS.filter((area) => compareDates(campaign.calendar, area.programThrough) <= 0
        && !campaign.orders.some((record) => record.order === "order-energy-leasing"
            && record.subject?.kind === "lease-planning" && record.subject.areaId === area.id
            && record.rescindedTurn === undefined && record.review?.status !== "struck-down"))
        .map((area) => ({ kind: "lease-planning", areaId: area.id }));
}
