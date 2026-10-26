import { selectCurrentLaws, type Campaign } from "./state.js";
import type { StateId } from "@admin/world";
import { selectDeclaredEmergencies } from "./emergency.js";
import { campaignDay } from "./clock.js";
import type { EffectPacket } from "./effects.js";
import type { MilitaryConstructionProject } from "./state-orders.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
import type { TurnPhase } from "./turn-loop.js";
import { hasProspectiveOrderAuthority } from "./order-authority.js";

export type MilitaryConstructionProjectEffect = { readonly kind: "militaryConstructionProject"; readonly set: MilitaryConstructionProject };

/** Congress names the project and its money when an appropriation becomes law. */
export function militaryConstructionAppropriation(
  campaign: Campaign, billId: string, slug: string, name: string, shareOfGdp: number, hostState?: StateId,
): MilitaryConstructionProject {
  const gdp = campaign.nations[campaign.founding.nation]?.stats.economy.gdp ?? 0;
  return { id: `${billId}:${slug}`, name, ...(hostState ? { hostState } : {}), appropriationBill: billId,
    appropriated: Math.round(gdp * shareOfGdp), obligated: 0, enactedTurn: campaign.turn, status: "active" };
}

export function applyMilitaryConstructionProject(state: Campaign, effect: MilitaryConstructionProjectEffect): Campaign {
  const list = state.militaryConstructionProjects ?? [];
  return { ...state, militaryConstructionProjects: list.some((entry) => entry.id === effect.set.id)
    ? list.map((entry) => entry.id === effect.set.id ? effect.set : entry) : [...list, effect.set] };
}

/** A live declaration can still support new emergency contracts, subject to court relief. */
export function constructionAuthorityAvailable(campaign: Campaign, order: ExecutiveOrderRecord): boolean {
  if (order.subject?.kind !== "construction" || !order.constructionNotice || order.review?.status === "struck-down"
    || order.rescindedTurn !== undefined) return false;
  const declarationId = order.subject.declarationId;
  return hasProspectiveOrderAuthority(campaign, order.id)
    && selectDeclaredEmergencies(campaign).some((emergency) => emergency.id === declarationId);
}

/** Commit enacted balances, then pay only commitments actually made. */
export const militaryConstructionPhase: TurnPhase = (campaign) =>
  (campaign.militaryConstructionProjects ?? []).flatMap<EffectPacket>((project) => {
    if (project.lastWorkTurn === campaign.turn || project.redirectedLastTurn === campaign.turn) return [];
    const sourceAuthorized = selectCurrentLaws(campaign).some((bill) => bill.id === project.appropriationBill);
    const weeklySource = Math.ceil(project.appropriated / 52);
    const obligated = project.status === "active" && sourceAuthorized
      ? Math.min(project.appropriated, project.obligated + weeklySource) : project.obligated;
    const sourceSpent = Math.min(project.obligated, (project.sourceSpent ?? 0) + weeklySource);
    const order = campaign.orders.find((record) => record.order === "order-emergency-construction"
      && record.subject?.kind === "construction" && record.subject.sourceId === project.id);
    const committed = project.redirectedObligated ?? 0;
    const spent = project.redirectedSpent ?? 0;
    const weeklyRedirected = Math.ceil((project.redirected ?? 0) / 52);
    const mayObligate = Boolean(sourceAuthorized && order && constructionAuthorityAvailable(campaign, order)
      && campaignDay(campaign) >= order.constructionNotice!.mayContractDay);
    const nextCommitted = mayObligate ? Math.min(project.redirected ?? 0, committed + weeklyRedirected) : committed;
    const nextSpent = Math.min(committed, spent + weeklyRedirected);
    const lastCashOutlay = sourceSpent - (project.sourceSpent ?? 0) + nextSpent - spent;
    if (obligated === project.obligated && sourceSpent === (project.sourceSpent ?? 0)
      && nextCommitted === committed && nextSpent === spent && (project.lastCashOutlay ?? 0) === 0) return [];
    return [{ source: "simulate" as const, actor: "world" as const, turn: campaign.turn,
      narration: { summary: project.status === "active" ? `${project.name} draws on its enacted construction appropriation.`
        : mayObligate ? `Emergency construction commits transferred authority from ${project.name}.`
          : `Construction pays only commitments already made from ${project.name}.` },
      provenance: { origin: "scheduled" as const, entities: [project.id, project.appropriationBill, ...(order ? [order.id] : [])], systems: ["appropriation"] },
      effects: [{ kind: "militaryConstructionProject" as const, set: { ...project,
        obligated, sourceSpent, redirectedObligated: nextCommitted, redirectedSpent: nextSpent,
        lastCashOutlay, lastWorkTurn: campaign.turn,
        ...(project.status === "canceled" ? { redirectedLastTurn: campaign.turn } : {}),
        ...(committed === 0 && nextCommitted > 0 && order?.constructionNotice
          ? { redirectedFirstContractDay: campaignDay(campaign), redirectedContractId: order.constructionNotice.contractId }
          : {}) } }] }];
  });
