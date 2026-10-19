import { describe, expect, it } from "vitest";
import { addDays, apply, type Campaign } from "@admin/engine";
import { CORE_SCENARIOS, castBound, inactionPacket, rankCandidates, scenarioCaseId, scenarioOccurrenceKey, scenarioUnansweredFlag, type ScenarioDef } from "@admin/content";
import { openingCampaign } from "../__fixtures__/opening";
import { chargedThisWeek } from "./lapse-source";
import { withScenarioCases } from "./scenario-cases";

const template: ScenarioDef = {
  ...CORE_SCENARIOS[0]!, id: "recurrence-probe", once: false, family: undefined,
  cast: { pick: "none" }, conditions: [], weight: 1,
};

function close(campaign: Campaign, id: string): Campaign {
  return apply(campaign, { source: "action", actor: "player", turn: campaign.turn,
    narration: { summary: "Answered." }, effects: [{ kind: "case", actor: "player", transition: { id, disposition: { kind: "act", actionId: "hold" }, narration: "Answered." } }],
  });
}

describe("authored scenario recurrence", () => {
  it("keeps a template's first case and seats a later occurrence under a distinct stable id", () => {
    const opening = openingCampaign();
    const firstCast = castBound(opening, template, opening.founding.nation);
    const first = withScenarioCases(opening, [firstCast]);
    const firstId = scenarioCaseId(firstCast);
    expect(firstId).toBe("scenario:recurrence-probe");
    const settled = close(first, firstId);
    const soon = { ...settled, turn: settled.turn + 1, calendar: addDays(settled.calendar, 7) };
    expect(rankCandidates(soon, [template])).toEqual([]);

    const later = { ...settled, turn: settled.turn + 8, calendar: addDays(settled.calendar, 56) };
    expect(rankCandidates(later, [template])).toHaveLength(1);
    const secondCast = castBound(later, template, later.founding.nation);
    expect(scenarioOccurrenceKey(secondCast)).toBe(`recurrence-probe@${later.turn}`);
    expect(castBound(later, template, later.founding.nation).occurrence).toBe(secondCast.occurrence);
    const second = withScenarioCases(later, [secondCast]);
    const secondId = scenarioCaseId(secondCast);
    expect(secondId).not.toBe(firstId);
    expect(second.cases?.[firstId]?.status).toBe("acted");
    expect(second.cases?.[secondId]?.status).toBe("raised");
    expect(JSON.parse(second.cases?.[secondId]?.authoredSnapshot ?? "null")).toMatchObject({ occurrence: secondCast.occurrence });

    const charged = apply(second, inactionPacket(second, secondCast));
    expect(chargedThisWeek(charged, scenarioOccurrenceKey(secondCast))).toBe(true);
    expect(charged.player.flags[scenarioUnansweredFlag(template.id)]).toBe(true);
    expect(charged.player.flags[scenarioUnansweredFlag(scenarioOccurrenceKey(secondCast))]).toBe(true);
    expect(charged.cases?.[firstId]?.status).toBe("acted");
  });
});
