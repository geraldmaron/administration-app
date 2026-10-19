import type { NationId } from "@admin/world";
import { type Campaign, type ChamberVote, type IssuedAuthorizationAct, type LobbyForecast } from "./state.js";
import { type CongressResult } from "./congress.js";
import { type EffectPacket } from "./effects.js";
/** Days both chambers hold the request after it is filed. */
export declare const AUTHORIZATION_DELAY_DAYS = 3;
export type AuthorizationProjection = {
    readonly target: NationId;
    readonly title: string;
    readonly votes: readonly ChamberVote[];
    readonly wouldPass: boolean;
    /** Hidden engine odds; ordinary play reads `forecast` instead. */
    readonly successChance: number;
    readonly forecast: LobbyForecast;
    /** The one-line reason the count is what it is — no exact shortfall. */
    readonly reasoning: string;
};
export type AuthorizationIssueResult = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly projection: AuthorizationProjection;
    readonly act: IssuedAuthorizationAct;
    readonly packet: EffectPacket;
};
/**
 * The whip count before the vote is held. Pure and seed-independent: the engine
 * still uses the exact arithmetic; ordinary play reads likelihood and
 * confidence instead of the yeas.
 */
export declare function projectForceAuthorization(campaign: Campaign, target: NationId): AuthorizationProjection;
/**
 * Ask Congress. The floor has not voted; Continue brings the count on the due
 * date. Ordinary play freezes likelihood and confidence, not the yeas.
 */
export declare function issueForceAuthorization(campaign: Campaign, target: NationId): AuthorizationIssueResult;
/** Resolve one issued force authorization whose due date has arrived. */
export declare function resolveIssuedAuthorization(campaign: Campaign, id: string): CongressResult;
export declare function dueIssuedAuthorizationActs(campaign: Campaign): readonly IssuedAuthorizationAct[];
/** Every force authorization still waiting on Congress, whether or not it is due. */
export declare function outstandingIssuedAuthorizationActs(campaign: Campaign): readonly IssuedAuthorizationAct[];
/**
 * Apply every force authorization that has come due.
 */
export declare function resolveDueAuthorizations(campaign: Campaign): {
    readonly campaign: Campaign;
    readonly packets: readonly EffectPacket[];
};
