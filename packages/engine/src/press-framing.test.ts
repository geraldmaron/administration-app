import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import {
  DECISION_FRAMINGS,
  DECISION_FRAMING_KEYS,
  FRAMING_SCRUTINY_TURNS,
  FRAMING_WINDOW_TURNS,
  frameDecision,
  frameableOrders,
  framingCaughtItems,
  framingContradicts,
  outletFramingReading,
  projectFraming,
} from "./press-framing.js";
import { PRESS_OUTLETS, outletTarget, pressPhase } from "./press.js";
import { apply } from "./effects.js";
import { recomputeApproval } from "./opinion.js";
import { CURRENT_SCHEMA_VERSION, createSave, loadSave } from "./save.js";
import type { Campaign, ExecutiveOrderRecord } from "./state.js";

const construction = (turn: number): ExecutiveOrderRecord => ({
  id: `order-emergency-construction:${turn}`,
  order: "order-emergency-construction",
  turn,
  contested: false,
  challengeChance: 0.4,
});

// Settled at the turn the test puts the campaign on, not the turn the fixture
// was built at. The headline carries a honeymoon that decays week by week, so
// moving a built campaign forward without re-settling leaves a stored approval
// two weeks of decay too high — and then the next `apply()` corrects it, which
// reads as though the framing moved the country.
const withOrder = (record: ExecutiveOrderRecord, turn = record.turn): Campaign =>
  recomputeApproval({
    ...buildCampaign(),
    turn,
    orders: [record],
  });

const framed = (campaign: Campaign, framing: Parameters<typeof frameDecision>[2]): Campaign => {
  const result = frameDecision(campaign, campaign.orders[0]!.id, framing);
  if (!result.ok) throw new Error(result.reason);
  return apply(campaign, result.packet);
};

describe("what a framing is", () => {
  it("offers four framings, each with a pull of its own", () => {
    expect(DECISION_FRAMING_KEYS).toEqual(["resolve", "restraint", "necessity", "regret"]);
    const pulls = DECISION_FRAMING_KEYS.map((key) => JSON.stringify(DECISION_FRAMINGS[key].pull));
    expect(new Set(pulls).size).toBe(DECISION_FRAMING_KEYS.length);
  });

  it("only offers acts from the last two weeks that have not been explained", () => {
    const campaign = withOrder(construction(4), 4 + FRAMING_WINDOW_TURNS);
    expect(frameableOrders(campaign).map((entry) => entry.id)).toEqual([campaign.orders[0]!.id]);
    expect(frameableOrders({ ...campaign, turn: campaign.turn + 1 })).toEqual([]);
    expect(frameableOrders(framed(campaign, "resolve"))).toEqual([]);
  });

  it("refuses a second framing on the same act, and a second podium in the same week", () => {
    const once = framed(withOrder(construction(3)), "resolve");
    expect(frameDecision(once, once.orders[0]!.id, "regret")).toMatchObject({ ok: false });
    const twoActs: Campaign = { ...once, orders: [...once.orders, construction(3 + 1)], turn: 3 };
    expect(frameDecision(twoActs, twoActs.orders[1]!.id, "regret")).toMatchObject({ ok: false });
  });
});

describe("what a framing must never do", () => {
  it("writes the framing onto the act's own record and nothing else", () => {
    const before = withOrder(construction(3));
    const after = framed(before, "resolve");
    expect(after.orders[0]!.framing).toEqual({ framing: "resolve", turn: 3 });
    // Every figure a screen quotes is untouched: what happened is the same
    // record whether or not it was explained.
    expect(after.player.metrics).toEqual(before.player.metrics);
    expect(after.player.alignments).toEqual(before.player.alignments);
    expect(after.player.opinion).toEqual(before.player.opinion);
    expect(after.press).toEqual(before.press);
    expect({ ...after.orders[0], framing: undefined }).toEqual({ ...before.orders[0], framing: undefined });
  });

  it("moves only where the desks are heading", () => {
    const before = withOrder(construction(3));
    const after = framed(before, "resolve");
    const moved = PRESS_OUTLETS.filter((outlet) => outletTarget(after, outlet) !== outletTarget(before, outlet));
    expect(moved.length).toBeGreaterThan(0);
  });

  it("splits the corps: a framing one desk believes is a framing another does not", () => {
    const before = withOrder(construction(3));
    const after = framed(before, "resolve");
    const deltas = PRESS_OUTLETS.map((outlet) => outletTarget(after, outlet) - outletTarget(before, outlet));
    expect(Math.max(...deltas)).toBeGreaterThan(0);
    expect(Math.min(...deltas)).toBeLessThan(0);
  });
});

