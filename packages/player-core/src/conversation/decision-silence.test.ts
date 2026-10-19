import { describe, expect, it } from "vitest";
import { apply, createRngStreams, makeCampaignSeed, openConversation, sealFounding, type Campaign } from "@admin/engine";
import { scenarioCaseId } from "@admin/content";
import { worldDataset } from "@admin/world";
import { foundingOptions, openingChoices } from "../campaign/founding-options";
import { decisionComparison } from "./decision-comparison";
import { silenceLine } from "./decision-silence";
import { scenarioDispositionPackets, scenarioDispositions, silencePrice } from "./scenario-dispositions";
import { pendingConversations } from "./scripts";
import { chargedThisWeek } from "./lapse-source";

/** A founding whose desk holds a critical decision on the morning of the oath. */
function withDecision(): Campaign {
  const seed = makeCampaignSeed("surface-audit-a");
  const choices = openingChoices(foundingOptions(seed));
  return sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
}

const campaign = withDecision();
const cast = pendingConversations(campaign)[0]!;

function comparison() {
  const thread = openConversation(campaign, cast.script, createRngStreams(campaign.seed));
  return decisionComparison(campaign, cast.script, thread.replies, "The other government");
}

function commitAll(state: Campaign, packets: readonly Parameters<typeof apply>[1][]): Campaign {
  return packets.reduce((next, packet) => apply(next, packet), state);
}

describe("leaving a decision unanswered", () => {
  it("is no column of the comparison: every option is an answer", () => {
    expect(cast).toBeDefined();
    const table = comparison();
    const replies = openConversation(campaign, cast.script, createRngStreams(campaign.seed)).replies.map((reply) => reply.option.id);
    expect(table.options.map((option) => option.id)).toEqual(replies);
    for (const row of table.rows) expect(row.cells, row.id).toHaveLength(table.options.length);
  });

  it("prices silence with the packet that charges it: the ledger records exactly the readings shown", () => {
    const price = silencePrice(campaign, cast);
    expect(price.alreadyCharged).toBe(false);
    expect(Object.keys(price.metrics).length).toBeGreaterThan(0);
    const answer = scenarioDispositionPackets(campaign, cast, "allow-default");
    if (!answer.ok) throw new Error(answer.reason);
    const after = commitAll(campaign, answer.packets);
    const charge = after.ledger[campaign.ledger.length]!;
    for (const [key, delta] of Object.entries(price.metrics)) {
      expect(charge.cost?.[key as keyof typeof charge.cost], key).toBeCloseTo(delta, 12);
    }
    // Every reading the charge moved is on the page.
    for (const key of Object.keys(charge.cost ?? {})) expect(price.metrics, key).toHaveProperty(key);
    // And every judgment it moved, by what the entry records.
    expect(Object.keys(price.judgments).length).toBeGreaterThan(0);
    for (const [driver, delta] of Object.entries(price.judgments)) {
      expect(charge.mood?.[driver as keyof NonNullable<typeof charge.mood>], driver).toBeCloseTo(delta, 12);
    }
  });

  it("says what the silence costs as one line beside the answers", () => {
    const line = silenceLine(campaign, cast);
    expect(line).toMatch(/^If it runs out unanswered: /);
    expect(line).toContain(silencePrice(campaign, cast).narration);
  });
});

describe("the dispositions a decision declares", () => {
  it("offers exactly what the case accepts besides a reply, in its own order", () => {
    expect(scenarioDispositions(campaign, cast).map((entry) => entry.kind)).toEqual(["decline", "defer", "allow-default"]);
  });

  it("leaves it unanswered: the case defaults, the desk closes, and the week cannot charge it again", () => {
    const answer = scenarioDispositionPackets(campaign, cast, "allow-default");
    if (!answer.ok) throw new Error(answer.reason);
    const after = commitAll(campaign, answer.packets);
    expect(after.cases?.[scenarioCaseId(cast.def.id)]?.status).toBe("defaulted");
    expect(pendingConversations(after)).toHaveLength(0);
    expect(chargedThisWeek(after, cast.def.id)).toBe(true);
    expect(silencePrice(after, cast).alreadyCharged).toBe(true);
  });

  it("declines it, on the record as declined, at the same price", () => {
    const answer = scenarioDispositionPackets(campaign, cast, "decline");
    if (!answer.ok) throw new Error(answer.reason);
    const after = commitAll(campaign, answer.packets);
    expect(after.cases?.[scenarioCaseId(cast.def.id)]?.status).toBe("declined");
    expect(after.ledger.at(-1)?.description).toMatch(/^Declined to take up/);
  });

  it("puts it off without charging it, and takes it off today's desk", () => {
    const answer = scenarioDispositionPackets(campaign, cast, "defer");
    if (!answer.ok) throw new Error(answer.reason);
    expect(answer.packets).toHaveLength(1);
    const after = commitAll(campaign, answer.packets);
    expect(after.cases?.[scenarioCaseId(cast.def.id)]?.status).toBe("deferred");
    expect(pendingConversations(after).map((entry) => entry.def.id)).not.toContain(cast.def.id);
    expect(chargedThisWeek(after, cast.def.id)).toBe(false);
  });
});
