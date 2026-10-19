import type { Campaign } from "@admin/engine";
import { type MapLens } from "../contract.js";
import type { MapPalette } from "../palette.js";
export declare const sidesLensId: (conflictId: string) => string;
export declare const bodyLensId: (orgId: string) => string;
export declare const partiesLensId: (treatyId: string) => string;
/** The set lens a directive names, or undefined where the id is none of the three. */
export declare function setLens(id: string, campaign: Campaign | null, palette: MapPalette): MapLens | undefined;
