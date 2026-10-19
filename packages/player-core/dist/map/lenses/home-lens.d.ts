import { type MapLens } from "../contract.js";
import type { MapPalette } from "../palette.js";
/** The id that names a ticket's homes: yours, your running mate's, and the shortlisted mates'. */
export declare function homesLensId(you: string | undefined, mate: string | undefined, bench?: readonly string[]): string;
export declare function homesLens(id: string, palette: MapPalette): MapLens | undefined;
