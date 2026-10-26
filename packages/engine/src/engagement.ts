import { agendaTheme, type AgendaTheme, type NationId, type NationTraits, type Relationship } from "@admin/world";
import { selectNation, selectRelationship, selectRelationshipsFrom, type Campaign, type FeedItem } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { grudgeWeight, relationshipAnchor } from "./relationships.js";
import { liveTemperament, TEMPERAMENT_CENTER } from "./temperament.js";
import { nationName } from "./naming.js";
import { engagementLine } from "./wire.js";
import { envoyBenchLean, envoyLean, presidentRapport } from "./treaty-counterpart.js";
import { sharedPressureWarning } from "./intelligence.js";
import {
  noiseFrom,
  projectWillingness,
  stampOf,
  weigh,
  willDraw,
  type DecisionStamp,
  type Term,
  type Willingness,
  type WillingnessProjection,
} from "./willingness.js";

// Engagement: a call, an envoy, a visit, a summit, a joint declaration. A
// family of acts that works a relationship without coercing it, priced by one
// path for the President and for every other government, and kept outside the
// instrument ladder because every rung of that ladder is read as coercion.
//
// The other side decides whether to receive it, from its own ties to the one
// asking and its own temperament; a government that is received moves both
// edges of the pair a bounded step toward warmth. Nothing here draws a flat
// chance: the one draw is the noise on the receiving government's weighing.

export type EngagementKind = "call" | "envoy" | "visit" | "summit" | "declaration";

export const ENGAGEMENT_KINDS: readonly EngagementKind[] = ["call", "envoy", "visit", "summit", "declaration"];

export type EngagementRequest = {
  readonly actor: NationId;
  readonly target: NationId;
  readonly kind: EngagementKind;
};

type Warmth = { readonly trust: number; readonly tension: number; readonly alignment: number };

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
export const ENGAGEMENT_BOUND = 0.06;

/** Planning ceiling above standing trust for routine contact, shared by calls and envoys. */
export const ROUTINE_TRUST_SURPLUS = 0.06;

// Planning values, set so a call is almost always taken and a joint declaration
// only between governments that already trust each other. A summit is how two
// tense governments meet, so it is the one that works mostly on tension. A
// joint declaration records trust already built and sets the pair's direction,
// so it moves common aims at the family's bound and trust no more than a visit.
export const ENGAGEMENT_TERMS: Readonly<Record<EngagementKind, KindTerms>> = {
  call: { warmth: { trust: 0.02, tension: -0.01, alignment: 0 }, cooldownWeeks: 4, threshold: -0.4 },
  envoy: { warmth: { trust: 0.02, tension: -0.02, alignment: 0 }, cooldownWeeks: 6, threshold: -0.2 },
  visit: { warmth: { trust: 0.05, tension: -0.02, alignment: 0.02 }, cooldownWeeks: 26, threshold: 0.15 },
  summit: { warmth: { trust: 0.03, tension: -0.06, alignment: 0 }, cooldownWeeks: 26, threshold: 0 },
  declaration: { warmth: { trust: 0.04, tension: -0.02, alignment: 0.06 }, cooldownWeeks: 52, threshold: 0.35 },
};

/** The noise on a government's decision to receive; inside this margin the draw decides. */
const RECEIVE_NOISE = 0.1;

/** The trust each side must hold before a joint declaration is on the table at all. */
export const DECLARATION_TRUST = 0.3;
/** The tension below which two governments have no need of a summit. */
export const SUMMIT_TENSION = 0.3;
/** The host's trust in the visitor below which it will not stage a state visit. */
export const VISIT_HOST_TRUST = 0;

