import type { MapPalette } from "../palette.js";
import type { RegionRef } from "../contract.js";
/** Every government, state and district the dataset lists, as the map's geometry names them. */
export declare const REGIONS: readonly RegionRef[];
export declare const region: (layer: RegionRef["layer"], id: string) => RegionRef;
/** A palette of plain names, so a test reads which slot a lens chose. */
export declare const NAMED_PALETTE: MapPalette;
