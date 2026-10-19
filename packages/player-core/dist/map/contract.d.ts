import type { MapPalette } from "./palette.js";
/** The level a lens is written for. */
export type LensLevel = "nation" | "state" | "district";
/** The three region layers the map draws: governments, states and congressional districts. */
export type RegionLayer = "world" | "states" | "districts";
export type LensScale = "categorical" | "sequential" | "diverging";
/** Color alone; color with a magnitude; or a mixed value in proportion. */
export type LensEncoding = "color" | "color-radius" | "dither";
export interface LegendEntry {
    readonly label: string;
    readonly color: string;
}
/**
 * How a reading colors its region. `scale` is a magnitude lens's size
 * multiplier (0.6× to 1.6×) for a renderer that draws one; a dither is a
 * mixed value (28 of 52 seats) in proportion.
 */
export type LensFill = {
    readonly kind: "solid";
    readonly color: string;
    readonly scale?: number;
} | {
    readonly kind: "dither";
    readonly colors: readonly string[];
    readonly weights: readonly number[];
} | {
    readonly kind: "none";
};
/** One region as a lens reads it: which layer, and its id there (`FRA`, `CA`, `NY-12`). */
export interface RegionRef {
    readonly layer: RegionLayer;
    readonly id: string;
    /** The name the geometry carries, for a government the dataset does not list. */
    readonly name?: string;
}
/** What a lens says about one region: the value in words, its rank in the list, and its color. */
export interface LensReading {
    readonly text: string;
    /** Orders the list, highest first. */
    readonly rank: number;
    readonly fill: LensFill;
    /** The value in a few characters ("54%", "+0.2"), for a label beside the region's name; absent for a reading that is a word. */
    readonly figure?: string;
    /**
     * How much the map should fight to name this region, 0 to 1. Absent, it is how far the region sits from the
     * middle of the lens's own ranking; a lens sets it where its ranking misleads (an unread government sorts last
     * without being an extreme).
     */
    readonly salience?: number;
}
/**
 * The lens contract. `read` answers null for a region outside the lens's
 * subject (foreign land under a state lens), which draws as neutral land; a
 * region inside it with nothing honest to show answers a no-data reading.
 */
export interface MapLens {
    readonly id: string;
    readonly name: string;
    readonly level: LensLevel;
    readonly scale: LensScale;
    readonly encoding: LensEncoding;
    readonly legend: readonly LegendEntry[];
    /** The House's equal-area view: every district one hex. */
    readonly cartogram?: "hex";
    readonly read: (region: RegionRef, effective: LensLevel) => LensReading | null;
}
/** A reading with its short figure for the map's labels. */
export declare function withFigure(reading: LensReading, figure: string): LensReading;
export declare function noData(palette: MapPalette, text?: string): LensReading;
export declare function solid(text: string, rank: number, color: string, scale?: number): LensReading;
export declare function neutralLens(): MapLens;
export declare function layerOfLevel(level: LensLevel): RegionLayer;
/** A region's ref, the form a selection and a route name it in: `nation:FRA`, `state:CA`, `district:NY-12`. */
export declare function refOf(region: RegionRef): string;
/** The region a ref names, or undefined for a ref that is no region. */
export declare function regionOfRef(ref: string): RegionRef | undefined;
/** The name a player reads for a region. */
export declare function regionName(region: RegionRef): string;
/**
 * What a lens says about a region as drawn. A nation lens reads a US state or
 * district as the United States, so the country does not go neutral when the
 * map draws its states. A state lens with nothing of its own to say about a
 * district reads the district's state, said as statewide.
 */
export declare function readRegion(lens: MapLens, region: RegionRef, effective: LensLevel): LensReading | null;
