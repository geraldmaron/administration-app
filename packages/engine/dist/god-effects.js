export function applyGodMode(state, effect) {
    const current = state.godMode ?? { enabled: true, enabledTurn: state.turn, actions: 0, branchPoints: [] };
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
export function carryGodMode(before, after, packet) {
    // A god-sourced packet marks the campaign even when nothing sent the opening
    // `godMode` effect first: the mark is what makes an amended term honest
    // about itself, so it cannot depend on a caller remembering the ceremony.
    const held = after.godMode ??
        before.godMode ??
        (packet.source === "godmode"
            ? { enabled: true, enabledTurn: before.turn, actions: 0, branchPoints: [] }
            : undefined);
    if (!held)
        return undefined;
    return packet.source === "godmode" ? { ...held, actions: held.actions + 1 } : held;
}
