import type { Campaign } from "@admin/engine";
import { type MapLens } from "./contract.js";
import type { MapPalette } from "./palette.js";
/** Every lens id a directive may name. Anything else is the neutral lens. */
export declare const LENS_IDS: readonly ["neutral", "approval", "delta", "lean", "call", "relations", "forces", "house", "house-hex", "senate", "press-reach", "population", "jobs", "prices", "output", "federal-dependence", "conditions", "governors", "state-population", "trade-share", "world-trend", "world-alignment"];
export type LensId = (typeof LENS_IDS)[number];
export declare function isLensId(id: string | undefined): id is LensId;
/**
 * The lens an id names, built over the campaign (or none, before a campaign
 * exists). The delta lens also reads the campaign before the last change. An
 * unknown id is neutral, never an error.
 */
export declare function resolveLens(id: string | undefined, campaign: Campaign | null, palette: MapPalette, baseline?: Campaign | null): MapLens;
/** The lenses a page chooses for its own map, outside the screen-wide list. */
export declare const PAGE_LENS_IDS: readonly ["circuits", "delegation-warmth"];
