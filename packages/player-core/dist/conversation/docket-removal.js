function answeredIds(campaign, packet) {
    const held = new Set((campaign.docket ?? []).map((entry) => entry.id));
    if (held.size === 0)
        return [];
    const remove = [];
    for (const effect of packet.effects) {
        if (effect.kind !== "flag")
            continue;
        for (const flag of effect.set ?? []) {
            if (held.has(flag) && !remove.includes(flag))
                remove.push(flag);
        }
    }
    return remove;
}
/** The packet plus a background removal for every held entry its flags answer. */
export function withHeldRemoval(campaign, packet) {
    const remove = answeredIds(campaign, packet);
    if (remove.length === 0)
        return packet;
    return { ...packet, effects: [...packet.effects, { kind: "docket", remove }] };
}
