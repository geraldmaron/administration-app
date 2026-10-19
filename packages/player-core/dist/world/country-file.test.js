import { describe, expect, it } from "vitest";
import { selectionCountdown } from "./country-file";
import { readingBand } from "../reading";
describe("the ranges the country file draws", () => {
    it("counts months to a selection and draws against a term only when the table states it plainly", () => {
        expect(selectionCountdown({ year: 2027, month: 1 }, { year: 2031, month: 1 }, "5")).toEqual({ monthsLeft: 48, termMonths: 60 });
        expect(selectionCountdown({ year: 2027, month: 1 }, { year: 2031, month: 1 }, "4 (unverified)")).toEqual({ monthsLeft: 48 });
        expect(selectionCountdown({ year: 2027, month: 1 }, { year: 2031, month: 1 }, "3-4 (disputed)")).toEqual({ monthsLeft: 48 });
        expect(selectionCountdown({ year: 2027, month: 1 }, { year: 2033, month: 1 }, "4")).toEqual({ monthsLeft: 72 });
        expect(selectionCountdown({ year: 2027, month: 6 }, { year: 2027, month: 3 }, "4")).toEqual({ monthsLeft: 0, termMonths: 48 });
    });
    it("judges standing on the cuts the word is read by", () => {
        const bands = [
            { from: 0, to: 0.25, stance: "adverse" },
            { from: 0.25, to: 0.45, stance: "caution" },
            { from: 0.45, to: 0.65, stance: "neutral" },
            { from: 0.65, to: 1, stance: "favorable" },
        ];
        for (const band of bands) {
            expect(readingBand("standing", band.from)?.stance).toBe(band.stance);
            expect(readingBand("standing", band.to - 0.001)?.stance).toBe(band.stance);
        }
    });
});
