import { describe, expect, it } from "vitest";
import { classification, paperDark, situation } from "./classified";
import { contrastRatio } from "./contrast";
describe("classified material stays legible", () => {
    it("every banner carries its ink at 4.5:1", () => {
        for (const [name, mark] of Object.entries(classification)) {
            expect(contrastRatio(mark.ink, mark.fill), name).toBeGreaterThanOrEqual(4.5);
        }
    });
    it("situation inks read on the situation surfaces", () => {
        for (const ground of [situation.ground, situation.surface, situation.raised]) {
            expect(contrastRatio(situation.text, ground)).toBeGreaterThanOrEqual(7);
            expect(contrastRatio(situation.secondary, ground)).toBeGreaterThanOrEqual(4.5);
            expect(contrastRatio(situation.accent, ground)).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrastRatio(situation.lineStrong, situation.surface)).toBeGreaterThanOrEqual(3);
    });
    it("dimmed paper keeps its ink", () => {
        expect(contrastRatio(paperDark.ink, paperDark.surface)).toBeGreaterThanOrEqual(7);
    });
});
