import type { ScenarioRoleHint } from "./scenario.js";
/**
 * The substrings a hint is resolved by, exposed so the paired test can check
 * the vocabulary against the government rather than restating this table.
 */
export declare function roleHintTargets(hint: ScenarioRoleHint): readonly string[];
