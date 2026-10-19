import type { AlignmentVector, NationRuntime } from "./state.js";

// Alignment accumulates from decision history, not a single choice, and is
// read by the player's own institutions, factions, and the
// NPC world. Each axis mirrors IdeologyVector's economicLeftRight /
// authLibertarian / nationalistGlobalist so nations, factions, and charters
// can be compared against the player on the same scale. A player who
// habitually coerces pulls authLibertarian and nationalistGlobalist
// positive; one who builds coalitions pulls them negative.

const AXES: readonly (keyof AlignmentVector)[] = ["economicLeftRight", "authLibertarian", "nationalistGlobalist"];

function clamp11(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

// Accumulates a decision's pull onto the existing vector — never overwrites
// it — so alignment is the sum of a player's history, not their last choice.
export function accumulateAlignment(current: AlignmentVector, pull: Partial<AlignmentVector>): AlignmentVector {
  const next = { ...current };
  for (const axis of AXES) {
    const delta = pull[axis];
    if (delta !== undefined) next[axis] = clamp11(current[axis] + delta);
  }
  return next;
}

// Normalized similarity in [-1, 1] between the player's accumulated
// alignment and a stance expressed on any subset of axes: 1 is perfectly
// aligned, -1 is maximally opposed, 0 if the stance names no shared axis.
export function alignmentAffinity(alignment: AlignmentVector, stance: Partial<AlignmentVector>): number {
  const sharedAxes = AXES.filter((axis) => stance[axis] !== undefined);
  if (sharedAxes.length === 0) return 0;
  const total = sharedAxes.reduce((sum, axis) => sum + (1 - Math.abs(alignment[axis] - stance[axis]!)), 0);
  return clamp11(total / sharedAxes.length);
}

// A nation's implied alignment preference, derived from its authored traits
// rather than a separately-authored stance: aggressive, low-legalism nations
// read as authoritarian; isolationist nations read as nationalist.
export function nationImpliedStance(nation: NationRuntime): Partial<AlignmentVector> {
  return {
    authLibertarian: clamp11(nation.traits.aggression - nation.traits.legalism),
    nationalistGlobalist: clamp11(nation.traits.isolationism * 2 - 1),
  };
}

export function npcTrustAffinity(alignment: AlignmentVector, nation: NationRuntime): number {
  return alignmentAffinity(alignment, nationImpliedStance(nation));
}

// A faction's or charter's preferred position on the same scale. Authored
// faction/charter data will eventually supply real stances; alignmentAffinity
// is the mechanism both that data and the removal arc consume.
export type AlignmentStance = Partial<AlignmentVector>;

export function factionApproval(alignment: AlignmentVector, stance: AlignmentStance): number {
  return alignmentAffinity(alignment, stance);
}

// One input among several (alongside metrics) to removal pressure: the
// further the player's accumulated alignment sits from what a charter's
// institutions expect, the more pressure it contributes.
export function removalPressureFromAlignment(alignment: AlignmentVector, expectedAlignment: AlignmentStance): number {
  return clamp11(-alignmentAffinity(alignment, expectedAlignment));
}
