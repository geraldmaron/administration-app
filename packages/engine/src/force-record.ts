import type { NationId } from "@admin/world";
import { selectRelationship, type Campaign } from "./state.js";

// What two governments remember about force being used between them, and how
// long they answer for it.
//
// It lives on its own because two modules need the same rule and neither can
// host it: the ladder writes the record when a rung lands, and the conflict
// opener reads it to decide whether this is an incident or a war — and the
// projection a player reads before committing has to give the same answer as
// committing does. A second copy in either place is a rule that goes quietly
// wrong the first time one of them changes.

/** The acts a relationship's own history remembers force being used in. */
export const FORCE_RECORD_KINDS: readonly string[] = ["blockade", "strike", "invasion"];

/**
 * How long a use of force stays on the record as the thing a second one is a
 * continuation of.
 *
 * Longer than the eight weeks a crossed red line stays answerable for, and for
 * a reason that is arithmetic rather than temperament: sixty governments share
 * three weekly slots, so a capital's own turn comes round about every twentieth
 * week. A shorter window asks a government to answer inside a period in which
 * it will usually never be asked for a decision at all.
 */
export const FORCE_ANSWERABLE_FOR = 20;

/**
 * Whether force has already been used between these two governments lately, in
 * either direction.
 *
 * Deliberately symmetric. A blow returned and a blow repeated are both the
 * second act of the same episode, and neither capital would still describe what
 * is happening as an isolated incident once there have been two.
 */
export function forceOnTheRecord(campaign: Campaign, a: NationId, b: NationId): boolean {
  return [selectRelationship(campaign, a, b), selectRelationship(campaign, b, a)].some((edge) =>
    (edge?.history ?? []).some(
      (event) => FORCE_RECORD_KINDS.includes(event.kind) && campaign.turn - event.turn <= FORCE_ANSWERABLE_FOR,
    ),
  );
}
