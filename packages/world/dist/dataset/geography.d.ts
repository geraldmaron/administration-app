import { Chokepoint, NationGeography } from "../schemas/geography.js";
import type { Nation } from "../schemas/nation.js";
export declare const chokepoints: Chokepoint[];
export declare const nationGeographies: NationGeography[];
export declare const chokepointById: ReadonlyMap<string, Chokepoint>;
export declare const geographyByNation: ReadonlyMap<string, NationGeography>;
export declare function applyGeography<T extends Pick<Nation, "id" | "geo">>(nations: readonly T[]): T[];
