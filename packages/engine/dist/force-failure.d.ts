import type { Effect } from "./effects.js";
import type { InstrumentContext } from "./instrument-gates.js";
import type { NationId } from "@admin/world";
import { type Campaign } from "./state.js";
/** Planning value: the navy or air arm a government needs to fire on a force sent against it, the floor a blockade is itself stood up out of. */
export declare const ANSWER_ARM_FLOOR = 0.3;
/**
 * Whether a government can answer an act of force with its own: forces ready
 * enough to take a heavy rung, and a navy or an air arm that reaches the ships
 * or aircraft sent against it. Where it cannot, "hits back harder" is not a way
 * the act can fail, and the projection does not offer it.
 */
export declare function answersWithForce(campaign: Campaign, nation: NationId): boolean;
/**
 * Whether "hits back harder" is a way this rung can fail: only an act of force
 * puts a force on the target to fire on, and only a target that can answer
 * does. An exercise or a forward deployment that fails is a signal that did
 * not land, and the projection does not offer a retaliation behind it.
 */
export declare function hitsBackHarder(campaign: Campaign, rung: number, target: NationId): boolean;
/**
 * What a failed act of force leaves beyond the failure itself, or nothing for
 * an act that is not force. A blockade or strike spends readiness and is
 * reported as an introduction into hostilities whether or not it landed; an
 * act of force the target answers opens or heats a war.
 */
export declare function failedForceEffects(ctx: InstrumentContext, rung: number, riskId: string | undefined): readonly Effect[];
