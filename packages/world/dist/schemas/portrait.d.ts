import { z } from "zod";
export declare const PortraitHeritage: z.ZodEnum<{
    "africa-west": "africa-west";
    "africa-east": "africa-east";
    "africa-southern": "africa-southern";
    "africa-central": "africa-central";
    mena: "mena";
    "europe-north": "europe-north";
    "europe-south": "europe-south";
    "europe-east": "europe-east";
    "central-asia": "central-asia";
    "south-asia": "south-asia";
    "east-asia": "east-asia";
    "southeast-asia": "southeast-asia";
    "latin-america": "latin-america";
    pacific: "pacific";
    mixed: "mixed";
}>;
export type PortraitHeritage = z.infer<typeof PortraitHeritage>;
export declare const PortraitGenderPresentation: z.ZodEnum<{
    masculine: "masculine";
    feminine: "feminine";
    androgynous: "androgynous";
}>;
export type PortraitGenderPresentation = z.infer<typeof PortraitGenderPresentation>;
export declare const PortraitAgeBand: z.ZodEnum<{
    early: "early";
    emerging: "emerging";
    established: "established";
    senior: "senior";
    elder: "elder";
}>;
export type PortraitAgeBand = z.infer<typeof PortraitAgeBand>;
export declare const PortraitSkinTone: z.ZodEnum<{
    "tone-1": "tone-1";
    "tone-2": "tone-2";
    "tone-3": "tone-3";
    "tone-4": "tone-4";
    "tone-5": "tone-5";
    "tone-6": "tone-6";
}>;
export type PortraitSkinTone = z.infer<typeof PortraitSkinTone>;
export declare const PortraitAttire: z.ZodEnum<{
    field: "field";
    business: "business";
    military: "military";
    ceremonial: "ceremonial";
    religious: "religious";
    academic: "academic";
}>;
export type PortraitAttire = z.infer<typeof PortraitAttire>;
export declare const PortraitHairStyle: z.ZodEnum<{
    short: "short";
    cropped: "cropped";
    long: "long";
    "tied-back": "tied-back";
    covered: "covered";
    bald: "bald";
}>;
export type PortraitHairStyle = z.infer<typeof PortraitHairStyle>;
export declare const PortraitHairColor: z.ZodEnum<{
    black: "black";
    brown: "brown";
    fair: "fair";
    red: "red";
    graying: "graying";
    white: "white";
}>;
export type PortraitHairColor = z.infer<typeof PortraitHairColor>;
export declare const PortraitFacialHair: z.ZodEnum<{
    none: "none";
    stubble: "stubble";
    mustache: "mustache";
    "trimmed-beard": "trimmed-beard";
    "full-beard": "full-beard";
}>;
export type PortraitFacialHair = z.infer<typeof PortraitFacialHair>;
export declare const PortraitEyewear: z.ZodEnum<{
    none: "none";
    glasses: "glasses";
}>;
export type PortraitEyewear = z.infer<typeof PortraitEyewear>;
export declare const PortraitFacets: z.ZodObject<{
    heritage: z.ZodEnum<{
        "africa-west": "africa-west";
        "africa-east": "africa-east";
        "africa-southern": "africa-southern";
        "africa-central": "africa-central";
        mena: "mena";
        "europe-north": "europe-north";
        "europe-south": "europe-south";
        "europe-east": "europe-east";
        "central-asia": "central-asia";
        "south-asia": "south-asia";
        "east-asia": "east-asia";
        "southeast-asia": "southeast-asia";
        "latin-america": "latin-america";
        pacific: "pacific";
        mixed: "mixed";
    }>;
    gender: z.ZodEnum<{
        masculine: "masculine";
        feminine: "feminine";
        androgynous: "androgynous";
    }>;
    ageBand: z.ZodEnum<{
        early: "early";
        emerging: "emerging";
        established: "established";
        senior: "senior";
        elder: "elder";
    }>;
    skinTone: z.ZodEnum<{
        "tone-1": "tone-1";
        "tone-2": "tone-2";
        "tone-3": "tone-3";
        "tone-4": "tone-4";
        "tone-5": "tone-5";
        "tone-6": "tone-6";
    }>;
    attire: z.ZodEnum<{
        field: "field";
        business: "business";
        military: "military";
        ceremonial: "ceremonial";
        religious: "religious";
        academic: "academic";
    }>;
    hairStyle: z.ZodEnum<{
        short: "short";
        cropped: "cropped";
        long: "long";
        "tied-back": "tied-back";
        covered: "covered";
        bald: "bald";
    }>;
    hairColor: z.ZodEnum<{
        black: "black";
        brown: "brown";
        fair: "fair";
        red: "red";
        graying: "graying";
        white: "white";
    }>;
    facialHair: z.ZodEnum<{
        none: "none";
        stubble: "stubble";
        mustache: "mustache";
        "trimmed-beard": "trimmed-beard";
        "full-beard": "full-beard";
    }>;
    eyewear: z.ZodEnum<{
        none: "none";
        glasses: "glasses";
    }>;
    variant: z.ZodNumber;
}, z.core.$strip>;
export type PortraitFacets = z.infer<typeof PortraitFacets>;
export declare const AGE_BAND_BOUNDS: Record<PortraitAgeBand, {
    min: number;
    max: number;
}>;
export declare function ageBandFor(age: number): PortraitAgeBand;
export declare function portraitRef(facets: PortraitFacets): string;
export declare function parsePortraitRef(ref: string): PortraitFacets;
