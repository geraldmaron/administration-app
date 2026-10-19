import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { chamberControl, judgeAttribute } from "./machine-readings";
describe("a person read as a band and a confidence", () => {
    it("prints the band's word and never the figure", () => {
        const reading = judgeAttribute("loyalty", 0.7);
        expect(reading).toMatchObject({ label: "Loyalty", word: "Loyal", stance: "favorable", band: 3 });
        expect(JSON.stringify(reading)).not.toMatch(/0\.7|70/);
    });
    it("places the four bands on the same cuts every stance reads", () => {
        expect([0.1, 0.25, 0.45, 0.65].map((value) => judgeAttribute("competence", value).band)).toEqual([0, 1, 2, 3]);
        expect(judgeAttribute("competence", 0.5).word).toBe("Fair");
    });
    it("starts loyalty low and competence moderate, before any contested call", () => {
        expect(judgeAttribute("loyalty", 0.5).confidence).toBe("low");
        expect(judgeAttribute("competence", 0.5).confidence).toBe("moderate");
        expect(judgeAttribute("integrity", 0.5).confidence).toBe("low");
        expect(judgeAttribute("loyalty", 0.5).basis).toBe("from their record alone");
    });
    it("firms the read with each contested call the person advised on", () => {
        expect(judgeAttribute("loyalty", 0.5, 2).confidence).toBe("moderate");
        expect(judgeAttribute("loyalty", 0.5, 4).confidence).toBe("high");
        expect(judgeAttribute("competence", 0.5, 4).confidence).toBe("high");
        expect(judgeAttribute("loyalty", 0.5, 1).basis).toBe("from 1 contested call");
        expect(judgeAttribute("loyalty", 0.5, 3).basis).toBe("from 3 contested calls");
    });
});
function withHouse(campaign, house, anchor) {
    return {
        ...campaign,
        congress: { ...campaign.congress, caucusAnchor: anchor, chambers: { ...campaign.congress.chambers, house } },
    };
}
describe("who holds a chamber", () => {
    const campaign = openingCampaign();
    it("counts the independents with the Democrats", () => {
        const split = { seats: 100, administration: 49, opposition: 49, independent: 2 };
        expect(chamberControl(withHouse(campaign, split, "democrat"), "house")).toMatchObject({ party: "democrat", caucus: "administration" });
        expect(chamberControl(withHouse(campaign, split, "republican"), "house")).toMatchObject({ party: "democrat", caucus: "opposition", anchor: "republican" });
    });
    it("gives a tie to the administration", () => {
        const tie = { seats: 100, administration: 50, opposition: 50, independent: 0 };
        expect(chamberControl(withHouse(campaign, tie, "republican"), "house")).toMatchObject({ party: "republican", caucus: "administration" });
    });
    it("names the Speaker for the House and the Majority Leader for the Senate", () => {
        expect(chamberControl(campaign, "house").leader?.post.title).toBe("Speaker of the House");
        expect(chamberControl(campaign, "senate").leader?.post.title).toBe("Senate Majority Leader");
    });
});
