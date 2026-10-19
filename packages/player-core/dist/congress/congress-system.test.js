import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { congressSystem } from "./congress-system";
const opening = openingCampaign();
function rolled(campaign, turn, yeaSeats) {
    const members = (campaign.congress.members ?? []).filter((member) => member.chamber === "senate");
    const rollCall = members.slice(0, 60).map((member, i) => ({ person: member.person, seat: member.seat, state: member.state, party: member.party, yea: i < yeaSeats, support: 0, reasons: [] }));
    const vote = { chamber: "senate", yeas: yeaSeats, nays: 60 - yeaSeats, required: 51, passed: yeaSeats >= 51, rollCall, recordedTurn: turn };
    const bill = { id: `bill:test:${turn}`, act: "test", title: `Test Act ${turn}`, sponsor: "bipartisan", introducedTurn: turn - 2, status: "dead", passage: [vote] };
    return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
}
describe("congressSystem", () => {
    it("seats every recorded member once, left to right by party then recorded position", () => {
        const system = congressSystem(opening);
        for (const chamber of system.chambers) {
            const recorded = (opening.congress.members ?? []).filter((member) => member.chamber === chamber.chamber);
            expect(chamber.members).toHaveLength(recorded.length);
            expect(new Set(chamber.members.map((member) => member.seat)).size).toBe(recorded.length);
            expect(chamber.members.length + chamber.unrecorded).toBe(chamber.seats);
            const order = { democrat: 0, independent: 1, republican: 2 };
            const ranks = chamber.members.map((member) => order[member.party]);
            expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
        }
    });
    it("measures the nearest caucus against each line the chamber counts by", () => {
        const senate = congressSystem(opening).chambers.find((chamber) => chamber.chamber === "senate");
        const keys = senate.thresholds.map((line) => [line.key, line.votes]);
        expect(keys).toEqual([["majority", 51], ["cloture", 60], ["override", 67], ["sustain", 34]]);
        for (const line of senate.thresholds)
            if (!line.tieBreak)
                expect(line.short).toBe(Math.max(0, line.votes - senate.caucus.seats));
        const house = congressSystem(opening).chambers.find((chamber) => chamber.chamber === "house");
        expect(house.thresholds.some((line) => line.key === "cloture")).toBe(false);
    });
    it("shows only the newest recorded roll call, and leaves seats without a recorded vote out of it", () => {
        const campaign = rolled(rolled(opening, opening.turn + 1, 55), opening.turn + 3, 40);
        const roll = congressSystem(campaign).chambers.find((chamber) => chamber.chamber === "senate").lastRoll;
        expect(roll).toMatchObject({ title: `Test Act ${opening.turn + 3}`, yeas: 40, nays: 20, passed: false, question: "Passage" });
        expect(roll.votes.size).toBe(60);
        expect(congressSystem(opening).chambers.every((chamber) => chamber.lastRoll === undefined)).toBe(true);
    });
    it("carries a measure in an evenly split Senate only through the Vice President", () => {
        const even = { ...opening, congress: { ...opening.congress, chambers: { ...opening.congress.chambers, senate: { seats: 100, administration: 50, opposition: 50, independent: 0 } } } };
        const lines = congressSystem(even).chambers.find((chamber) => chamber.chamber === "senate").thresholds;
        expect(lines.find((line) => line.key === "majority")).toMatchObject({ short: 0, tieBreak: true });
        expect(lines.find((line) => line.key === "cloture")).toMatchObject({ short: 10 });
        expect(lines.find((line) => line.key === "cloture")?.tieBreak).toBeUndefined();
    });
    it("flags a chamber whose seated members do not add up to its count", () => {
        expect(congressSystem(opening).chambers.some((chamber) => chamber.recordsDisagree)).toBe(false);
        const skewed = { ...opening, congress: { ...opening.congress, chambers: { ...opening.congress.chambers, senate: { seats: 100, administration: 70, opposition: 30, independent: 0 } } } };
        expect(congressSystem(skewed).chambers.find((chamber) => chamber.chamber === "senate").recordsDisagree).toBe(true);
    });
});
