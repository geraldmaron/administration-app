import { describe, expect, it } from "vitest";
import { faceRef, generateFace, portraitRef } from "@admin/world";
import { monogramFor, portraitSpecFor } from "./genome";
const FACETS = {
    heritage: "europe-south",
    gender: "masculine",
    ageBand: "senior",
    skinTone: "tone-3",
    attire: "business",
    hairStyle: "short",
    hairColor: "graying",
    facialHair: "mustache",
    eyewear: "none",
    variant: 2,
};
const person = (id, over = {}) => ({
    id: id,
    name: "Carlo Benedetti",
    nationality: "ITA",
    age: 64,
    portraitRef: portraitRef(FACETS),
    traits: [],
    eligibleRoles: [],
    ...over,
});
describe("portraitSpecFor", () => {
    it("chooses the same face for the same person on every call", () => {
        const spec = portraitSpecFor(person("PER-ITA-a"));
        expect(spec).toBeDefined();
        expect(portraitSpecFor(person("PER-ITA-a"))).toEqual(spec);
    });
    it("gives two people with the same facets two different faces", () => {
        expect(portraitSpecFor(person("PER-ITA-a"))?.genome).not.toEqual(portraitSpecFor(person("PER-ITA-b"))?.genome);
    });
    it("uses the record's age without a campaign, and carries the mood and treatment asked for", () => {
        const spec = portraitSpecFor(person("PER-ITA-a"), { mood: "stern", treatment: "wire" });
        expect(spec?.age).toBe(64);
        expect(spec?.mood).toBe("stern");
        expect(spec?.treatment).toBe("wire");
        expect(spec?.key).not.toBe(portraitSpecFor(person("PER-ITA-a"))?.key);
    });
    it("chooses an authored face as built", () => {
        const authored = generateFace({ ...FACETS, gender: "feminine", facialHair: "none" }, "authored", { age: 50 });
        expect(portraitSpecFor(person("PER-USA-president", { portraitRef: faceRef(authored) }))?.genome).toBeDefined();
    });
    it("chooses nothing for a person with no face yet, so the surface draws a monogram", () => {
        expect(portraitSpecFor(person("PER-USA-president", { portraitRef: "portrait-player-leader" }))).toBeUndefined();
    });
});
describe("monogramFor", () => {
    it("takes the first letter of the first two names", () => {
        expect(monogramFor("Carlo Benedetti")).toBe("CB");
        expect(monogramFor("  maria  de la cruz ")).toBe("MD");
        expect(monogramFor("")).toBe("?");
    });
});
