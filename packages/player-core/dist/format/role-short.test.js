import { describe, expect, it } from "vitest";
import { roleShortLabel } from "./role-short";
describe("roleShortLabel", () => {
    it("names a department the way a president does", () => {
        expect(roleShortLabel("role-defense-minister")).toBe("Defense");
        expect(roleShortLabel("role-foreign-minister")).toBe("State");
        expect(roleShortLabel("role-treasury-minister")).toBe("Treasury");
        expect(roleShortLabel("role-homeland-secretary")).toBe("Homeland Security");
    });
    it("reads the catalog rather than inventing a second vocabulary", () => {
        // The dispatch board's executor bench reads the same field, so a chair
        // named on the desk and the same chair named on the board cannot disagree.
        expect(roleShortLabel("role-health-secretary")).toBe("HHS");
        expect(roleShortLabel("role-veterans-secretary")).toBe("Veterans Affairs");
    });
    it("names the chairs at the table that run no department", () => {
        expect(roleShortLabel("role-president")).toBe("President");
    });
    it("says nothing for a role it has no short name for, rather than chopping up a title", () => {
        expect(roleShortLabel("role-not-a-real-chair")).toBeUndefined();
    });
    it("never returns a form too long for the caption it is drawn in", () => {
        const chairs = [
            "role-defense-minister",
            "role-foreign-minister",
            "role-treasury-minister",
            "role-attorney-general",
            "role-interior-minister",
            "role-agriculture-secretary",
            "role-commerce-secretary",
            "role-labor-secretary",
            "role-health-secretary",
            "role-housing-secretary",
            "role-transportation-secretary",
            "role-energy-secretary",
            "role-education-secretary",
            "role-veterans-secretary",
            "role-homeland-secretary",
            "role-president",
        ];
        for (const role of chairs) {
            const short = roleShortLabel(role);
            expect(short, `${role} has a short form`).toBeDefined();
            // Two lines of caption in a 72pt cell. The longest single word sets the
            // cell width, so no word may run past it.
            for (const word of short.split(" ")) {
                expect(word.length, `${short} fits the cell`).toBeLessThanOrEqual(14);
            }
        }
    });
});
