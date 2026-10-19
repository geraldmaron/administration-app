import type { PartyId } from "../schemas/ids.js";
import type { Charter, Party } from "../schemas/org-cradle-charter.js";

// Named tickets on a charter. A president's ticket is the major nearest on
// beliefs.economicLeftRight. Empty parties is honest — nothing is invented.

export function partiesOf(charter: Charter | undefined): readonly Party[] {
  return charter?.parties ?? [];
}

export function partyById(parties: readonly Party[], id: string | PartyId | undefined): Party | undefined {
  if (id === undefined) return undefined;
  return parties.find((party) => (party.id as string) === (id as string));
}

function nearest(parties: readonly Party[], economicLeftRight: number): Party | undefined {
  let best: Party | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const party of parties) {
    const dist = Math.abs(party.beliefs.economicLeftRight - economicLeftRight);
    if (dist < bestDist) {
      best = party;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * President never Independent. Tie at center keeps the first authored major
 * (US: Democrat). Empty or one-sided catalogues → none.
 */
export function presidentPartyFromIdeology(
  parties: readonly Party[],
  economicLeftRight: number,
): Party | undefined {
  return nearest(
    parties.filter((party) => party.kind === "major"),
    economicLeftRight,
  );
}

export function opposingMajor(parties: readonly Party[], ticket: Party | undefined): Party | undefined {
  return parties.find((party) => party.kind === "major" && party.id !== ticket?.id);
}
