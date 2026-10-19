import { describe, expect, it } from "vitest";
import type { RoleId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { projectMinisterProposal, TAKEN_PROPOSAL_LOYALTY, takeMinisterProposal } from "./cabinet-agenda-acts.js";
import { ordersByChair, ROLE_DEFENSE, ROLE_STATE } from "./cabinet-initiative.js";
import { executiveOrder, projectOrder, signOrder } from "./orders.js";
import { setCommandPosture } from "./combatant-commands.js";
import { engagementCandidates, engagementPacket } from "./engagement.js";
import { createRngStreams } from "./rng.js";
import { apply } from "./effects.js";
import type { CombatantCommandId } from "./command-catalog.js";
import type { Campaign, MinisterProposal, ProposalAct } from "./state.js";

// Taking a Secretary's own act is taking that act: the same packet its own
// entry point writes, priced by that act's own projection, plus the credit of
// having listened and the item off the agenda.

const { campaign: founded, charter } = foundedForBalance("ws-d-take");
const CENTCOM = "CCMD-CENTCOM" as CombatantCommandId;

function proposing(campaign: Campaign, role: RoleId, act: ProposalAct): { readonly campaign: Campaign; readonly proposal: MinisterProposal } {
  const proposal: MinisterProposal = {
    id: `proposal:initiative:${role as string}:${campaign.turn}`,
    role,
    person: campaign.player.cabinet[role]!,
    turn: campaign.turn,
    summary: "A Secretary's own act.",
    expiresTurn: campaign.turn + 1,
    act,
  };
  return { campaign: { ...campaign, cabinetAgenda: { proposals: [proposal], offers: [], lastProposalTurn: campaign.turn } }, proposal };
}

function ownedOrder(campaign: Campaign): { readonly role: RoleId; readonly order: string } {
  const [role, orders] = [...ordersByChair(campaign).entries()].find(([seat]) => campaign.player.cabinet[seat] !== undefined)!;
  return { role, order: orders[0]!.id };
}

function expectTaken(campaign: Campaign, proposal: MinisterProposal, direct: readonly unknown[]) {
  const taken = takeMinisterProposal(campaign, proposal.id);
  if (!taken.ok) throw new Error(taken.reason);
  expect(taken.packet.effects.slice(0, direct.length)).toEqual(direct);
  expect(taken.packet.effects.slice(direct.length)).toEqual([
    { kind: "person", person: proposal.person, changes: {}, loyaltyShift: TAKEN_PROPOSAL_LOYALTY },
    { kind: "cabinetAgenda", set: { proposals: [], offers: [], lastProposalTurn: campaign.turn } },
  ]);
  const after = apply(campaign, taken.packet);
  expect(after.cabinetAgenda!.proposals).toEqual([]);
  expect(after.people[proposal.person]!.base.loyalty).toBeGreaterThan(campaign.people[proposal.person]!.base.loyalty);
  return taken.packet;
}

describe("taking a Secretary's own act", () => {
  it("signs the order they brought, at the price and the odds the order's own projection quotes", () => {
    const { role, order } = ownedOrder(founded);
    const { campaign, proposal } = proposing(founded, role, { kind: "order", order });
    const price = projectMinisterProposal(campaign, proposal.id);
    if (!price.ok) throw new Error(price.reason);
    const projection = projectOrder(campaign, charter, executiveOrder(order)!);
    expect(price.kind).toBe("order");
    expect(price.cost).toEqual(projection.cost);
    expect(price.risks[0]!.chance).toBe(projection.challengeChance);
    const direct = signOrder(campaign, charter, order, createRngStreams(campaign.seed));
    if (!direct.ok) throw new Error(direct.reason);
    const packet = expectTaken(campaign, proposal, direct.packet.effects);
    expect(apply(campaign, packet).orders.some((record) => record.order === order)).toBe(true);
  });

  it("gives the posture order they asked for, and refuses one the theater already stands at", () => {
    const { campaign, proposal } = proposing(founded, ROLE_DEFENSE, { kind: "posture", command: CENTCOM, posture: "heightened" });
    const price = projectMinisterProposal(campaign, proposal.id);
    if (!price.ok) throw new Error(price.reason);
    expect(price.kind).toBe("posture");
    expect(price.risks[0]!.description).toContain("readiness");
    const direct = setCommandPosture(campaign, CENTCOM, "heightened");
    if (!direct.ok) throw new Error(direct.reason);
    expectTaken(campaign, proposal, direct.packet.effects);
    const stale = proposing(founded, ROLE_DEFENSE, { kind: "posture", command: CENTCOM, posture: "routine" });
    expect(projectMinisterProposal(stale.campaign, stale.proposal.id).ok).toBe(false);
    expect(takeMinisterProposal(stale.campaign, stale.proposal.id).ok).toBe(false);
  });

  it("makes the engagement they proposed, with the receiving government's own decision on it", () => {
    const request = engagementCandidates(founded, founded.founding.nation).find((entry) => entry.kind === "visit")!;
    const { campaign, proposal } = proposing(founded, ROLE_STATE, { kind: "engagement", target: request.target, engagement: "visit" });
    const price = projectMinisterProposal(campaign, proposal.id);
    if (!price.ok) throw new Error(price.reason);
    expect(price.kind).toBe("engagement");
    expect(price.risks[0]!.chance).toBeGreaterThan(0);
    expect(price.risks[0]!.chance).toBeLessThanOrEqual(1);
    const direct = engagementPacket(campaign, request, createRngStreams(campaign.seed));
    if (!direct.ok) throw new Error(direct.reason);
    const packet = expectTaken(campaign, proposal, direct.packet.effects);
    expect(packet.provenance?.decision?.question).toBe("receive-engagement");
  });
});
