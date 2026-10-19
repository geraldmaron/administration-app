import { US_ID, worldDataset, type NationFidelity, type NationId, type NationTraits } from "@admin/world";
import type { Campaign } from "./state.js";
import type { TemperamentAxisKey, TemperamentOffset } from "./state-world.js";
import { LEADER_OFFSET_BOUND, incumbentResidual } from "./foreign-leader.js";
import { leaderPersonalityOn } from "./leader-index.js";

// A foreign government's character, read the one way every decision reads it.
//
// The dataset authors each government's traits and the founding rolls them;
// the leader in office then moves them by a bounded lean for as long as they
// hold office: how far that person sits from the leader the government would
// typically have, whether the founding drew them or they came to power since.
// Every actor decision asks this module for the live
// temperament rather than reaching into `traits` itself, so a successor's
// character reaches every choice their government makes, and a decision that
// forgot the offset cannot be written without the willingness-route gate
// noticing.

/**
 * How much of its temperament a government's record lets it act on, by how
 * deeply the dataset knows it. A roster of every recognized government puts
 * many thin records in the draw beside the researched ones, and at full weight
 * a microstate would outdraw a regional power on an archetype's aims.
 */
export const FIDELITY_WEIGHT: Readonly<Record<NationFidelity, number>> = { full: 1, standard: 0.6, thin: 0.25 };

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** How far up the ladder a government is willing to step at all: mostly nerve, partly appetite for a fight. */
export function appetite(traits: NationTraits): number {
  return clamp01(traits.riskTolerance * 0.6 + traits.aggression * 0.4);
}

/** The strongest brake on acting abroad: a government that has decided its business is its own. */
export function inwardPull(traits: NationTraits): number {
  return traits.isolationism * 0.9;
}

export type TemperamentCenter = {
  readonly appetite: number;
  readonly isolationism: number;
  readonly legalism: number;
  readonly reliability: number;
};

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function centerOf(traits: readonly NationTraits[]): TemperamentCenter {
  return {
    appetite: median(traits.map(appetite)),
    isolationism: median(traits.map((entry) => entry.isolationism)),
    legalism: median(traits.map((entry) => entry.legalism)),
    reliability: median(traits.map((entry) => entry.reliability)),
  };
}

/**
 * The middle of the authored world, which a term measures a government
 * against: an appetite above the center pulls toward acting, below it pulls
 * away. Read from the dataset rather than written as constants, so a revised
 * roster moves the center with it; the paired test pins today's figures, so a
 * move is seen rather than absorbed.
 */
export const TEMPERAMENT_CENTER: TemperamentCenter = centerOf(
  worldDataset.nations.filter((nation) => nation.id !== US_ID).map((nation) => nation.traits),
);

/** Whether a nation decides for itself. The President's own country acts only on an order. */
export function isWorldActor(campaign: Campaign, nation: NationId): boolean {
  return nation !== campaign.founding.nation;
}

function withOffset(traits: NationTraits, offset: TemperamentOffset): NationTraits {
  const moved = { ...traits };
  for (const [axis, delta] of Object.entries(offset) as [TemperamentAxisKey, number | undefined][]) {
    if (delta === undefined || delta === 0) continue;
    moved[axis] = clamp01(traits[axis] + delta);
  }
  return moved;
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

/**
 * What the seated leader puts on their government in all: the offset the seat
 * stores and the lean of the leader in office at the start, held together
 * inside the one bound. Zero axes are left out, so a government whose leader
 * is exactly the one it would typically have reads an empty lean.
 */
export function leaderLean(campaign: Campaign, nation: NationId): TemperamentOffset {
  const stored = campaign.foreignPolitics?.seats[nation]?.offset ?? {};
  if (!leaderPersonalityOn()) return stored;
  const residual = incumbentResidual(campaign, nation);
  if (Object.keys(residual).length === 0) return stored;
  const axes = new Set([...Object.keys(stored), ...Object.keys(residual)] as TemperamentAxisKey[]);
  const lean: Partial<Record<TemperamentAxisKey, number>> = {};
  for (const axis of axes) {
    const sum = round3((stored[axis] ?? 0) + (residual[axis] ?? 0));
    const bounded = Math.max(-LEADER_OFFSET_BOUND, Math.min(LEADER_OFFSET_BOUND, sum));
    if (bounded !== 0) lean[axis] = bounded;
  }
  return lean;
}

// One reading per government per week: the agent reads a target's temperament
// once for every move it prices, and the lean only changes when the seat or the
// cast does. Keyed by the traits object, checked against the seat's offset and
// the cast it was read from, so a new week's state reads afresh.
type LiveEntry = { readonly seat: TemperamentOffset | undefined; readonly people: Campaign["people"]; readonly live: NationTraits };
const liveReadings = new WeakMap<NationTraits, LiveEntry>();

/**
 * The temperament a government decides with this week: its own traits, moved
 * by whatever the leader it has seated brings. With no lean the traits come
 * back unchanged, the same object, so a decision that reads through here for
 * a government whose leader leans nowhere computes exactly what it computed
 * reading the traits directly.
 */
export function liveTemperament(campaign: Campaign, nation: NationId): NationTraits | undefined {
  const runtime = campaign.nations[nation];
  if (!runtime) return undefined;
  const seat = campaign.foreignPolitics?.seats[nation]?.offset;
  const on = leaderPersonalityOn();
  const known = on ? liveReadings.get(runtime.traits) : undefined;
  if (known && known.seat === seat && known.people === campaign.people) return known.live;
  const lean = leaderLean(campaign, nation);
  const live = Object.keys(lean).length === 0 ? runtime.traits : withOffset(runtime.traits, lean);
  if (on) liveReadings.set(runtime.traits, { seat, people: campaign.people, live });
  return live;
}
