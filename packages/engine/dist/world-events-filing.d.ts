import type { NationId, OrgId } from "@admin/world";
import { type Campaign, type FeedItem, type FeedVisibility } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { type DecisionStamp, type Term, type Willingness } from "./willingness.js";
import { type WorldEventFamily } from "./world-event-templates.js";
/** Inside this margin the draw decides a member's or a government's vote. */
export declare const EVENT_NOISE = 0.1;
/** A member's vote in a body's own chamber: a bloc's sanctions, an admission, a departure. */
export declare function decideVote(streams: RngStreams, terms: readonly Term[], threshold: number, subject: readonly (string | number)[]): Willingness;
/** A government deciding whether to act against a rival on a standing template. */
export declare function decideHostileAct(streams: RngStreams, terms: readonly Term[], threshold: number, subject: readonly (string | number)[]): Willingness;
/** A government that is not a party deciding whether to send help. */
export declare function decideAid(streams: RngStreams, terms: readonly Term[], threshold: number, subject: readonly (string | number)[]): Willingness;
export declare function filing(campaign: Campaign, family: WorldEventFamily, names: {
    readonly actor: string;
    readonly subject: string;
}, ids: {
    readonly actor?: NationId;
    readonly subject?: NationId;
}, visibility: FeedVisibility, index?: 0 | 1 | 2): FeedItem;
export declare function eventPacket(campaign: Campaign, summary: string, effects: readonly Effect[], stamp: DecisionStamp, entities: readonly string[]): EffectPacket;
type RelationshipEffect = Extract<Effect, {
    readonly kind: "relationship";
}>;
/**
 * A government's reaction on the edge it holds toward another, or nothing
 * where the graph holds no such edge. The graph is directed and sparse, so the
 * edge an actor holds toward its target does not promise one back, and
 * `apply()` refuses a move on an edge that is not there.
 */
export declare function onEdge(campaign: Campaign, effect: RelationshipEffect): readonly Effect[];
/** The marker a firing leaves on the acting government's edge: its cooldown, and the record of it. */
export declare function marker(campaign: Campaign, family: WorldEventFamily, from: NationId, to: NationId, description: string): Extract<Effect, {
    readonly kind: "relationship";
}>;
/** The governments sitting in a body this week, its authored roster as accessions and withdrawals have changed it. */
export declare function liveMembers(campaign: Campaign, org: OrgId): readonly NationId[];
export {};
