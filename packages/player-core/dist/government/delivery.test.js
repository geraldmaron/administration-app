import { describe, expect, it } from "vitest";
import { apply, dismissMinister, selectExecutiveCapacity } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening.js";
import { branchDelivery } from "./delivery.js";
const TREASURY = "role-treasury-minister";
function emptied(campaign, role) {
    const dismissal = dismissMinister(campaign, role);
    if (!dismissal.ok)
        throw new Error(dismissal.reason);
    return apply(campaign, dismissal.packet);
}
function aged(campaign, institution, vacantDays) {
    const runtime = campaign.institutions[institution];
    return { ...campaign, institutions: { ...campaign.institutions, [institution]: { ...runtime, vacancy: true, actingLeader: undefined, vacantDays } } };
}
describe("the branch's delivery", () => {
    const campaign = openingCampaign({ seedText: "delivery-reading" });
    it("heads with the engine's own branch figure and lists every top-level directed body, weakest first", () => {
        const reading = branchDelivery(campaign);
        expect(reading.quality).toBe(selectExecutiveCapacity(campaign));
        expect(reading.rows.map((row) => row.institution)).toContain("INST-STATE");
        expect(reading.rows.map((row) => row.institution)).not.toContain("INST-FED");
        for (let i = 1; i < reading.rows.length; i++)
            expect(reading.rows[i].quality).toBeGreaterThanOrEqual(reading.rows[i - 1].quality);
    });
    it("builds each row from parts that add up to what the body could deliver, less what it is losing", () => {
        for (const row of branchDelivery(campaign).rows) {
            const built = row.built.reduce((sum, part) => sum + part.value, 0);
            const lost = row.lost.reduce((sum, part) => sum + part.value, 0);
            expect(row.quality, row.name).toBeCloseTo(Math.min(1, Math.max(0, built - lost)), 6);
        }
    });
    it("names a long-open chair as the cause, on the row and in the branch sentence", () => {
        const reading = branchDelivery(aged(emptied(campaign, TREASURY), "INST-TREASURY", 300));
        const treasury = reading.rows.find((row) => row.institution === "INST-TREASURY");
        expect(reading.rows[0].institution).toBe("INST-TREASURY");
        expect(treasury.lost[0].key).toBe("vacancy");
        expect(treasury.reason).toMatch(/No leader for 300 days/);
        expect(reading.sentence).toMatch(/to empty top jobs/);
    });
    it("never says nothing is wrong while an office is losing ground", () => {
        const reading = branchDelivery(emptied(campaign, TREASURY));
        expect(reading.rows.some((row) => row.lost.length > 0)).toBe(true);
        expect(reading.sentence).not.toMatch(/^Nothing is slowing/);
    });
});
