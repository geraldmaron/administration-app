import { type LegendEntry, type LensFill, type LensLevel, type MapLens, type RegionRef } from "./contract.js";
import type { MapPalette } from "./palette.js";
/** A mixed value in proportion: each color with its share's weight. */
export interface LensMix {
    readonly colors: readonly string[];
    readonly weights: readonly number[];
}
/**
 * One region as a filled map and its list both draw it: the ref it is chosen
 * by, its name, the value in words, its rank, and one color. A mixed reading
 * fills with its majority color and carries the mix for a proportional key.
 */
export interface LensRow {
    readonly regionKey: string;
    readonly label: string;
    readonly value: string;
    readonly rank: number;
    readonly fill: string;
    readonly mix?: LensMix;
    readonly figure?: string;
    readonly salience?: number;
}
/** A drawn region's color where the list carries no row of its own: a district under its state's reading, a state read as the United States. */
export interface LensPaint {
    readonly regionKey: string;
    readonly fill: string;
    readonly label: string;
    readonly value: string;
}
/** Everything a map panel draws for one lens: its name and key, the ranked rows, and the colors of the regions the rows do not list. */
export interface LensView {
    readonly id: string;
    readonly name: string;
    readonly level: LensLevel;
    readonly legend: readonly LegendEntry[];
    readonly rows: readonly LensRow[];
    readonly paint: readonly LensPaint[];
}
/** The one color a fill draws as: a solid's color, a mix's largest share, or the quiet land. */
export declare function fillColor(fill: LensFill, palette: MapPalette): string;
/**
 * The lens as a ranked list at the level the map is drawing: the data table,
 * the arrow-key order and the forced-colors view. Regions the lens says
 * nothing about are left out; regions with no data sort last.
 */
export declare function lensRows(lens: MapLens, regions: readonly RegionRef[], effective: LensLevel, palette: MapPalette): readonly LensRow[];
/** The lens read for a map: the ranked rows, plus the color of every other drawn region the lens says something about. */
export declare function lensView(lens: MapLens, regions: readonly RegionRef[], effective: LensLevel, palette: MapPalette): LensView;
