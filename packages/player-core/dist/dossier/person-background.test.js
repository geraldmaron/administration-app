import { describe, expect, it } from "vitest";
import { makeCampaignSeed } from "@admin/engine";
import { usaCharter } from "@admin/world";
import { foundingOptions } from "../campaign/founding-options";
import { personBackground } from "./person-background";
describe("personBackground", () => {
    const pool = foundingOptions(makeCampaignSeed("person-background")).pool;
    const candidate = pool.find((person) => person.eligibleRoles.includes("role-treasury-minister"));
    it("reads a founding candidate's file before any campaign exists", () => {
        const background = personBackground(candidate, usaCharter.roleTitles);
        expect(background.education.school).toBeTruthy();
        expect(background.education.school).not.toMatch(/^SCH-/);
        expect(background.education.field).toBe(candidate.education.field);
    });
    it("titles the chairs a candidate could hold the way the charter does", () => {
        const background = personBackground(candidate, usaCharter.roleTitles);
        expect(background.eligible.map((row) => row.role)).toEqual(candidate.eligibleRoles);
        expect(background.eligible.find((row) => row.role === "role-treasury-minister")?.title).toBe("Secretary of the Treasury");
    });
});
