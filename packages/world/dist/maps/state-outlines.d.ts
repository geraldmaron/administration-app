import type { LonLat } from "../schemas/zone.js";
import type { StateId } from "../schemas/state.js";
import { type Ring } from "../geo/polygon.js";
/**
 * A longitude and latitude in the US map's plane, through the projection the
 * named state is drawn with. Alaska and Hawaii are insets, so the state picks
 * the inset rather than the point's own extent.
 */
export declare function projectToUsPlate(state: StateId, point: LonLat): LonLat;
/** Kilometers on the ground per plane unit, at the projection's scale; the inset scale makes Alaska's coarser. */
export declare function kmPerUsPlateUnit(state: StateId): number;
/** A state's baked outline as rings in the US map's plane. */
export declare function stateOutline(state: StateId): readonly Ring[];
/** Whether a longitude and latitude falls inside the state's drawn outline. */
export declare function stateContains(state: StateId, point: LonLat): boolean;
/** Kilometers from a longitude and latitude to the nearest edge of the state's drawn outline. */
export declare function distanceToStateKm(state: StateId, point: LonLat): number;
