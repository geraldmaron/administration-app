import { describe, expect, it } from "vitest";
import { advanceUntilAttention, apply, coalitionFor, createRngStreams, defaultTurnPhases, issueAction } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { attentionItems } from "./attention";

const target = "VEN" as NationId;

describe("foreign operation attention destinations", () => {
  it("opens the precise operation and authorized terms when partner replies stop Continue", () => {
    const campaign = openingCampaign();
    const partner = coalitionFor(campaign, campaign.founding.nation, target).backers[0]?.nation;
    if (!partner) throw new Error("The opening campaign needs an eligible partner");
    const issued = issueAction(campaign, { actor: campaign.founding.nation, target, instrument: "economic", rung: 1, support: { mode: "seek", partners: [partner] } }, createRngStreams(campaign.seed));
    if (!issued.ok) throw new Error(issued.missingCapability);
    const result = advanceUntilAttention(apply(campaign, issued.packet), { phases: defaultTurnPhases, horizonDays: 10 });
    const matter = result.stop.presented.find((entry) => entry.id.startsWith("support:"));
    expect(matter).toBeDefined();
    const row = attentionItems(result.campaign).find((entry) => entry.id === matter!.id);
    expect(row?.subject).toBe(matter?.subject);
    const href = new URL(row!.href, "https://example.test");
    expect(href.pathname).toBe("/world/nation/VEN/act");
    expect(href.searchParams.get("support")).toBe("seek");
    expect(href.searchParams.get("partners")).toBe(partner);
    expect(decodeURIComponent(href.hash)).toBe(`#operation-${matter!.subject}`);
    expect(row?.reason).toMatch(/confirmed|refused|conditional/);
  });

  it("opens the actual execution record when an operation report stops Continue", () => {
    const campaign = openingCampaign();
    const issued = issueAction(campaign, { actor: campaign.founding.nation, target, instrument: "economic", rung: 1, support: { mode: "unilateral", partners: [] } }, createRngStreams(campaign.seed));
    if (!issued.ok) throw new Error(issued.missingCapability);
    const result = advanceUntilAttention(apply(campaign, issued.packet), { phases: defaultTurnPhases, horizonDays: 10 });
    const matter = result.stop.presented.find((entry) => entry.source === "consequence-return");
    expect(matter).toBeDefined();
    const row = attentionItems(result.campaign).find((entry) => entry.id === matter!.id);
    const event = decodeURIComponent(new URL(row!.href, "https://example.test").pathname.replace(/^\/record\/event\//, ""));
    const record = result.campaign.ledger.find((entry) => entry.causal?.eventId === event);
    expect(record?.description).toContain(matter!.reason);
  });
});
