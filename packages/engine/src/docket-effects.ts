// Admits and removes documents the desk is holding. The first admission
// creates the list; an absent list is left absent until a docket effect runs.
import type { DocketEffect } from "./effect-types.js";
import type { Campaign } from "./state.js";
import type { DocketEntry } from "./state-week.js";

function withoutRemoved(held: readonly DocketEntry[], remove: readonly string[]): readonly DocketEntry[] {
  if (remove.length === 0) return held;
  const gone = new Set(remove);
  return held.filter((entry) => !gone.has(entry.id));
}

function withAdmitted(held: readonly DocketEntry[], admit: readonly DocketEntry[]): readonly DocketEntry[] {
  const seen = new Set(held.map((entry) => entry.id));
  const fresh = admit.filter((entry) => !seen.has(entry.id));
  return fresh.length === 0 ? held : [...held, ...fresh];
}

/** Appends entries whose ids are not already held, and drops the listed ids. */
export function applyDocket(state: Campaign, effect: DocketEffect): Campaign {
  const held = state.docket ?? [];
  const kept = withoutRemoved(held, effect.remove ?? []);
  const next = withAdmitted(kept, effect.admit ?? []);
  if (next === held && state.docket !== undefined) return state;
  return { ...state, docket: next };
}
