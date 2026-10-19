import { type Campaign } from "@admin/engine";
import { type MapLens } from "../contract.js";
import { type MapPalette } from "../palette.js";
/**
 * Approval by state, as the change from the campaign before the last act or
 * advance to the campaign now. The dots carry the move, which is the payoff
 * of an act; the exact before and after figures are in the list and tooltip.
 */
export declare function deltaLens(baseline: Campaign | null, campaign: Campaign | null, palette: MapPalette): MapLens;
/** The lens id for one closed week's move in approval by state, as the digest names it. */
export declare const weekLensId: (week: number) => string;
/**
 * One closed week's move in approval by state, read off the weekly series the
 * campaign keeps, so the digest can replay any week rather than only the last
 * run. The open week's figures stand in for the row the series has not yet
 * written. Undefined for an id that does not name a week.
 */
export declare function weekLens(id: string, campaign: Campaign | null, palette: MapPalette): MapLens | undefined;
