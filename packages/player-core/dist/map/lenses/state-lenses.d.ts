import { type Campaign, type StateCall } from "@admin/engine";
import { leanWords } from "../../world/nation-overview.js";
import { type LensReading, type MapLens } from "../contract.js";
import { type MapPalette } from "../palette.js";
export declare function approvalLens(campaign: Campaign | null, palette: MapPalette): MapLens;
/** Lean in points, the way a reader says it: D+12, R+4, Even. The panel says it the same way. */
export declare const leanText: typeof leanWords;
export declare function leanLens(campaign: Campaign | null, palette: MapPalette): MapLens;
/** One state's call: carried, lost, or (Maine and Nebraska) split by district. */
export declare function callReading(call: StateCall, palette: MapPalette): LensReading;
export declare function callLens(campaign: Campaign | null, palette: MapPalette): MapLens;
/** How many people live in each state, the live headcount: color on a log scale, radius by area. */
export declare function statePopulationLens(campaign: Campaign | null, palette: MapPalette): MapLens;
