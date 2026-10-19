import { describe, expect, it } from "vitest";
import { pressReading } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { abroadRows, coverageByWeek, coverageRows, coverageTopics, deskRows, filterCoverage, pressKpis, pressLede, runningStories } from "./press-board";
const opening = openingCampaign();
const foreign = Object.keys(opening.nations).find((id) => id !== opening.founding.nation);
function filed(turn, outletId, stance, over = {}) {
    return { turn, kind: "npc-action", visibility: "public", headline: `Story ${turn} at ${outletId}`, desk: { outletId, stance }, ...over };
}
const campaign = {
    ...opening,
    turn: 6,
    feed: [
        filed(2, "outlet-national-wire", "neutral"),
        filed(5, "outlet-frontier-channel", "hostile", { actor: foreign, target: opening.founding.nation }),
        filed(6, "outlet-frontier-channel", "hostile", { kind: "conflict" }),
        filed(6, "outlet-capital-register", "skeptical"),
        filed(6, "outlet-main-street-radio", "friendly"),
        { turn: 6, kind: "player-action", visibility: "public", headline: "The order took effect." },
    ],
};
describe("the coverage feed", () => {
    const rows = coverageRows(campaign);
    it("leans each story by the stance its desk had when it filed, and names the governments it is about", () => {
        const tones = Object.fromEntries(rows.map((row) => [row.headline, row.tone]));
        expect(tones["Story 5 at outlet-frontier-channel"]).toBe("critical");
        expect(tones["Story 6 at outlet-capital-register"]).toBe("critical");
        expect(tones["Story 2 at outlet-national-wire"]).toBe("even");
        expect(tones["Story 6 at outlet-main-street-radio"]).toBe("friendly");
        expect(tones["The order took effect."]).toBeUndefined();
        const named = rows.find((row) => row.headline === "Story 5 at outlet-frontier-channel");
        expect(named.nations.map((nation) => nation.id)).toEqual([foreign]);
        expect(named.week).toBe(4);
    });
    it("narrows by topic, outlet, lean and week, and each narrowing is a subset of the feed", () => {
        expect(filterCoverage(rows, { topic: "conflict" })).toHaveLength(1);
        expect(filterCoverage(rows, { tone: "critical" })).toHaveLength(3);
        expect(filterCoverage(rows, { week: 5 })).toHaveLength(4);
        expect(filterCoverage(rows, { outlet: "outlet-frontier-channel", week: 5 })).toHaveLength(1);
        expect(filterCoverage(rows, {})).toHaveLength(rows.length);
    });
    it("counts the topics so a filter never promises more than it holds", () => {
        const topics = coverageTopics(rows);
        expect(topics.reduce((sum, entry) => sum + entry.count, 0)).toBe(rows.length);
        expect(topics[0]).toMatchObject({ topic: "npc-action", count: 4 });
    });
});
describe("coverage by week", () => {
    it("splits every week by lean, keeps empty weeks, and totals to the feed", () => {
        const weeks = coverageByWeek(campaign);
        expect(weeks.map((entry) => entry.week)).toEqual([1, 2, 3, 4, 5]);
        expect(weeks.reduce((sum, entry) => sum + entry.total, 0)).toBe(campaign.feed.length);
        expect(weeks.at(-1)).toMatchObject({ critical: 2, even: 0, friendly: 1, other: 1, total: 4, current: true });
        expect(weeks[2].total).toBe(0);
    });
});
describe("the desks", () => {
    it("counts each desk's stories and week from the same rows the feed lists", () => {
        const desks = deskRows(campaign);
        const frontier = desks.find((desk) => desk.id === "outlet-frontier-channel");
        expect(frontier.filed).toBe(2);
        expect(frontier.thisWeek).toBe(1);
        expect(frontier.last?.headline).toBe("Story 6 at outlet-frontier-channel");
        expect(desks.reduce((sum, desk) => sum + desk.filed, 0)).toBe(coverageRows(campaign).filter((row) => row.outletId).length);
    });
});
describe("the readings a President scans first", () => {
    it("agrees with the engine's own hostile share and with the desks table", () => {
        const kpis = pressKpis(campaign);
        const desks = deskRows(campaign);
        expect(kpis.deskCount).toBe(desks.length);
        expect(Math.round(kpis.hostileDesks / kpis.deskCount * 1000) / 1000).toBe(pressReading(campaign, "hostileShare"));
        expect(kpis.standing.value).toBe(campaign.press.standing);
        expect(kpis.silenceWeeks).toBe(pressReading(campaign, "silenceWeeks"));
    });
    it("shares this week's toned coverage between lean and friendliness, leaving out notices with no desk", () => {
        const kpis = pressKpis(campaign);
        expect(kpis.week?.total).toBe(4);
        expect(kpis.criticalShare).toBeCloseTo(2 / 3);
        expect(kpis.friendlyShare).toBeCloseTo(1 / 3);
        expect(kpis.earlierAverage).toBeCloseTo(1 / 2);
        expect(pressLede(kpis)).toContain("67% of this week's coverage was critical");
    });
    it("counts the stories still running the way the board lists them", () => {
        expect(pressKpis(campaign).running).toBe(runningStories(campaign).length);
    });
});
describe("the press abroad", () => {
    it("names the government each outlet files from and puts the coolest first", () => {
        const rows = abroadRows(campaign);
        for (const row of rows)
            expect(row.nation.href).toBe(`/world/nation/${row.nation.id}`);
        const order = rows.map((row) => ["hostile", "cool", "neutral", "warm"].indexOf(row.band));
        expect(order).toEqual([...order].sort((a, b) => a - b));
    });
});
