import type { Nation, NationId } from "@admin/world";
import { type Campaign } from "./state.js";
import type { EffectContribution, ResolutionRequest, Ripple } from "./resolution.js";
import type { InstrumentId } from "./instrument-ids.js";
/** Planning value: the most approval can lift an observer above where it stands with the actor. */
export declare const APPROVAL_CEILING = 0.08;
/**
 * Planning value: the most objection alone can take an observer's trust below
 * where it stands with the actor. Deeper than the approval ceiling because a
 * grievance weighs more than a favor of the same size; bounded because an
 * observer that already reads a frequent coercer as one learns little from
 * the next act.
 */
export declare const OBJECTION_FLOOR = 0.25;
/**
 * The observer's signed reading of the move: below zero it objects, above
 * zero it approves. Exported because a war the world watches week after week
 * is read through the same ties as the act that opened it.
 */
export declare function observerStance(campaign: Campaign, observer: NationId, actor: NationId, target: Nation, instrument: InstrumentId): number;
export declare function projectRipples(campaign: Campaign, request: ResolutionRequest, target: Nation, severity: number, actorName: string): readonly Ripple[];
export declare function rippleContribution(campaign: Campaign, request: ResolutionRequest, ripples: readonly Ripple[]): EffectContribution;
