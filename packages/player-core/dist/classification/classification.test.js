import { describe, expect, it } from "vitest";
import { classificationForSeverity } from "@admin/engine";
import { CLASSIFICATION_ORDER, bannerWords, highestClassification } from "./classification.js";
describe("highestClassification", () => {
    it("reads UNCLASSIFIED when nothing is marked", () => {
        expect(highestClassification([])).toBe("UNCLASSIFIED");
        expect(highestClassification([undefined, undefined])).toBe("UNCLASSIFIED");
    });
    it("takes the most restrictive level regardless of order", () => {
        expect(highestClassification(["CONFIDENTIAL", "SECRET", "UNCLASSIFIED"])).toBe("SECRET");
        expect(highestClassification(["TOP SECRET", "SECRET"])).toBe("TOP SECRET");
        expect(highestClassification([undefined, "CONFIDENTIAL"])).toBe("CONFIDENTIAL");
    });
    it("accepts any iterable, such as a map's values", () => {
        const marked = new Map([["a", "CONFIDENTIAL"], ["b", "SECRET"]]);
        expect(highestClassification(marked.values())).toBe("SECRET");
    });
    it("orders every level the engine assigns to a scenario severity", () => {
        const fromSeverity = ["routine", "serious", "critical"].map(classificationForSeverity);
        expect(fromSeverity.every((level) => CLASSIFICATION_ORDER.includes(level))).toBe(true);
        expect(highestClassification(fromSeverity)).toBe("SECRET");
    });
});
describe("banner text", () => {
    it("prints the level itself", () => {
        for (const level of CLASSIFICATION_ORDER)
            expect(bannerWords(level)).toBe(level);
    });
});
