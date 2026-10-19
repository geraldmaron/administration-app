import { type Nation, type WorldDataset } from "../schemas/index.js";
import type { ValidationError } from "./validation-error.js";
import { type CarriedConflictRow } from "../dataset/carried-conflicts.js";
import { type UsBasingRow } from "../dataset/us-basing.js";
import { type UsMunitionsRow } from "../dataset/us-munitions.js";
/**
 * Units' personnel may not exceed the service's headcount outright. The
 * catalog's establishments are rough, so the check is one-directional and has
 * no lower bound: a service whose named units account for a tenth of its people
 * is a service whose staff, training and support are simply not on the roster.
 */
export declare function checkForceAssets(nation: Nation): ValidationError[];
/** The five US munition classes, named here so a seed row with a class nobody reads is refused. */
export declare const US_MUNITION_CLASS_IDS: readonly ["air-defense", "naval-interceptors", "cruise-standoff", "precision-fires", "artillery-155"];
/** The seed tables the board is built from, passed in so a check can be exercised on a planted row. */
export type ForceBoardTables = {
    readonly basing: readonly UsBasingRow[];
    readonly conflicts: readonly CarriedConflictRow[];
    readonly munitions: readonly UsMunitionsRow[];
};
/**
 * The governments a seed row may name: this dataset's and the shipped
 * roster's. A row whose host the dataset leaves out is not seeded into a world
 * built from it (the board filters on the host), so a small world is not wrong
 * for lacking Japan; a row naming a government on neither is a typo.
 */
export declare function seedRosterOf(dataset: WorldDataset): ReadonlySet<string>;
/**
 * The board's force rules across the roster: installations abroad on a host
 * that exists, carried conflicts between governments on the roster and never
 * with the United States as a belligerent, munitions classes the engine knows
 * on the 0 to 1 index, and a source someone opened behind every row.
 */
export declare function checkForceBoard(dataset: WorldDataset, tables?: ForceBoardTables): ValidationError[];
