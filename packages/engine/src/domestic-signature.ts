// Who a nationally-scoped act hits at home: fold a DomesticSignature through
// each state's authored character into a lean delta and a grievance mark.
// Returns effects, not packets — callers splice them into their own packet
// the same way resolveImpact and gazetteerEffects do.
import {
  IDEOLOGY_AXES,
  SECTOR_AXIS,
  STATE_ECONOMY_AXES,
  STATE_IDS,
  type IdeologyAxis,
  type IdeologyVector,
  type SectorId,
  type StateCharacter,
  type StateEconomyAxis,
} from "@admin/world";
import type { StateEffect } from "./effects.js";
import type { DomesticChannel } from "./cohort-channels.js";
import type { Campaign } from "./state.js";
import { towardAdministration, type AdministrationStanding } from "./party.js";

export type DomesticMagnitude = "light" | "moderate" | "heavy";

/**
 * Who an act hits at home. Declared by the act, never inferred from prose.
 * `sectors` is the convenient half (name the real industries) and folds into
 * `axes` through SECTOR_AXIS; `axes` is the direct half, for an act whose
 * signature is not an industry list.
 */
export type DomesticSignature = {
  readonly axes?: Partial<Record<StateEconomyAxis, number>>; // −1..1 each
  readonly sectors?: readonly SectorId[]; // folded, +1 each
  readonly urban?: number; // −1..1: positive favors metro states
  readonly federal?: number; // −1..1: positive favors federally-dependent states
  /**
   * What the act says about the country, not what industry it touches.
   *
   * The values it reads are already differentiated: `AlignmentPullShape` lets a
   * reply declare exactly this vector, and `COHORT_MOTIVATION[cohort].beliefs`
   * carries a real, distinguishing position on it for all sixteen cohorts, with
   * rural sitting 0.15-0.25 toward `authLibertarian` and urban 0.1-0.2 the
   * other way. What this field supplies is the reader. Without it a declared
   * pull moves one national accumulator (`player.alignments`) and nothing else,
   * so an identity-coded act lands identically on every state and every cohort
   * regardless of what either actually believes. Folded the same way `urban`
   * and `federal` are.
   */
  // A weight per axis, keyed like a belief vector but not a person's ideology.
  readonly values?: Partial<Record<IdeologyAxis, number>>;
  /**
   * The policy channels the act moves (civil-rights enforcement, immigration,
   * health access, disability programs, veterans' benefits), −1..1 each. They
   * reach cohorts only: how directly each channel bears on a cohort is
   * `CHANNEL_REACH`. A state's lean never reads them, because demography does
   * not derive lean (DECISIONS 5.10).
   */
  readonly channels?: Partial<Record<DomesticChannel, number>>;
  readonly magnitude: DomesticMagnitude;
  /** Slug the grievance mark carries and a scenario condition can name. */
  readonly signature: string;
  readonly reason: string;
};

export const MAGNITUDE_STEP: Readonly<Record<DomesticMagnitude, number>> = {
  light: 0.004,
  moderate: 0.010,
  heavy: 0.020,
};

/** Hard ceiling on what any single routed act may do to one state's lean. */
export const STATE_ROUTE_CAP = 0.025;
/** Hard ceiling on the sum of routed movement in one state in one turn. */
export const STATE_ROUTE_TURN_CAP = 0.04;

/** Decay per turn for a mark written by a routed act (~sixteen weeks to fade). */
export const BASE_MARK_DECAY = 0.06;

const MOVEMENT_FLOOR = 0.002;

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Fold sectors into axes: each named sector adds +1 on its SECTOR_AXIS landing. */
export function foldedAxes(signature: DomesticSignature): Record<StateEconomyAxis, number> {
  const folded = Object.fromEntries(STATE_ECONOMY_AXES.map((axis) => [axis, signature.axes?.[axis] ?? 0])) as Record<
    StateEconomyAxis,
    number
  >;
  for (const sector of signature.sectors ?? []) {
    const axis = SECTOR_AXIS[sector];
    folded[axis] += 1;
  }
  return folded;
}

