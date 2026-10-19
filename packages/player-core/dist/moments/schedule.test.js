import { describe, expect, it } from "vitest";
import { momentLengthMs, stageMoment } from "./schedule";
const DURATIONS = { normal: 220, slow: 360 };
describe("stageMoment", () => {
    it("shows the first step at once and each later step one token later", () => {
        const schedule = stageMoment([{ key: "spoken" }, { key: "narrator" }, { key: "moved", pause: "reveal" }], DURATIONS, false);
        expect(schedule).toEqual([
            { key: "spoken", delayMs: 0 },
            { key: "narrator", delayMs: 220 },
            { key: "moved", delayMs: 580 },
        ]);
        expect(momentLengthMs(schedule)).toBe(580);
    });
    it("uses only the token values, whatever the sequence", () => {
        const schedule = stageMoment([{ key: "a" }, { key: "b", pause: "beat" }, { key: "c", pause: "beat" }, { key: "d", pause: "reveal" }], DURATIONS, false);
        const gaps = schedule.slice(1).map((step, index) => step.delayMs - schedule[index].delayMs);
        for (const gap of gaps)
            expect([DURATIONS.normal, DURATIONS.slow]).toContain(gap);
    });
    it("puts everything on screen at once under reduced motion", () => {
        const schedule = stageMoment([{ key: "a" }, { key: "b" }, { key: "c", pause: "reveal" }], DURATIONS, true);
        expect(schedule.every((step) => step.delayMs === 0)).toBe(true);
        expect(momentLengthMs(schedule)).toBe(0);
    });
    it("has nothing to schedule for an empty moment", () => {
        expect(stageMoment([], DURATIONS, false)).toEqual([]);
        expect(momentLengthMs([])).toBe(0);
    });
});
