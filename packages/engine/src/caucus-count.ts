/**
 * Each caucus's own reading of a bill, small enough to nudge a count.
 *
 * Absent on an act with no domestic signature, and then the floor count is
 * the one it was: one support figure for the whole chamber.
 */
import type { UsMajorParty } from "./state-legislature.js";
import type { DomesticSignature } from "./domestic-signature.js";
import { BELIEF_WEIGHT, partyReading } from "./party-beliefs.js";
import { otherMajorParty, usTicket } from "./party.js";
import { actOf } from "./legislative-acts.js";
import { selectBillsInProgress, type Campaign } from "./state.js";

export type CaucusReadings = {
  readonly administration: number;
  readonly opposition: number;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function readingsFor(signature: DomesticSignature, anchor: UsMajorParty): CaucusReadings {
  const administration = BELIEF_WEIGHT * partyReading(usTicket(anchor).beliefs, signature);
  const opposition = BELIEF_WEIGHT * partyReading(usTicket(otherMajorParty(anchor)).beliefs, signature);
  return { administration, opposition };
}

/**
 * The room's support as each caucus actually reads it: the chamber's own figure,
 * plus that caucus's reading of the act, plus what the sponsor is worth inside
 * it. One clamp, at the end, so a caucus cannot be carried past certainty by one
 * term and then pulled back under it by the next.
 *
 * With neither term this is the figure it was — one support figure for the whole
 * chamber — which is what a count on an act nobody's platform has anything to
 * say about honestly is.
 */
export function splitSupport(
  support: number,
  readings?: CaucusReadings,
  sponsor?: CaucusReadings,
): { readonly own: number; readonly opposition: number } {
  if (!readings && !sponsor) return { own: support, opposition: support };
  return {
    own: clamp01(support + (readings?.administration ?? 0) + (sponsor?.administration ?? 0)),
    opposition: clamp01(support + (readings?.opposition ?? 0) + (sponsor?.opposition ?? 0)),
  };
}

/**
 * The signature of the measure the chambers are actually working.
 *
 * One measure, and the oldest live one: a caucus reads the bill in front of it,
 * and a room with three bills moving is a room whose leadership is being lobbied
 * about the one that is furthest along. An act with no signature — a stopgap, a
 * ceiling — says nothing about the country, and then there is nothing for a
 * platform to agree with.
 */
export function liveSignature(campaign: Campaign): DomesticSignature | undefined {
  for (const bill of selectBillsInProgress(campaign)) {
    const signature = actOf(bill)?.domestic;
    if (signature) return signature;
  }
  return undefined;
}
