import type { Campaign } from "./state.js";
import { institutionDef, type InstitutionId } from "./institutions.js";

// Who the law gives a piece of government work to, and what that work waits on.
//
// Delivery used to be read by domain: every body tagged "trade" was sorted by
// how healthy it was and the healthiest led. That made customs collection
// USDA's job in any week USDA was running better than Customs and Border
// Protection, and it let a hollowed CBP collect more duty as long as the other
// trade bodies were well. The law does not move work to whichever agency is
// running best; it names one. So a piece of work names its owner and the
// authority the owner holds for it, and a healthy body elsewhere can help only
// through an edge the work declares.
//
// Two kinds of edge, because they fail differently:
//
//   - `approval`: a serial stage another body must clear before the work can
//     finish (a security screening, a statutory sign-off). Work cannot move
//     faster than its slowest stage, so the approval caps delivery, and below
//     `APPROVAL_FLOOR` the stage is not being cleared at all and the work stops.
//     Nothing averages it away.
//   - `support`: a body working alongside the owner (records, analysis). It
//     enters the lead-dominant blend the response module also uses: the owner
//     carries most of the weight, so support helps or hurts at the margin and
//     never replaces the owner.

export type WorkId = string;

export type WorkDependency = {
  readonly kind: "approval" | "support";
  readonly institution: InstitutionId;
  /** The authority the dependent body holds that this edge needs, checked against the catalog. */
  readonly authority: string;
};

export type WorkDef = {
  readonly id: WorkId;
  readonly name: string;
  readonly owner: InstitutionId;
  /** The authority the owner holds for this work, checked against the catalog. */
  readonly authority: string;
  readonly dependencies: readonly WorkDependency[];
};

export type WorkStatus = "delivering" | "delayed" | "blocked";

export type WorkDelivery = {
  readonly work: WorkId;
  readonly owner: InstitutionId;
  /** The owner's own delivery, 0..1, before support or approvals. */
  readonly ownerQuality: number;
  /** What the work actually gets done at, 0..1. */
  readonly capacity: number;
  readonly status: WorkStatus;
  /** The approval holding the work back, when one is. */
  readonly binding?: InstitutionId;
};

// The owner's share of the blend against its support, the same split the
// response module weighs a lead against the bodies supporting it.
const OWNER_WEIGHT = 0.7;
// Below this an approving body is not clearing its stage: a department this
// far gone is not processing the files it is asked to sign.
export const APPROVAL_FLOOR = 0.25;

/** Customs duty is collected by CBP under its customs-collection authority, whatever else is happening in trade. */
export const CUSTOMS_COLLECTION: WorkDef = {
  id: "customs-collection",
  name: "Customs collection",
  owner: "INST-CBP",
  authority: "customs-collection",
  dependencies: [],
};

function qualityOf(campaign: Campaign, id: InstitutionId): number {
  return campaign.institutions[id]?.implementationQuality ?? 0;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Whether the catalog actually gives each named body the authority the work says it uses. */
export function workIsLawful(work: WorkDef): boolean {
  const holds = (id: InstitutionId, authority: string) => institutionDef(id)?.authorities.includes(authority) === true;
  return holds(work.owner, work.authority) && work.dependencies.every((edge) => holds(edge.institution, edge.authority));
}

/** The approving body clearing its stage most slowly, with its pace; undefined when the work waits on no approval. */
export function slowestApproval(campaign: Campaign, work: WorkDef): { readonly institution: InstitutionId; readonly quality: number } | undefined {
  return work.dependencies
    .filter((edge) => edge.kind === "approval")
    .map((edge) => ({ institution: edge.institution, quality: qualityOf(campaign, edge.institution) }))
    .sort((a, b) => a.quality - b.quality)[0];
}

/**
 * How well one piece of work is being delivered right now, led by the body
 * the law gives it to and held back by any approval it waits on.
 */
export function selectWorkDelivery(campaign: Campaign, work: WorkDef): WorkDelivery {
  const ownerQuality = qualityOf(campaign, work.owner);
  const supports = work.dependencies.filter((edge) => edge.kind === "support").map((edge) => qualityOf(campaign, edge.institution));
  const blended =
    supports.length === 0
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
