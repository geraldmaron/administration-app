import type { Effect } from "./effects.js";
import { type InstrumentContext, type InstrumentRung } from "./instrument-gates.js";
/**
 * A rung's bill against the force that took it, written on the actor's own
 * services rather than on the player's panel.
 *
 * It has to be the nation stat and not the metric, because the ladder is one
 * code path for the player and for every other capital: a cost only the
 * player's own panel carried would hand the world a tempo the player could not
 * match, and `forcePhase` would have nothing to regenerate. The player's panel
 * still moves, because `apply()` mirrors this nation's readiness onto it — one
 * force, written once, read in two places.
 */
export declare function spendsReadiness(ctx: InstrumentContext, rung: 3 | 4 | 5): readonly Effect[];
export declare const militaryRungs: InstrumentRung[];
