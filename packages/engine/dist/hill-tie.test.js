import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { chamberMajority } from "./hill.js";
const { campaign } = foundedForBalance("house-tie", "democrat");
function tiedHouse(speaker) {
    const congress = campaign.congress;
    // 217 against 217 with one independent counted with the Democrats: a dead heat.
    const house = { seats: 435, administration: 216, opposition: 217, independent: 1 };
    const leadership = congress.leadership
        .filter((figure) => figure.post !== "post-house-speaker" || speaker !== undefined)
        .map((figure) => (figure.post === "post-house-speaker" && speaker ? { ...figure, caucus: speaker } : figure));
    return { ...congress, caucusAnchor: "democrat", chambers: { ...congress.chambers, house }, leadership };
}
describe("a tied chamber", () => {
    it("leaves a tied House with the caucus holding the Speakership, since no Vice President breaks it", () => {
        expect(chamberMajority(tiedHouse("opposition"), "house")).toBe("opposition");
        expect(chamberMajority(tiedHouse("administration"), "house")).toBe("administration");
    });
    it("gives a tied House with no Speaker yet to the side whose own party has more members", () => {
        expect(chamberMajority(tiedHouse(undefined), "house")).toBe("opposition");
    });
    it("gives a tied Senate to the administration, whose Vice President breaks it", () => {
        const congress = tiedHouse("opposition");
        const senate = { seats: 100, administration: 48, opposition: 50, independent: 2 };
        expect(chamberMajority({ ...congress, chambers: { ...congress.chambers, senate } }, "senate")).toBe("administration");
    });
    it("does not consult the Speakership when the House has a majority", () => {
        const congress = tiedHouse("opposition");
        const house = { seats: 435, administration: 220, opposition: 215, independent: 0 };
        expect(chamberMajority({ ...congress, chambers: { ...congress.chambers, house } }, "house")).toBe("administration");
    });
});
