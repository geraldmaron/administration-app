import type { Campaign, PersonRuntime } from "./state.js";
import type { PersonEffect } from "./effect-types.js";

/** The effect fold is the only path that registers a newly drawn fictional judge. */
export function applyPerson(state: Campaign, effect: PersonEffect): Campaign {
  if (effect.create) {
    if (state.people[effect.person]) return state;
    return { ...state, people: { ...state.people, [effect.person]: effect.create } };
  }
  const current = state.people[effect.person];
  if (!current) throw new Error(`no person ${effect.person} to apply an effect to`);
  const next: Record<string, unknown> = { ...current, ...effect.changes };
  if (effect.loyaltyShift !== undefined) {
    next.base = { ...current.base, loyalty: Math.max(0, Math.min(1, current.base.loyalty + effect.loyaltyShift)) };
  }
  if (effect.competenceShift !== undefined) {
    const base = (next.base as PersonRuntime["base"] | undefined) ?? current.base;
    next.base = { ...base, competence: Math.max(0, Math.min(1, base.competence + effect.competenceShift)) };
  }
  // An undefined change deletes the property so JSON round-trips identically.
  for (const [key, value] of Object.entries(effect.changes)) {
    if (value === undefined) delete next[key];
  }
  return { ...state, people: { ...state.people, [effect.person]: next as PersonRuntime } };
}
