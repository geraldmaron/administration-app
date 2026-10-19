import { type ColorVision } from "@admin/design";
/**
 * The colors every lens paints with. The map is drawn on the dark theater in
 * either page theme, so every slot resolves from the design package's dark
 * set and map palettes; a color-vision setting or high contrast is a
 * different palette object, never a different lens.
 */
export interface MapPalette {
    readonly ground: string;
    /** The neutral lens and land a lens has nothing to say about. */
    readonly neutral: string;
    /** No data: dim neutral. */
    readonly nodata: string;
    /** Land a lens says nothing about, as a quiet fill under the lens colors. */
    readonly land: string;
    /** The seam between regions. */
    readonly border: string;
    readonly line: string;
    readonly seaGlow: string;
    readonly coast: string;
    readonly graticule: string;
    /** Lightness-first sequential ramp, low to high. */
    readonly seq: readonly string[];
    /** Diverging ramp, negative to positive, the middle step neutral. */
    readonly div: readonly string[];
    /** The public's standing behind the President, thin to broad: never a party's colors. */
    readonly standing: readonly string[];
    readonly democrat: string;
    readonly republican: string;
    readonly independent: string;
    readonly favorable: string;
    readonly steady: string;
    readonly caution: string;
    readonly adverse: string;
    /** A condition's three severities as the severity bars beside the map draw them: minor in the accent blue, serious in the brown-orange family, severe in red. */
    readonly minor: string;
    readonly serious: string;
    readonly unread: string;
    /** The United States itself, in gold. */
    readonly own: string;
    readonly forStrong: string;
    readonly forLean: string;
    readonly againstLean: string;
    readonly againstStrong: string;
    /** Selection outline and tint. */
    readonly selection: string;
    readonly shadow: string;
}
export interface PaletteOptions {
    readonly colorVision?: ColorVision;
    readonly highContrast?: boolean;
}
/** The palette a player's display settings resolve to. */
export declare function mapPalette(options?: PaletteOptions): MapPalette;
/** A ramp step for a share in 0..1. */
export declare function rampStep(ramp: readonly string[], share: number): string;
