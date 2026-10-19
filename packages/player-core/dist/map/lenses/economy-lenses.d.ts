import type { Campaign } from "@admin/engine";
import { type MapLens } from "../contract.js";
import { type MapPalette } from "../palette.js";
export declare function jobsLens(campaign: Campaign | null, palette: MapPalette): MapLens;
export declare function pricesLens(campaign: Campaign | null, palette: MapPalette): MapLens;
export declare function outputLens(campaign: Campaign | null, palette: MapPalette): MapLens;
export declare function dependenceLens(campaign: Campaign | null, palette: MapPalette): MapLens;
