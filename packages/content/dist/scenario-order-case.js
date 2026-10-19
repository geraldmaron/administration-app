import { answerLowerOrderReview, executiveOrder, rescindOrder } from "@admin/engine";
export function orderCaseGate(conditions) {
    return conditions.find((condition) => condition.kind === "pendingOrderCase");
}
function ruleState(campaign, recordId) {
    const rule = campaign.pendingRules.find((entry) => entry.id === recordId);
    if (!rule)
        return "operative";
    if (rule.status === "pending" || rule.status === "stayed")
        return "unimplemented";
    return rule.status === "in-effect" ? "operative" : undefined;
}
export function selectScenarioOrderCase(campaign, scenarioId, gate) {
    return campaign.judiciary.proceedings?.flatMap((proceeding) => {
        if (proceeding.subject.kind !== "executive-order" || proceeding.stage === "final")
            return [];
        const { recordId, orderId } = proceeding.subject;
        const record = campaign.orders.find((entry) => entry.id === recordId);
        const order = executiveOrder(orderId);
        const posture = gate?.posture === "adverse-lower" ? "adverse-lower" : "pending-challenge";
        const state = ruleState(campaign, recordId);
        if (!record || record.order !== orderId || record.review?.status !== "pending" || !order ||
            campaign.cases?.[`scenario:${scenarioId}@court:${proceeding.id}`] !== undefined ||
            (posture === "adverse-lower" ? proceeding.stage !== "appeal" ||
                proceeding.lower?.holding !== "struck-down" || proceeding.lower.enforcement !== "in-force" ||
                state === undefined || gate?.ruleState !== undefined && gate.ruleState !== state ||
                !answerLowerOrderReview(campaign, proceeding.id, "accept").ok
                : !rescindOrder(campaign, recordId).ok))
            return [];
        return [{ proceedingId: proceeding.id, recordId, orderId, filedTurn: proceeding.filedTurn,
                stage: proceeding.stage, orderName: order.name, question: proceeding.matter?.question ?? "Whether this order is lawful.",
                posture, ...(posture === "adverse-lower" ? { ruleState: state } : {}) }];
    }).sort((a, b) => b.filedTurn - a.filedTurn || a.proceedingId.localeCompare(b.proceedingId))[0];
}
export function orderCaseStillLive(campaign, frozen) {
    const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === frozen.proceedingId);
    const record = campaign.orders.find((entry) => entry.id === frozen.recordId);
    return proceeding?.subject.kind === "executive-order" && proceeding.subject.recordId === frozen.recordId &&
        proceeding.subject.orderId === frozen.orderId && proceeding.filedTurn === frozen.filedTurn &&
        proceeding.stage === frozen.stage &&
        (proceeding.matter?.question ?? "Whether this order is lawful.") === frozen.question &&
        record?.order === frozen.orderId && record.review?.status === "pending" &&
        executiveOrder(frozen.orderId)?.name === frozen.orderName &&
        (frozen.posture === "adverse-lower" ? frozen.stage === "appeal" &&
            proceeding.lower?.holding === "struck-down" && proceeding.lower.enforcement === "in-force" &&
            ruleState(campaign, frozen.recordId) === frozen.ruleState &&
            answerLowerOrderReview(campaign, frozen.proceedingId, "accept").ok
            : rescindOrder(campaign, frozen.recordId).ok);
}
