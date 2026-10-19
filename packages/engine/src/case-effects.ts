// The apply() handler for a case effect. One effect raises or transitions.
// It never does both, and it never does neither.
import { currentEventId } from "./causality.js";
import { withCaseTransition, withRaisedCase } from "./cases.js";
import type { CaseEffect } from "./case-types.js";
import type { Campaign } from "./state.js";

export function applyCase(state: Campaign, effect: CaseEffect): Campaign {
  if (effect.raise !== undefined && effect.transition !== undefined) {
    throw new Error("a case effect raises or transitions, not both");
  }
  const causeId = currentEventId();
  if (effect.raise !== undefined) return withRaisedCase(state, effect.raise, effect.actor, causeId);
  if (effect.transition !== undefined) {
    const move = effect.transition;
    return withCaseTransition(state, move.id, move.disposition, move.narration, effect.actor, causeId);
  }
  throw new Error("a case effect raises or transitions");
}
