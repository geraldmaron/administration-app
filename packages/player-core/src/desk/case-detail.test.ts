import { describe, expect, it } from "vitest";
import { apply, reliefSignature, type Bill, type Campaign, type StateRuntime } from "@admin/engine";
import type { StateId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { caseDetail, commitCaseDisposition, leadCase } from "./case-detail";

const base = openingCampaign();

function withBill(campaign: Campaign): Campaign {
  const bill: Bill = {
    id: "bill:act-test:1",
    act: "act-test",
    title: "A bill",
    sponsor: "bipartisan",
    introducedTurn: campaign.turn,
    status: "on-the-desk",
    passage: [{ chamber: "house", yeas: 240, nays: 190, required: 218, passed: true }],
  };
  return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
}

function withRequest(campaign: Campaign): Campaign {
  const michigan = campaign.states["MI" as StateId] as StateRuntime;
  const claim = { signature: reliefSignature("flood"), openedTurn: campaign.turn - 1, expiresTurn: campaign.turn + 30, weight: 0.3, reason: "Michigan asked for help." };
  return { ...campaign, states: { ...campaign.states, ["MI" as StateId]: { ...michigan, claims: [claim] } } };
}

describe("leadCase: the one case worth opening without being asked", () => {
  it("is undefined with nothing on the Desk", () => {
    expect(leadCase(base)).toBeUndefined();
  });

  it("picks the nearer clock: the bill's signing window before a month-long relief request", () => {
    expect(leadCase(withRequest(withBill(base)))?.source.raise.kind).toBe("bill");
  });
});

describe("caseDetail: the tray options a family's own contract allows", () => {
  it("offers a bill a put-off and letting it become law unsigned, in the office's words", () => {
    const campaign = withBill(base);
    const detail = caseDetail(campaign, leadCase(campaign)!);
    expect(detail.options.map((option) => option.label)).toEqual(["Put off a week", "Let it become law unsigned"]);
    expect(detail.clockKind).toBe("statutory");
  });

  it("offers an emergency a put-off, a decline and the default", () => {
    const campaign = withRequest(base);
    const detail = caseDetail(campaign, leadCase(campaign)!);
    expect(detail.options.map((option) => option.kind)).toEqual(["defer", "decline", "allow-default"]);
    expect(detail.clockKind).toBe("operational");
  });
});

describe("commitCaseDisposition: the tray's commit, one act on the case and the attention record", () => {
  it("raises the case it has not seen yet and puts both off together", () => {
    const campaign = withRequest(base);
    const id = leadCase(campaign)!.source.raise.id;
    const answer = commitCaseDisposition(campaign, id, "defer");
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    const after = apply(campaign, answer.packet);
    expect(after.cases?.[id]?.status).toBe("deferred");
    expect(after.deferrals[id]).toEqual(after.cases?.[id]?.deferredUntil);
    const lead = leadCase(after)!;
    expect(caseDetail(after, lead).options.map((option) => option.kind)).not.toContain("defer");
  });
});
