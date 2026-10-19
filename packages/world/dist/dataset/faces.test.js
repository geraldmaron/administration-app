import { describe, expect, it } from "vitest";
import { FACE_GARMENTS, FACE_HAIR_CUTS, FACE_HEADWEAR, FaceGenome, } from "../schemas/face.js";
import { decodeFace, encodeFace, faceRef, isFaceRef, parseFaceRef } from "../schemas/face-code.js";
import { PortraitAttire, PortraitFacialHair, PortraitHairColor, PortraitHairStyle, portraitRef } from "../schemas/portrait.js";
import { faceForPerson, generateFace } from "./faces.js";
import { nameTraditionOf } from "./name-traditions.js";
const BASE = {
    heritage: "europe-north",
    gender: "masculine",
    ageBand: "established",
    skinTone: "tone-2",
    attire: "business",
    hairStyle: "short",
    hairColor: "brown",
    facialHair: "none",
    eyewear: "none",
    variant: 1,
};
const face = (over, seed = "seed", age = 52, ctx = {}) => generateFace({ ...BASE, ...over }, seed, { age, nation: "USA", ...ctx });
/** The renderer's graying curve, restated so the facet contract is tested against what the face will show. */
const grayAt = (onset, age) => Math.min(1, Math.max(0, (age - (20 + onset * 42)) / 26));
describe("face code", () => {
    it("round-trips every generated face to within its storage step", () => {
        for (let i = 0; i < 200; i += 1) {
            const genome = face({ gender: i % 3 === 0 ? "feminine" : "masculine", hairStyle: i % 5 === 0 ? "long" : "short" }, `rt-${i}`);
            const back = decodeFace(encodeFace(genome));
            expect(back.hair.cut).toBe(genome.hair.cut);
            expect(back.attire).toEqual(genome.attire);
            expect(back.headwear).toEqual(genome.headwear);
            expect(back.skin.tone).toBe(genome.skin.tone);
            expect(Math.abs(back.head.width - genome.head.width)).toBeLessThanOrEqual(1 / 70);
            expect(Math.abs(back.mouth.expression - genome.mouth.expression)).toBeLessThanOrEqual(1 / 70);
        }
    });
    it("stores an authored face as a portrait reference and reads it back", () => {
        const genome = face({}, "ref");
        const ref = faceRef(genome);
        expect(isFaceRef(ref)).toBe(true);
        expect(parseFaceRef(ref).presentation).toBe(genome.presentation);
    });
    it("refuses a code from another version, of the wrong length, or naming a missing entry", () => {
        const code = encodeFace(face({}, "bad"));
        expect(() => decodeFace(`9${code.slice(1)}`)).toThrow(/version/);
        expect(() => decodeFace(code.slice(0, -1))).toThrow(/characters/);
        expect(() => decodeFace(`${code.slice(0, 1)}z${code.slice(2)}`)).toThrow(/no entry/);
    });
    it("keeps its registries append-only: what a saved code points at never moves", () => {
        expect(FACE_HAIR_CUTS.slice(0, 5)).toEqual(["bald", "balding", "buzz", "crew", "side-part"]);
        expect(FACE_GARMENTS.slice(0, 3)).toEqual(["suit", "suit-open", "blazer"]);
        expect(FACE_HEADWEAR.slice(0, 3)).toEqual(["none", "hijab", "headwrap"]);
    });
});
describe("generateFace", () => {
    it("draws the same face from the same record every time", () => {
        expect(face({}, "same")).toEqual(face({}, "same"));
        expect(face({}, "one")).not.toEqual(face({}, "two"));
    });
    it("honors every facet the person system sets", () => {
        const families = {
            none: ["none"],
            stubble: ["stubble"],
            mustache: ["mustache", "pencil", "walrus"],
            "trimmed-beard": ["short-beard", "circle-beard", "goatee"],
            "full-beard": ["full-beard", "long-beard"],
        };
        for (const facialHair of PortraitFacialHair.options) {
            for (const eyewear of ["none", "glasses"]) {
                for (let i = 0; i < 12; i += 1) {
                    const g = face({ facialHair, eyewear, skinTone: `tone-${1 + (i % 6)}` }, `f-${facialHair}-${eyewear}-${i}`);
                    expect(families[facialHair]).toContain(g.facialHair);
                    expect(g.eyewear.style === "none").toBe(eyewear === "none");
                    expect(g.skin.tone).toBe(1 + (i % 6));
                    expect(g.presentation).toBe("masculine");
                }
            }
        }
    });
    it("shows the facet's hair color at the age it was drawn, then lets it age", () => {
        // From the ages the facet table deals each color at: white from the
        // established band, graying from the emerging one, natural colors at any age.
        const from = { black: 30, brown: 30, fair: 30, red: 30, graying: 34, white: 45 };
        for (const hairColor of PortraitHairColor.options) {
            for (let i = 0; i < 20; i += 1) {
                const age = from[hairColor] + i * 2;
                const g = face({ hairColor }, `gray-${hairColor}-${i}`, age);
                const gray = g.hair.dyed ? 0 : grayAt(g.hair.grayOnset, age);
                if (hairColor === "white")
                    expect(gray).toBeGreaterThanOrEqual(0.85);
                else if (hairColor === "graying")
                    expect(gray).toBeGreaterThan(0.3);
                else
                    expect(gray).toBeLessThan(0.2);
            }
        }
    });
    it("covers a covered head and dresses every attire the record names", () => {
        for (let i = 0; i < 30; i += 1) {
            const covered = face({ gender: "feminine", hairStyle: "covered", heritage: "mena" }, `cov-${i}`, 50, { nation: "EGY" });
            expect(["hijab", "headwrap", "gele", "dupatta"]).toContain(covered.headwear.style);
            const bald = face({ hairStyle: "bald" }, `bald-${i}`);
            expect(["bald", "balding", "comb-over"]).toContain(bald.hair.cut);
        }
        for (const attire of PortraitAttire.options) {
            const g = face({ attire }, `attire-${attire}`);
            if (attire === "military")
                expect(["military", "military-open"]).toContain(g.attire.garment);
            if (attire === "academic")
                expect(g.attire.garment).toBe("academic");
            if (attire === "field")
                expect(g.attire.garment).toBe("field");
        }
        for (const hairStyle of PortraitHairStyle.options)
            expect(() => FaceGenome.parse(face({ hairStyle }, hairStyle))).not.toThrow();
    });
    it("robes the bench and draws clerics as clerics", () => {
        expect(face({}, "judge", 60, { roles: ["role-chief-justice"] }).attire.garment).toBe("judicial");
        const cleric = face({ heritage: "mena", attire: "religious", facialHair: "full-beard" }, "cleric", 70, { nation: "IRN" });
        expect(cleric.attire.garment).toBe("robe");
        expect(cleric.headwear.style).toBe("amamah");
    });
    it("dresses a covered head by the name before the region", () => {
        for (let i = 0; i < 20; i += 1) {
            const hindu = face({ heritage: "south-asia", gender: "feminine", hairStyle: "covered", skinTone: "tone-4" }, `h-${i}`, 50, { nation: "IND", tradition: "south-asian-hindu" });
            expect(hindu.headwear.style).toBe("dupatta");
        }
        const sikhs = Array.from({ length: 60 }, (_, i) => face({ heritage: "south-asia", facialHair: "full-beard", skinTone: "tone-4" }, `s-${i}`, 55, { nation: "IND", tradition: "south-asian-sikh" }));
        expect(sikhs.filter((g) => g.headwear.style === "turban").length).toBeGreaterThan(45);
    });
    it("never lets a hidden attribute shape a face, and lets public character show", () => {
        const plain = face({}, "traits", 52, { traits: [] });
        expect(face({}, "traits", 52, { traits: ["corrupt", "loyal", "ambitious"] })).toEqual(plain);
        expect(face({}, "traits", 52, { traits: ["charismatic"] }).mouth.expression).toBeGreaterThan(plain.mouth.expression);
        expect(face({}, "traits", 52, { traits: ["hawkish"] }).brows.tilt).toBeLessThan(plain.brows.tilt);
    });
});
describe("distinctness at avatar size", () => {
    it("tells apart twenty-five people the record describes identically", () => {
        // What survives at forty pixels: the hair's shape and shade, the skin, the
        // glasses, the beard, and what they wear. The worst case is a cabinet whose
        // facets all match, so it is the case measured.
        const signature = (g) => [g.hair.cut, g.hair.color, g.skin.tone, g.skin.undertone, g.eyewear.style, g.facialHair, g.attire.garment, g.attire.primary, g.attire.accent, g.head.shape].join("|");
        const cabinet = Array.from({ length: 25 }, (_, i) => face({}, `PER-USA-cabinet-${i}`));
        expect(new Set(cabinet.map(signature)).size).toBeGreaterThanOrEqual(23);
    });
});
describe("faceForPerson", () => {
    const person = {
        id: "PER-USA-secretary-state-1",
        name: "Evelyn Hart",
        nationality: "USA",
        age: 58,
        portraitRef: portraitRef({ ...BASE, gender: "feminine", hairStyle: "long" }),
        traits: [],
        eligibleRoles: [],
    };
    it("draws a generated person from their facets, seeded by who they are", () => {
        const g = faceForPerson(person);
        expect(g?.presentation).toBe("feminine");
        expect(faceForPerson(person)).toEqual(g);
        expect(faceForPerson({ ...person, id: "PER-USA-secretary-state-2" })).not.toEqual(g);
    });
    it("reads an authored face as authored, and draws nothing for a reference that is neither", () => {
        const authored = face({ gender: "androgynous" }, "authored");
        expect(faceForPerson({ ...person, portraitRef: faceRef(authored) })?.presentation).toBe("androgynous");
        expect(faceForPerson({ ...person, portraitRef: "portrait-player-leader" })).toBeUndefined();
    });
});
describe("nameTraditionOf", () => {
    it("reads the tradition a name was drawn from back out of the name", () => {
        expect(nameTraditionOf("Harjit Singh", "IND")).toBe("south-asian-sikh");
        expect(nameTraditionOf("Priya Sharma", "IND")).toBe("south-asian-hindu");
    });
});
