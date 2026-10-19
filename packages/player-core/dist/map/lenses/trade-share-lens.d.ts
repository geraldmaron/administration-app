import type { Campaign } from "@admin/engine";
import { type MapLens } from "../contract.js";
import { type MapPalette } from "../palette.js";
/** Each government's share of US goods trade: color on a square-root ramp, so the largest partners do not flatten everyone else, and radius by area. */
export declare function tradeShareLens(campaign: Campaign | null, palette: MapPalette): MapLens;
