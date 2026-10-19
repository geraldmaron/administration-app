import { describe, it, expect } from "vitest";
import { branchesFor, generateUnitDesignation } from "./unit-designations.js";
// Genuinely well-known real-world unit designations — famous enough that a
// player recognizing one in a fictional beat would break the no-real-insignia
// posture. If this list ever needs a new entry, add the unit here rather than
// trusting the type vocabulary not to have drifted toward it.
const REAL_FAMOUS_UNITS = [
    "101st Airborne Division",
    "82nd Airborne Division",
    "1st Marine Division",
    "1st Cavalry Division",
    "3rd Infantry Division",
    "10th Mountain Division",
    "75th Ranger Regiment",
    "173rd Airborne Brigade",
    "7th Fleet",
    "6th Fleet",
    "24th Marine Expeditionary Unit",
    "509th Bomb Wing",
    "4th Infantry Division",
    "1st Armored Division",
    "2nd Marine Division",
    "82nd Airborne",
    "1st Special Forces Operational Detachment-Delta",
    "160th Special Operations Aviation Regiment",
];
describe("world.unit-designations", () => {
    it("is deterministic: the same seed always names the same unit", () => {
        const first = generateUnitDesignation({}, "campaign-1", "beat-42", 3);
        const second = generateUnitDesignation({}, "campaign-1", "beat-42", 3);
        expect(second).toEqual(first);
    });
    it("diverges across different seeds", () => {
        const seeds = Array.from({ length: 25 }, (_, i) => generateUnitDesignation({}, "campaign-1", "beat", i));
        const designations = new Set(seeds.map((d) => d.designation));
        // 25 draws over a 6-branch x ~4-type x 999-number space should not
        // collapse to one value; a single generator bug (e.g. an unseeded draw)
        // would make every entry identical.
        expect(designations.size).toBeGreaterThan(1);
    });
    it("never collides with a real famous unit designation", () => {
        const realSet = new Set(REAL_FAMOUS_UNITS);
        for (let i = 0; i < 2000; i++) {
            const draw = generateUnitDesignation({}, "collision-check", i);
            expect(realSet.has(draw.designation), draw.designation).toBe(false);
        }
    });
    it("returns a branch, number and type that compose the designation string", () => {
        const draw = generateUnitDesignation({}, "compose-check", "one");
        expect(draw.designation.endsWith(draw.type)).toBe(true);
        expect(draw.designation.includes(String(draw.number))).toBe(true);
        expect(draw.branchDisplay.length).toBeGreaterThan(0);
    });
    it("throws on an empty seed rather than silently drawing an unkeyed unit", () => {
        expect(() => generateUnitDesignation({})).toThrow();
    });
    // The defect this axis exists to close: an unconstrained draw put an undersea
    // squadron into a line whose verbs are aviation verbs, five times in six.
    it("draws only from the branches the caller's prose can carry", () => {
        for (let i = 0; i < 500; i++) {
            const draw = generateUnitDesignation({ branches: ["air"] }, "branch-check", i);
            expect(draw.branch).toBe("air");
        }
    });
    it("draws a formation only where a formation-scale vocabulary exists", () => {
        expect(branchesFor({ echelon: "formation" })).toEqual(["army", "marines"]);
        for (let i = 0; i < 200; i++) {
            const draw = generateUnitDesignation({ branches: ["army", "marines"], echelon: "formation" }, "echelon-check", i);
            expect(draw.echelon).toBe("formation");
            expect(draw.designation.endsWith("Corps")).toBe(true);
        }
    });
    it("throws rather than silently widening when the constraint names no drawable branch", () => {
        expect(() => generateUnitDesignation({ branches: ["cyber"], echelon: "formation" }, "impossible")).toThrow();
    });
});
