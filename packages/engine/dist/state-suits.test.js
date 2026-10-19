// Political opposition is a signal of cooperation risk, not a lawsuit.
import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { stateOppositionThisWeek, pickStateOpposition } from "./state-suits.js";
const AK = "AK";
const AL = "AL";
const CA = "CA";
const WY = "WY";
function seat(id, name, party) {
    return { id, name, party };
}
function withGovernors(campaign, seats) {
    const states = { ...campaign.states };
    for (const entry of seats) {
        const runtime = states[entry.id];
        if (!runtime)
            throw new Error(`missing ${entry.id}`);
        states[entry.id] = {
            ...runtime,
            governor: { person: "PER-1", party: entry.party, disposition: 0.5 },
        };
    }
    return { ...campaign, states };
}
function withPresident(campaign, party, caucusAnchor) {
    return {
        ...campaign,
        congress: { ...campaign.congress, administrationParty: party, caucusAnchor },
    };
}
function withoutCaucusAnchor(campaign) {
    const { caucusAnchor: _anchor, ...congress } = campaign.congress;
    return { ...campaign, congress: congress };
}
describe("opposition governor signal", () => {
    const founded = buildCampaign();
    it("returns null when no governor is seated", () => {
        expect(stateOppositionThisWeek(founded)).toBeNull();
    });
    it("picks the first sorted state whose governor is the other major party", () => {
        expect(founded.congress.administrationParty).toBe("democrat");
        const suited = withGovernors(founded, [
            { id: WY, party: "republican" },
            { id: CA, party: "republican" },
            { id: AL, party: "democrat" },
            { id: AK, party: "republican" },
        ]);
        const alaska = suited.states.AK;
        const suit = stateOppositionThisWeek(suited);
        expect(suit).toEqual({
            stateId: AK,
            title: "An opposition governor is in office",
            reason: `${alaska.base.name} has a governor from the other major party. Review their willingness to cooperate with federal action.`,
        });
        expect(JSON.stringify(suit)).not.toMatch(/Jordan|Vale|PER-1/);
        expect(stateOppositionThisWeek(suited)).toEqual(suit);
        expect(suited.states.AK).toBe(alaska);
    });
    it("returns null when every seated governor shares the President's party", () => {
        const aligned = withGovernors(founded, [
            { id: AK, party: "democrat" },
            { id: CA, party: "democrat" },
        ]);
        expect(stateOppositionThisWeek(aligned)).toBeNull();
    });
    it("skips an independent governor and still returns one opposition signal", () => {
        const mixed = withGovernors(founded, [
            { id: AK, party: "independent" },
            { id: WY, party: "republican" },
        ]);
        expect(stateOppositionThisWeek(mixed)?.stateId).toBe(WY);
    });
    it("compares an independent president with the caucus anchor", () => {
        const seated = withGovernors(founded, [
            { id: AK, party: "republican" },
            { id: CA, party: "democrat" },
        ]);
        const republicanAnchor = withPresident(seated, "independent", "republican");
        expect(stateOppositionThisWeek(republicanAnchor)).toEqual({
            stateId: CA,
            title: "An opposition governor is in office",
            reason: `${seated.states.CA.base.name} has a governor from the other major party. Review their willingness to cooperate with federal action.`,
        });
        expect(stateOppositionThisWeek(withoutCaucusAnchor(republicanAnchor))).toBeNull();
    });
    it("orders seats by state id and stays quiet without an anchor", () => {
        const seats = [
            seat(WY, "Wyoming", "republican"),
            seat(CA, "California", "republican"),
            seat(AK, "Alaska", "independent"),
        ];
        const suit = pickStateOpposition(seats, "democrat");
        expect(suit).toEqual({
            stateId: CA,
            title: "An opposition governor is in office",
            reason: "California has a governor from the other major party. Review their willingness to cooperate with federal action.",
        });
        expect(pickStateOpposition(seats, "democrat")).toEqual(suit);
        expect(pickStateOpposition(seats, "republican")).toBeNull();
        expect(pickStateOpposition(seats, "independent")).toBeNull();
        expect(pickStateOpposition(seats, "independent", "democrat")?.stateId).toBe(CA);
    });
});
