import { deriveLeaderAttributes, type LeaderDraft } from "@admin/engine";
import type { LeaderAttributes, LeaderBackground, LeaderRoute } from "@admin/world";

// The five readings, and what a card's comparison is measured against.
//
// Every figure this module returns comes back from `deriveLeaderAttributes` —
// the engine's own pure, RNG-free derivation, and the same one `composeLeader`
// calls on the way to the seal. Nothing here recomputes an attribute, applies a
// weighting of its own, or previews a roll: choose the same life twice and the
// cards say the same thing twice, because they are asking the engine.

export type LeaderReading = {
  readonly key: keyof LeaderAttributes;
  readonly label: string;
  /**
   * Whether a rise in this reading is good news. Ambition carries no verdict
   * anywhere else in the app and carries none here — a hungry President is a
   * description, not a failing, and painting a rise in it green would say
   * otherwise.
   */
  readonly judged: boolean;
};

export const LEADER_READINGS: readonly LeaderReading[] = [
  { key: "competence", label: "Competence", judged: true },
  { key: "loyalty", label: "Loyalty", judged: true },
  { key: "integrity", label: "Integrity", judged: true },
  { key: "charisma", label: "Charisma", judged: true },
  { key: "ambition", label: "Ambition", judged: false },
];

/**
 * The person a given career and route would produce from this draft.
 *
 * The age is pulled into the career's own plausible window first, because that
 * is exactly what choosing the career would do: the seal refuses an age outside
 * it. Without that, a card for a career whose window starts at 48 would price
 * itself at an age nobody can hold it at, and the figures on the card would not
 * be the figures the player got by pressing it.
 */
export function attributesUnder(
  draft: Pick<LeaderDraft, "age" | "ideology">,
  background: LeaderBackground,
  route: LeaderRoute,
): LeaderAttributes {
  const age = Math.min(Math.max(draft.age, background.ageRange.min), background.ageRange.max);
  return deriveLeaderAttributes({ age, ideology: draft.ideology }, background, route);
}
