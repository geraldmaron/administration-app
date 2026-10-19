import type { MaritimeZone } from "../schemas/zone.js";
import type { WorldDataset } from "../schemas/dataset.js";
import { type UsBasingRow } from "../dataset/us-basing.js";
import type { ValidationError } from "./validation-error.js";
/**
 * How far off the host's baked outline a sourced point may sit. The outlines
 * are Natural Earth at 1:50m, kept to a tenth of a plate unit (about four
 * kilometers at the equator), so a naval station on a harbor or a base on a
 * small island falls a few kilometers into the drawn sea: Bahrain's whole
 * outline is six points, and the furthest sourced point off its outline,
 * Changi, sits under six kilometers out. Ten kilometers admits that and still
 * refuses a point in a neighboring country or a transposed coordinate.
 */
export declare const COASTAL_TOLERANCE_KM = 10;
/**
 * Kosovo and the Marshall Islands have no baked outline, so a point there is
 * held to the government's recorded position instead. Kwajalein sits about
 * 490 kilometers from Majuro inside one atoll chain, which sets the radius;
 * it is a weaker check than containment, and the test pins which hosts take it.
 */
export declare const OUTLINE_LESS_RADIUS_KM = 600;
export type PlacementTables = {
    readonly basing: readonly UsBasingRow[];
    readonly zones: readonly MaritimeZone[];
};
/** Installations whose host the map bakes no outline for: the hosts held to a radius rather than containment. */
export declare function outlineLessHosts(rows?: readonly UsBasingRow[]): readonly string[];
/**
 * The placement rules: every installation anchor is well formed, and a sourced
 * point falls inside its host's outline or within the coastal tolerance; every
 * maritime zone is a simple ring with open water, framed by governments on
 * the roster, and overlaps no other zone.
 */
export declare function checkForcePlacement(dataset: WorldDataset, tables?: PlacementTables): ValidationError[];
