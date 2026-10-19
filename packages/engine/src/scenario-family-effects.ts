import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { FamilyDisposition, ScenarioFamilyId, ScenarioFamilyRun, ScenarioPlace } from "./scenario-families.js";

// The writer for the arc ledger, beside its own domain the way the institution,
// trade and national security writers are.

export type ScenarioFamilyEffect = {
  readonly kind: "scenarioFamily";
  /**
   * An opener was raised or answered: the family starts and its counterpart
   * and place are pinned. `unanswered` marks the raise; the later answer finds
   * the run, keeps its pinned place and makes the thread live.
   */
  readonly open?: {
    readonly family: ScenarioFamilyId;
    readonly counterpart: NationId;
    readonly scenario: string;
    readonly turn: number;
    /** The opener's rendered subject, kept so the Record can name the arc when it ends. */
    readonly title?: string;
    /** Where at home the opener happened, when it happened below the capital. */
    readonly place?: ScenarioPlace;
    readonly unanswered?: boolean;
  };
  /** A thread whose opener was never answered is dropped; nothing was dealt under it. */
  readonly expire?: { readonly family: ScenarioFamilyId };
  /** A later member was dealt under a family already running. */
  readonly beat?: { readonly family: ScenarioFamilyId; readonly scenario: string; readonly turn: number };
  /** The family is over. It deals nothing more, and the record of it stays. */
  readonly close?: { readonly family: ScenarioFamilyId; readonly turn: number; readonly disposition: FamilyDisposition };
  /**
   * An answer set these authored flags, and this is where it happened. A
   * scenario gated on one of them is the story's next scene even when no family
   * ties the two together, so it comes back here. With no place, the answer
   * happened in Washington or abroad and any place an earlier answer left on
   * the same flags is dropped: the latest deed is the one the board stands on.
   */
  readonly callback?: { readonly flags: readonly string[]; readonly place?: ScenarioPlace };
};

export function applyScenarioFamily(state: Campaign, effect: ScenarioFamilyEffect): Campaign {
  let families = state.scenarioFamilies;

  if (effect.open) {
    const { family } = effect.open;
    const existing = families[family];
    // Only an answer replaces a raise: a raise that finds a run changes
    // nothing, so a re-raise cannot move the pinned place.
    if (!(existing && effect.open.unanswered)) {
      families = { ...families, [family]: openedRun(existing, effect.open) };
    }
  }

  if (effect.expire && families[effect.expire.family]?.unanswered) {
    const { [effect.expire.family]: _dropped, ...rest } = families;
    families = rest;
  }

  if (effect.beat) {
    const { family, scenario, turn } = effect.beat;
    const existing = families[family];
    if (existing) {
      families = {
        ...families,
        [family]: { ...existing, lastTurn: turn, beats: [...existing.beats, scenario] },
      };
    }
  }

  if (effect.close) {
    const existing = families[effect.close.family];
    if (existing && existing.closedTurn === undefined) {
      const { place: _place, ...kept } = existing;
      families = {
        ...families,
        [existing.family]: { ...kept, closedTurn: effect.close.turn, disposition: effect.close.disposition },
      };
    }
  }

  const placed = effect.callback ? withCallbackPlaces(state, effect.callback) : state;
  return families === state.scenarioFamilies ? placed : { ...placed, scenarioFamilies: families };
}

// An opener for a family already running is a beat, not a second opening:
// re-pinning would move the arc's country mid-arc, which is the whole defect
// the family exists to close. The one exception is the answer to a raised
// opener, which makes the pinned thread live and keeps the place it was raised
// in.
function openedRun(existing: ScenarioFamilyRun | undefined, open: NonNullable<ScenarioFamilyEffect["open"]>): ScenarioFamilyRun {
  const { family, counterpart, scenario, turn, title, place } = open;
  if (existing?.unanswered) {
    const { unanswered: _raised, ...answered } = existing;
    return {
      ...answered,
      counterpart,
      lastTurn: turn,
      beats: existing.beats.includes(scenario) ? existing.beats : [...existing.beats, scenario],
      ...(title ? { title } : {}),
      ...(existing.place ?? place ? { place: existing.place ?? place } : {}),
    };
  }
  if (existing) return { ...existing, lastTurn: turn, beats: [...existing.beats, scenario] };
  return {
    family,
    counterpart,
    openedTurn: turn,
    lastTurn: turn,
    beats: [scenario],
    ...(open.unanswered ? { unanswered: true as const } : {}),
    ...(title ? { title } : {}),
    ...(place ? { place } : {}),
  };
}

function withCallbackPlaces(state: Campaign, callback: NonNullable<ScenarioFamilyEffect["callback"]>): Campaign {
  const current = state.flagPlaces ?? {};
  const { place } = callback;
  const next = place
    ? { ...current, ...Object.fromEntries(callback.flags.map((flag) => [flag, place])) }
    : Object.fromEntries(Object.entries(current).filter(([flag]) => !callback.flags.includes(flag)));
  if (!place && Object.keys(next).length === Object.keys(current).length) return state;
  return { ...state, flagPlaces: next };
}
