import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { billPipeline, floorSchedule, settledBills, sponsorWords } from "./floor-schedule";
const base = openingCampaign();
function bill(id, status, stage) {
    return {
        id,
        act: "act-tax-relief-and-growth",
        title: "Tax Relief and Growth Act",
        sponsor: "bipartisan",
        introducedTurn: base.turn,
        status,
        ...(stage ? { stage, setbacks: 1, momentum: 0, beats: [] } : {}),
        ...(status === "on-the-desk" ? { presentedOn: base.calendar } : {}),
        ...(status === "law" ? { resolvedTurn: base.turn, enactedBy: "signed" } : {}),
        passage: [
            { chamber: "house", yeas: 231, nays: 199, required: 218, passed: true },
            { chamber: "senate", yeas: 61, nays: 39, required: 60, passed: true },
        ],
    };
}
const withBills = (campaign, bills) => ({ ...campaign, bills: Object.fromEntries(bills.map((entry) => [entry.id, entry])) });
describe("the floor schedule", () => {
    it("is empty when Congress has nothing in front of it", () => {
        expect(floorSchedule(withBills(base, []))).toEqual([]);
    });
    it("puts the desk first, then the floor, markup and committee, each with its count", () => {
        const campaign = withBills(base, [bill("bill:a:1", "in-progress", "referral"), bill("bill:b:1", "on-the-desk"), bill("bill:c:1", "in-progress", "floor")]);
        const groups = floorSchedule(campaign);
        expect(groups.map((group) => group.key)).toEqual(["desk", "floor", "referral"]);
        const desk = groups[0].rows[0];
        expect(desk.href).toBe("/washington/congress/bill/bill%3Ab%3A1");
        expect(desk.line).toMatch(/^Sign it or send it back by \w+ \d+, \d{4}/);
        expect(desk.counts.map((count) => count.name)).toEqual(["House", "Senate"]);
        const floor = groups[1].rows[0];
        expect(floor.stageName).toBe("On the floor");
        expect(floor.line).toBe("It can stall 2 more times before it dies. No one knows yet when it gets a vote or who will support it.");
        expect(floor.counts.every((count) => count.supportKnown === false)).toBe(true);
    });
    it("keeps the record of what left the chambers, with the votes it carried", () => {
        const rows = settledBills(withBills(base, [bill("bill:d:1", "law")]));
        expect(rows[0].stageName).toBe("Law");
        expect(rows[0].line).toBe("House 231 to 199, Senate 61 to 39");
    });
});
describe("a bill's pipeline", () => {
    it("marks the stage it is at, the stages behind it done and the ones ahead not yet", () => {
        expect(billPipeline(bill("bill:e:1", "in-progress", "markup")).map((step) => step.state)).toEqual(["done", "current", "ahead", "ahead", "ahead"]);
        expect(billPipeline(bill("bill:f:1", "on-the-desk")).find((step) => step.state === "current")?.label).toBe("On your desk");
        expect(billPipeline(bill("bill:g:1", "vetoed")).at(-1)).toEqual({ key: "outcome", label: "Vetoed", state: "current" });
    });
});
describe("whose bill it is", () => {
    it("names the other party's bill by its party", () => {
        expect(sponsorWords(base, "administration")).toBe("Your bill");
        expect(sponsorWords(base, "opposition")).toMatch(/^The (Democrats|Republicans)' bill$/);
    });
});
