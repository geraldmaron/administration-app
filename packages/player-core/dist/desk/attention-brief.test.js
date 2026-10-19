/**
 * June 2029 puts Belgium's selection on the Desk, and the row does not pause.
 */
import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { briefAttentionItems } from "./attention-brief";
describe("brief rows", () => {
    it("reports opposition as ambient cooperation context, without inventing a filed lawsuit", () => {
        const campaign = openingCampaign();
        const alaska = campaign.states.AK;
        if (!alaska?.governor)
            throw new Error("The opening fixture must seat Alaska's governor");
        const states = { ...campaign.states };
        for (const state of Object.values(campaign.states)) {
            states[state.base.id] = {
                ...state,
                ...(state.governor ? { governor: { ...state.governor, party: state.base.id === "AK" ? "republican" : "democrat" } } : {}),
            };
        }
        const opposed = { ...campaign, states, congress: { ...campaign.congress, administrationParty: "democrat" } };
        const row = briefAttentionItems(opposed).find((item) => item.id === "state-opposition:AK");
        expect(row).toMatchObject({
            source: "standing-threshold",
            urgency: "ambient",
            title: "An opposition governor is in office",
            href: "/nation/state/AK#state-governor",
        });
        expect(row?.reason).toContain("Review their willingness to cooperate");
        expect(briefAttentionItems(opposed).some((item) => /sued|filed suit/.test(`${item.title} ${item.reason}`))).toBe(false);
        const aligned = { ...opposed, states: { ...states, AK: { ...alaska, governor: { ...alaska.governor, party: "democrat" } } } };
        expect(briefAttentionItems(aligned).some((item) => item.id.startsWith("state-opposition:"))).toBe(false);
    });
    it("names Belgium in June 2029 and stays ambient", () => {
        const campaign = openingCampaign();
        const june = { ...campaign, calendar: { ...campaign.calendar, year: 2029, month: 6, day: 13 } };
        const row = briefAttentionItems(june).find((item) => item.id.startsWith("selection-due:BEL"));
        expect(row?.urgency).toBe("ambient");
        expect(row?.title).toBe("Another country is choosing its leader");
        expect(row?.href).toBe("/world/nation/BEL#country-leader");
    });
});