describe("a framing that argues against its own act", () => {
  it("catches restraint said about an act that reaches for power, and not about an act that supports it", () => {
    expect(framingContradicts({ authLibertarian: 0.7 }, "restraint")).toBe(true);
    expect(framingContradicts({ authLibertarian: 0.7 }, "resolve")).toBe(false);
    expect(framingContradicts({ economicLeftRight: -0.3 }, "regret")).toBe(false);
  });

  it("says so before the podium rather than after it", () => {
    const campaign = withOrder(construction(3));
    const projection = projectFraming(campaign, campaign.orders[0]!, "restraint", PRESS_OUTLETS, outletTarget);
    expect(projection.contradicts).toBe(true);
    expect(projectFraming(campaign, campaign.orders[0]!, "resolve", PRESS_OUTLETS, outletTarget).contradicts).toBe(
      false,
    );
  });

  it("works for a week, and then costs every desk more than never framing did", () => {
    const unframed = withOrder(construction(3));
    const lie = framed(unframed, "restraint");
    const caught: Campaign = { ...lie, turn: 3 + FRAMING_SCRUTINY_TURNS };
    for (const outlet of PRESS_OUTLETS) {
      const never = outletFramingReading(unframed, outlet.beliefs);
      const standing = outletFramingReading(lie, outlet.beliefs);
      const corrected = outletFramingReading(caught, outlet.beliefs);
      expect(never).toBe(0);
      expect(corrected).toBeLessThan(never);
      expect(corrected).toBeLessThan(standing);
    }
  });

  it("swings the desks that bought the line hardest", () => {
    const lie = framed(withOrder(construction(3)), "restraint");
    const caught: Campaign = { ...lie, turn: 3 + FRAMING_SCRUTINY_TURNS };
    const readings = PRESS_OUTLETS.map((outlet) => ({
      bought: outletFramingReading(lie, outlet.beliefs),
      after: outletFramingReading(caught, outlet.beliefs),
    }));
    const believers = readings.filter((entry) => entry.bought > 0);
    const skeptics = readings.filter((entry) => entry.bought < 0);
    expect(believers.length).toBeGreaterThan(0);
    expect(skeptics.length).toBeGreaterThan(0);
    expect(Math.min(...believers.map((entry) => entry.after))).toBeLessThan(
      Math.min(...skeptics.map((entry) => entry.after)),
    );
  });

  it("is reported once, on the week the record catches up", () => {
    const lie = framed(withOrder(construction(3)), "restraint");
    expect(framingCaughtItems(lie, 3)).toEqual([]);
    expect(framingCaughtItems(lie, 3 + FRAMING_SCRUTINY_TURNS)).toHaveLength(1);
    expect(framingCaughtItems(lie, 3 + FRAMING_SCRUTINY_TURNS + 1)).toEqual([]);
    // No new feed kind: the correction runs as press, like every other story
    // the corps writes about this administration.
    expect(framingCaughtItems(lie, 3 + FRAMING_SCRUTINY_TURNS)[0]!.kind).toBe("press");
  });

  it("puts the correction in the week's press packet", () => {
    const lie = framed(withOrder(construction(3)), "restraint");
    const packets = pressPhase({ ...lie, turn: 3 + FRAMING_SCRUTINY_TURNS - 1 });
    const items = packets.flatMap((packet) =>
      packet.effects.flatMap((effect) => (effect.kind === "feed" ? effect.items : [])),
    );
    expect(items.some((item) => item.headline.includes("does not say what the White House said"))).toBe(true);
  });

  it("an honest framing is never caught", () => {
    const honest = framed(withOrder(construction(3)), "resolve");
    expect(framingCaughtItems(honest, 3 + FRAMING_SCRUTINY_TURNS)).toEqual([]);
  });
});

describe("the record keeps it", () => {
  it("survives a save round trip at the current schema version", () => {
    const campaign = framed(withOrder(construction(3)), "resolve");
    const reopened = loadSave(createSave(campaign));
    expect(reopened.orders[0]!.framing).toEqual({ framing: "resolve", turn: 3 });
    expect(CURRENT_SCHEMA_VERSION).toBe(67);
  });

});
