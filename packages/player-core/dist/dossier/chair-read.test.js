import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { attributeIsRead } from "./attribute-consequence";
import { chairRead } from "./chair-read";
const campaign = openingCampaign();
const holder = Object.values(campaign.people)[0].base;
const strong = { ...holder, competence: 0.9, loyalty: 0.9, integrity: 0.9, charisma: 0.9, ambition: 0.1, traits: [] };
describe("a chair's read", () => {
    it("reads an officer strong on everything the simulation uses as sound", () => {
        const read = chairRead(strong);
        expect(read).toMatchObject({ tone: "good", word: "Sound" });
        expect(read.pips.every((pip) => attributeIsRead(pip.key, "cabinet"))).toBe(true);
        expect(read.pips.map((pip) => pip.key)).toEqual(["competence", "loyalty", "integrity", "ambition"]);
        expect(read.others.map((pip) => pip.key)).toEqual(["charisma"]);
    });
    it("leads with the reading that decides it, and gives its consequence as the reason", () => {
        const read = chairRead({ ...strong, loyalty: 0.05 });
        expect(read.tone).toBe("bad");
        expect(read.word).toBe("Disloyal");
        expect(read.reason).toBe("When loyalty is low, they may leak, resign, or turn on you.");
    });
    it("puts loyalty ahead of competence when both are equally far out", () => {
        expect(chairRead({ ...strong, loyalty: 0.05, competence: 0.05 }).word).toBe("Disloyal");
    });
    it("says why integrity decides the read, not what integrity is", () => {
        expect(chairRead({ ...strong, integrity: 0.05 })).toMatchObject({ tone: "bad", reason: expect.stringContaining("Little would stop them") });
    });
    it("never lets charisma decide the read: for a serving officer it only prices a dismissal", () => {
        expect(chairRead({ ...strong, charisma: 0.05 })).toMatchObject({ tone: "good", word: "Sound" });
    });
    it("lets ambition qualify the read without leading it, since it only bites once loyalty slips", () => {
        const loyal = chairRead({ ...strong, ambition: 0.99 });
        expect(loyal).toMatchObject({ tone: "good", word: "Sound" });
        expect(loyal.reason).toContain("rival faction");
        const slipping = chairRead({ ...strong, ambition: 0.99, loyalty: 0.05 });
        expect(slipping.word).toBe("Disloyal");
        expect(slipping.reason).toContain("rival faction");
    });
});
