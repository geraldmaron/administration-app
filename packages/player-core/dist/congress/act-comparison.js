export const actCell = (lines, stance, figure) => ({
    lines: typeof lines === "string" ? [lines] : lines,
    ...(stance ? { stance } : {}),
    ...(figure ? { figure } : {}),
});
/** What a packet sets Congress's disposition to, where it writes one. */
export function congressAfter(packet) {
    for (const effect of packet.effects)
        if (effect.kind === "congress")
            return effect.set.disposition;
    return undefined;
}
/** "From 56% to 59%", or "No change", for the room's disposition. */
export function dispositionMove(before, after) {
    if (after === undefined || Math.round(after * 100) === Math.round(before * 100))
        return actCell("No change", undefined, { kind: "share", value: before, from: before });
    const up = after > before;
    const stance = up ? "favorable" : "caution";
    return actCell(`${up ? "Warms" : "Cools"} from ${Math.round(before * 100)}% to ${Math.round(after * 100)}%`, stance, { kind: "share", value: after, from: before, stance });
}
