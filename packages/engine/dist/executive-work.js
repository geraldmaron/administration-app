import { institutionDef } from "./institutions.js";
// The owner's share of the blend against its support, the same split the
// response module weighs a lead against the bodies supporting it.
const OWNER_WEIGHT = 0.7;
// Below this an approving body is not clearing its stage: a department this
// far gone is not processing the files it is asked to sign.
export const APPROVAL_FLOOR = 0.25;
/** Customs duty is collected by CBP under its customs-collection authority, whatever else is happening in trade. */
export const CUSTOMS_COLLECTION = {
    id: "customs-collection",
    name: "Customs collection",
    owner: "INST-CBP",
    authority: "customs-collection",
    dependencies: [],
};
function qualityOf(campaign, id) {
    return campaign.institutions[id]?.implementationQuality ?? 0;
}
function round3(value) {
    return Math.round(value * 1000) / 1000;
}
/** Whether the catalog actually gives each named body the authority the work says it uses. */
export function workIsLawful(work) {
    const holds = (id, authority) => institutionDef(id)?.authorities.includes(authority) === true;
    return holds(work.owner, work.authority) && work.dependencies.every((edge) => holds(edge.institution, edge.authority));
}
/** The approving body clearing its stage most slowly, with its pace; undefined when the work waits on no approval. */
export function slowestApproval(campaign, work) {
    return work.dependencies
        .filter((edge) => edge.kind === "approval")
        .map((edge) => ({ institution: edge.institution, quality: qualityOf(campaign, edge.institution) }))
        .sort((a, b) => a.quality - b.quality)[0];
}
/**
 * How well one piece of work is being delivered right now, led by the body
 * the law gives it to and held back by any approval it waits on.
 */
export function selectWorkDelivery(campaign, work) {
    const ownerQuality = qualityOf(campaign, work.owner);
    const supports = work.dependencies.filter((edge) => edge.kind === "support").map((edge) => qualityOf(campaign, edge.institution));
    const blended = supports.length === 0
        ? ownerQuality
        : ownerQuality * OWNER_WEIGHT + (supports.reduce((sum, q) => sum + q, 0) / supports.length) * (1 - OWNER_WEIGHT);
    const slowest = slowestApproval(campaign, work);
    const base = { work: work.id, owner: work.owner, ownerQuality: round3(ownerQuality) };
    if (slowest && slowest.quality < APPROVAL_FLOOR) {
        return { ...base, capacity: 0, status: "blocked", binding: slowest.institution };
    }
    if (slowest && slowest.quality < blended) {
        return { ...base, capacity: round3(slowest.quality), status: "delayed", binding: slowest.institution };
    }
    return { ...base, capacity: round3(blended), status: "delivering" };
}