/**
 * A state's own position on the three-axis ideology vector, read off the one
 * signal a state actually carries: `lean` (Dem ← → Rep, −1..1).
 *
 * A state does not carry a full `IdeologyVector`: authoring 51 × 3 figures is
 * a real cost, and whether to pay it is an open design call. `lean` is folded
 * onto all three axes as the
 * best available proxy, on the same precedent `bands.ts` already sets for
 * every other derived-rather-than-authored figure: `economicLeftRight` and
 * `authLibertarian` read `lean` directly (a Republican-leaning state reads
 * positive on both, which is the correlation the real coalition actually
 * has); `nationalistGlobalist` reads urbanization inverted, because the axis
 * `lean` tracks least is the one urban/rural sorts on more directly than
 * party does. Superseded without ceremony the day a real per-state vector is
 * authored — this function is the only caller that would need to change.
 */
export function stateValues(character: StateCharacter, lean: number): IdeologyVector {
  return {
    economicLeftRight: lean,
    authLibertarian: lean,
    nationalistGlobalist: (character.urbanization - 0.5) * -2,
  };
}

/** Affinity of one state's character for a signature. Pure, no roll. */
export function stateAffinity(character: StateCharacter, lean: number, signature: DomesticSignature): number {
  const folded = foldedAxes(signature);
  let affinity = 0;
  for (const axis of STATE_ECONOMY_AXES) {
    affinity += character.economy[axis] * folded[axis];
  }
  affinity += (signature.urban ?? 0) * (character.urbanization - 0.5) * 2;
  affinity += (signature.federal ?? 0) * (character.federalDependence - 0.5) * 2;
  if (signature.values) {
    const position = stateValues(character, lean);
    for (const axis of IDEOLOGY_AXES) {
      affinity += (signature.values[axis] ?? 0) * position[axis];
    }
  }
  return affinity;
}

/** A safe state still moves, but less: elasticity = 1 − 0.5 × |lean|. */
export function stateElasticity(lean: number): number {
  return 1 - 0.5 * Math.abs(lean);
}

function leanDeltaFor(
  character: StateCharacter,
  lean: number,
  signature: DomesticSignature,
  standing: AdministrationStanding,
): number {
  const affinity = stateAffinity(character, lean, signature);
  const raw = MAGNITUDE_STEP[signature.magnitude] * affinity * stateElasticity(lean);
  // Per-act cap first; turn cap is the absolute ceiling if a caller ever raises
  // the per-act bound (and the bound shared with any co-router in the same turn).
  const capped = clamp(raw, -STATE_ROUTE_CAP, STATE_ROUTE_CAP);
  const bounded = clamp(capped, -STATE_ROUTE_TURN_CAP, STATE_ROUTE_TURN_CAP);
  return towardAdministration(bounded, standing);
}

/**
 * Compile a domestic signature into one StateEffect per state that clears the
 * movement floor. Iteration is over STATE_IDS in declaration order so the
 * effect list is byte-identical run to run.
 */
export function routeDomestic(campaign: Campaign, signature: DomesticSignature): readonly StateEffect[] {
  const effects: StateEffect[] = [];
  for (const id of STATE_IDS) {
    const runtime = campaign.states[id];
    if (!runtime) continue;
    const delta = round3(leanDeltaFor(runtime.base.character, runtime.lean, signature, campaign.congress));
    if (Math.abs(delta) < MOVEMENT_FLOOR) continue;
    const affinity = stateAffinity(runtime.base.character, runtime.lean, signature);
    const valence: 1 | -1 = affinity >= 0 ? 1 : -1;
    effects.push({
      kind: "state",
      state: id,
      deltas: { lean: delta },
      addMark: {
        turn: campaign.turn,
        signature: signature.signature,
        weight: clamp01(Math.abs(affinity)),
        valence,
        decayRate: BASE_MARK_DECAY,
        reason: signature.reason,
      },
      reason: signature.reason,
    });
  }
  return effects;
}
