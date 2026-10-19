import { describe, expect, it } from "vitest";
import { STATE_IDS } from "../schemas/state.js";
import { distanceToStateKm, projectToUsPlate, stateContains, stateOutline } from "./state-outlines.js";
describe("state outlines", () => {
    // Read off d3-geo's geoAlbersUsa(), the projection the state outlines were baked with.
    it("projects the way the bake did, insets included", () => {
        const cases = [
            { state: "DC", point: [-77.0365, 38.8977], plane: [759.8286, 219.157] },
            { state: "AK", point: [-134.41, 58.3], plane: [224.4182, 456.6635] },
            { state: "HI", point: [-157.85, 21.3], plane: [298.6236, 451.1159] },
            { state: "WA", point: [-122.9, 47.03], plane: [149.1963, 45.3687] },
        ];
        for (const { state, point, plane } of cases) {
            const [x, y] = projectToUsPlate(state, [...point]);
            expect(x, state).toBeCloseTo(plane[0], 3);
            expect(y, state).toBeCloseTo(plane[1], 3);
        }
    });
    it("reads a ring for every state and DC", () => {
        for (const state of STATE_IDS)
            expect(stateOutline(state).length, state).toBeGreaterThan(0);
    });
    it("puts a point in its own state and not its neighbor", () => {
        const kansasCity = [-94.5786, 39.0997];
        expect(stateContains("MO", kansasCity)).toBe(true);
        expect(stateContains("KS", kansasCity)).toBe(false);
        expect(distanceToStateKm("KS", kansasCity)).toBeGreaterThan(0);
        expect(distanceToStateKm("KS", kansasCity)).toBeLessThan(10);
    });
});
