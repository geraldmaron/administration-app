import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { orgScreenReading } from "./org-screen";
describe("an international body as its screen reads it", () => {
    const campaign = openingCampaign({ seedText: "org-screen" });
    it("reads nothing for an id the dataset does not know", () => {
        expect(orgScreenReading(campaign, "ORG-NONE")).toBeUndefined();
    });
    it("seats the United States first, ranks the rest by how they stand, and names the set", () => {
        const reading = orgScreenReading(campaign, "ORG-NATO");
        expect(reading.usMember).toBe(true);
        expect(reading.members[0].us).toBe(true);
        const levels = reading.members.slice(1).map((member) => member.fraction);
        expect([...levels].sort((a, b) => b - a)).toEqual(levels);
        expect(reading.set.split("|")).toHaveLength(reading.members.length);
        expect(reading.kind).toMatch(/defense/);
        const { counts } = reading.alignment;
        expect(counts.favorable + counts.neutral + counts.caution + counts.adverse + counts.unread).toBe(reading.members.length - 1);
    });
    it("says plainly when the United States sits outside a body", () => {
        const reading = orgScreenReading(campaign, "ORG-BRICS");
        expect(reading.usMember).toBe(false);
        expect(reading.usRole).toMatch(/isn't a member/);
        expect(reading.members.every((member) => !member.us)).toBe(true);
    });
});
