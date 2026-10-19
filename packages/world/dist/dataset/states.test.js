import { describe, expect, it } from "vitest";
import { worldStates, ELECTORAL_COLLEGE } from "./states.js";
import { STATE_IDS } from "../schemas/state.js";
describe("US states overlay", () => {
    it("ships fifty states plus DC, unique ids, EV 538", () => {
        expect(worldStates).toHaveLength(51);
        expect(new Set(worldStates.map((state) => state.id)).size).toBe(51);
        expect(worldStates.map((state) => state.id).sort()).toEqual([...STATE_IDS].sort());
        expect(ELECTORAL_COLLEGE).toBe(538);
        expect(worldStates.reduce((sum, state) => sum + state.electoralVotes, 0)).toBe(538);
    });
    it("gives DC three electoral votes and no House seat; others EV = house + 2", () => {
        const dc = worldStates.find((state) => state.id === "DC");
        expect(dc.electoralVotes).toBe(3);
        expect(dc.houseSeats).toBe(0);
        for (const state of worldStates) {
            if (state.id === "DC")
                continue;
            expect(state.houseSeats, state.id).toBe(state.electoralVotes - 2);
        }
    });
});
