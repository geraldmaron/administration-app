import { describe, expect, it } from "vitest";
import {
  INSTITUTION_CATALOG,
  SLOW_WALK_QUALITY,
  proposeThisWeek,
  selectDateOfTurn,
  type Campaign,
  type DepartmentProposal,
  type MinisterProposal,
  type ResignationOffer,
} from "@admin/engine";
import type { RoleId } from "@admin/world";
import { charterOf } from "../campaign/founding-options";
import { openingCampaign } from "../__fixtures__/opening";
import { roleTitle } from "../format/figures";
import { attentionItems } from "./attention";
import {
  cabinetProposalItem,
  cabinetProposalItems,
  ministerInitiativeItem,
  ministerInitiativeItems,
  resignationOfferItem,
  resignationOfferItems,
} from "./attention-cabinet";

const opening = openingCampaign();

/** Chairs filled and delivery at the line the engine already treats as holding. */
function held(campaign: Campaign): Campaign {
  const institutions = { ...campaign.institutions };
  for (const def of INSTITUTION_CATALOG) {
    if (!def.cabinetRole) continue;
    const runtime = institutions[def.id];
    if (!runtime) continue;
    institutions[def.id] = {
      ...runtime,
      vacancy: false,
      vacantDays: 0,
      implementationQuality: Math.max(runtime.implementationQuality, SLOW_WALK_QUALITY),
    };
  }
  return { ...campaign, institutions };
}

/** One cabinet chair left empty, so the engine has a week it will propose for. */
function withOneVacancy(campaign: Campaign): Campaign {
  const def = INSTITUTION_CATALOG.find((entry) => entry.cabinetRole && campaign.institutions[entry.id]);
  if (!def) throw new Error("opening campaign has no cabinet institution to leave empty");
  const runtime = campaign.institutions[def.id];
  if (!runtime) throw new Error("opening campaign has no cabinet institution to leave empty");
  return {
    ...campaign,
    institutions: {
      ...campaign.institutions,
      [def.id]: { ...runtime, vacancy: true, vacantDays: Math.max(runtime.vacantDays, 1) },
    },
  };
}

describe("the week's department proposal on the Desk", () => {
  it("adds no row when the week has no proposal", () => {
    const quiet = held(opening);
    expect(proposeThisWeek(quiet)).toBeNull();
    expect(cabinetProposalItems(quiet)).toEqual([]);
    expect(attentionItems(quiet).some((item) => item.id.startsWith("cabinet-proposal:"))).toBe(false);
  });

  it("shows one row for a campaign the engine would propose", () => {
    const asking = withOneVacancy(opening);
    const proposal = proposeThisWeek(asking);
    expect(proposal).not.toBeNull();
    const rows = cabinetProposalItems(asking);
    expect(rows).toEqual([cabinetProposalItem(asking, proposal!)]);
    expect(attentionItems(asking).filter((item) => item.id.startsWith("cabinet-proposal:"))).toEqual(rows);
  });

  it("returns the same row on a second call", () => {
    const asking = withOneVacancy(opening);
    expect(cabinetProposalItems(asking)).toEqual(cabinetProposalItems(asking));
    const proposal = proposeThisWeek(asking);
    expect(proposal).not.toBeNull();
    expect(cabinetProposalItem(asking, proposal!)).toEqual(cabinetProposalItem(asking, proposal!));
  });

  it("names the chair and states the reason, without choosing the department", () => {
    const proposal: DepartmentProposal = {
      role: "role-education-secretary" as RoleId,
      reason: "vacancy",
      week: opening.turn,
    };
    const row = cabinetProposalItem(opening, proposal);
    expect(row).toMatchObject({
      source: "agency-request",
      urgency: "soft",
      title: roleTitle(proposal.role, charterOf(opening).roleTitles),
      reason: "The seat is empty.",
      href: "/washington/office/OFF-EDUCATION-SEC?view=actions#office-actions",
    });
    expect(cabinetProposalItem(opening, { ...proposal, reason: "delivery" }).reason).toBe(
      "The department isn't getting its work done.",
    );
  });
});