// How much engagement serves each kind of aim. Standing is built at summits and
// on state visits; a government after its own autonomy engages widely so no one
// patron owns it; an inward agenda finds little in it.
const ENGAGEMENT_AFFINITY: Record<AgendaTheme, number> = {
  security: 0.45,
  economic: 0.7,
  prestige: 0.95,
  autonomy: 0.6,
  internal: 0.3,
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round4 = (v: number) => Math.round(v * 10000) / 10000 || 0;

export const engagementHistoryKind = (kind: EngagementKind): string => `engagement-${kind}`;

/** How much a government's own aims are served by engaging at all, 0..1. */
export function engagementAffinity(traits: NationTraits): number {
  const total = traits.agendas.reduce((sum, agenda) => sum + agenda.weight, 0);
  if (total === 0) return 0.5;
  const weighted = traits.agendas.reduce((sum, agenda) => {
    const theme = agendaTheme(agenda.id);
    return sum + (theme ? ENGAGEMENT_AFFINITY[theme] : 0.5) * agenda.weight;
  }, 0);
  return weighted / total;
}

/** The week this kind was last made or refused on this edge, if it was. */
function lastMade(edge: Relationship, kind: EngagementKind): number | undefined {
  const tag = engagementHistoryKind(kind);
  const made = edge.history.filter((event) => event.kind === tag || event.kind === `${tag}-declined`);
  return made.length > 0 ? Math.max(...made.map((event) => event.turn)) : undefined;
}

// --- The people at the table ---------------------------------------------

/**
 * How much the Secretary of State's own hand counts in a government's decision
 * to receive each kind. A call is the President on the line and nobody else; an
 * envoy is the Secretary's own work, and a visit, a summit or a declaration is
 * prepared by the department before the President arrives.
 */
export const ENVOY_WEIGHT: Readonly<Record<EngagementKind, number>> = {
  call: 0,
  envoy: 0.3,
  visit: 0.15,
  summit: 0.2,
  declaration: 0.15,
};

/**
 * How much warmer a received meeting is with a Secretary at the strong end of
 * the bench, and how much cooler at the weak end. A product choice for how much
 * the Secretary of State's leadership is worth, not a tuned figure; an empty
 * chair reads below the bench and lands 15% cooler.
 */
const WARMTH_PER_BENCH_LEAN = 0.12;

/** How much rapport between the two leaders counts in a decision to receive. */
const RECEIVE_RAPPORT_WEIGHT = 0.15;

const byPresidentOf = (campaign: Campaign, request: EngagementRequest): boolean => request.actor === campaign.founding.nation;

/**
 * How far the Secretary of State's craft sizes what a received meeting does
 * for the relationship. Only the President's own meetings, and never a call,
 * which the Secretary does not prepare; 1 everywhere else.
 */
export function warmthScale(campaign: Campaign, request: EngagementRequest): number {
  if (!byPresidentOf(campaign, request) || ENVOY_WEIGHT[request.kind] === 0) return 1;
  return round4(1 + WARMTH_PER_BENCH_LEAN * envoyBenchLean(campaign));
}

/**
 * The President's side of the table, as the receiving government weighs it:
 * who the department sent, and how the two leaders get on. Nothing for another
 * government's request, whose own people are not modeled at the table.
 */
function presidentTerms(campaign: Campaign, request: EngagementRequest): readonly Term[] {
  if (!byPresidentOf(campaign, request)) return [];
  const weight = ENVOY_WEIGHT[request.kind];
  const rapport = presidentRapport(campaign, request.target);
  return [
    ...(weight > 0 ? [{ key: "envoy" as const, source: "situation" as const, value: round4(weight * envoyLean(campaign)) }] : []),
    ...(rapport === undefined ? [] : [{ key: "rapport" as const, source: "trait" as const, value: round4(RECEIVE_RAPPORT_WEIGHT * rapport) }]),
  ];
}

/**
 * Why a kind is off the table this week, so a screen can say so instead of
 * leaving the offer out. Each is the one gate that closed it, checked in the
 * order `engagementAvailable` always checked them.
 */
export type EngagementHold =
  | { readonly kind: "no-relationship" }
  | { readonly kind: "cooldown"; readonly weeksLeft: number }
  | { readonly kind: "host-distrusts"; readonly theirs: number; readonly need: number }
  | { readonly kind: "too-calm"; readonly tension: number; readonly need: number }
  | { readonly kind: "too-little-trust"; readonly ours: number; readonly theirs: number; readonly need: number };

/** What keeps this kind off the table between the two this week, or undefined when it is on it. */
export function engagementHold(campaign: Campaign, request: EngagementRequest): EngagementHold | undefined {
  const out = selectRelationship(campaign, request.actor, request.target);
  const back = selectRelationship(campaign, request.target, request.actor);
  if (!out || !back || request.actor === request.target) return { kind: "no-relationship" };
  const last = lastMade(out, request.kind);
  const cooldown = ENGAGEMENT_TERMS[request.kind].cooldownWeeks;
  if (last !== undefined && campaign.turn - last < cooldown) return { kind: "cooldown", weeksLeft: cooldown - (campaign.turn - last) };
  if (request.kind === "visit" && back.trust < VISIT_HOST_TRUST) return { kind: "host-distrusts", theirs: back.trust, need: VISIT_HOST_TRUST };
  const tension = Math.max(out.tension, back.tension);
  if (request.kind === "summit" && tension < SUMMIT_TENSION) return { kind: "too-calm", tension, need: SUMMIT_TENSION };
  if (request.kind === "declaration" && (out.trust < DECLARATION_TRUST || back.trust < DECLARATION_TRUST)) return { kind: "too-little-trust", ours: out.trust, theirs: back.trust, need: DECLARATION_TRUST };
  return undefined;
}

/** Whether this kind is on the table between the two this week. */
export function engagementAvailable(campaign: Campaign, request: EngagementRequest): boolean {
  return engagementHold(campaign, request) === undefined;
}

/** The engagements a government could make this week, to the governments it has a working relationship with. */
export function engagementCandidates(
  campaign: Campaign,
  actor: NationId,
  targets?: readonly NationId[],
): readonly EngagementRequest[] {
  const allowed = targets ? new Set(targets as readonly string[]) : undefined;
  return selectRelationshipsFrom(campaign, actor)
    .filter((edge) => !allowed || allowed.has(edge.to as string))
    .flatMap((edge) => ENGAGEMENT_KINDS.map((kind) => ({ actor, target: edge.to, kind })))
    .filter((request) => engagementAvailable(campaign, request));
}

/**
 * What the receiving government weighs: its own trust in the one asking, what
 * stands between them, what the one asking is worth to it, whether its own aims
 * are served by the meeting, and whether it is a government that keeps to
 * itself. Read from the edge the receiver holds and its live temperament; for
 * the President's own request, also who the State Department sent and how the
 * two leaders get on.
 */
function receiveTerms(campaign: Campaign, request: EngagementRequest): readonly Term[] {
  const back = selectRelationship(campaign, request.target, request.actor)!;
  const temper = liveTemperament(campaign, request.target)!;
  const asker = selectNation(campaign, request.actor)!;
  const weight = (asker.base.bands.powerTier - 1) / 4;
  return [
    { key: "bond", source: "interest", value: round4(0.8 * back.trust) },
    { key: "enmity", source: "situation", value: round4(-(0.6 * back.tension + 0.4 * clamp01(grudgeWeight(back)))) },
    { key: "stakes", source: "interest", value: round4(0.4 * clamp01(back.tradeDependence + 0.5 * weight)) },
    { key: "agenda-fit", source: "interest", value: round4(0.3 * (engagementAffinity(temper) - 0.5)) },
    { key: "isolationism", source: "trait", value: round4(-0.3 * (temper.isolationism - TEMPERAMENT_CENTER.isolationism)) },
    ...(request.actor === campaign.founding.nation && (request.kind === "envoy" || request.kind === "summit") &&
      sharedPressureWarning(campaign, request.target)
      ? [{ key: "shared-warning" as const, source: "situation" as const, value: 0.05 }] : []),
    ...presidentTerms(campaign, request),
  ];
}

export type EngagementProjection = {
  readonly request: EngagementRequest;
  /** Whether the other side would take the meeting. */
  readonly willingness: WillingnessProjection;
  /** Exactly what a received engagement writes: both edges, and the record of it on the asker's. */
  readonly effects: readonly Effect[];
};

/** One reading's step, sized by the Secretary's craft and never past the family's bound. */
const sized = (value: number, scale: number): number =>
  scale === 1 ? value : round4(Math.max(-ENGAGEMENT_BOUND, Math.min(ENGAGEMENT_BOUND, value * scale)));

function routineTrust(campaign: Campaign, from: NationId, to: NationId, trust: number): number {
  const edge = selectRelationship(campaign, from, to)!;
  const anchor = relationshipAnchor(campaign, edge);
  if (!anchor) return 0;
  const room = Math.max(0, ROUTINE_TRUST_SURPLUS - Math.max(0, edge.trust - anchor.trust));
  return Math.min(room, trust * room / ROUTINE_TRUST_SURPLUS);
}

function warmthEffects(campaign: Campaign, request: EngagementRequest, line: string): readonly Effect[] {
  const { warmth } = ENGAGEMENT_TERMS[request.kind];
  const scale = warmthScale(campaign, request);
  const deltas = { trust: sized(warmth.trust, scale), tension: sized(warmth.tension, scale), alignment: sized(warmth.alignment, scale) };
  const onEdge = (from: NationId, to: NationId): Warmth => request.kind === "call" || request.kind === "envoy"
    ? { ...deltas, trust: routineTrust(campaign, from, to, deltas.trust) } : deltas;
  return [
    {
      kind: "relationship",
      from: request.actor,
      to: request.target,
      deltas: onEdge(request.actor, request.target),
      addHistory: { turn: campaign.turn, kind: engagementHistoryKind(request.kind), description: line },
    },
    { kind: "relationship", from: request.target, to: request.actor, deltas: onEdge(request.target, request.actor) },
  ];
}

function namesOf(campaign: Campaign, request: EngagementRequest): { readonly actor: string; readonly target: string } {
  const name = (id: NationId) => {
    const identity = selectNation(campaign, id)?.base.identity;
    return identity ? nationName(identity) : (id as string);
  };
  return { actor: name(request.actor), target: name(request.target) };
}

function readout(campaign: Campaign, request: EngagementRequest, received: boolean): string {
  const byPresident = byPresidentOf(campaign, request);
  return engagementLine({ kind: request.kind, ...namesOf(campaign, request), byPresident, received, turn: campaign.turn });
}

/** Whether the other side would take it, without the draw. The agent reads this and not the whole projection, which composes prose. */
export function projectReceive(campaign: Campaign, request: EngagementRequest): WillingnessProjection {
  return projectWillingness("receive-engagement", receiveTerms(campaign, request), {
    threshold: ENGAGEMENT_TERMS[request.kind].threshold,
    noiseBound: RECEIVE_NOISE,
  });
}

/** What an engagement would do before it is made. Undefined where the kind is not on the table this week. */
export function projectEngagement(campaign: Campaign, request: EngagementRequest): EngagementProjection | undefined {
  if (!engagementAvailable(campaign, request)) return undefined;
  const willingness = projectReceive(campaign, request);
  return { request, willingness, effects: warmthEffects(campaign, request, readout(campaign, request, true)) };
}

/**
 * The receiving government's reasoning as it stands this week, with no draw
 * in it: what a reading of the offer is allowed to name. Never applied.
 */
export function receivePreview(campaign: Campaign, request: EngagementRequest): DecisionStamp {
  const preview = weigh("receive-engagement", receiveTerms(campaign, request), {
    threshold: ENGAGEMENT_TERMS[request.kind].threshold,
    noiseBound: RECEIVE_NOISE,
    noise: 0,
  });
  return stampOf(preview, request.target as string, request.actor as string, "intelligence");
}

/** The receiving government's decision, with its one draw. Keyed without the week, so the answer moves only with the terms. */
export function receiveDecision(campaign: Campaign, request: EngagementRequest, streams: RngStreams): Willingness {
  const draw = willDraw(streams, "receive-engagement", request.target, request.actor, request.kind);
  return weigh("receive-engagement", receiveTerms(campaign, request), {
    threshold: ENGAGEMENT_TERMS[request.kind].threshold,
    noiseBound: RECEIVE_NOISE,
    noise: noiseFrom(draw, RECEIVE_NOISE),
  });
}

function feedItem(campaign: Campaign, request: EngagementRequest, headline: string): FeedItem {
  const byPresident = request.actor === campaign.founding.nation;
  return {
    turn: campaign.turn + 1,
    kind: byPresident ? "player-action" : "npc-action",
    visibility: "public",
    headline,
    actor: request.actor,
    target: request.target,
    facts: { instrument: `engagement:${request.kind}`, topicTags: ["diplomacy"] },
  };
}

export type EngagementResult =
  | { readonly ok: true; readonly received: boolean; readonly packet: EffectPacket; readonly decision: DecisionStamp }
  | { readonly ok: false; readonly reason: string };

/**
 * Make the engagement: the receiving government decides, and the packet writes
 * what the projection promised if it said yes, or only the record of the
 * refusal if it said no. The one path for the President and every other
 * government; the President's commit and the agent's chosen move both land here.
 */
export function engagementPacket(campaign: Campaign, request: EngagementRequest, streams: RngStreams): EngagementResult {
  const projection = projectEngagement(campaign, request);
  if (!projection) {
    return { ok: false, reason: `A ${request.kind} with ${namesOf(campaign, request).target} is not on the table this week.` };
  }
  const decision = receiveDecision(campaign, request, streams);
  const stamp = stampOf(decision, request.target as string, request.actor as string, "intelligence");
  const byPresident = request.actor === campaign.founding.nation;
  const headline = readout(campaign, request, decision.acts);
  const declined: Effect = {
    kind: "relationship",
    from: request.actor,
    to: request.target,
    addHistory: { turn: campaign.turn, kind: `${engagementHistoryKind(request.kind)}-declined`, description: headline },
  };
  return {
    ok: true,
    received: decision.acts,
    decision: stamp,
    packet: {
      source: byPresident ? "action" : "simulate",
      actor: byPresident ? "player" : "world",
      turn: campaign.turn,
      narration: { summary: headline },
      effects: [...(decision.acts ? projection.effects : [declined]), { kind: "feed", items: [feedItem(campaign, request, headline)] }],
      provenance: { origin: "decision", entities: [request.actor, request.target], systems: ["engagement"], decision: stamp },
    },
  };
}
