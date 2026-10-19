import { decisionCauses, marksOfPacket, type CausalProvenance } from "./causality.js";
import type { Effect } from "./effect-types.js";
import type { ResolutionRequest } from "./resolution.js";
import type { Campaign } from "./state.js";

// Where an act of statecraft sits in the causal graph.
//
// `actor` says whose hand it was, and nothing else here is derivable from it:
// not the country a covert operation was run against, and not whether the act
// reached the public record at all, which is what visibility says.
//
// The two fields that were missing are what made the graph shallow on exactly
// the entries a player opens it for. `causeIds` was never supplied, so no act
// answered to anything; `marks` did not exist, so no act could be answered to
// either — a decision's whole legacy is the flags it leaves standing, and a
// flag is a bare string in a keyed set with nowhere to record who wrote it.
//
// Split out of resolution.ts rather than added to it, the way resolution-deeds
// was: that file sits at a recorded size ceiling and a new concern must not
// push it past.
export function actProvenance(
  campaign: Campaign,
  request: ResolutionRequest,
  effects: readonly Effect[],
  visible: boolean,
): CausalProvenance {
  const entities: readonly [string, string] = [request.actor as string, request.target as string];
  // The thread between these two capitals: this act answers whatever last
  // passed between them, in either direction. A first move between two
  // governments answers to nothing, which is the honest reading of a first
  // move. Followed only where this government is one of the two, the same
  // scope the deed record keeps.
  const player = campaign.founding.nation;
  const between = request.actor === player || request.target === player ? entities : undefined;
  const causeIds = decisionCauses(campaign.ledger, { ...(between ? { between } : {}) });
  // Only the deeds the player is a party to leave a marker — that is the scope
  // resolution-deeds stamps in, and marking a flag nothing wrote would put an
  // edge in the graph pointing at a fact the board does not hold.
  const marks = marksOfPacket(campaign.turn, effects);
  return {
    origin: "decision",
    confidence: "observed",
    visibility: visible ? "public" : "intelligence",
    entities: [...entities],
    systems: ["statecraft", request.instrument],
    ...(causeIds.length > 0 ? { causeIds } : {}),
    ...(marks.length > 0 ? { marks } : {}),
  };
}
