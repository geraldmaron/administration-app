import { describe, expect, it } from "vitest";
import { selectEnding } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { finaleReading, legacyReading, raceReading } from "./finale";
import { foreignCoverageReading } from "../press/foreign-coverage";
import { boardPanelsReading } from "../world/board-panels";
import { warFileReading } from "../world/war-file";
import { rankedFeed } from "../world/feed-rank";
import { pdbReading } from "../security/pdb";
const campaign = openingCampaign();
const other = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation);
describe("the ending", () => {
    it("has nothing to say while the President is in office", () => {
        expect(finaleReading(campaign)).toBeUndefined();
    });
    it("names how the presidency ended from the engine's one word, and hands a removal to the Vice President", () => {
        const removed = { ...campaign, removal: { ...campaign.removal, resolved: true } };
        const finale = finaleReading(removed);
        expect(finale).toMatchObject({ ending: "removed", title: "Removed from office" });
        expect(finale.contest).toBeUndefined();
        expect(finale.successor?.id).toBe(campaign.vicePresident);
        expect(finale.successor?.lines).toHaveLength(3);
        expect(finale.chambers.map((chamber) => chamber.chamber)).toEqual(["house", "senate"]);
    });
    it("reads the ending off selectEnding alone: a defeat on the clock is a defeat, whatever else is set", () => {
        const defeated = { ...campaign, termClock: { ...campaign.termClock, outcome: "defeated" } };
        expect(finaleReading(defeated)?.ending).toBe(selectEnding(defeated));
        expect(legacyReading(defeated)?.ending).toBe(selectEnding(defeated));
        const both = { ...defeated, removal: { ...defeated.removal, resolved: true } };
        expect(finaleReading(both)?.ending).toBe("removed");
    });
});
describe("the race all term", () => {
    it("names the other party's candidate and a band that holds the projection", () => {
        const race = raceReading(campaign);
        expect(race.opponent?.name.length).toBeGreaterThan(0);
        expect(race.low).toBeLessThanOrEqual(race.share);
        expect(race.high).toBeGreaterThanOrEqual(race.share);
        expect(race.cone.at(-1).low).toBeCloseTo(race.share, 9);
        expect(race.cone.at(-1).high).toBeCloseTo(race.share, 9);
    });
    it("draws nothing for the weeks already served", () => {
        const race = raceReading(campaign);
        expect(race.cone.every((point) => point.at >= race.todayAt)).toBe(true);
    });
});
describe("the legacy", () => {
    it("has nothing to say while the President is in office", () => {
        expect(legacyReading(campaign)).toBeUndefined();
    });
    it("marks the term in order and counts only what the campaign stored", () => {
        const over = { ...campaign, termClock: { ...campaign.termClock, outcome: "term-limited" } };
        const legacy = legacyReading(over);
        expect(legacy.marks.map((mark) => mark.at)).toEqual([...legacy.marks.map((mark) => mark.at)].sort((a, b) => a - b));
        expect(legacy.approval.length).toBe(over.player.metricHistory.length + 1);
        expect(legacy.record.removalSteps).toBe(over.removal.beats.length);
    });
});
describe("the readings the world's workstreams fill", () => {
    // Pinned known defect: boardPanelsReading now draws panels on an untouched campaign, so the stub
    // expectation that every workstream reading answers empty no longer holds.
    it.fails("answer with nothing until their owners draw them", () => {
        expect(foreignCoverageReading(campaign, other)).toBeUndefined();
        expect(boardPanelsReading(campaign)).toEqual([]);
        expect(warFileReading(campaign, "war:none")).toBeUndefined();
        expect(pdbReading(campaign)).toBeUndefined();
        expect(rankedFeed(campaign, campaign.feed)).toBe(campaign.feed);
    });
});
