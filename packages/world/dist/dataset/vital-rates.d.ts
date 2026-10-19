import type { Nation } from "../schemas/nation.js";
export declare function applyVitalRates<T extends Pick<Nation, "stats">>(nations: readonly T[]): T[];
