import { describe, expect, it } from "vitest";
import { projectToPlate, unprojectFromPlate } from "../maps/projection.js";
import { nationOutline } from "../maps/outlines.js";
import { distanceToRingKm, ringContains, ringSelfCrossings, ringsContain, ringsOverlap, segmentsCross } from "./polygon.js";
const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
describe("plane geometry on longitude and latitude", () => {
    it("contains a point inside a ring and not one outside it", () => {
        expect(ringContains(square, [5, 5])).toBe(true);
        expect(ringContains(square, [15, 5])).toBe(false);
    });
    it("reads a ring inside another as a hole", () => {
        const hole = [[4, 4], [6, 4], [6, 6], [4, 6]];
        expect(ringsContain([square, hole], [5, 5])).toBe(false);
        expect(ringsContain([square, hole], [2, 2])).toBe(true);
    });
    it("counts a proper crossing and not a shared edge or a shared corner", () => {
        expect(segmentsCross([0, 0], [10, 10], [0, 10], [10, 0])).toBe(true);
        expect(segmentsCross([0, 0], [10, 0], [5, 0], [15, 0])).toBe(false);
        expect(segmentsCross([0, 0], [10, 0], [10, 0], [10, 10])).toBe(false);
    });
    it("finds a bowtie's crossing and none in a simple ring", () => {
        expect(ringSelfCrossings([[0, 0], [10, 10], [10, 0], [0, 10]])).toEqual([[0, 2]]);
        expect(ringSelfCrossings(square)).toEqual([]);
    });
    it("lets neighbors share an edge without overlapping, and catches one ring inside another", () => {
        expect(ringsOverlap(square, [[10, 0], [20, 0], [20, 10], [10, 10]])).toBe(false);
        expect(ringsOverlap(square, [[2, 2], [4, 2], [4, 4]])).toBe(true);
        expect(ringsOverlap(square, [[5, 5], [15, 5], [15, 15]])).toBe(true);
    });
    it("measures distance to an edge in kilometers", () => {
        expect(distanceToRingKm(square, [11, 5])).toBeCloseTo(111.3, 0);
        expect(distanceToRingKm(square, [5, 5])).toBeCloseTo(5 * 110.574, -1);
    });
});
describe("reading the map back to the globe", () => {
    it("inverts the projection to well under a hundredth of a degree", () => {
        for (const [lon, lat] of [[0, 0], [139.67, 35.29], [-68.7, 76.53], [-75.16, 19.92], [179, -60]]) {
            const plate = projectToPlate(lon, lat);
            const back = unprojectFromPlate(plate.x, plate.y);
            expect(back.lon).toBeCloseTo(lon, 6);
            expect(back.lat).toBeCloseTo(lat, 6);
        }
    });
    it("puts a capital inside its own outline and folds administered territory into its administrator", () => {
        expect(ringsContain(nationOutline("FRA"), [2.35, 48.86])).toBe(true);
        expect(ringsContain(nationOutline("DNK"), [-68.7, 76.53])).toBe(true);
        expect(nationOutline("XKX")).toBeUndefined();
    });
});
