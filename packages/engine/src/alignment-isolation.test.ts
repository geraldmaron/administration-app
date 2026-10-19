import { withStandingFinding } from "./finding-testing.js";
import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply, type EffectPacket } from "./effects.js";
import { createRngStreams } from "./rng.js";
import { resolveAction } from "./resolution.js";
import { openConflict } from "./conflicts.js";
import { joinConflict } from "./war-entry.js";
import { commitReply, type ConversationScript, type ReplyOption } from "./conversations.js";
import { signOrder, EXECUTIVE_ORDERS } from "./orders.js";
import { enactPolicy } from "./policy-draft.js";
import { legislationPhase, signBill } from "./legislation.js";
import { projectPassage } from "./bill-stages.js";
import { legislativeAct } from "./legislative-acts.js";
import type { AlignmentVector, Bill, Campaign } from "./state.js";

// The census of every emitter of an alignment pull. Alignment is the record of
// what the President has chosen to stand for, so each emitter is driven twice:
// once as the President's own act, through the real path, where it must move
// the axes; and once as somebody else's, where it must not. An emitter that
// only the President can reach is re-stamped as the world's to prove the same
// filter would hold the day a phase reaches it.

const AXES = ["economicLeftRight", "authLibertarian", "nationalistGlobalist"] as const;

function moved(before: AlignmentVector, after: AlignmentVector): boolean {
  return AXES.some((axis) => Math.abs(after[axis] - before[axis]) > 1e-9);
}

function carriesAlignment(packet: EffectPacket): boolean {
  return packet.effects.some((effect) => effect.kind === "alignment");
}

function packetOf(result: { readonly ok: boolean; readonly packet?: EffectPacket; readonly reason?: string }): EffectPacket {
  if (!result.ok || !result.packet) throw new Error(`expected a packet, got: ${result.reason ?? "a refusal"}`);
  return result.packet;
}

/** The President's own act moves the axes; the same packet in the world's hands does not. */
function expectOnlyThePresidentMovesIt(campaign: Campaign, packet: EffectPacket): void {
  expect(packet.actor).toBe("player");
  expect(carriesAlignment(packet)).toBe(true);
  expect(moved(campaign.player.alignments, apply(campaign, packet).player.alignments)).toBe(true);
  const theirs = apply(campaign, { ...packet, actor: "world" });
  expect(theirs.player.alignments).toEqual(campaign.player.alignments);
}

const founded = foundedForBalance("alignment-census");
const US = founded.campaign.founding.nation;
const others = Object.keys(founded.campaign.nations).filter((id) => id !== US) as NationId[];

/** The first NPC draw of a rung that lands with its alignment pull, so the census tests a real world packet. */
function npcPacketFor(instrument: "diplomatic" | "covert", rung: 2): EffectPacket {
  for (const actor of others) {
    for (const target of others) {
      if (actor === target) continue;
      const result = resolveAction(founded.campaign, { actor, target, instrument, rung }, createRngStreams(founded.campaign.seed), "simulate");
      if (result.ok && carriesAlignment(result.packet)) return result.packet;
    }
  }
  throw new Error(`no government on the board lands ${instrument} rung ${rung}`);
}

