import { ScenarioDef } from "../scenario.js";
/**
 * The corpus baked into the player binary, lifted out of the generated module
 * the same way verify-shipped-content-parses does: each shard body is one
 * `JSON.stringify` literal on its own line.
 */
export declare function bakedScenarios(): readonly ScenarioDef[];
