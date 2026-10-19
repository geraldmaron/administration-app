import { FOUNDING_DYADS, worldNations, type DyadKind, type DyadRow, type Nation, type NationId, type Relationship } from "@admin/world";
import { relationshipKey, type RelationshipGraph } from "./state-campaign.js";

// The particular relationships the world actually has, laid over the ones
// derived from the two countries' shapes.
//
// The derivation reads power, region, government type and standing bodies, which
// gets the average pair about right and gets every pair that matters wrong: the
// United States and the United Kingdom are not close because they are both rich
// democracies in NATO, and Washington and Havana are not distant because of a
// tier gap. A dataset of sourced dyads is how a founding board reads like the
// world instead of like a model of it.
//
// Applied as an overlay after the derivation rather than inside it, so the rule
// stays one rule and the exceptions stay data.

/** Where a row of each kind puts a reading, as a function of how strongly the kind holds. */
type KindReading = {
  readonly trust: (intensity: number) => number;
  readonly tension: (intensity: number) => number;
  /** Absent where the kind says nothing about force: a cool pair is distant, not armed. */
  readonly threat?: (intensity: number) => number;
  /** The adversarial kinds only ever harden an edge; the friendly ones only ever soften it. */
  readonly hardens: boolean;
};

// Read against the country file's own bands: trust below -0.3 is hostile and
// below -0.1 wary, tension above 0.35 is no longer low, and a threat above 0.55
// is serious. A rival or an enemy at any intensity a source would bother to
// record clears those lines; that is what the row is saying.
const KIND_READINGS: Readonly<Record<DyadKind, KindReading>> = {
  hostile: { trust: (i) => -(0.15 + 0.5 * i), tension: (i) => 0.25 + 0.5 * i, threat: (i) => 0.3 + 0.45 * i, hardens: true },
  rivalrous: { trust: (i) => -(0.1 + 0.3 * i), tension: (i) => 0.25 + 0.35 * i, threat: (i) => 0.45 + 0.3 * i, hardens: true },
  cool: { trust: (i) => 0.1 - 0.4 * i, tension: (i) => 0.15 + 0.3 * i, hardens: true },
  close: { trust: (i) => 0.3 + 0.5 * i, tension: (i) => 0.35 - 0.25 * i, threat: (i) => 0.25 - 0.2 * i, hardens: false },
  dependent: { trust: (i) => 0.2 + 0.4 * i, tension: (i) => 0.3 - 0.2 * i, hardens: false },
};

/**
 * How much of an enemy's hostility arrives as force, by its own authored
 * doctrine. A row says a pair is hostile; it does not say the weaker side points
 * an army at the stronger. A defensive government under blockade is an enemy
 * the reader worries about, not a military threat to it, which is how the
 * threat assessments read Havana beside Pyongyang.
 */
const POSTURE_REACH: Readonly<Record<Nation["doctrine"]["posture"], number>> = {
  defensive: 0.25,
  balanced: 0.6,
  assertive: 1,
  expansionist: 1,
};

const postureById = new Map(worldNations.map((nation) => [nation.id as string, nation.doctrine.posture]));

// Three places, the same place the derivation settles at, so a sourced edge
// and a derived one round the same way and survive a save identically.
const round3 = (v: number) => Math.round(v * 1000) / 1000 || 0;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Move a reading toward the row's target, never past it and never back the other way. */
function toward(current: number, target: number, raise: boolean): number {
  return raise ? Math.max(current, target) : Math.min(current, target);
}

/** The reading a row sets on one direction of its pair: its levels where it has them, else its kind's. */
function targetFor(edge: Relationship, row: DyadRow): { readonly trust: number; readonly tension: number; readonly threat?: number } {
  const reading = KIND_READINGS[row.kind];
  if (row.levels) {
    const first = (edge.from as string) === row.pair[0];
    return {
      trust: row.levels.trust[first ? 0 : 1],
      tension: row.levels.tension,
      threat: row.levels.threat[first ? 0 : 1],
    };
  }
  const i = clamp(row.intensity, 0, 1);
  const reach = POSTURE_REACH[postureById.get(edge.to as string) ?? "balanced"];
  const threat = reading.threat ? clamp(reading.threat(i) * (reading.hardens ? reach : 1), 0, 1) : undefined;
  return { trust: reading.trust(i), tension: reading.tension(i), ...(threat === undefined ? {} : { threat }) };
}

function overlay(edge: Relationship, row: DyadRow): Relationship {
  const hard = KIND_READINGS[row.kind].hardens;
  const target = targetFor(edge, row);
  return {
    ...edge,
    trust: round3(clamp(toward(edge.trust, target.trust, !hard), -1, 1)),
    tension: round3(clamp(toward(edge.tension, target.tension, hard), 0, 1)),
    ...(target.threat === undefined ? {} : { militaryThreat: round3(clamp(toward(edge.militaryThreat, target.threat, hard), 0, 1)) }),
  };
}

/**
 * Lay the sourced dyads over a derived graph.
 *
 * Each row moves both directions of its pair, as bounded moves on trust,
 * tension and military threat: toward the reading the row's kind and intensity
 * give, never past it, and never softening an edge an adversarial row names or
 * hardening one a friendly row names. A pair the graph holds no edge for is
 * left alone, because the derivation decides who has a working relationship at
 * all and a row only says what that relationship is. It sits at the head of the
 * founding edge pipeline so that anything appended after it — a world posture,
 * a scenario's opening — reads the sourced pair rather than the derived one.
 */
export function applyFoundingDyads(graph: RelationshipGraph, _player: NationId): RelationshipGraph {
  const next: Record<string, Relationship> = { ...graph };
  for (const row of FOUNDING_DYADS) {
    const [a, b] = row.pair as readonly [NationId, NationId];
    for (const key of [relationshipKey(a, b), relationshipKey(b, a)]) {
      const edge = next[key];
      if (edge) next[key] = overlay(edge, row);
    }
  }
  return next;
}
