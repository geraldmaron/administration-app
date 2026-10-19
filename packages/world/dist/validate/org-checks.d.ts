import type { WorldDataset } from "../schemas/index.js";
import { type DyadRow } from "../dataset/dyads.js";
import type { ValidationError } from "./validation-error.js";
/** One sourced pair: refused without a link and an opened date, and read only inside its schema ranges. */
export declare function dyadErrors(row: DyadRow, index: number): ValidationError[];
/** The registry's cross-record rules, and the sourced dyads'. */
export declare function checkOrganizations(dataset: WorldDataset): ValidationError[];
