import type { NationId, Relationship } from "@admin/world";
import { currentEventId, type CausalId } from "./causality.js";
import type { Campaign } from "./state.js";
import { selectNation, selectRelationship } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";

type IncidentPressure = {
  readonly tensionBefore: number;
  readonly militaryThreatBefore: number;
  readonly tensionAdded: number;
  readonly militaryThreatAdded: number;
};

/** A bilateral hazard, kept separately from a government's deliberate border-clash decision. */
export type BorderIncident = {
  readonly id: string;
  readonly parties: readonly [NationId, NationId];
  readonly openedTurn: number;
  readonly revision: number;
  /** Exact increment each directed edge received after clamping, in parties order. */
  readonly pressure: readonly [IncidentPressure, IncidentPressure];
  readonly causedBy?: CausalId;
  readonly assessment?: {
    readonly turn: number;
    readonly finding: "likely-inadvertent" | "undetermined";
    readonly confidence: "low" | "moderate";
    readonly evidence: readonly string[];
  };
};

export type BorderIncidentEffect = {
  readonly kind: "borderIncident";
  readonly incident: BorderIncident;
  readonly expectedRevision: number | null;
};

export function applyBorderIncident(campaign: Campaign, effect: BorderIncidentEffect): Campaign {
  const old = campaign.borderIncidents?.[effect.incident.id];
  if ((old?.revision ?? null) !== effect.expectedRevision) return campaign;
  if (old && (effect.incident.revision !== old.revision + 1 ||
    effect.incident.parties[0] !== old.parties[0] || effect.incident.parties[1] !== old.parties[1] ||
    effect.incident.openedTurn !== old.openedTurn)) throw new Error("Invalid border incident revision");
  if (!old && effect.incident.revision !== 0) throw new Error("A new border incident must start at revision zero");
  const incident = { ...effect.incident, causedBy: old?.causedBy ?? effect.incident.causedBy ?? currentEventId() };
  return { ...campaign, borderIncidents: { ...campaign.borderIncidents, [incident.id]: incident } };
}

const HISTORY_KIND = "world-event:border-incident";
const ASSESSMENT_KIND = "world-event:border-incident-assessment";
const PAIR_COOLDOWN = 26;
const GLOBAL_COOLDOWN = 8;
// Provisional game pacing assumption, not an observed incident frequency.
const HAZARD_SCALE = 0.004;

export const borderIncidentPairKey = (a: NationId, b: NationId): string =>
  a < b ? `${a}:${b}` : `${b}:${a}`;
const pairId = (a: NationId, b: NationId, turn: number): string => `border-incident:${borderIncidentPairKey(a, b)}:${turn}`;
const nameOf = (campaign: Campaign, id: NationId): string => selectNation(campaign, id)?.base.identity.name ?? id;

function eligiblePairs(campaign: Campaign): readonly (readonly [NationId, NationId, Relationship, Relationship])[] {
  if (Object.values(campaign.borderIncidents ?? {}).some((incident) => campaign.turn - incident.openedTurn < GLOBAL_COOLDOWN)) return [];
  return (Object.keys(campaign.nations) as NationId[]).sort().flatMap((a) =>
    (selectNation(campaign, a)?.base.geo.neighbors ?? []).flatMap((b) => {
      if (a >= b || !campaign.nations[b]) return [];
      const forward = selectRelationship(campaign, a, b);
      const back = selectRelationship(campaign, b, a);
      if (!forward || !back) return [];
      if (Math.max(forward.tension, back.tension) < 0.18) return [];
      if (Object.values(campaign.conflicts).some((conflict) => conflict.status === "active" &&
        ((conflict.aggressor === a && conflict.defender === b) || (conflict.aggressor === b && conflict.defender === a)))) return [];
      if ([forward, back].some((edge) => edge.history.some((event) =>
        event.kind === HISTORY_KIND && campaign.turn - event.turn < PAIR_COOLDOWN))) return [];
      return [[a, b, forward, back] as const];
    }),
  );
}

function pressureOf(edge: Relationship): IncidentPressure {
  return { tensionBefore: edge.tension, militaryThreatBefore: edge.militaryThreat,
    tensionAdded: Math.min(0.05, 1 - edge.tension), militaryThreatAdded: Math.min(0.02, 1 - edge.militaryThreat) };
}

