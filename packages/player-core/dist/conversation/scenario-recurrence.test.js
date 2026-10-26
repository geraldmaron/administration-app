import { describe, expect, it } from "vitest";
import { addDays, apply } from "@admin/engine";
import { CORE_SCENARIOS, CLASS_COOLDOWN, RECURRING_REST_DAYS, castBound, inactionPacket, rankCandidates, recurrenceKind, scenarioCaseId, scenarioOccurrenceKey, scenarioUnansweredFlag } from "@admin/content";
import { openingCampaign } from "../__fixtures__/opening";
import { chargedThisWeek } from "./lapse-source";
import { withScenarioCases } from "./scenario-cases";
const REST_WEEKS = RECURRING_REST_DAYS / 7;
const template = {
    ...CORE_SCENARIOS[0], id: "recurrence-probe", once: false, family: undefined,
    cast: { pick: "none" }, conditions: [], weight: 1,
};
function close(campaign, id) {
    return apply(campaign, { source: "action", actor: "player", turn: campaign.turn,
        narration: { summary: "Answered." }, effects: [{ kind: "case", actor: "player", transition: { id, disposition: { kind: "act", actionId: "hold" }, narration: "Answered." } }],
    });
}
function weeksLater(campaign, weeks) {
    return { ...campaign, turn: campaign.turn + weeks, calendar: addDays(campaign.calendar, weeks * 7) };
}
// The recurrence contract (scenario-director.ts): a unique incident happens
// once; recurring business rests a quarter after it was last raised; an
// episode-bound matter returns only for a new episode.
describe("authored scenario recurrence", () => {
    it("keeps a template's first case and seats a later occurrence under a distinct stable id", () => {
        const opening = openingCampaign();
        expect(recurrenceKind(template)).toBe("recurring");
        const firstCast = castBound(opening, template, opening.founding.nation);
        const first = withScenarioCases(opening, [firstCast]);
        const firstId = scenarioCaseId(firstCast);
        expect(firstId).toBe("scenario:recurrence-probe");
        const settled = close(first, firstId);
        expect(rankCandidates(weeksLater(settled, 1), [template])).toEqual([]);
        // Fifty-six days was the old contract's whole wait. Recurring business now
        // rests a quarter, so the same routine question is not back inside ninety days.
        expect(rankCandidates(weeksLater(settled, 8), [template])).toEqual([]);
        expect(rankCandidates(weeksLater(settled, REST_WEEKS - 1), [template])).toEqual([]);
        const later = weeksLater(settled, REST_WEEKS);
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
describe("an episode-bound scenario", () => {
    const episodic = { ...template, id: "episode-probe", conditions: [{ kind: "conditionActive", condition: "unrest" }] };
    function withUnrest(campaign, id, startedTurn) {
        const condition = { id, nation: campaign.founding.nation, kind: "unrest", scope: "nation", severity: 0.6,
            startedTurn, status: "active", beats: [{ turn: startedTurn, description: "Unrest." }] };
        return { ...campaign, conditions: { ...campaign.conditions, [id]: condition } };
    }
    it("does not ask the same question twice inside one episode, and asks again when a new one opens", () => {
        const opening = withUnrest(openingCampaign(), "condition:unrest:USA:0", 0);
        expect(recurrenceKind(episodic)).toBe("episode");
        const cast = castBound(opening, episodic, opening.founding.nation);
        const settled = close(withScenarioCases(opening, [cast]), scenarioCaseId(cast));
        const sameEpisode = weeksLater(settled, REST_WEEKS * 2);
        expect(rankCandidates(sameEpisode, [episodic])).toEqual([]);
        const ended = { ...sameEpisode, conditions: { ...sameEpisode.conditions, "condition:unrest:USA:0": { ...sameEpisode.conditions["condition:unrest:USA:0"], status: "resolved" } } };
        const fresh = withUnrest(ended, `condition:unrest:USA:${ended.turn}`, ended.turn);
        expect(rankCandidates(fresh, [episodic])).toHaveLength(1);
    });
    it("still waits the class cooldown even for a new episode", () => {
        const opening = withUnrest(openingCampaign(), "condition:unrest:USA:0", 0);
        const cast = castBound(opening, episodic, opening.founding.nation);
        const settled = close(withScenarioCases(opening, [cast]), scenarioCaseId(cast));
        const soon = weeksLater(settled, CLASS_COOLDOWN - 1);
        const ended = { ...soon, conditions: { ...soon.conditions, "condition:unrest:USA:0": { ...soon.conditions["condition:unrest:USA:0"], status: "resolved" } } };
        expect(rankCandidates(withUnrest(ended, "condition:unrest:USA:new", soon.turn), [episodic])).toEqual([]);
    });
});
