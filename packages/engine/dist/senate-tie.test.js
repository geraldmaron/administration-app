import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { breakSenateTie } from "./senate-tie.js";
const tied = (required) => ({
    chamber: "senate",
    yeas: 50,
    nays: 50,
    required,
    passed: false,
});
describe("breakSenateTie", () => {
    it("carries a 50-50 simple majority when a Vice President is seated", () => {
        const campaign = buildCampaign();
        const person = Object.values(campaign.player.cabinet)[0];
        const congress = {
            ...campaign.congress,
            presidingOfficer: { person, liaison: 0 },
        };
        const vote = breakSenateTie(congress, tied(51));
        expect(vote.passed).toBe(true);
        expect(vote.yeas).toBe(51);
        expect(vote.nays).toBe(50);
        expect(vote.castingVote).toEqual({ person, yea: true });
        expect(vote.tieBrokenBy).toBe(person);
    });
    it("records an additional nay when the chair opposes a restraint", () => {
        const campaign = buildCampaign();
        const person = Object.values(campaign.player.cabinet)[0];
        const vote = breakSenateTie({ ...campaign.congress, presidingOfficer: { person, liaison: 0 } }, tied(51), "against");
        expect(vote.yeas).toBe(50);
        expect(vote.nays).toBe(51);
        expect(vote.castingVote).toEqual({ person, yea: false });
        expect(vote.passed).toBe(false);
    });
    it("leaves a 50-50 simple majority failing when the chair is empty", () => {
        const vote = breakSenateTie(buildCampaign().congress, tied(51));
        expect(vote.passed).toBe(false);
        expect(vote.tieBrokenBy).toBeUndefined();
    });
    it("does not break a tie that needs sixty", () => {
        const campaign = buildCampaign();
        const person = Object.values(campaign.player.cabinet)[0];
        const congress = {
            ...campaign.congress,
            presidingOfficer: { person, liaison: 0 },
        };
        const vote = breakSenateTie(congress, tied(60));
        expect(vote.passed).toBe(false);
        expect(vote.yeas).toBe(50);
        expect(vote.tieBrokenBy).toBeUndefined();
    });
});
