import { deescalateConflict, selectConflictBetween, settleByAgreement, termsOfferedFlag, type ConflictMove } from "./conflicts.js";
import type { Effect } from "./effects.js";
import type { Campaign } from "./state.js";
import type { ConversationScript } from "./conversations.js";
import { markedFlags } from "./marked-flags.js";

/**
 * The move on the war the answer was about. The audit refuses a conflict move
 * on a scenario that is not gated on the player being at war, so an absent
 * conflict here means the front ended between the desk opening and the answer
 * being given: the words still stand, with nothing left to settle.
 */
export function conflictMoveEffects(
  campaign: Campaign,
  script: ConversationScript,
  move: ConflictMove,
  remembered: string,
): Effect[] {
  const conflict = selectConflictBetween(campaign, campaign.founding.nation, script.counterpart);
  if (!conflict) return [];
  switch (move) {
    case "offerTerms":
      return [{ kind: "flag", set: markedFlags([termsOfferedFlag(conflict.id)], campaign.turn) }];
    case "acceptTerms":
      return [{ kind: "conflict", set: settleByAgreement(conflict, campaign.turn, remembered) }];
    case "deescalate":
      return [{ kind: "conflict", set: deescalateConflict(conflict, campaign.turn, remembered) }];
  }
}
