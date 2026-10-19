import type { Campaign, GodModeState } from "./state.js";
import type { EffectPacket } from "./effects.js";

// The god-mode writer, beside its own domain the way the institution, trade and
// national security writers are.
//
// It is two rules rather than one handler, and the second is why it could not
// stay inline: permanence and the action count are properties of *applying a
// packet*, not of any one effect, so they are applied by the mutator over the
// finished packet and had to be written where the effect they answer to lives.

// Entering god mode, and recording a turn the timeline was branched from.
// There is deliberately no way to say "leave": the state is permanent, and
// `apply()` carries it forward past any effect that would drop it. Everything
// god mode *does* is expressed with the ordinary effects above — this one only
// records that it was done at all.
export type GodModeEffect = {
  readonly kind: "godMode";
  readonly enable?: true;
  readonly branchPoint?: number;
};

export function applyGodMode(state: Campaign, effect: GodModeEffect): Campaign {
  const current: GodModeState = state.godMode ?? { enabled: true, enabledTurn: state.turn, actions: 0, branchPoints: [] };
  return {
    ...state,
    godMode: {
      ...current,
      branchPoints: effect.branchPoint === undefined ? current.branchPoints : [...current.branchPoints, effect.branchPoint],
    },
  };
}

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
export function carryGodMode(before: Campaign, after: Campaign, packet: EffectPacket): GodModeState | undefined {
  // A god-sourced packet marks the campaign even when nothing sent the opening
  // `godMode` effect first: the mark is what makes an amended term honest
  // about itself, so it cannot depend on a caller remembering the ceremony.
  const held =
    after.godMode ??
    before.godMode ??
    (packet.source === "godmode"
      ? { enabled: true as const, enabledTurn: before.turn, actions: 0, branchPoints: [] }
      : undefined);
  if (!held) return undefined;
  return packet.source === "godmode" ? { ...held, actions: held.actions + 1 } : held;
}