function openingPacket(campaign: Campaign, a: NationId, b: NationId): EffectPacket {
  const id = pairId(a, b, campaign.turn);
  const headline = `An exchange of fire is reported on the border between ${nameOf(campaign, a)} and ${nameOf(campaign, b)}; who fired first is not established.`;
  const history = { turn: campaign.turn, kind: HISTORY_KIND, description: headline };
  const forward = selectRelationship(campaign, a, b)!;
  const back = selectRelationship(campaign, b, a)!;
  const incident: BorderIncident = { id, parties: [a, b], openedTurn: campaign.turn, revision: 0,
    pressure: [pressureOf(forward), pressureOf(back)] };
  return {
    source: "simulate", actor: "world", turn: campaign.turn,
    narration: { summary: headline },
    provenance: { origin: "world", entities: [a, b], systems: ["world-events", "relations"], visibility: "public", confidence: "contested" },
    effects: [
      { kind: "borderIncident", incident, expectedRevision: null },
      { kind: "relationship", from: a, to: b, deltas: { tension: 0.05, militaryThreat: 0.02 }, addHistory: history },
      { kind: "relationship", from: b, to: a, deltas: { tension: 0.05, militaryThreat: 0.02 }, addHistory: history },
      { kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", headline,
        facts: { subject: "an unresolved border incident", topicTags: ["world", "security"] } }] },
    ],
  };
}

/** One independent hazard draw per real, unsettled border; a deliberate clash is decided elsewhere. */
export function borderIncidentPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[] {
  const candidates = eligiblePairs(campaign).flatMap(([a, b, forward, back]) => {
    const friction = Math.min(1, (forward.tension + back.tension + forward.militaryThreat + back.militaryThreat) / 2);
    const draw = streams.stream("border-incident", campaign.turn, a, b).next();
    return draw < HAZARD_SCALE * friction ? [{ a, b, draw }] : [];
  });
  const selected = candidates.sort((left, right) => left.draw - right.draw || `${left.a}:${left.b}`.localeCompare(`${right.a}:${right.b}`))[0];
  return selected ? [openingPacket(campaign, selected.a, selected.b)] : [];
}

function assessmentPacket(campaign: Campaign, incident: BorderIncident, streams: RngStreams): EffectPacket {
  const [a, b] = incident.parties;
  const capability = Math.max(campaign.nations[a]?.stats.security.intelCapability ?? 0,
    campaign.nations[b]?.stats.security.intelCapability ?? 0);
  // Provisional discovery odds; an absent record leaves the cause unresolved.
  const logs = streams.stream("border-incident-evidence", incident.id, "orders").next() < 0.35 + capability * 0.35;
  const radio = streams.stream("border-incident-evidence", incident.id, "radio").next() < 0.2 + capability * 0.3;
  const evidence = [
    ...(logs ? ["available orders logs contain no order to open fire"] : []),
    ...(radio ? ["radio records show confused position reports"] : []),
  ];
  const likely = logs && radio;
  const finding = likely ? "likely-inadvertent" : "undetermined";
  const line = likely
    ? `A review of the ${nameOf(campaign, a)}–${nameOf(campaign, b)} border incident finds inadvertent fire likely, based on orders logs and radio records; it does not establish who fired first.`
    : `A review of the ${nameOf(campaign, a)}–${nameOf(campaign, b)} border incident cannot establish who fired first or whether either command ordered it.`;
  const next: BorderIncident = { ...incident, revision: incident.revision + 1,
    assessment: { turn: campaign.turn, finding, confidence: likely ? "moderate" : "low", evidence } };
  const history = { turn: campaign.turn, kind: ASSESSMENT_KIND, description: line };
  const relief = (edge: Relationship, pressure: IncidentPressure) => likely ? {
    tension: -Math.min(0.02, pressure.tensionAdded, Math.max(0, edge.tension - pressure.tensionBefore)),
    militaryThreat: -Math.min(0.01, pressure.militaryThreatAdded, Math.max(0, edge.militaryThreat - pressure.militaryThreatBefore)),
  } : {};
  const forward = selectRelationship(campaign, a, b)!;
  const back = selectRelationship(campaign, b, a)!;
  const effects: readonly Effect[] = [
    { kind: "borderIncident", incident: next, expectedRevision: incident.revision },
    { kind: "relationship", from: a, to: b, deltas: relief(forward, incident.pressure[0]), addHistory: history },
    { kind: "relationship", from: b, to: a, deltas: relief(back, incident.pressure[1]), addHistory: history },
    { kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", headline: line,
      facts: { subject: "a border incident assessment", topicTags: ["world", "security"] } }] },
  ];
  return { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: line }, effects,
    provenance: { origin: "institution", entities: [a, b], systems: ["world-events", "relations"],
      ...(incident.causedBy ? { causeIds: [incident.causedBy] } : {}), visibility: "public", confidence: likely ? "assessed" : "contested" } };
}

/** Evidence is gathered after the incident, not inferred from a government's general intent score. */
export function borderIncidentAssessmentPackets(campaign: Campaign, streams: RngStreams): readonly EffectPacket[] {
  return Object.values(campaign.borderIncidents ?? {})
    .filter((incident) => !incident.assessment && campaign.turn - incident.openedTurn >= 2)
    .map((incident) => assessmentPacket(campaign, incident, streams));
}
