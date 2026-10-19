import { describe, expect, it } from "vitest";
import { executiveOrder, LEGISLATIVE_ACTS } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { orderDesk } from "./order-desk";
import { reachByGroup, reachSentence } from "./reach";
const campaign = openingCampaign();
const act = (id) => LEGISLATIVE_ACTS.find((a) => a.id === id).domestic;
describe("who an act reaches, by group", () => {
    it("names the groups a civil-rights act is about, hardest first, and says it helps them", () => {
        const lines = reachByGroup(campaign, act("act-equal-protection"));
        expect(lines.length).toBeGreaterThan(2);
        expect(lines.every((l) => l.direction === "helps")).toBe(true);
        expect(lines[0].weight).toBeGreaterThanOrEqual(lines.at(-1).weight);
        const names = lines.map((l) => l.name);
        expect(names).toContain("Black residents");
        expect(names).toContain("People with a disability");
    });
    it("does not claim nationwide cohort effects for one country's visa refusals", () => {
        const order = executiveOrder("order-entry-suspension");
        expect(order.domestic).toBeUndefined();
    });
    it("reaches veterans for a veterans act and no one for an act about nothing in particular", () => {
        expect(reachByGroup(campaign, act("act-veterans-transition")).map((l) => l.name)).toContain("Veterans");
        expect(reachSentence([])).toBeUndefined();
    });
    it("is a read: it does not change the campaign", () => {
        const before = JSON.stringify(campaign);
        reachByGroup(campaign, act("act-health-coverage"));
        expect(JSON.stringify(campaign)).toBe(before);
    });
    it("limits the sentence to the first four of a side and counts the rest", () => {
        const lines = ["a", "b", "c", "d", "e", "f"].map((n, i) => ({ cohort: "urban", name: n, direction: "helps", weight: 1 - i / 10 }));
        expect(reachSentence(lines)).toBe("Helps a, b, c and d and 2 more.");
    });
    it("hands the order desk the same lines the sentence is made from", () => {
        const desk = orderDesk(campaign, charterOf(campaign), "order-entry-suspension");
        expect(desk.reachLines).toEqual([]);
        expect(reachSentence(desk.reachLines)).toBe(desk.reach);
    });
});
