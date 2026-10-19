import type { FaceGenome } from "../schemas/face.js";
import type { PortraitHeritage } from "../schemas/portrait.js";
export type Odds<T> = ReadonlyArray<readonly [T, number]>;
type Genome = FaceGenome;
export declare const isAfricanHeritage: (heritage: string) => boolean;
/** Where the epicanthic fold and a low lid crease are common, the lid shapes lean that way. */
export declare const ASIAN_LID: ReadonlySet<string>;
export declare const HAIR_TEXTURE_ODDS: Readonly<Partial<Record<PortraitHeritage, Odds<Genome["hair"]["texture"]>>>>;
export declare const EYE_SHAPE_ODDS: Readonly<Partial<Record<PortraitHeritage, Odds<Genome["eyes"]["shape"]>>>>;
export declare const DEFAULT_EYE_SHAPE_ODDS: Odds<Genome["eyes"]["shape"]>;
export declare const EYE_COLOR_ODDS: Readonly<Partial<Record<PortraitHeritage, Odds<Genome["eyes"]["color"]>>>>;
export declare const DEFAULT_EYE_COLOR_ODDS: Odds<Genome["eyes"]["color"]>;
/**
 * The most a heritage moves a nose or lip gene's mean: a sixth of the range.
 * Enough that a cast reads as coming from somewhere, never enough to draw a type.
 */
export declare const HERITAGE_SHIFT_CAP: number;
export declare const NATURAL_HAIR_ODDS: Readonly<Record<"black" | "brown" | "fair" | "red", Odds<Genome["hair"]["color"]>>>;
/**
 * How much each trait the game shows moves the resting face. Corruption,
 * loyalty, ambition and integrity are absent on purpose: a portrait must not
 * tell the player what the game makes them earn.
 */
export declare const TRAIT_EXPRESSION: Readonly<Record<string, {
    readonly mouth: number;
    readonly brow: number;
}>>;
/** Seats whose holders sit for their portrait in a robe. */
export declare const JUDICIAL_ROLES: ReadonlySet<string>;
export declare const GULF_DRESS: ReadonlySet<string>;
export declare const WEST_AFRICAN_DRESS: ReadonlySet<string>;
export declare const SOUTH_ASIAN_DRESS: ReadonlySet<string>;
export declare const PECI_DRESS: ReadonlySet<string>;
type Fabric = Genome["attire"]["primary"];
export declare const SUIT_CLOTH: Odds<Fabric>;
export declare const SHIRT_CLOTH: Odds<Fabric>;
export declare const TIE_CLOTH: Odds<Fabric>;
export declare const BLAZER_CLOTH: Odds<Fabric>;
export declare const BLOUSE_CLOTH: Odds<Fabric>;
export declare const SCARF_CLOTH: Odds<Fabric>;
export declare const DUPATTA_CLOTH: Odds<Fabric>;
export declare const GELE_CLOTH: Odds<Fabric>;
export declare const DASTAR_CLOTH: Odds<Fabric>;
export declare const CAP_CLOTH: Odds<Fabric>;
export declare const UNIFORM_CLOTH: Odds<Fabric>;
export {};
