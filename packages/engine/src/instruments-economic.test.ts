/**
 * Aid answers a need, and goodwill bought with aid saturates by recipient and
 * purpose whatever the act is called.
 */
import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { aidReception } from "./instruments-economic.js";
import { resolveAction, type ResolutionRequest } from "./resolution.js";
import { createRngStreams } from "./rng.js";
import { selectRelationship, type Campaign, type NationCondition } from "./state.js";

const USA = "USA" as NationId;
const PAK = "PAK" as NationId;
const { campaign: FOUNDED } = foundedForBalance("aid-saturation", "democrat", {}, { carriedWorld: false });

const ask = (campaign: Campaign, rung: 1 | 2 | 4) => resolveAction(campaign, { actor: USA, target: PAK, instrument: "assistance", rung } as ResolutionRequest, createRngStreams(campaign.seed), "action");
const trust = (campaign: Campaign) => selectRelationship(campaign, PAK, USA)?.trust ?? 0;

const flood = (campaign: Campaign, severity: number): Campaign => {
  const condition: NationCondition = {
    id: `condition:flood:PAK:${campaign.turn}`, nation: PAK, kind: "flood", scope: "nation", severity, startedTurn: campaign.turn, status: "active",
    beats: [{ turn: campaign.turn, description: "Pakistan is struck by flooding nationwide." }],
  };
  return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
};

/** Land one act a week for `weeks` weeks, returning each week's trust gain. */
function weekly(campaign: Campaign, rungs: readonly (1 | 2 | 4)[]): { readonly gains: readonly number[]; readonly end: Campaign } {
  let working = campaign;
  const gains: number[] = [];
  for (const rung of rungs) {
    const result = ask(working, rung);
    if (!result.ok) throw new Error(`refused: ${result.reason}`);
    const before = trust(working);
    working = apply(working, result.packet);
    gains.push(trust(working) - before);
    working = withWeeksElapsed(working, 1);
  }
  return { gains, end: working };
}

describe("emergency relief answers a need", () => {
  it("is refused to a government living through nothing", () => {
    const refused = ask(FOUNDED, 1);
    expect(refused.ok).toBe(false);
    expect((refused as { reason?: string }).reason).toMatch(/disaster or crisis/);
  });

  it("lands on a flooded government, and a second shipment is refused while the first operation still answers that flood", () => {
    const flooded = flood(FOUNDED, 0.6);
    const first = ask(flooded, 1);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const after = withWeeksElapsed(apply(flooded, first.packet), 1);
    expect(ask(after, 1).ok).toBe(false);
  });

  it("costs and delivers in proportion: a shipment to a flood nearly over moves less money than one to a deep flood", () => {
    const money = (campaign: Campaign) => {
      const result = ask(campaign, 1);
      if (!result.ok) throw new Error(result.reason);
      return apply(campaign, result.packet).nations[PAK]!.stats.softPower.aidReceived - campaign.nations[PAK]!.stats.softPower.aidReceived;
    };
    expect(money(flood(FOUNDED, 0.02))).toBeLessThan(money(flood(FOUNDED, 0.6)));
  });
});

describe("goodwill bought with aid saturates by recipient and purpose", () => {
  it("lets development grants land without a disaster, each worth less than the last while the record is fresh", () => {
    const { gains } = weekly(FOUNDED, Array<2>(12).fill(2));
    const late = gains.slice(-4).reduce((sum, gain) => sum + gain, 0) / 4;
    expect(gains[0]!).toBeGreaterThan(0);
    expect(late).toBeLessThan(gains[0]! / 4);
    expect(gains.reduce((sum, gain) => sum + gain, 0)).toBeLessThan(gains[0]! * 4);
  });

  it("does not reset when the act changes its name: a grant after relief lands less than a grant to a fresh recipient", () => {
    const flooded = flood(FOUNDED, 0.6);
    const relieved = weekly(flooded, [1]).end;
    expect(aidReception(relieved, USA, PAK, "civil")).toBeLessThan(aidReception(flooded, USA, PAK, "civil"));
    const afterRelief = weekly(relieved, [2]).gains[0]!;
    const fresh = weekly(withWeeksElapsed(FOUNDED, 1), [2]).gains[0]!;
    expect(afterRelief).toBeLessThan(fresh);
  });

  it("keeps purposes apart: money sent does not dull the reception of arms", () => {
    const granted = weekly(FOUNDED, [2, 2, 2]).end;
    expect(aidReception(granted, USA, PAK, "security")).toBe(1);
  });

  it("recovers as the record fades by the calendar", () => {
    const granted = weekly(FOUNDED, [2, 2, 2]).end;
    expect(aidReception(withWeeksElapsed(granted, 104), USA, PAK, "civil")).toBeGreaterThan(aidReception(granted, USA, PAK, "civil"));
  });
});
