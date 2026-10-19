import type { Campaign } from "@admin/engine";
import { type MapLens } from "../contract.js";
import { type MapPalette } from "../palette.js";
/** The radius multiplier a magnitude lens gives a share of its maximum: 0.6× to 1.6×, area tracking value. */
export declare function magnitudeScale(value: number, max: number): number;
export declare function relationsLens(campaign: Campaign | null, palette: MapPalette): MapLens;
export declare function forcesLens(campaign: Campaign | null, palette: MapPalette): MapLens;
/** The plain magnitude lens: color on a log scale, radius by area. It reads the dataset, so it needs no campaign. */
export declare function populationLens(palette: MapPalette): MapLens;
