import { describe, expect, it } from "vitest";
import { Charter, Person } from "@admin/world";
import { buildCampaign, person, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { takePressAction } from "./__fixtures__/issued-acts.js";
import { apply } from "./effects.js";
import { PRESS_SECRETARY_ROLE, corpsFrom, outletSpreadAt, podiumSkill, pressPhase, projectPressAction, secretarySpentFlag } from "./press.js";
import { secretaryTakesTheHit } from "./press-secretary.js";
import { createRngStreams } from "./rng.js";
import type { Campaign } from "./state.js";

const charter = Charter.parse({
  id: "charter-1",
  name: "The Constitution",
  removalMechanism: "impeachment",
  cabinetRoles: ["role-chancellor"],
  institutions: [{ name: "Congress", role: "Brings impeachment.", kind: "assembly" }],
  decisionConstraint: "Treaties require the Senate.",
  successionRule: "The Vice President serves out the term.",
  roleTitles: { "role-chancellor": "President" },
});

function withSecretary(campaign: Campaign, charisma: number, competence: number): Campaign {
  const secretary = Person.parse({ ...person, id: "PER-SEC", name: "Dana Whitcomb", charisma, competence, eligibleRoles: [PRESS_SECRETARY_ROLE] });
  return {
    ...campaign,
    founding: { ...campaign.founding, staff: { ...campaign.founding.staff, [PRESS_SECRETARY_ROLE]: secretary.id } },
    people: { ...campaign.people, [secretary.id]: { base: secretary, alive: true } },
  };
}

/** A week where the leak went badly and the room is hostile enough that it reliably does. */
function afterABadLeak(campaign: Campaign): Campaign {
  const hostile = { ...campaign, press: corpsFrom(campaign.press, outletSpreadAt(0.1)) };
  const result = takePressAction(hostile, charter, "leak", createRngStreams(hostile.seed), "outlet-rampart");
  if (!result.ok) throw new Error(result.reason);
  if (result.wentWell) throw new Error("the fixture expected the leak to go badly");
  return apply(hostile, result.packet);
}

describe("the press secretary at the podium", () => {
  it("delivers the press shop's plays and not the President's own interview", () => {
    const base = withWeeksElapsed(buildCampaign(), 2);
    const strong = withSecretary(base, 0.95, 0.95);
    const weak = withSecretary(base, 0.05, 0.05);
    expect(podiumSkill(strong, "interview")).toBe(podiumSkill(weak, "interview"));
    expect(podiumSkill(strong, "press-conference")).toBeGreaterThan(podiumSkill(weak, "press-conference"));
    expect(podiumSkill(strong, "leak")).toBeGreaterThan(podiumSkill(weak, "leak"));
    expect(projectPressAction(strong, "press-conference").successChance).toBeGreaterThan(
      projectPressAction(weak, "press-conference").successChance,
    );
  });

  it("moves nothing while nobody is speaking: no weekly drift from who holds the post", () => {
    const base = withWeeksElapsed(buildCampaign(), 3);
    const weekOf = (campaign: Campaign) => pressPhase(campaign).map((packet) => packet.effects);
    expect(weekOf(withSecretary(base, 0.95, 0.95))).toEqual(weekOf(withSecretary(base, 0.05, 0.05)));
  });
});

describe("taking a bad cycle for the President", () => {
  it("wins back part of a bad engagement, costs the secretary's credibility, and works once", () => {
    const campaign = afterABadLeak(withSecretary(withWeeksElapsed(buildCampaign(), 2), 0.6, 0.6));
    const hit = secretaryTakesTheHit(campaign);
    if (!hit.ok) throw new Error(hit.reason);
    expect(hit.standingAfter).toBeGreaterThan(campaign.press.standing);
    const after = apply(campaign, hit.packet);
    expect(after.player.flags[secretarySpentFlag("PER-SEC")]).toBe(true);
    expect(after.player.opinion.integrity).toBeGreaterThan(campaign.player.opinion.integrity);
    expect(podiumSkill(after, "leak")).toBeLessThan(podiumSkill(campaign, "leak"));
    const again = secretaryTakesTheHit(after);
    expect(again.ok).toBe(false);
  });

  it("is refused with a reason when there is no secretary or no bad cycle to take", () => {
    const quiet = withSecretary(withWeeksElapsed(buildCampaign(), 2), 0.6, 0.6);
    const none = secretaryTakesTheHit(quiet);
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.reason).toMatch(/no bad cycle/);
    const vacant = secretaryTakesTheHit(afterABadLeak(withWeeksElapsed(buildCampaign(), 2)));
    expect(vacant.ok).toBe(false);
  });

  it("files the apology as the administration's own story", () => {
    const campaign = afterABadLeak(withSecretary(withWeeksElapsed(buildCampaign(), 2), 0.6, 0.6));
    const hit = secretaryTakesTheHit(campaign);
    if (!hit.ok) throw new Error(hit.reason);
    const items = hit.packet.effects.flatMap((effect) => (effect.kind === "feed" ? effect.items : []));
    expect(items).toHaveLength(1);
    expect(items[0]!.kind).toBe("player-action");
    expect(items[0]!.actor).toBe(campaign.founding.nation);
    expect(items[0]!.desk).toBeDefined();
  });
});
