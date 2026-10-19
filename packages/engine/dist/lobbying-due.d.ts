import type { Campaign, IssuedLobbyAct } from "./state.js";
import type { EffectPacket } from "./effects.js";
export declare function dueIssuedLobbyActs(campaign: Campaign): readonly IssuedLobbyAct[];
/** Every Hill play still waiting on a counterpart, whether or not it is due. */
export declare function outstandingIssuedLobbyActs(campaign: Campaign): readonly IssuedLobbyAct[];
/**
 * Apply every Hill play that has come due, in id order, each packet seeing the
 * state the one before it wrote. New acts created during a resolution that are
 * themselves due today are picked up on a later look, not in this pass.
 */
export declare function resolveDueLobbying(campaign: Campaign): {
    readonly campaign: Campaign;
    readonly packets: readonly EffectPacket[];
};
