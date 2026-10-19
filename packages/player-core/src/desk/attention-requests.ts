import {
  guardAskFor,
  guardEligibleCondition,
  hazardLabel,
  projectGovernorWillingness,
  RELIEF_SIGNATURE_PREFIX,
  type Campaign,
  type NationCondition,
  type WillingnessProjection,
} from "@admin/engine";
import { stateById, type StateId } from "@admin/world";

// A governor's request, one per emergency rather than one per state.
//
// A nation-scope condition opens a claim on all fifty states in the same
// turn (`obligations.ts`'s `statesOwedBy`), and a row for every one of them
// is the failure `conversation/scripts.ts`'s own staging comment warns
// against: a director — or here, a claim ledger — that always has something
// to say halts the run every tick, forever. The emergency family
// (`family-emergency.ts`) raises one case per group this file bundles.

export type ClaimGroup = {
  readonly signature: string;
  readonly openedTurn: number;
  readonly expiresTurn: number;
  readonly reason: string;
  readonly states: readonly StateId[];
};

/** A key that cannot collide with a real signature, since `reliefSignature` itself contains a colon. */
function groupKey(signature: string, openedTurn: number): string {
  return `${signature}\u0000${openedTurn}`;
}

/**
 * Every emergency a governor is waiting on Washington over, bundled by the
 * ask rather than by the state asking: claims that share a signature and an
 * opening turn are the same emergency asking once.
 */
export function governorRequestGroups(campaign: Campaign): readonly ClaimGroup[] {
  const groups = new Map<string, ClaimGroup>();
  for (const id of Object.keys(campaign.states) as StateId[]) {
    const runtime = campaign.states[id];
    if (!runtime) continue;
    for (const claim of runtime.claims) {
      if (!claim.signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`)) continue;
      const key = groupKey(claim.signature, claim.openedTurn);
      const held = groups.get(key);
      groups.set(
        key,
        held
          ? { ...held, states: [...held.states, id], expiresTurn: Math.max(held.expiresTurn, claim.expiresTurn) }
          : { signature: claim.signature, openedTurn: claim.openedTurn, expiresTurn: claim.expiresTurn, reason: claim.reason, states: [id] },
      );
    }
  }
  return [...groups.values()];
}

// --- The other direction: the President asks a governor for the Guard ------
//
// `governorRequestGroups` above is a state waiting on Washington. This is
// Washington asking a state: whether a governor would consent to a National
// Guard federalization against an emergency already running there, off the
// same `governor-consent` model (`governors.ts`, `guard-federalization.ts`).
// Never raised as an interruption — nothing forces the President to ask —
// so it carries no row of its own: an ask about a state already waiting on a
// relief answer is the act of that emergency's case, and the rest are the
// Desk's "Federal help" section (`apps/web/src/desk/GuardRequest.tsx`).

export type GuardCandidate = {
  readonly state: StateId;
  readonly stateName: string;
  readonly condition: NationCondition;
  readonly forecast: WillingnessProjection;
};

/**
 * Every state a Guard federalization could be asked over right now, worst
 * emergency first. Projects off `projectGovernorWillingness` directly, the
 * same forecast function `requestGuardFederalization` (`guard-
 * federalization.ts`) decides through — one terms builder (`guardAskFor`),
 * read on both sides of the ask.
 */
export function guardRequestCandidates(campaign: Campaign): readonly GuardCandidate[] {
  return (Object.keys(campaign.states) as StateId[])
    .flatMap((state) => {
      const condition = guardEligibleCondition(campaign, state);
      if (!condition) return [];
      const forecast = projectGovernorWillingness(campaign, state, guardAskFor(condition));
      return [{ state, stateName: stateById.get(state)?.name ?? state, condition, forecast }];
    })
    .sort((a, b) => b.condition.severity - a.condition.severity);
}

/** The condition a candidate's headline names, in the Desk's own hazard vocabulary. */
export function guardCandidateHeadline(candidate: GuardCandidate): string {
  return hazardLabel(candidate.condition.kind);
}
