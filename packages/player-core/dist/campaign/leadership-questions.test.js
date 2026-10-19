import { describe, expect, it } from "vitest";
import { scoreLeadershipAnswers } from "@admin/engine";
import { LEADERSHIP_QUESTIONS, SCALE_STOPS, SPLIT_SHARES, rankScore, scaleScore, scaleStop, splitScore, splitShares } from "./leadership-questions.js";
describe("version 1 leadership questionnaire", () => {
    it("keeps saved answer positions attached to the same twenty questions", () => {
        expect(LEADERSHIP_QUESTIONS.map((question) => question.id)).toEqual([
            "recession", "healthcare", "labor", "competition", "surveillance", "protest", "emergency", "oversight",
            "trade", "climate", "refugees", "institutions", "provocation", "hostages", "ally", "ceasefire",
            "coalition", "cabinet", "evidence", "negotiation",
        ]);
        expect(LEADERSHIP_QUESTIONS.every((question) => new Set(question.options).size === 3)).toBe(true);
    });
    it("maps each policy group independently to the engine's polarity", () => {
        for (const [group, axis] of ["economicLeftRight", "authLibertarian", "nationalistGlobalist"].entries()) {
            const values = LEADERSHIP_QUESTIONS.map((_, index) => Math.floor(index / 4) === group ? -1 : 0);
            const profile = scoreLeadershipAnswers({ version: 1, values });
            expect(profile.ideology).toEqual({ economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0, [axis]: -1 });
        }
        expect(scoreLeadershipAnswers({ version: 1, values: LEADERSHIP_QUESTIONS.map((_, index) => index >= 16 ? 1 : 0) }).style).toBe("pragmatic");
    });
});
describe("answer formats beyond three cards", () => {
    it("mixes formats within every scored group, so no group is answered one way only", () => {
        for (let group = 0; group < 5; group += 1) {
            const formats = new Set(LEADERSHIP_QUESTIONS.slice(group * 4, group * 4 + 4).map((question) => question.format));
            expect(formats.size).toBeGreaterThanOrEqual(3);
        }
    });
    it("runs a scale end to end and back", () => {
        expect(scaleScore(0)).toBe(-1);
        expect(scaleScore((SCALE_STOPS - 1) / 2)).toBe(0);
        expect(scaleScore(SCALE_STOPS - 1)).toBe(1);
        for (let stop = 0; stop < SCALE_STOPS; stop += 1)
            expect(scaleStop(scaleScore(stop))).toBe(stop);
    });
    it("scores a split by the shares the first side keeps, and reads them back", () => {
        expect(splitScore(SPLIT_SHARES)).toBe(-1);
        expect(splitScore(SPLIT_SHARES / 2)).toBe(0);
        expect(splitScore(0)).toBe(1);
        for (let shares = 0; shares <= SPLIT_SHARES; shares += 1)
            expect(splitShares(splitScore(shares))).toBe(shares);
    });
    it("scores a ranking by what comes first against what comes last", () => {
        expect(rankScore([2, 1, 0])).toBe(1);
        expect(rankScore([0, 1, 2])).toBe(-1);
        expect(rankScore([1, 2, 0])).toBe(0.5);
        expect(rankScore([1, 0, 2])).toBe(-0.5);
        expect(() => rankScore([0, 0, 1])).toThrow(/order/);
    });
    it("gives the engine graded answers it accepts", () => {
        const values = LEADERSHIP_QUESTIONS.map((question) => (question.format === "rank" ? rankScore([1, 2, 0]) : question.format === "split" ? splitScore(3) : question.format === "scale" ? scaleScore(4) : 0));
        expect(scoreLeadershipAnswers({ version: 2, values }).ideology.economicLeftRight).toBeGreaterThan(0);
    });
});
