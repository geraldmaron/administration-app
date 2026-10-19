import { PortraitAttire, PortraitHeritage, PortraitSkinTone, type PortraitAgeBand, type PortraitEyewear, type PortraitFacialHair, type PortraitGenderPresentation, type PortraitHairColor, type PortraitHairStyle } from "../schemas/portrait.js";
/** A draw where the options are not equally likely. */
export type Weighted<T> = ReadonlyArray<{
    value: T;
    weight: number;
}>;
export declare const NATION_HERITAGE_MIX: Record<string, ReadonlyArray<{
    heritage: PortraitHeritage;
    weight: number;
}>>;
export declare const HERITAGE_SKIN_TONES: Record<PortraitHeritage, readonly PortraitSkinTone[]>;
export declare const ROLE_ATTIRE: Record<string, Weighted<PortraitAttire>>;
export declare const GENDER_PRESENTATIONS: readonly PortraitGenderPresentation[];
export declare const GENDER_WEIGHTS: Record<PortraitGenderPresentation, number>;
export declare const HAIR_STYLE_WEIGHTS: Record<PortraitGenderPresentation, Record<PortraitAgeBand, Weighted<PortraitHairStyle>>>;
export declare const DEFAULT_HEAD_COVERING = 0.02;
export declare const NATION_HEAD_COVERING: Record<string, number>;
export declare const HERITAGE_HAIR_COLORS: Record<PortraitHeritage, Weighted<PortraitHairColor>>;
/** How likely hair has gone gray or white by each band, whatever it started as. */
export declare const AGE_BAND_GRAYING: Record<PortraitAgeBand, {
    graying: number;
    white: number;
}>;
export declare const FACIAL_HAIR_WEIGHTS: Record<PortraitGenderPresentation, Weighted<PortraitFacialHair>>;
/** Reading glasses become common with age, and read as senior official at any age. */
export declare const AGE_BAND_EYEWEAR: Record<PortraitAgeBand, Weighted<PortraitEyewear>>;
/**
 * The authored mix where a country has one, then a thin country's own prior,
 * then its region's. Throws for a nation the dataset does not carry, rather
 * than handing it some region's faces.
 */
export declare function heritageMixFor(nation: string): ReadonlyArray<{
    heritage: PortraitHeritage;
    weight: number;
}>;
export declare function attireOptionsFor(role: string): Weighted<PortraitAttire>;
export declare function hairStyleWeightsFor(gender: PortraitGenderPresentation, ageBand: PortraitAgeBand): Weighted<PortraitHairStyle>;
/**
 * How often this nation's public life shows a covered head. Nations with no
 * entry take the default rather than throwing: the head-covering table is a
 * refinement of a global baseline, and a missing entry means "unremarkable
 * here", not "unauthored".
 */
export declare function headCoveringRateFor(nation: string): number;
export declare function hairColorWeightsFor(heritage: PortraitHeritage): Weighted<PortraitHairColor>;
export declare function facialHairWeightsFor(gender: PortraitGenderPresentation): Weighted<PortraitFacialHair>;
export declare function eyewearWeightsFor(ageBand: PortraitAgeBand): Weighted<PortraitEyewear>;
/** A US party as the bench table reads it; absent for a person no ticket carries. */
export type BenchParty = "democrat" | "republican" | "independent" | undefined;
/**
 * The presentation one seat draws, as a single weighted pick. An American
 * reads the bench row for their seat and party; every other nation reads its
 * government's row in the leader table, and the global weights only where the
 * table has no row.
 */
export declare function genderWeightsFor(nation: string, role: string, party: BenchParty): Weighted<PortraitGenderPresentation>;
/** The faces one seat draws: the American bench row, or the nation's own mix everywhere else. */
export declare function seatHeritageMixFor(nation: string, role: string, party: BenchParty): ReadonlyArray<{
    heritage: PortraitHeritage;
    weight: number;
}>;
