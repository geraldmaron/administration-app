/** A new finding expires after a year rather than becoming a permanent sanctions key. */
export const EXTERNAL_EMERGENCY_TURNS = 52;
export function findingForThreat(pursuit) {
    if (pursuit.aim === "security")
        return "national-security";
    if (pursuit.aim === "economic")
        return "economy";
    if (pursuit.aim === "prestige" || pursuit.aim === "autonomy")
        return "foreign-policy";
    return undefined;
}
/** The finding must point to a recent, public campaign against the United States. */
export function eligibleExternalThreats(campaign) {
    return Object.values(campaign.pursuits).filter((pursuit) => pursuit.target === campaign.founding.nation &&
        pursuit.actor !== campaign.founding.nation &&
        pursuit.status === "active" &&
        pursuit.overt &&
        pursuit.rungReached >= 2 &&
        pursuit.commitment >= 0.4 &&
        findingForThreat(pursuit) !== undefined &&
        campaign.turn - pursuit.lastActedTurn <= 2);
}
export function activeExternalEmergency(campaign, target) {
    return Object.values(campaign.externalEmergencies ?? {}).find((record) => record.target === target && record.endedTurn === undefined && campaign.turn < record.expiresTurn);
}
/** The President's dated IEEPA finding names both a foreign actor and the observed act. */
export function declareExternalEmergency(campaign, pursuitId, finding) {
    const pursuit = eligibleExternalThreats(campaign).find((candidate) => candidate.id === pursuitId);
    if (!pursuit)
        return { ok: false, reason: "No recent public foreign campaign against the United States supports this finding." };
    if (findingForThreat(pursuit) !== finding)
        return { ok: false, reason: "The legal finding does not match the observed foreign campaign." };
    if (activeExternalEmergency(campaign, pursuit.actor))
        return { ok: false, reason: "A declaration over this threat already stands." };
    const record = {
        id: `external-emergency:${pursuit.actor}:${campaign.turn}`,
        target: pursuit.actor,
        pursuitId,
        finding,
        declaredTurn: campaign.turn,
        expiresTurn: campaign.turn + EXTERNAL_EMERGENCY_TURNS,
    };
    const name = campaign.nations[pursuit.actor]?.base.identity.name ?? "a foreign government";
    return {
        ok: true,
        record,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary: `A national emergency is declared over ${name}'s campaign against the United States.` },
            provenance: { origin: "decision", entities: [pursuit.id, pursuit.actor], systems: ["emergency"] },
            effects: [{ kind: "externalEmergency", set: record }],
        },
    };
}
