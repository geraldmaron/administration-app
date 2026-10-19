import { describe, expect, it } from "vitest";
import { Relationship, type NationId } from "@admin/world";
import { buildCampaign, nationA, nationB, relationship } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { openConflict } from "./conflicts.js";
import { settle } from "./war-tick.js";
import { OUTCOME_LINES, settlementEffects } from "./war-outcomes.js";
import { relationshipKey, type Campaign, type Conflict } from "./state.js";
import type { Effect } from "./effect-types.js";

const USA = nationA.id;
const ALP = nationB.id as NationId;

/** Both directions of the edge, so a grudge has somewhere to land whichever side lost. */
function withBothEdges(campaign: Campaign): Campaign {
  return {
    ...campaign,
    relationships: {
      ...campaign.relationships,
      [relationshipKey(ALP, USA)]: Relationship.parse({ ...relationship, from: ALP, to: USA }),
    },
  };
}

function ended(campaign: Campaign, status: Conflict["status"]): Conflict {
  return settle(openConflict(ALP, USA, campaign.turn, "Alpland attacks."), campaign.turn, status, OUTCOME_LINES.withdrawal);
}

function metric(effects: readonly Effect[], key: "standing"): number {
  return effects.reduce((sum, effect) => sum + (effect.kind === "metric" ? (effect.deltas[key] ?? 0) : 0), 0);
}

describe("a war's end changes standing", () => {
  it("raises the President's standing when the country wins, and costs more when it loses", () => {
    const campaign = withBothEdges(buildCampaign());
    const won = metric(settlementEffects(campaign, ended(campaign, "defender-victory")), "standing");
    const lost = metric(settlementEffects(campaign, ended(campaign, "aggressor-victory")), "standing");
    expect(won).toBeGreaterThan(0);
    expect(lost).toBeLessThan(0);
    expect(Math.abs(lost)).toBeGreaterThan(won);
  });

  it("costs a decisive defeat more than one the country walked away from", () => {
    const campaign = withBothEdges(buildCampaign());
    const war = ended(campaign, "aggressor-victory");
    expect(metric(settlementEffects(campaign, war, { decisive: true }), "standing")).toBeLessThan(metric(settlementEffects(campaign, war), "standing"));
  });

  it("takes legitimacy from a beaten government and gives some to the victor", () => {
    const campaign = withBothEdges(buildCampaign());
    const after = apply(campaign, {
      source: "simulate",
      actor: "world",
      turn: campaign.turn,
      narration: { summary: "The war ends." },
      effects: [...settlementEffects(campaign, ended(campaign, "defender-victory"))],
    });
    expect(after.nations[ALP]!.stats.politics.legitimacy).toBeLessThan(campaign.nations[ALP]!.stats.politics.legitimacy);
  });

  it("moves nothing on an armistice's standing, and leaves both principals a grudge", () => {
    const campaign = withBothEdges(buildCampaign());
    const effects = settlementEffects(campaign, ended(campaign, "settled"));
    expect(metric(effects, "standing")).toBe(0);
    const grudges = effects.filter((effect) => effect.kind === "relationship" && effect.addGrudge !== undefined);
    expect(grudges).toHaveLength(2);
  });

  it("leaves the loser a lasting grudge against the victor, heavier for a decisive defeat", () => {
    const campaign = withBothEdges(buildCampaign());
    const war = ended(campaign, "defender-victory");
    const weight = (decisive: boolean) =>
      settlementEffects(campaign, war, { decisive }).flatMap((effect) =>
        effect.kind === "relationship" && effect.from === ALP && effect.to === USA && effect.addGrudge ? [effect.addGrudge.weight] : [],
      )[0];
    expect(weight(false)).toBeGreaterThan(0);
    expect(weight(true)).toBeGreaterThan(weight(false)!);
  });

  it("writes no grudge on an edge the graph does not hold", () => {
    const campaign = buildCampaign();
    const effects = settlementEffects(campaign, ended(campaign, "defender-victory"));
    expect(effects.some((effect) => effect.kind === "relationship" && effect.from === ALP)).toBe(false);
  });

  it("draws nothing: the same ending leaves the same aftermath", () => {
    const campaign = withBothEdges(buildCampaign());
    const war = ended(campaign, "aggressor-victory");
    expect(settlementEffects(campaign, war, { decisive: true })).toEqual(settlementEffects(campaign, war, { decisive: true }));
  });

  it("carries nothing for a war still running", () => {
    const campaign = buildCampaign();
    expect(settlementEffects(campaign, openConflict(ALP, USA, campaign.turn, "Alpland attacks."))).toEqual([]);
  });
});

describe("the settled war is the armistice's record", () => {
  it("stays on the board with its status, its end week and its beats", () => {
    const campaign = buildCampaign();
    const war = ended(campaign, "settled");
    expect(war.status).toBe("settled");
    expect(war.endedTurn).toBe(campaign.turn);
    expect(war.beats.at(-1)!.description).toBe(OUTCOME_LINES.withdrawal);
  });
});
