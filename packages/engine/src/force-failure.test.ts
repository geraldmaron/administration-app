/**
 * "Iran hits back harder instead of backing down" is a branch of the
 * projection, and it has to be a different week from "Iran's forces held and
 * nothing was gained": the target answers with force, and that is a war.
 */
import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { commodityShocks } from "./commodity-shocks.js";
import { apply, type Effect } from "./effects.js";
import { answersWithForce, failedForceEffects } from "./force-failure.js";
import { projectAction } from "./resolution.js";
import { warOpinionTerms } from "./opinion-war.js";
import { createRngStreams } from "./rng.js";
import { selectRelationship, type Campaign } from "./state.js";

const USA = "USA" as NationId;
const IRN = "IRN" as NationId;

const { campaign: BARE } = foundedForBalance("hit-back-proof", "democrat", {}, { carriedWorld: false });
const ctx = { campaign: BARE, actor: USA, target: IRN, streams: createRngStreams(BARE.seed) };

const applied = (effects: readonly Effect[]): Campaign =>
  apply(BARE, { source: "action", actor: "player", turn: BARE.turn, narration: { summary: "A failed blockade." }, effects });

describe("a blockade that fails", () => {
  const repulsed = failedForceEffects(ctx, 3, "repulsed");
  const hitBack = failedForceEffects(ctx, 3, "escalation");

  it("still spends the force's readiness and reports an introduction into hostilities either way", () => {
    for (const effects of [repulsed, hitBack]) {
      expect(effects.some((effect) => effect.kind === "nationStat" && effect.nation === USA)).toBe(true);
      expect(effects.some((effect) => effect.kind === "warPowers" && effect.open?.kind === "hostilities")).toBe(true);
    }
  });

  it("opens no war when the target only holds", () => {
    expect(repulsed.some((effect) => effect.kind === "conflict")).toBe(false);
    expect(Object.values(applied(repulsed).conflicts)).toEqual([]);
  });

  it("opens a war when the target hits back, with its fire on the record as a use of force", () => {
    const after = applied(hitBack);
    const wars = Object.values(after.conflicts);
    expect(wars).toHaveLength(1);
    expect(wars[0]!.opening).toBe("retaliation");
    const answered = selectRelationship(after, IRN, USA)?.history;
    expect(answered?.some((event) => event.kind === "strike" && event.turn === BARE.turn)).toBe(true);
  });

  it("reaches the market through the war it opens, where holding does not", () => {
    expect(commodityShocks(applied(repulsed), "crude")).toEqual([]);
    expect(commodityShocks(applied(hitBack), "crude").map((shock) => shock.kind)).toContain("route");
  });

  it("buys the President who moved first no rally", () => {
    expect(warOpinionTerms(applied(hitBack)).rally).toBe(0);
  });

  it("leaves an act below force as it was", () => {
    expect(failedForceEffects(ctx, 2, "escalation")).toEqual([]);
  });
});

describe("who can hit back", () => {
  const risks = (target: string) => {
    const projected = projectAction(BARE, { actor: USA, target: target as NationId, instrument: "military", rung: 3 }, createRngStreams(BARE.seed));
    if (!projected.ok) throw new Error(projected.reason);
    return projected.projection.risks.map((risk) => risk.id);
  };

  it("offers the branch against a government with a navy or air arm ready to fire", () => {
    expect(answersWithForce(BARE, IRN)).toBe(true);
    expect(risks("IRN")).toContain("escalation");
  });

  // Djibouti's navy and air arm are each under the floor a blockade is stood
  // up out of: it can hold its ports or fail to, and it cannot answer at sea.
  it("does not offer it against a government with nothing to fire back with", () => {
    expect(answersWithForce(BARE, "DJI" as NationId)).toBe(false);
    expect(risks("DJI")).toEqual(["repulsed"]);
  });
});
