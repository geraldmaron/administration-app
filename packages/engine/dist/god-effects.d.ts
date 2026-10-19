import type { Campaign, GodModeState } from "./state.js";
import type { EffectPacket } from "./effects.js";
export type GodModeEffect = {
    readonly kind: "godMode";
    readonly enable?: true;
    readonly branchPoint?: number;
};
export declare function applyGodMode(state: Campaign, effect: GodModeEffect): Campaign;
/**
 * The god-mode flag as it stands after a packet: never cleared, and one action
 * heavier whenever the packet came from god mode.
 *
 * It is settled here rather than in the handler because the two rules it
 * encodes are properties of *applying a packet*, not of any one effect.
 * Permanence has to survive an effect that rebuilds state without the field,
 * and the action count has to include god packets that carry no `godMode`
 * effect at all — which is most of them, since a god edit is an ordinary
 * metric or relationship effect wearing `source: "godmode"`.
 */
export declare function carryGodMode(before: Campaign, after: Campaign, packet: EffectPacket): GodModeState | undefined;
