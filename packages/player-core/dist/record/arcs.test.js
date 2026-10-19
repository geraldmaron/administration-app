import { describe, expect, it } from "vitest";
import { apply, selectDateOfTurn } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { ARC_DISPOSITION_WORDS, ARC_QUIET_DAYS, arcsClosedBetween, selectArcReading } from "./arcs";
function deal(campaign, effects) {
    return apply(campaign, { source: "conversation", actor: "player", turn: campaign.turn, narration: { summary: "The arc moves." }, effects });
}
function at(campaign, turn) {
    return { ...campaign, turn, calendar: selectDateOfTurn(campaign, turn) };
}
function withTwoArcs() {
    const campaign = openingCampaign();
    const other = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation);
    const counterpart = other;
    const opened = deal(campaign, [
        { kind: "scenarioFamily", open: { family: "strait", counterpart, scenario: "strait-1", turn: 1, title: "The strait closes at dawn" } },
        { kind: "scenarioFamily", open: { family: "lease", counterpart, scenario: "lease-1", turn: 1 } },
    ]);
    return deal(at(opened, 7), [
        { kind: "scenarioFamily", beat: { family: "strait", scenario: "strait-2", turn: 7 } },
        { kind: "scenarioFamily", close: { family: "strait", turn: 7, disposition: "lost" } },
    ]);
}
describe("the Record's arcs", () => {
    it("lists nothing before the first story opens", () => {
        expect(selectArcReading(openingCampaign())).toEqual({ finished: [], running: [] });
    });
    it("splits what finished from what is still running, with weeks computed from the dates", () => {
        const reading = selectArcReading(withTwoArcs());
        expect(reading.finished).toHaveLength(1);
        expect(reading.finished[0]).toMatchObject({ family: "strait", title: "The strait closes at dawn", disposition: "lost", chapters: 2, weeks: 6 });
        expect(reading.running.map((row) => row.family)).toEqual(["lease"]);
        // A run saved before titles were kept is still named, by its country.
        expect(reading.running[0]?.title).toMatch(/^The situation with /);
    });
    it("prints every ending in words of one kind", () => {
        expect(Object.values(ARC_DISPOSITION_WORDS)).toEqual(["Held", "Lost", "Lapsed"]);
    });
    it("says when nothing has finished in a quarter", () => {
        const campaign = withTwoArcs();
        const quietTurn = 7 + Math.ceil(ARC_QUIET_DAYS / 7) + 1;
        expect(selectArcReading(at(campaign, 8)).quietSince).toBeUndefined();
        expect(selectArcReading(at(campaign, quietTurn)).quietSince).toEqual(selectDateOfTurn(campaign, 7));
    });
    it("names only the arcs that closed between two readings", () => {
        const after = withTwoArcs();
        const { closedTurn: _closedTurn, disposition: _disposition, ...stillOpen } = after.scenarioFamilies.strait;
        const before = { ...after, scenarioFamilies: { ...after.scenarioFamilies, strait: stillOpen } };
        expect(arcsClosedBetween(before, after).map((row) => row.family)).toEqual(["strait"]);
        expect(arcsClosedBetween(after, after)).toEqual([]);
    });
});
