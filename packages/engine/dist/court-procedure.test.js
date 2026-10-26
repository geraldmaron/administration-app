import { describe, expect, it } from "vitest";
import { makeCampaignSeed } from "./rng.js";
import { COURT_TIMING_DAYS, courtStep, courtWeeks, openedProceeding } from "./court-procedure.js";
const weeks = (step) => Array.from({ length: 200 }, (_, i) => courtWeeks(makeCampaignSeed(`timing-${i}`), `case:${i}`, step));
describe("court clocks", () => {
    it("keeps every draw inside its sourced band, in weeks", () => {
        for (const step of Object.keys(COURT_TIMING_DAYS)) {
            const band = COURT_TIMING_DAYS[step];
            const drawn = weeks(step);
            expect(Math.min(...drawn)).toBeGreaterThanOrEqual(Math.max(1, Math.ceil(band.min / 7)));
            expect(Math.max(...drawn)).toBeLessThanOrEqual(Math.ceil(band.max / 7));
            expect(band.source.length).toBeGreaterThan(20);
        }
    });
    it("decides interim relief in weeks and merits and appeals in months", () => {
        const interim = Math.max(...weeks("interim"));
        expect(interim).toBeLessThanOrEqual(3);
        expect(Math.min(...weeks("lowerMerits"))).toBeGreaterThan(interim);
        expect(Math.min(...weeks("circuitMerits"))).toBeGreaterThan(interim);
    });
    it("does not read the 90-day petition deadline as a minimum wait", () => {
        expect(Math.min(...weeks("certDisposition"))).toBeLessThan(Math.ceil(90 / 7));
    });
    it("is the same draw for the same proceeding every time", () => {
        const seed = makeCampaignSeed("timing-replay");
        expect(courtWeeks(seed, "case:x", "lowerMerits")).toBe(courtWeeks(seed, "case:x", "lowerMerits"));
    });
    it("waits until a dated turn when told to, and never less than a week", () => {
        const opened = openedProceeding("r", "order-border-controls", 10, 10);
        expect(courtStep(opened, "interim", 10, "a", {}, 14).nextTurn).toBe(14);
        expect(courtStep(opened, "interim", 10, "a", {}, 5).nextTurn).toBe(11);
        expect(courtStep(opened, "final", 10, "a", {}, 14).nextTurn).toBe(10);
    });
});
