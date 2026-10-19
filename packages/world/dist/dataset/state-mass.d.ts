import type { Nation } from "../schemas/nation.js";
import type { State } from "../schemas/state.js";
export declare const MASS_DERIVED_NATION = "USA";
export declare function applyStateMass<T extends Pick<Nation, "id" | "stats">>(nations: readonly T[], states: readonly State[]): T[];