describe("a resignation offer on the Desk (CAB-8 12a)", () => {
  const offer: ResignationOffer = {
    id: "offer:role-education-secretary:0",
    role: "role-education-secretary" as RoleId,
    person: "PER-USA-test-secretary" as never,
    turn: opening.turn,
    reason: "Karen Boyd has lost faith in the direction of the administration.",
    expiresTurn: opening.turn + 3,
  };

  it("adds no row when nobody has offered", () => {
    expect(resignationOfferItems(opening)).toEqual([]);
    expect(attentionItems(opening).some((item) => item.id.startsWith("resignation-offer:"))).toBe(false);
  });

  it("carries the officer's own stamped reason, unchanged", () => {
    const row = resignationOfferItem(opening, offer);
    expect(row).toMatchObject({
      id: `resignation-offer:${offer.id}`,
      source: "resignation-offer",
      urgency: "soft",
      title: `${roleTitle(offer.role, charterOf(opening).roleTitles)} has offered to resign`,
      reason: offer.reason,
      href: "/washington/office/OFF-EDUCATION-SEC?view=actions#office-actions",
      stance: "adverse",
    });
    expect(row.dueDate).toEqual(selectDateOfTurn(opening, offer.expiresTurn!));
  });

  it("reads every standing offer off the cabinet's agenda", () => {
    const withOffer: Campaign = { ...opening, cabinetAgenda: { proposals: [], offers: [offer] } };
    expect(resignationOfferItems(withOffer)).toEqual([resignationOfferItem(withOffer, offer)]);
    expect(attentionItems(withOffer).filter((item) => item.id.startsWith("resignation-offer:"))).toEqual(
      resignationOfferItems(withOffer),
    );
  });
});

describe("a Secretary's own proposal on the Desk", () => {
  const proposal: MinisterProposal = {
    id: `proposal:initiative:role-foreign-minister:${opening.turn}`,
    role: "role-foreign-minister" as RoleId,
    person: "PER-USA-test-secretary" as never,
    turn: opening.turn,
    summary:
      "The Secretary of State, Dana Reyes, proposes a state visit to France. Dana Reyes sees a chance to deepen ties with France, which is ready to receive you. Taking it sends the request; the other government decides whether to receive it.",
    expiresTurn: opening.turn + 1,
    act: { kind: "engagement", target: "FRA" as never, engagement: "visit" },
  };
  const asking: Campaign = { ...opening, turn: opening.turn + 1, cabinetAgenda: { proposals: [proposal], offers: [], lastProposalTurn: opening.turn } };

  it("adds no row while nobody has brought one", () => {
    expect(ministerInitiativeItems(opening)).toEqual([]);
  });

  it("says who proposes what, why, and what taking it does, in the engine's own words", () => {
    const row = ministerInitiativeItem(asking, proposal);
    expect(row).toMatchObject({
      id: `cabinet-initiative:${proposal.id}`,
      source: "agency-request",
      urgency: "soft",
      title: `${roleTitle(proposal.role, charterOf(asking).roleTitles)} brings you a proposal`,
      reason: proposal.summary,
      href: "/washington/office/OFF-STATE-SEC?view=actions#office-actions",
      stance: "favorable",
    });
    expect(row.dueDate).toEqual(selectDateOfTurn(asking, proposal.expiresTurn!));
  });

  it("reads the week's proposal off the agenda beside any department request, and drops it once it lapses", () => {
    expect(ministerInitiativeItems(asking)).toEqual([ministerInitiativeItem(asking, proposal)]);
    expect(cabinetProposalItems(asking)).toContainEqual(ministerInitiativeItem(asking, proposal));
    expect(attentionItems(asking).some((item) => item.id === `cabinet-initiative:${proposal.id}`)).toBe(true);
    expect(ministerInitiativeItems({ ...asking, turn: asking.turn + 1 })).toEqual([]);
  });

  it("leaves a department's own request off this row", () => {
    const { act: _act, ...asked } = proposal;
    const request: MinisterProposal = { ...asked, id: "proposal:delivery:role-foreign-minister:0" };
    expect(ministerInitiativeItems({ ...asking, cabinetAgenda: { proposals: [request], offers: [] } })).toEqual([]);
  });
});
