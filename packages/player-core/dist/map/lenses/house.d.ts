import { type Campaign } from "@admin/engine";
import { type MapLens } from "../contract.js";
import type { MapPalette } from "../palette.js";
export declare function houseLens(campaign: Campaign | null, palette: MapPalette): MapLens;
/** The same seats, every district one equal hex. */
export declare function houseHexLens(campaign: Campaign | null, palette: MapPalette): MapLens;
/** Each state's two senators, dithered half and half when the pair is split. */
export declare function senateLens(campaign: Campaign | null, palette: MapPalette): MapLens;
/** The lens id a bill's whip count takes: `whip:<chamber>:<bill id>`. */
export declare function whipLensId(chamber: "house" | "senate", billId: string): string;
/** Actual recorded delegation votes; future member support remains unresolved. */
export declare function whipLens(id: string, campaign: Campaign | null, palette: MapPalette): MapLens | undefined;
