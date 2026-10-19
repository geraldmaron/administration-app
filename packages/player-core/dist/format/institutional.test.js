import { describe, expect, it } from "vitest";
import { institutionalCapacityWords } from "./institutional";
describe("institutionalCapacityWords", () => {
    it("turns a declared tag into words", () => {
        expect(institutionalCapacityWords(["forces-committed"])).toBe("forces committed");
    });
    it("joins several as a sentence would", () => {
        expect(institutionalCapacityWords(["legal-authority-spent", "alliance-credit-earned", "civil-service-strained"])).toBe("legal power used, goodwill with allies gained, and government workers stretched thin");
    });
    it("never prints a hyphenated tag, even one it has no words for", () => {
        expect(institutionalCapacityWords(["some-new-tag"])).toBe("some new tag");
        expect(institutionalCapacityWords([])).toBe("");
    });
});
