import type { WorldDataset } from "../schemas/index.js";
import type { ValidationError } from "./validation-error.js";
type WorldDatasetT = WorldDataset;
/**
 * Every shipped nation states how power is contested inside it.
 *
 * The field is optional on the schema so a save or a fixture written before it
 * still loads; it is required here so a nation cannot ship without it. An
 * absent slate and an authored `contest: "none"` are different statements —
 * absent is "nobody researched this", "none" is "researched, and this country
 * runs no parties" — and only the second is a fact a surface may print.
 */
export declare function checkNationPartySystem(dataset: WorldDatasetT): ValidationError[];
export {};