describe("who may move the President's alignment", () => {
  it.each([
    ["a public statement", "diplomatic"],
    ["an influence operation", "covert"],
  ] as const)("moves it for the President's %s and not for a foreign government's", (_label, instrument) => {
    const target = "CAN" as NationId;
    const campaign = withStandingFinding(founded.campaign, target);
    const ours = resolveAction(campaign, { actor: US, target, instrument, rung: 2 }, createRngStreams(campaign.seed), "action");
    expectOnlyThePresidentMovesIt(campaign, packetOf(ours));

    const theirs = npcPacketFor(instrument, 2);
    expect(theirs.actor).toBe("world");
    expect(apply(campaign, theirs).player.alignments).toEqual(campaign.player.alignments);
  });

  it("moves it when the President joins a war, and not when another government does", () => {
    const war = openConflict("RUS" as NationId, "UKR" as NationId, founded.campaign.turn, "a test war");
    const campaign: Campaign = { ...founded.campaign, conflicts: { ...founded.campaign.conflicts, [war.id]: war } };
    expectOnlyThePresidentMovesIt(campaign, packetOf(joinConflict(campaign, US, war.id, "defender")));

    const theirs = packetOf(joinConflict(campaign, "POL" as NationId, war.id, "defender"));
    expect(theirs.actor).toBe("world");
    expect(apply(campaign, theirs).player.alignments).toEqual(campaign.player.alignments);
  });

  it("moves it when the President signs an order", () => {
    const campaign = founded.campaign;
    const order = EXECUTIVE_ORDERS.find((entry) => entry.id === "order-border-controls")!;
    expectOnlyThePresidentMovesIt(campaign, packetOf(signOrder(campaign, founded.charter, order.id, createRngStreams(campaign.seed))));
  });

  it("moves it when the President adopts a program", () => {
    const campaign = founded.campaign;
    expectOnlyThePresidentMovesIt(campaign, packetOf(enactPolicy(campaign, "industry-extraction")));
  });

  it("moves it when the President takes a position in a conversation", () => {
    const campaign = founded.campaign;
    const concede: ReplyOption = {
      id: "concede",
      tone: "conciliatory",
      text: "We will let this one pass, quietly.",
      commitment: {
        kind: "position",
        cost: { standing: -0.02 },
        pull: { nationalistGlobalist: 0.1 },
        remembered: "The United States let the border incident pass without answer.",
      },
    };
    const script: ConversationScript = {
      id: "alignment-census",
      counterpart: "CAN" as NationId,
      subject: "The border incident",
      opening: [{ speaker: { kind: "counterpart" }, text: "A navigation error. Nothing more." }],
      options: [concede],
    };
    const result = commitReply(campaign, script, concede, createRngStreams(campaign.seed));
    if (!result.ok) throw new Error(`reply refused: ${result.missingCapability}`);
    expectOnlyThePresidentMovesIt(campaign, result.packet);
  });
});

describe("a law the President did not sign", () => {
  const ACT = "act-infrastructure-investment";

  function withBill(campaign: Campaign, status: Bill["status"], at: number): Campaign {
    const act = legislativeAct(ACT)!;
    const bill: Bill = {
      id: `bill:${ACT}:${at}`,
      act: ACT,
      title: act.title,
      sponsor: act.sponsor,
      introducedTurn: at,
      status,
      passage: projectPassage(campaign, act),
      ...(status === "vetoed" ? { resolvedTurn: at } : {}),
    };
    return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
  }

  function lawsAfterThePhase(campaign: Campaign): { readonly after: Campaign; readonly enacted: boolean } {
    const packets = legislationPhase(campaign);
    const after = packets.reduce((state, packet) => apply(state, packet), campaign);
    const enacted = Object.values(after.bills).some((bill) => bill.act === ACT && bill.status === "law");
    expect(packets.every((packet) => packet.actor === "world")).toBe(true);
    expect(packets.some(carriesAlignment)).toBe(true);
    return { after, enacted };
  }

  it("moves it when the President signs the bill", () => {
    const campaign = withBill(buildCampaign(), "on-the-desk", buildCampaign().turn);
    expectOnlyThePresidentMovesIt(campaign, packetOf(signBill(campaign, `bill:${ACT}:${campaign.turn}`)));
  });

  it("does not move it when the bill becomes law without a signature", () => {
    const base = buildCampaign();
    const campaign = { ...withBill(base, "on-the-desk", base.turn), turn: base.turn + 3 };
    const { after, enacted } = lawsAfterThePhase(campaign);
    expect(enacted).toBe(true);
    expect(after.player.alignments).toEqual(campaign.player.alignments);
  });

  it("does not move it when Congress overrides the veto", () => {
    const base = buildCampaign();
    const hostile = { ...base, congress: { ...base.congress, disposition: 0.05 } };
    const campaign = { ...withBill(hostile, "vetoed", base.turn), turn: base.turn + 3 };
    const { after, enacted } = lawsAfterThePhase(campaign);
    expect(enacted).toBe(true);
    expect(after.player.alignments).toEqual(campaign.player.alignments);
  });
});
