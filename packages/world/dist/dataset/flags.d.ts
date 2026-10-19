import { FlagDesign, type FlagEmblem, type FlagLayout, type FlagTincture } from "../schemas/flag.js";
export type FlagTinctureSpec = {
    /** What a player and a screen reader both call it. */
    readonly name: string;
    readonly hex: string;
};
export declare const FLAG_TINCTURES: Readonly<Record<FlagTincture, FlagTinctureSpec>>;
export type FlagLayoutSpec = {
    readonly name: string;
    /** How many of the design's three tinctures this construction actually draws. */
    readonly bands: 2 | 3;
    /** Which tincture the charge is drawn over — the one it has to be legible against. */
    readonly emblemBand: 0 | 1 | 2;
    /** Which drawn areas share an edge, and therefore have to be told apart. */
    readonly touching: readonly (readonly [number, number])[];
};
export declare const FLAG_LAYOUTS: Readonly<Record<FlagLayout, FlagLayoutSpec>>;
export declare const FLAG_EMBLEMS: Readonly<Record<FlagEmblem, string>>;
/**
 * sRGB relative luminance, 0..1 — derived from the pigment rather than authored
 * beside it, so a palette edit cannot leave a stale brightness behind it.
 */
export declare function tinctureLuminance(tincture: FlagTincture): number;
export type FlagObjection = {
    /** In-fiction, because it is read by a player designing a flag, not a linter. */
    readonly explanation: string;
};
/**
 * Whether a design would actually read as a flag. Two near-identical greens
 * beside each other are not a bicolor, they are a smudge — and a charge that
 * disappears into the field it sits on is a charge nobody will ever see.
 */
export declare function flagObjections(design: FlagDesign): readonly FlagObjection[];
/**
 * The banner a founding opens on: sober, legible, and plainly a placeholder for
 * the player's own — three bands and a single star, the most common national
 * flag on earth in outline.
 */
export declare const defaultFlagDesign: FlagDesign;
