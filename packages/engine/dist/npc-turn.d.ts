import type { NationId } from "@admin/world";
import { type Campaign, type FeedItem, type FeedVisibility, type Pursuit } from "./state.js";
import { type WireAct } from "./wire.js";
import { type RngStreams } from "./rng.js";
import type { Effect, EffectPacket } from "./effects.js";
import { type NpcDecision } from "./npc-agent.js";
import { type ResolutionRequest, type ResolutionResult } from "./resolution.js";
import type { TurnPhase } from "./turn-loop.js";
export declare const MAX_NPC_ACTIONS_PER_TURN = 3;
export type NpcTurnOutcome = {
    readonly decision: NpcDecision;
    readonly result: Extract<ResolutionResult, {
        ok: true;
    }>;
    readonly feedItem?: FeedItem;
    readonly pursuit?: Pursuit;
};
/**
 * How often a nation reaches for something in a week, 0..0.9. Opportunistic
 * and aggressive states reach more often, isolationist ones less, scaled by
 * how deeply the dataset knows the country.
 */
export declare function initiativeRate(campaign: Campaign, actor: NationId): number;
export declare function npcActorsThisTurn(campaign: Campaign, streams: RngStreams): NationId[];
export declare function feedVisibility(campaign: Campaign, outcome: {
    readonly covert: boolean;
    readonly exposed: boolean;
    readonly actor: NationId;
}): FeedVisibility | undefined;
export declare function wireActFor(campaign: Campaign, result: Extract<ResolutionResult, {
    ok: true;
}>, turn: number): WireAct;
export declare function runNpcTurn(campaign: Campaign, actor: NationId, streams: RngStreams): NpcTurnOutcome | undefined;
/**
 * An engagement the government chose over every coercive move: made through
 * the same priced path the President's own call takes, and stamped with the
 * actor's reason for making it. The other side's reason for receiving it or
 * not is the packet's own and is replaced here, because the act of record is
 * the actor's.
 */
export declare function engagementTurn(campaign: Campaign, decision: NpcDecision, streams: RngStreams): EffectPacket | undefined;
/**
 * What a made act spends of the world's tempo: every regime operation and every act of force spends one,
 * landed or not, and a war it opened spends a closure of each priced strait it
 * newly contests. Read against the board before the act lands.
 */
export declare function npcTempoRecord(campaign: Campaign, request: ResolutionRequest, effects: readonly Effect[]): Effect | undefined;
export declare const npcActionPhase: TurnPhase;
