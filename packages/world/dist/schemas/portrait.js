import { z } from "zod";
// A portrait is addressed by what it depicts, not by an opaque asset id. Every
// facet below is a real axis of human variation the cast has to span, so the
// reference itself is the coverage record: if a combination is never
// referenced, the gap is visible without opening a single image.
// Heritage is a *visual* grouping, not a nationality and not an ethnicity
// claim about any individual. It exists so a nation's cast looks like it could
// plausibly come from that part of the world, and it is deliberately coarse:
// finer categories would imply a precision that neither the art nor the game
// has, and would invite treating people as types.
export const PortraitHeritage = z.enum([
    "africa-west",
    "africa-east",
    "africa-southern",
    "africa-central",
    "mena",
    "europe-north",
    "europe-south",
    "europe-east",
    "central-asia",
    "south-asia",
    "east-asia",
    "southeast-asia",
    "latin-america",
    "pacific",
    "mixed",
]);
// Presentation, not identity: this selects how a face is rendered, and nothing
// in the game reads it as a fact about the person.
export const PortraitGenderPresentation = z.enum(["masculine", "feminine", "androgynous"]);
export const PortraitAgeBand = z.enum(["early", "emerging", "established", "senior", "elder"]);
// Its own axis rather than something implied by heritage. Every region of the
// world contains a range of skin tones, and collapsing tone into heritage is
// exactly the flattening this system is meant to avoid.
export const PortraitSkinTone = z.enum(["tone-1", "tone-2", "tone-3", "tone-4", "tone-5", "tone-6"]);
export const PortraitAttire = z.enum(["business", "military", "ceremonial", "religious", "academic", "field"]);
// Style and color are separate axes because they vary independently in life.
// Folding them together — as a single enum carrying both "tied-back" and
// "graying" did — makes half the real combinations unsayable: nobody could be
// both balding and gray, and nobody with tied-back hair could be either.
export const PortraitHairStyle = z.enum(["short", "cropped", "long", "tied-back", "covered", "bald"]);
export const PortraitHairColor = z.enum(["black", "brown", "fair", "red", "graying", "white"]);
// The strongest individuating feature on a masculine portrait: a cast with no
// way to author a beard reads as one face in different suits.
export const PortraitFacialHair = z.enum(["none", "stubble", "mustache", "trimmed-beard", "full-beard"]);
export const PortraitEyewear = z.enum(["none", "glasses"]);
export const PortraitFacets = z.object({
    heritage: PortraitHeritage,
    gender: PortraitGenderPresentation,
    ageBand: PortraitAgeBand,
    skinTone: PortraitSkinTone,
    attire: PortraitAttire,
    hairStyle: PortraitHairStyle,
    hairColor: PortraitHairColor,
    facialHair: PortraitFacialHair,
    eyewear: PortraitEyewear,
    // Distinguishes two people who happen to draw the same facets. Framing and
    // lighting are fixed by the visual standard, so the variant only ever
    // changes the face, never the shot.
    variant: z.number().int().min(1).max(8),
});
export const AGE_BAND_BOUNDS = {
    early: { min: 18, max: 33 },
    emerging: { min: 34, max: 44 },
    established: { min: 45, max: 59 },
    senior: { min: 60, max: 74 },
    elder: { min: 75, max: 100 },
};
export function ageBandFor(age) {
    for (const band of ["early", "emerging", "established", "senior"]) {
        if (age <= AGE_BAND_BOUNDS[band].max)
            return band;
    }
    return "elder";
}
const REF_PREFIX = "npc";
// The reference is the facet tuple, joined. Anything holding a portraitRef can
// recover exactly what it depicts without a lookup table, which is what lets
// coverage be checked from the cast alone.
export function portraitRef(facets) {
    const f = PortraitFacets.parse(facets);
    return [
        REF_PREFIX,
        f.heritage,
        f.gender,
        f.ageBand,
        f.skinTone,
        f.attire,
        f.hairStyle,
        f.hairColor,
        f.facialHair,
        f.eyewear,
        `v${f.variant}`,
    ].join("/");
}
const PART_COUNT = 11;
export function parsePortraitRef(ref) {
    const parts = ref.split("/");
    if (parts[0] !== REF_PREFIX) {
        throw new Error(`malformed portrait ref: ${ref}`);
    }
    if (parts.length !== PART_COUNT) {
        throw new Error(`malformed portrait ref: ${ref}`);
    }
    const [, heritage, gender, ageBand, skinTone, attire, hairStyle, hairColor, facialHair, eyewear, variant] = parts;
    return PortraitFacets.parse({
        heritage,
        gender,
        ageBand,
        skinTone,
        attire,
        hairStyle,
        hairColor,
        facialHair,
        eyewear,
        variant: Number(variant.replace(/^v/, "")),
    });
}
