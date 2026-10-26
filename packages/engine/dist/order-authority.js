/** An independent judicial limit survives a stay or favorable ruling in another case. */
export function isOrderCourtSuspended(campaign, recordId) {
    return campaign.judiciary.proceedings?.some((proceeding) => {
        if (proceeding.subject.kind !== "executive-order" || proceeding.subject.recordId !== recordId
            || proceeding.stage === "final")
            return false;
        // The merits judgment supersedes interim relief in its own case. Relief in another case remains independent.
        if (proceeding.circuit)
            return proceeding.circuit.holding === "struck-down";
        if (proceeding.lower)
            return proceeding.lower.holding === "struck-down"
                && proceeding.lower.enforcement === "in-force";
        return proceeding.interim === "rule-stayed" || proceeding.interim === "rule-paused"
            || proceeding.interim === "construction-obligations-stayed" || proceeding.interim === "order-enjoined"
            || Boolean(proceeding.partyRelief?.active && proceeding.partyRelief.scope === "agency-rule"
                && proceeding.partyRelief.fraction >= 1);
    }) ?? false;
}
export function prospectiveOrderAuthority(campaign, recordId) {
    const order = campaign.orders.find((entry) => entry.id === recordId);
    if (!order || order.rescindedTurn !== undefined || order.review?.status === "struck-down")
        return "ended";
    const rule = campaign.pendingRules.find((entry) => entry.id === recordId);
    if (rule && ["canceled", "struck-down", "rescinded", "disapproved"].includes(rule.status))
        return "ended";
    if (rule && (rule.status === "pending" || rule.status === "stayed"))
        return "not-yet-effective";
    return isOrderCourtSuspended(campaign, recordId) ? "suspended" : "operative";
}
export function hasProspectiveOrderAuthority(campaign, recordId) {
    return prospectiveOrderAuthority(campaign, recordId) === "operative";
}
/** A court pause suppresses dealings without lifting the measure or losing its identity. */
export function isTradeMeasureEffective(campaign, measureId) {
    const asset = campaign.blockedAssets?.find((entry) => entry.tradeMeasureId === measureId);
    if (!asset)
        return true;
    const emergency = campaign.externalEmergencies?.[asset.emergencyId];
    return asset.status === "blocked" && Boolean(emergency && emergency.endedTurn === undefined
        && campaign.turn < emergency.expiresTurn) && hasProspectiveOrderAuthority(campaign, asset.orderRecordId);
}
