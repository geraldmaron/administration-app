import type { EffectPacket } from "./effect-types.js";
import type { TurnPhase } from "./turn-loop.js";
import { type Campaign } from "./state.js";
/**
 * The weekly chance that some capital starts an operation. 0.017 a week is
 * about three and a half a term before the cap, inside the owner's band of one
 * to six; a term sees none about one time in thirty. A design value.
 */
export declare const NPC_REGIME_WEEKLY_CHANCE = 0.017;
/** This week's start, if the world draws one and some pair clears its gates. */
export declare function npcRegimeStart(campaign: Campaign): EffectPacket | undefined;
/** The week of every running operation (falls, exposures and lapses, after the week's changes of government), and any operation another capital starts. */
export declare const regimePhase: TurnPhase;
