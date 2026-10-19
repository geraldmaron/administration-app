// One model for "select one or more, set the terms per line, review as one
// package". A screen keeps a Selection (the subjects chosen, in the order they
// were chosen, and the one in focus), shows one line per member with its own
// readings and terms, and builds the whole package with buildSequential so a
// later line is priced on the world the earlier lines leave behind. Nation's
// federal acts are the first user; tariffs, troop moves, sanctions and aid can
// take the same three pieces (this file, package.ts and BatchLines.tsx).

export type Selection = {
  /** Every chosen subject, in the order chosen. */
  readonly members: readonly string[];
  /** The one in focus: the last chosen, shown when the screen reads one subject. */
  readonly focus?: string;
};

export const EMPTY_SELECTION: Selection = { members: [] };

export function selectOnly(id: string): Selection {
  return { members: [id], focus: id };
}

/** Adds a subject, or takes it out if it was already chosen; focus moves to the newest member left. */
export function toggle(selection: Selection, id: string): Selection {
  if (!selection.members.includes(id)) return { members: [...selection.members, id], focus: id };
  const members = selection.members.filter((member) => member !== id);
  const focus = selection.focus === id ? members[members.length - 1] : selection.focus;
  return focus === undefined ? { members } : { members, focus };
}

/** Adds every subject not already chosen, keeping the order they came in. */
export function selectAll(selection: Selection, ids: readonly string[]): Selection {
  const members = [...selection.members, ...ids.filter((id) => !selection.members.includes(id))];
  const focus = selection.focus ?? members[0];
  return focus === undefined ? { members } : { members, focus };
}

/** A press that adds to the set (shift, a modifier, or a "select several" mode) or replaces it. */
export function choose(selection: Selection, id: string, additive: boolean): Selection {
  if (additive) return toggle(selection, id);
  return selection.members.length === 1 && selection.members[0] === id ? EMPTY_SELECTION : selectOnly(id);
}
