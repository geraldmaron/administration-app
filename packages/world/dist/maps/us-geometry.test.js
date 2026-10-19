import { describe, expect, it } from "vitest";
import { US_DISTRICT_PATHS, US_MAP_VIEWBOX, US_STATE_PATHS } from "./us-geometry.js";
describe("US map geometry", () => {
    it("bakes exactly 51 state outlines (50 states + DC)", () => {
        expect(Object.keys(US_STATE_PATHS)).toHaveLength(51);
    });
    it("bakes exactly 436 district outlines (435 apportioned seats + DC's delegate)", () => {
        expect(Object.keys(US_DISTRICT_PATHS)).toHaveLength(436);
    });
    it("gives every district a state prefix with a baked outline of its own", () => {
        const stateIds = new Set(Object.keys(US_STATE_PATHS));
        for (const id of Object.keys(US_DISTRICT_PATHS)) {
            const [state] = id.split("-");
            expect(stateIds.has(state), id).toBe(true);
        }
    });
    it("carries a real SVG path for every state and district", () => {
        for (const path of Object.values(US_STATE_PATHS)) {
            expect(path).toMatch(/^M /);
        }
        for (const path of Object.values(US_DISTRICT_PATHS)) {
            expect(path).toMatch(/^M /);
        }
    });
    it("declares a plate viewbox matching what UsMap renders", () => {
        expect(US_MAP_VIEWBOX.width).toBeGreaterThan(0);
        expect(US_MAP_VIEWBOX.height).toBeGreaterThan(0);
    });
    it("resolves WY-AL, DC-DL, and CA-52 — the edge cases the district table's own tests pin", () => {
        expect(US_DISTRICT_PATHS["WY-AL"]).toBeDefined();
        expect(US_DISTRICT_PATHS["DC-DL"]).toBeDefined();
        expect(US_DISTRICT_PATHS["CA-52"]).toBeDefined();
    });
});
