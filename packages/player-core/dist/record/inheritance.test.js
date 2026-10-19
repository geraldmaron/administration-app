import { describe, expect, it } from "vitest";
import { INHERITED_WEEKS, METRIC_HISTORY_WINDOW } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { inheritedQuarter, isInheritedRow } from "./inheritance";
/** A metric row every field of which is `n`, so a test can tell rows apart by their value alone. */
function row(n) {
    return { approval: n, treasury: n, stability: n, militaryReadiness: n, standing: n };
}
/** The campaign at a given turn, with a history the length `tickWeek` would actually have left it. */
function atTurn(turn) {
    const opening = openingCampaign();
    const governedWeeksClosed = turn - 1;
    const totalRows = INHERITED_WEEKS + governedWeeksClosed;
    const metricHistory = Array.from({ length: totalRows }, (_unused, index) => row(index)).slice(-METRIC_HISTORY_WINDOW);
    return { ...opening, turn, player: { ...opening.player, metricHistory } };
}
describe("isInheritedRow", () => {
    it("reads every row inherited before any week has been governed", () => {
        const campaign = atTurn(1);
        expect(campaign.player.metricHistory).toHaveLength(INHERITED_WEEKS);
        for (let index = 0; index < INHERITED_WEEKS; index += 1)
            expect(isInheritedRow(campaign, index)).toBe(true);
    });
    it("still reads all 13 inherited rows at turn 12, the last turn before any scrolls out", () => {
        const campaign = atTurn(12);
        expect(campaign.player.metricHistory).toHaveLength(METRIC_HISTORY_WINDOW);
        for (let index = 0; index < INHERITED_WEEKS; index += 1)
            expect(isInheritedRow(campaign, index)).toBe(true);
        for (let index = INHERITED_WEEKS; index < METRIC_HISTORY_WINDOW; index += 1)
            expect(isInheritedRow(campaign, index)).toBe(false);
    });
    it("reads one fewer inherited row at turn 13, the turn the window first drops one", () => {
        const campaign = atTurn(13);
        expect(campaign.player.metricHistory).toHaveLength(METRIC_HISTORY_WINDOW);
        for (let index = 0; index < INHERITED_WEEKS - 1; index += 1)
            expect(isInheritedRow(campaign, index)).toBe(true);
        for (let index = INHERITED_WEEKS - 1; index < METRIC_HISTORY_WINDOW; index += 1)
            expect(isInheritedRow(campaign, index)).toBe(false);
    });
    it("reads no inherited row left at turn 30, long after the quarter has scrolled out", () => {
        const campaign = atTurn(30);
        expect(campaign.player.metricHistory).toHaveLength(METRIC_HISTORY_WINDOW);
        for (let index = 0; index < METRIC_HISTORY_WINDOW; index += 1)
            expect(isInheritedRow(campaign, index)).toBe(false);
    });
    it("is false for an index outside the history, in either direction", () => {
        const campaign = atTurn(1);
        expect(isInheritedRow(campaign, -1)).toBe(false);
        expect(isInheritedRow(campaign, campaign.player.metricHistory.length)).toBe(false);
    });
});
describe("inheritedQuarter", () => {
    it("spans the whole 13-row quarter before any week has been governed", () => {
        const quarter = inheritedQuarter(atTurn(1));
        expect(quarter?.modeled).toBe(true);
        expect(quarter?.weeks).toBe(INHERITED_WEEKS);
        expect(quarter?.moves.find((move) => move.metric === "approval")).toEqual({ metric: "approval", from: 0, to: INHERITED_WEEKS - 1 });
        // Treasury is excluded: it moves by a fraction of itself, not by points.
        expect(quarter?.moves.find((move) => move.metric === "treasury")).toBeUndefined();
    });
    it("narrows to what the window still holds once rows have scrolled out", () => {
        const quarter = inheritedQuarter(atTurn(13));
        expect(quarter?.weeks).toBe(INHERITED_WEEKS - 1);
        // One row (value 0) has scrolled out of the window, so the surviving
        // inherited rows are values 1..12, not the original 0..11.
        expect(quarter?.moves.find((move) => move.metric === "approval")).toEqual({ metric: "approval", from: 1, to: INHERITED_WEEKS - 1 });
    });
    it("is undefined once every inherited row has left the history", () => {
        expect(inheritedQuarter(atTurn(30))).toBeUndefined();
    });
});
