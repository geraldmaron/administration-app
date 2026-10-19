import type { CaseEffect } from "./case-types.js";
import type { Campaign } from "./state.js";
/** Drops entries that cannot be a case. Absence of the registry is left absent. */
export declare function repairCases(campaign: Campaign): Campaign;
/** Applies due defaults. The case stays, with status `defaulted`. The legal sentence is not run. */
export declare function withDueCaseDefaults(campaign: Campaign): Campaign;
/** World effects for open cases whose deadline is today or earlier. */
export declare function dueDefaultEffects(campaign: Campaign): readonly CaseEffect[];
