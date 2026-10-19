import { describe, expect, it } from "vitest";
import { apply, signTreaty } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { draftTreatyId, ratifyComparison, signComparison, signPacket, treatyChoices, treatyScreenReading, withdrawComparison } from "./treaty-screen";
const ALLIES = ["GBR", "CAN", "AUS", "JPN", "KOR", "FRA", "DEU", "NLD", "POL", "ISR"];
const SEED = "treaty-screen";
function signedTrade() {
    const sworn = openingCampaign({ seedText: SEED });
    for (const ally of ALLIES) {
        const result = signTreaty(sworn, charterOf(sworn), "trade", ally);
        if (result.ok)
            return { campaign: apply(sworn, result.packet), id: result.record.id, ally };
    }
    throw new Error("no ally signs a trade instrument");
}
describe("a treaty as its screen reads it", () => {
    it("reads a signed treaty with its parties, the Senate's projection and the acts open on it", () => {
        const { campaign, id, ally } = signedTrade();
        const reading = treatyScreenReading(campaign, id);
        expect(reading.form).toBe("record");
        expect(reading.statusKey).toBe("signed");
        expect(reading.set).toBe(`nation:${campaign.founding.nation}|nation:${ally}`);
        expect(reading.senate?.likelihood).toBeDefined();
        const ratify = ratifyComparison(campaign, reading);
        expect(ratify.columns.map((column) => column.id)).toEqual(["ratify"]);
        expect(ratify.columns[0].refusal).toBeUndefined();
        expect(withdrawComparison(campaign, reading).columns[0].refusal).toBeUndefined();
    });
    it("reads a draft before it is signed, with the other government's answer, and signs it through the engine", () => {
        const { ally } = signedTrade();
        const fresh = openingCampaign({ seedText: SEED });
        const reading = treatyScreenReading(fresh, draftTreatyId("alliance", ally));
        expect(reading.form).toBe("draft");
        expect(reading.bindsOn).toBe("ratification");
        expect(reading.signing?.forecast).toBeDefined();
        expect(signComparison(fresh, reading).columns.map((column) => column.id)).toEqual(["sign"]);
        expect(treatyChoices(fresh, ally).map((choice) => choice.kind)).toEqual(expect.arrayContaining(["alliance", "trade"]));
        const trade = treatyScreenReading(fresh, draftTreatyId("trade", ally));
        expect(signComparison(fresh, trade).columns[0].refusal).toBeUndefined();
        expect(signPacket(fresh, "trade", ally).effects.some((effect) => effect.kind === "treaty")).toBe(true);
    });
    it("reads a standing compact as read-only with its members as parties", () => {
        const reading = treatyScreenReading(openingCampaign({ seedText: SEED }), "compact:ORG-NATO");
        expect(reading.form).toBe("compact");
        expect(reading.parties.length).toBeGreaterThan(10);
    });
    it("reads nothing for an unknown id", () => {
        expect(treatyScreenReading(openingCampaign({ seedText: SEED }), "treaty:none")).toBeUndefined();
    });
});
