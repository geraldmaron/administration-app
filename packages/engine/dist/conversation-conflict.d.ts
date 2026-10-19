import { type ConflictMove } from "./conflicts.js";
import type { Effect } from "./effects.js";
import type { Campaign } from "./state.js";
import type { ConversationScript } from "./conversations.js";
/**
 * The move on the war the answer was about. The audit refuses a conflict move
 * on a scenario that is not gated on the player being at war, so an absent
 * conflict here means the front ended between the desk opening and the answer
 * being given: the words still stand, with nothing left to settle.
 */
export declare function conflictMoveEffects(campaign: Campaign, script: ConversationScript, move: ConflictMove, remembered: string): Effect[];
