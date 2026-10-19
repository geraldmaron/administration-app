import { describe, expect, it } from "vitest";
import { selectCabinetHolder } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening.js";
import { personFile } from "./person-file.js";
describe("a person's file", () => {
    const campaign = openingCampaign({ seedText: "w6-person-file" });
    const secretary = selectCabinetHolder(campaign, "role-defense-minister").base;
    const file = personFile(campaign, secretary.id);
    it("names their chair, frames its headquarters and gives the President the dismissal lever", () => {
        expect(file.role).toMatch(/Defense/);
        expect(file.camera).toBe("office:INST-DOD");
        expect(file.seat).toMatchObject({ kind: "cabinet", role: "role-defense-minister" });
    });
    it("draws five readings as bands with a consequence each, ambition as pressure with no stance", () => {
        expect(file.readings.map((reading) => reading.key)).toEqual(["competence", "loyalty", "integrity", "charisma", "ambition"]);
        for (const reading of file.readings) {
            expect(reading.band).toBeGreaterThanOrEqual(0);
            expect(reading.band).toBeLessThanOrEqual(3);
            expect(reading.consequence.length).toBeGreaterThan(0);
            expect(reading.word).not.toMatch(/\d/);
        }
        const ambition = file.readings.find((reading) => reading.key === "ambition");
        expect(ambition.stance).toBeUndefined();
    });
    it("lays out the career before office, oldest first", () => {
        expect(file.career.length).toBe(secretary.career.length);
        expect(file.career[0]?.when).toMatch(/^Age \d+ to \d+$/);
    });
    it("refuses an id the campaign does not know", () => {
        expect(personFile(campaign, "PER-NOBODY")).toBeUndefined();
    });
});
