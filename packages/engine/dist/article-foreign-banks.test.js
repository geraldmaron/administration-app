import { describe, expect, it } from "vitest";
import { FOREIGN_ARTICLE_BANK, STATE_MEDIA_ECHO } from "./article-foreign.js";
import { LEADERSHIP_ARTICLE_BANK, leadershipArticle } from "./article-leadership.js";
// The banks the foreign desk and a change of government abroad are written
// in. Every line renders with its particulars in place, names no weekday,
// forecasts nothing past the week, and quotes nobody.
const WEEKDAY = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/;
const PAST_THE_WEEK = /\b(weeks|months|years) later\b|\bnext (month|year)\b/i;
const QUOTED = /["“”]/;
function heldToTheRules(line, where) {
    expect(line, where).not.toMatch(/undefined|\$\{/);
    expect(line, where).not.toMatch(WEEKDAY);
    expect(line, where).not.toMatch(PAST_THE_WEEK);
    expect(line, where).not.toMatch(QUOTED);
    expect(line.trim().length, where).toBeGreaterThan(0);
}
describe("the foreign desk's voice", () => {
    const particulars = { nation: "Freedonia", act: "the administration's tariff order" };
    it("gives each format three ledes, three closings and a framing line for every band", () => {
        for (const [format, bank] of Object.entries(FOREIGN_ARTICLE_BANK)) {
            expect(bank.ledes, format).toHaveLength(3);
            expect(bank.closings, format).toHaveLength(3);
            expect(Object.keys(bank.voice).sort(), format).toEqual(["cool", "hostile", "neutral", "warm"]);
            for (const line of [...bank.ledes, ...bank.closings])
                heldToTheRules(line(particulars), format);
            for (const line of Object.values(bank.voice))
                heldToTheRules(line, format);
        }
        expect(STATE_MEDIA_ECHO).toHaveLength(3);
        for (const line of STATE_MEDIA_ECHO)
            heldToTheRules(line, "echo");
    });
});
describe("a change of government abroad", () => {
    const particulars = { nation: "Freedonia", leader: "the Incoming Premier", predecessor: "the Outgoing Premier" };
    it("has three headlines, three standfirsts and two paragraphs for every kind of change", () => {
        const stories = Object.keys(LEADERSHIP_ARTICLE_BANK);
        expect(stories.sort()).toEqual(["confidence", "coup", "death", "defeat", "handover", "held", "opposition", "removed"]);
        for (const story of stories) {
            const bank = LEADERSHIP_ARTICLE_BANK[story];
            expect(bank.headlines, story).toHaveLength(3);
            expect(bank.standfirsts, story).toHaveLength(3);
            expect(bank.bodies, story).toHaveLength(2);
            for (const line of [...bank.headlines, ...bank.standfirsts, ...bank.bodies])
                heldToTheRules(line(particulars), story);
        }
    });
    it("reads the same story every time the same change is opened", () => {
        const first = leadershipArticle("coup", particulars, "FRE:2030-03-02:coup");
        expect(leadershipArticle("coup", particulars, "FRE:2030-03-02:coup")).toEqual(first);
        expect(first.paragraphs).toHaveLength(2);
    });
});
