import { describe, expect, it } from "vitest";
import { apply, enableGodMode, hasIntelOnNation, QUESTION_TERMS } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { reasonLines } from "./reason-lines";
const campaign = openingCampaign({ seedText: "foreign-truth-gate" });
const foreign = Object.keys(campaign.nations).filter((id) => id !== campaign.founding.nation);
const readFull = foreign.find((id) => hasIntelOnNation(campaign, id) && campaign.nations[id].base.fidelity === "full");
const readThin = foreign.find((id) => hasIntelOnNation(campaign, id) && campaign.nations[id].base.fidelity !== "full");
const unread = foreign.find((id) => !hasIntelOnNation(campaign, id));
const TERMS = [
    { key: "agenda-fit", source: "interest", value: 0.6 },
    { key: "restraint", source: "trait", value: -0.9 },
    { key: "opportunity", source: "situation", value: 0.3 },
    { key: "salience", source: "interest", value: 0.1 },
    { key: "focus", source: "interest", value: 0 },
];
function stamp(actor, overrides = {}) {
    return { question: "npc-act", actor, subject: "USA", terms: TERMS, score: 2, threshold: 1.8, acts: true, close: false, visibility: "intelligence", ...overrides };
}
describe("the reasons a stamped decision reads as", () => {
    it("names the three heaviest terms, heaviest first, and never a figure", () => {
        const lines = reasonLines(stamp(readFull), campaign);
        expect(lines.map((line) => line.key)).toEqual(["restraint", "agenda-fit", "opportunity"]);
        for (const line of lines)
            expect(line.text).not.toMatch(/\d/);
    });
    it("says 'because of' for what pulled the way it went and 'despite' for what pulled against it", () => {
        const acted = reasonLines(stamp(readFull), campaign);
        expect(acted[0].text).toBe("Despite its own restraint.");
        expect(acted[1].text).toBe("Because of what it wants abroad.");
        const held = reasonLines(stamp(readFull, { acts: false }), campaign);
        expect(held[0].text).toBe("Because of its own restraint.");
        expect(held[1].text).toBe("Despite what it wants abroad.");
    });
    it("gives no reason for a government the services cannot read", () => {
        expect(reasonLines(stamp(unread), campaign)).toEqual([]);
        const omniscient = apply(campaign, enableGodMode(campaign));
        expect(reasonLines(stamp(unread), omniscient).length).toBeGreaterThan(0);
    });
    it("leaves temperament out of a reason for a government the dataset has not researched in full", () => {
        const keys = reasonLines(stamp(readThin), campaign).map((line) => line.key);
        expect(keys).not.toContain("restraint");
        expect(keys[0]).toBe("agenda-fit");
    });
    it("renders a public stamp at home without asking the services", () => {
        const governor = stamp("governor:TX", { question: "governor-consent", visibility: "public", terms: [{ key: "disaster-size", source: "situation", value: 0.4 }] });
        expect(reasonLines(governor, campaign)).toEqual([{ key: "disaster-size", text: "Because of the size of the disaster." }]);
    });
    it("has a phrase for every term any question can weigh", () => {
        for (const [question, keys] of Object.entries(QUESTION_TERMS)) {
            for (const key of keys) {
                const lines = reasonLines(stamp("governor:TX", { question: question, visibility: "public", terms: [{ key, source: "situation", value: 1 }] }), campaign);
                expect(lines[0]?.text, `${question} ${key}`).toMatch(/^Because of [a-z].+\.$/);
            }
        }
    });
});
