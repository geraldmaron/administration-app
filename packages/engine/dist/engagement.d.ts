import { type NationId, type NationTraits } from "@admin/world";
import { type Campaign } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { type DecisionStamp, type Willingness, type WillingnessProjection } from "./willingness.js";
export type EngagementKind = "call" | "envoy" | "visit" | "summit" | "declaration";
export declare const ENGAGEMENT_KINDS: readonly EngagementKind[];
export type EngagementRequest = {
    readonly actor: NationId;
    readonly target: NationId;
    readonly kind: EngagementKind;
};
type Warmth = {
    readonly trust: number;
    readonly tension: number;
    readonly alignment: number;
};
type KindTerms = {
    /** What a received engagement does to each edge of the pair. Trust and alignment up, tension down. */
    readonly warmth: Warmth;
    /** How many weeks the same kind waits before it is worth making again on the same edge. */
    readonly cooldownWeeks: number;
    /** Where the receiving government's weighing has to land for it to say yes. */
    readonly threshold: number;
};
/**
 * The most any one engagement moves any one reading. A single call is not a
 * reconciliation; a relationship is changed by a run of them, which is why the
 * cooldown and this bound are set together.
 */
export declare const ENGAGEMENT_BOUND = 0.06;
/** Planning ceiling above standing trust for routine contact, shared by calls and envoys. */
export declare const ROUTINE_TRUST_SURPLUS = 0.06;
export declare const ENGAGEMENT_TERMS: Readonly<Record<EngagementKind, KindTerms>>;
/** The trust each side must hold before a joint declaration is on the table at all. */
export declare const DECLARATION_TRUST = 0.3;
/** The tension below which two governments have no need of a summit. */
export declare const SUMMIT_TENSION = 0.3;
/** The host's trust in the visitor below which it will not stage a state visit. */
export declare const VISIT_HOST_TRUST = 0;
export declare const engagementHistoryKind: (kind: EngagementKind) => string;
/** How much a government's own aims are served by engaging at all, 0..1. */
export declare function engagementAffinity(traits: NationTraits): number;
/**
 * How much the Secretary of State's own hand counts in a government's decision
 * to receive each kind. A call is the President on the line and nobody else; an
 * envoy is the Secretary's own work, and a visit, a summit or a declaration is
 * prepared by the department before the President arrives.
 */
export declare const ENVOY_WEIGHT: Readonly<Record<EngagementKind, number>>;
/**
 * How far the Secretary of State's craft sizes what a received meeting does
 * for the relationship. Only the President's own meetings, and never a call,
 * which the Secretary does not prepare; 1 everywhere else.
 */
export declare function warmthScale(campaign: Campaign, request: EngagementRequest): number;
/**
 * Why a kind is off the table this week, so a screen can say so instead of
 * leaving the offer out. Each is the one gate that closed it, checked in the
 * order `engagementAvailable` always checked them.
 */
export type EngagementHold = {
    readonly kind: "no-relationship";
} | {
    readonly kind: "cooldown";
    readonly weeksLeft: number;
} | {
    readonly kind: "host-distrusts";
    readonly theirs: number;
    readonly need: number;
} | {
    readonly kind: "too-calm";
    readonly tension: number;
    readonly need: number;
} | {
    readonly kind: "too-little-trust";
    readonly ours: number;
    readonly theirs: number;
    readonly need: number;
};
/** What keeps this kind off the table between the two this week, or undefined when it is on it. */
export declare function engagementHold(campaign: Campaign, request: EngagementRequest): EngagementHold | undefined;
/** Whether this kind is on the table between the two this week. */
export declare function engagementAvailable(campaign: Campaign, request: EngagementRequest): boolean;
/** The engagements a government could make this week, to the governments it has a working relationship with. */
export declare function engagementCandidates(campaign: Campaign, actor: NationId, targets?: readonly NationId[]): readonly EngagementRequest[];
export type EngagementProjection = {
    readonly request: EngagementRequest;
    /** Whether the other side would take the meeting. */
    readonly willingness: WillingnessProjection;
    /** Exactly what a received engagement writes: both edges, and the record of it on the asker's. */
    readonly effects: readonly Effect[];
};
/** Whether the other side would take it, without the draw. The agent reads this and not the whole projection, which composes prose. */
export declare function projectReceive(campaign: Campaign, request: EngagementRequest): WillingnessProjection;
/** What an engagement would do before it is made. Undefined where the kind is not on the table this week. */
export declare function projectEngagement(campaign: Campaign, request: EngagementRequest): EngagementProjection | undefined;
/**
 * The receiving government's reasoning as it stands this week, with no draw
 * in it: what a reading of the offer is allowed to name. Never applied.
 */
export declare function receivePreview(campaign: Campaign, request: EngagementRequest): DecisionStamp;
/** The receiving government's decision, with its one draw. Keyed without the week, so the answer moves only with the terms. */
export declare function receiveDecision(campaign: Campaign, request: EngagementRequest, streams: RngStreams): Willingness;
export type EngagementResult = {
    readonly ok: true;
    readonly received: boolean;
    readonly packet: EffectPacket;
    readonly decision: DecisionStamp;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Make the engagement: the receiving government decides, and the packet writes
 * what the projection promised if it said yes, or only the record of the
 * refusal if it said no. The one path for the President and every other
 * government; the President's commit and the agent's chosen move both land here.
 */
export declare function engagementPacket(campaign: Campaign, request: EngagementRequest, streams: RngStreams): EngagementResult;
export {};
