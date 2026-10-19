import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { ScenarioSelectorLike } from "./scenario-cast.js";
/**
 * How bad the worst matching condition at home is, or zero if there is none.
 * Zero rather than undefined so an unbounded `conditionActive` still means
 * "there is one", via the `atLeast` an authored gate always carries.
 */
export declare function worstConditionSeverity(campaign: Campaign, kind?: string): number;
/**
 * How long a gating flag has to stand before age stops adding weight. A deed
 * a year cold is as ripe as a deed two years cold: past this the callback is
 * already at the front of the queue, and letting the multiplier keep climbing
 * would let one ancient follow-up crowd out everything the board is doing now.
 */
export declare const FLAG_AGE_SATURATION = 12;
export declare function effectiveWeight(campaign: Campaign, def: ScenarioSelectorLike, counterpart: NationId): number;
