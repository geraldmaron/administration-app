import { beforeAll, describe, expect, it } from "vitest";
import { createRngStreams, makeCampaignSeed, openConversation, sealFounding, type Campaign, type ReplyProjection } from "@admin/engine";
import type { CastScenario } from "@admin/content";
import { decisionComparison, foundingOptions, openingChoices, pendingConversations, silenceLine } from "@admin/player-core";
import { worldDataset } from "@admin/world";
import { answerAuthorities } from "./authority";
import { choiceOptions, counterpartName, dangerOf, reviewOf, verbOf } from "./choices";
import { decisionLetterhead } from "./letterhead";

let campaign: Campaign;
let cast: CastScenario;

beforeAll(() => {
  const seed = makeCampaignSeed("decision-screen-test");
  const choices = openingChoices(foundingOptions(seed));
  campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Test President" } });
  const first = pendingConversations(campaign)[0];
  if (!first) throw new Error("The opening campaign has no decision waiting; the fixture needs one.");
  cast = first;
}, 60_000);

function thread() {
  return openConversation(campaign, cast.script, createRngStreams(campaign.seed));
}

describe("the decision's answers", () => {
  it("lists every answer and no row for leaving it, on the engine's own comparison", () => {
    const replies = thread().replies;
    const options = choiceOptions(decisionComparison(campaign, cast.script, replies, counterpartName(campaign, cast)));
    expect(options.map((option) => option.id)).toEqual(replies.map((reply) => reply.option.id));
    for (const option of options) expect(option.outcome).toBeDefined();
    for (const option of options) expect(typeof option.lead).toBe("string");
  });

  it("says the review line and verb from the picked reply, and the waiting line from the price of silence", () => {
    const reply = thread().replies[0]!;
    expect(reviewOf(reply)).toContain(reply.option.text);
    expect(reviewOf(undefined)).toBeUndefined();
    expect(["Give this answer", "Start preparing"]).toContain(verbOf(reply));
    expect(silenceLine(campaign, cast)).toMatch(/unanswered|already cost|lower court/i);
  });

  it("draws force as danger and a spoken position as a signature", () => {
    const position = { option: { tone: "principled", commitment: { kind: "position" } } } as unknown as ReplyProjection;
    const force = { option: { tone: "firm", commitment: { kind: "instrument" } } } as unknown as ReplyProjection;
    expect(dangerOf(position)).toBe(false);
    expect(dangerOf(force)).toBe(true);
  });
});

describe("the letterhead", () => {
  it("names an issuer with an emblem, a filing date and the engine's decision-memo marking", () => {
    const head = decisionLetterhead(campaign, cast, thread().beats);
    expect(head.issuer.length).toBeGreaterThan(0);
    expect(head.seal.id.length).toBeGreaterThan(0);
    expect(head.filed).toMatch(/\d{4}$/);
    expect(head.marking.family).toBe("presidential-decision-memo");
    const expected = { routine: "UNCLASSIFIED", serious: "CONFIDENTIAL", critical: "SECRET" }[cast.def.severity];
    expect(head.marking.level).toBe(expected);
  });

  it("issues from the declared responsible office, not whoever speaks first", () => {
    const seats = Object.keys(campaign.player.cabinet);
    const issuerFor = (hint: string) => decisionLetterhead(campaign, { ...cast, def: { ...cast.def, responsibleOffice: hint } } as typeof cast, thread().beats).issuer;
    const defense = issuerFor("defense");
    const agriculture = issuerFor("agriculture");
    if (seats.includes("role-defense-minister") && seats.includes("role-agriculture-secretary")) expect(defense).not.toBe(agriculture);
    expect(defense.length).toBeGreaterThan(0);
  });
});

describe("the law an answer rests on", () => {
  it("cites only what the engine ties to the answer, each record once", () => {
    for (const reply of thread().replies) {
      const cited = answerAuthorities(reply, campaign);
      expect(new Set(cited.map((entry) => entry.authority.id)).size).toBe(cited.length);
    }
  });

  it("cites the War Powers Resolution where congressional leadership must be consulted", () => {
    const reply = { option: { commitment: { kind: "instrument" } }, consultation: [{ body: "Congressional leadership, under the War Powers Resolution (Congress's war clock)" }] } as unknown as ReplyProjection;
    const cited = answerAuthorities(reply, campaign);
    expect(cited).toHaveLength(1);
    expect(cited[0]?.bearing).toBe("You must consult others under");
    expect(cited[0]?.authority.cite).toMatch(/1541/);
  });

  it("cites the statute a scenario's tariff lift undoes, read off the measure", () => {
    const measure = { id: "probe-ours", kind: "tariff", sector: "steel", target: "CAN", rate: 0.25, imposedTurn: campaign.turn,
      imposedDate: campaign.calendar, authority: "INST-USTR", origin: "us", statute: "s232" } as unknown as Campaign["trade"]["measures"][string];
    const withMeasure: Campaign = { ...campaign, trade: { ...campaign.trade, measures: { ...campaign.trade.measures, [measure.id]: measure } } };
    const reply = { option: { commitment: { kind: "position", tariffLift: { ours: { measure: measure.id, sector: "steel", rate: 0.25, imposedTurn: campaign.turn } } } } } as unknown as ReplyProjection;
    const cited = answerAuthorities(reply, withMeasure);
    expect(cited).toHaveLength(1);
    expect(cited[0]?.authority.cite).toBe("19 U.S.C. §1862");
    expect(answerAuthorities(reply, campaign)).toHaveLength(0);
  });

  it("cites the relief order's own authority for an answer that sends federal relief", () => {
    const reply = { option: { commitment: { kind: "position", relief: { kind: "state", state: "TX" } } } } as unknown as ReplyProjection;
    expect(answerAuthorities(reply, campaign)[0]?.bearing).toBe("Based on");
  });
});
