// Alignment accumulates from decision history, not a single choice, and is
// read by the player's own institutions, factions, and the
// NPC world. Each axis mirrors IdeologyVector's economicLeftRight /
// authLibertarian / nationalistGlobalist so nations, factions, and charters
// can be compared against the player on the same scale. A player who
// habitually coerces pulls authLibertarian and nationalistGlobalist
// positive; one who builds coalitions pulls them negative.
const AXES = ["economicLeftRight", "authLibertarian", "nationalistGlobalist"];
function clamp11(value) {
    return Math.max(-1, Math.min(1, value));
}
// Accumulates a decision's pull onto the existing vector — never overwrites
// it — so alignment is the sum of a player's history, not their last choice.
export function accumulateAlignment(current, pull) {
    const next = { ...current };
    for (const axis of AXES) {
        const delta = pull[axis];
        if (delta !== undefined)
            next[axis] = clamp11(current[axis] + delta);
    }
    return next;
}
// Normalized similarity in [-1, 1] between the player's accumulated
// alignment and a stance expressed on any subset of axes: 1 is perfectly
// aligned, -1 is maximally opposed, 0 if the stance names no shared axis.
export function alignmentAffinity(alignment, stance) {
    const sharedAxes = AXES.filter((axis) => stance[axis] !== undefined);
    if (sharedAxes.length === 0)
        return 0;
    const total = sharedAxes.reduce((sum, axis) => sum + (1 - Math.abs(alignment[axis] - stance[axis])), 0);
    return clamp11(total / sharedAxes.length);
}
// A nation's implied alignment preference, derived from its authored traits
// rather than a separately-authored stance: aggressive, low-legalism nations
// read as authoritarian; isolationist nations read as nationalist.
export function nationImpliedStance(nation) {
    return {
        authLibertarian: clamp11(nation.traits.aggression - nation.traits.legalism),
        nationalistGlobalist: clamp11(nation.traits.isolationism * 2 - 1),
    };
}
export function npcTrustAffinity(alignment, nation) {
    return alignmentAffinity(alignment, nationImpliedStance(nation));
}
export function factionApproval(alignment, stance) {
    return alignmentAffinity(alignment, stance);
}
// One input among several (alongside metrics) to removal pressure: the
// further the player's accumulated alignment sits from what a charter's
// institutions expect, the more pressure it contributes.
export function removalPressureFromAlignment(alignment, expectedAlignment) {
    return clamp11(-alignmentAffinity(alignment, expectedAlignment));
}
