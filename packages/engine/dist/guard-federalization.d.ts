import type { StateId } from "@admin/world";
import { type GovernorAsk } from "./governors.js";
import type { RngStreams } from "./rng.js";
import type { Campaign, FlagId } from "./state-campaign.js";
import type { NationCondition } from "./state-condition.js";
import type { EffectPacket } from "./effects.js";
/** Treasury deltas use USD millions, like every other metric packet. */
export declare const GUARD_SUPPORT_COORDINATION_USD_MILLIONS = 10;
export declare function guardRequestAnsweredFlag(state: StateId, conditionId: string): FlagId;
/**
 * The condition a state support coordination request would be about: the
 * most severe eligible emergency running there that has not
 * already had an answer this cooldown. Undefined where nothing in the state
 * qualifies, which is what keeps this from ever inventing an ask a real
 * emergency does not back.
 */
export declare function guardEligibleCondition(campaign: Campaign, state: StateId): NationCondition | undefined;
/**
 * What a support coordination request is about, in the terms `governor-consent`
 * weighs. Exported so a Desk card can project the same forecast
 * `requestGuardFederalization` will actually decide from
 * (`projectGovernorWillingness(campaign, state, guardAskFor(condition))`,
 * `governors.ts`), off one terms builder rather than two.
 */
export declare function guardAskFor(condition: NationCondition): GovernorAsk;
export type GuardRequestResult = {
    readonly ok: true;
    readonly consents: boolean;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** A consent funds modeled support coordination; legal deployment authority is separate. */
export declare function requestGuardFederalization(campaign: Campaign, state: StateId, streams: RngStreams): GuardRequestResult;
