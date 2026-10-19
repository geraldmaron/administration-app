import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { floorBreachPressure, inheritedRowsStillHeld } from "./removal.js";
import { METRIC_HISTORY_WINDOW } from "./turn-loop.js";
function metrics(treasury) {
    return { approval: 0.5, treasury, stability: 0.7, militaryReadiness: 0.5, standing: 0.5 };
}
describe("floorBreachPressure", () => {
    it("does not charge the inherited quarter once it has scrolled out of the window", () => {
        expect(inheritedRowsStillHeld(1)).toBe(13);
        expect(inheritedRowsStillHeld(1 + METRIC_HISTORY_WINDOW)).toBe(0);
    });
    it("counts a treasury breach twenty weeks back after the history window has filled", () => {
        const base = buildCampaign();
        const history = Array.from({ length: METRIC_HISTORY_WINDOW }, (_, index) => metrics(index === 4 ? 0 : 1000));
        const campaign = {
            ...base,
            turn: 1 + METRIC_HISTORY_WINDOW,
            player: { ...base.player, metrics: metrics(1000), metricHistory: history },
        };
        expect(floorBreachPressure(campaign)).toBeGreaterThan(0);
    });
    it("counts no inherited week at week eight, where the quarter is still all in the window", () => {
        // Eight governed weeks: 13 inherited plus 8 is 21 rows, under the window,
        // so every inherited row is still held and every one of them is skipped.
        expect(inheritedRowsStillHeld(9)).toBe(13);
        const base = buildCampaign();
        const history = [...Array.from({ length: 13 }, () => metrics(0)), ...Array.from({ length: 8 }, () => metrics(1000))];
        const campaign = {
            ...base,
            turn: 9,
            player: { ...base.player, metrics: metrics(1000), metricHistory: history },
        };
        expect(floorBreachPressure(campaign)).toBe(0);
    });
    it("ignores an inherited treasury of zero on the day of the oath", () => {
        const base = buildCampaign();
        const campaign = {
            ...base,
            turn: 1,
            player: {
                ...base.player,
                metrics: metrics(1000),
                metricHistory: Array.from({ length: 13 }, () => metrics(0)),
            },
        };
        expect(floorBreachPressure(campaign)).toBe(0);
    });
});
