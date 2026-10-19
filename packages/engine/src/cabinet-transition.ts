import type { RoleId } from "@admin/world";
import type { EffectPacket } from "./effects.js";
import type { Campaign } from "./state.js";
import { announcedDepartures, type AnnouncedDeparture } from "./cabinet-departing.js";
import { handoverPacket, ordinaryExitPacket } from "./cabinet-revolt.js";
import { institutionForRole } from "./institutions.js";
import { selectNominationForOffice } from "./nomination-stages.js";

// How an announced departure ends.
//
// A Secretary who announces they are leaving serves on: the Energy Secretary
// who told the President on October 17, 2019 that he would resign left on
// December 1, about six weeks later, and where a successor was already before
// the Senate the Secretary stayed until the successor was confirmed (the
// Defense Secretary who announced on November 24, 2014 served until his
// successor's confirmation in February 2015; the Attorney General who
// announced on September 25, 2014 remained until the Senate confirmed his
// successor in April 2015). Dates from Brookings' Cabinet turnover table (the
// 2019 announcement) and the three officers' English Wikipedia biographies,
// read 2026-09-28.
//
// So the chair is held, and costs nothing as a vacancy, for six weeks or for as
// long as a successor is before the Senate, whichever is longer. Only a
// transition that runs out with nobody sent up leaves the deputy acting.

/** The weeks a Secretary serves after announcing, when no successor has been sent up. */
export const TRANSITION_WEEKS = 6;

/** An announced departure, as the Desk reads it: who, from which chair, and when they go if nobody is sent up. */
export type DepartureTransition = AnnouncedDeparture & {
  /** The week the Secretary leaves unless a successor is before the Senate by then. */
  readonly leavesTurn: number;
  /** Whether a successor's nomination is before the Senate, which keeps the Secretary on until it ends. */
  readonly successorPending: boolean;
};

function successorPending(campaign: Campaign, role: RoleId): boolean {
  const office = institutionForRole(role)?.offices[0]?.id;
  return office !== undefined && selectNominationForOffice(campaign, office) !== undefined;
}

/** Every announced departure still being served out, oldest first. */
export function selectDepartureTransitions(campaign: Campaign): readonly DepartureTransition[] {
  return announcedDepartures(campaign).map((departure) => ({
    ...departure,
    leavesTurn: departure.announcedTurn + TRANSITION_WEEKS,
    successorPending: successorPending(campaign, departure.role),
  }));
}

/**
 * The week's endings: a handover where the chair is no longer theirs, and an
 * exit through `vacates` where the transition has run out with nobody before
 * the Senate. `turn` is the week the packets are written for.
 */
export function transitionPackets(state: Campaign, turn: number): readonly EffectPacket[] {
  return selectDepartureTransitions(state).flatMap((transition) => {
    const person = state.people[transition.person];
    if (!person) return [];
    if (state.player.cabinet[transition.role] !== transition.person || !person.alive) {
      return [handoverPacket(state, turn, transition.role, person.base)];
    }
    if (turn < transition.leavesTurn || transition.successorPending) return [];
    return [ordinaryExitPacket(state, turn, transition.role, person.base)];
  });
}
