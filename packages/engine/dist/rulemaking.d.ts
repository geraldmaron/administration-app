import type { TurnPhase } from "./turn-loop.js";
/**
 * The week a rule becomes final, and the week Congress unmakes one.
 *
 * Runs after the courts, so a strike-down and a landing that fall in the same
 * week resolve in the order they actually would: the bench speaks first, and a
 * rule it has just stayed does not then take effect.
 */
export declare const rulemakingPhase: TurnPhase;
