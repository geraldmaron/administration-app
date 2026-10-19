import { describe, expect, it } from "vitest";
import { defaultLeaderDraft, deriveLeaderAttributes } from "@admin/engine";
import { leaderBackgrounds, leaderRoutes } from "@admin/world";
import { LEADER_READINGS, attributesUnder } from "./leader-attributes";
describe("the readings a founding card prices", () => {
    it("lists the five readings once each, with ambition carrying no verdict", () => {
        expect(LEADER_READINGS.map((reading) => reading.key).sort()).toEqual(["ambition", "charisma", "competence", "integrity", "loyalty"]);
        expect(LEADER_READINGS.find((reading) => reading.key === "ambition").judged).toBe(false);
        expect(LEADER_READINGS.filter((reading) => reading.judged)).toHaveLength(4);
    });
    it("asks the engine rather than recomputing, so a card and the seal agree", () => {
        const draft = { ...defaultLeaderDraft(), age: 60 };
        for (const background of leaderBackgrounds) {
            for (const route of leaderRoutes) {
                const age = Math.min(Math.max(draft.age, background.ageRange.min), background.ageRange.max);
                expect(attributesUnder(draft, background, route)).toEqual(deriveLeaderAttributes({ age, ideology: draft.ideology }, background, route));
            }
        }
    });
    it("prices a career at an age that career can actually reach the chair at", () => {
        const youngest = [...leaderBackgrounds].sort((a, b) => b.ageRange.min - a.ageRange.min)[0];
        const route = leaderRoutes[0];
        const tooYoung = { ...defaultLeaderDraft(), age: youngest.ageRange.min - 10 };
        expect(attributesUnder(tooYoung, youngest, route)).toEqual(deriveLeaderAttributes({ age: youngest.ageRange.min, ideology: tooYoung.ideology }, youngest, route));
    });
});
