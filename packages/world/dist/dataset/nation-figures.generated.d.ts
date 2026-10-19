import type { NationFigures } from "./compose-nation.js";
/**
 * The readings on every row that no source states: fitted from the authored
 * roster's own readings against the governance indicators and sourced mass.
 * A country with no standing military holds its force readings at zero instead.
 */
export declare const JUDGED_READINGS: readonly string[];
export declare const NATION_FIGURES: Readonly<Record<string, NationFigures>>;
