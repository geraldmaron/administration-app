import { ownerWeight } from "./order-lineage.js";
function attributionMissing(state, id, contribution) {
    return !contribution || Object.keys(contribution).some((path) => path !== "economy.debt"
        && !state.orderStatLineage?.[path]?.events.some((event) => event.ownerId === id));
}
function remainingOwnerWeight(state, orderId, omitProceedingId) {
    const limits = (state.judiciary.proceedings ?? []).filter((entry) => entry.id !== omitProceedingId
        && (entry.subject.kind === "executive-order" || entry.subject.kind === "statutory-authority")
        && entry.subject.recordId === orderId && entry.stage !== "final").map((entry) => {
        if (entry.lower?.holding === "struck-down" && entry.lower.enforcement === "in-force")
            return 0;
        return entry.partyRelief?.active ? 1 - entry.partyRelief.fraction : 1;
    });
    return Math.min(1, ...limits);
}
/** Party relief only withholds the named supplier share of this order's recorded movement. */
export function applyCourtLimitedRelief(state, effect) {
    const proceeding = state.judiciary.proceedings?.find((entry) => entry.id === effect.proceedingId);
    if (!proceeding || (proceeding.subject.kind !== "executive-order" && proceeding.subject.kind !== "statutory-authority")
        || proceeding.subject.recordId !== effect.orderId
        || (effect.scope === "defense-industrial" && proceeding.subject.kind !== "statutory-authority")
        || (effect.scope === "agency-rule" && proceeding.matter?.kind !== "agency-procedure"))
        throw new Error(`No matching statutory proceeding for relief ${effect.proceedingId}`);
    const order = state.orders.find((entry) => entry.id === effect.orderId);
    if (!order)
        throw new Error(`No order for limited relief ${effect.orderId}`);
    if (!Number.isFinite(effect.fraction) || effect.fraction < 0 || effect.fraction > 1)
        throw new Error("Invalid limited court relief scope or fraction.");
    const prior = proceeding.partyRelief;
    const rule = state.pendingRules.find((entry) => entry.id === effect.orderId);
    if (effect.action === "apply") {
        if (prior?.appliedOnce || order.remedyApplied || rule?.remedyApplied)
            return state;
        const contribution = effect.scope === "agency-rule" ? rule?.nationContribution : order.nationContribution;
        const missing = attributionMissing(state, effect.orderId, contribution);
        const weight = Math.min(1 - effect.fraction, remainingOwnerWeight(state, effect.orderId, proceeding.id));
        const { state: next, movement, unknown: drifted } = ownerWeight(state, effect.orderId, weight);
        const unknown = missing || drifted;
        return { ...next, judiciary: { ...next.judiciary, proceedings: next.judiciary.proceedings?.map((entry) => entry.id === proceeding.id
                    ? { ...entry, partyRelief: { scope: effect.scope, fraction: effect.fraction,
                            active: Boolean(movement) || (effect.scope === "defense-industrial" && Boolean(order.defenseContract)), appliedOnce: true,
                            outstanding: movement ?? {}, ...(unknown ? { unquantified: true } : {}) } } : entry) } };
    }
    if (!prior?.active)
        return state;
    if (order.remedyApplied || rule?.remedyApplied)
        return state;
    const { state: next } = ownerWeight(state, effect.orderId, remainingOwnerWeight(state, effect.orderId, proceeding.id));
    return { ...next, judiciary: { ...next.judiciary, proceedings: next.judiciary.proceedings?.map((entry) => entry.id === proceeding.id
                ? { ...entry, partyRelief: { ...prior, active: false, outstanding: {} } } : entry) } };
}
/** The contribution is debited at most once, even if an effect packet is replayed after other changes. */
export function applyOrderRemedy(state, effect) {
    if (Boolean(effect.orderId) === Boolean(effect.ruleId))
        throw new Error("An order remedy needs exactly one order or rule id.");
    if (effect.orderId) {
        const record = state.orders.find((entry) => entry.id === effect.orderId);
        if (!record)
            throw new Error(`No order for remedy ${effect.orderId}`);
        if (record.remedyApplied)
            return state;
        const unknown = attributionMissing(state, effect.orderId, record.nationContribution);
        const { state: next, movement: removed, unknown: drifted } = ownerWeight(state, effect.orderId, 0);
        return { ...next, orders: next.orders.map((entry) => entry.id === effect.orderId
                ? { ...entry, remedyApplied: true, ...(removed ? { remedyContribution: removed } : {}), ...(unknown || drifted ? { remedyUnquantified: true } : {}) } : entry),
            judiciary: { ...next.judiciary, proceedings: next.judiciary.proceedings?.map((entry) => entry.subject.kind === "statutory-authority" && entry.subject.recordId === effect.orderId && entry.partyRelief?.active
                    ? { ...entry, partyRelief: { ...entry.partyRelief, active: false, outstanding: {} } } : entry) } };
    }
    const rule = state.pendingRules.find((entry) => entry.id === effect.ruleId);
    if (!rule)
        throw new Error(`No rule for remedy ${effect.ruleId}`);
    if (rule.remedyApplied)
        return state;
    const unknown = attributionMissing(state, effect.ruleId, rule.nationContribution);
    const { state: next, movement: removed, unknown: drifted } = ownerWeight(state, effect.ruleId, 0);
    return { ...next, pendingRules: next.pendingRules.map((entry) => entry.id === effect.ruleId
            ? { ...entry, remedyApplied: true, ...(removed ? { remedyContribution: removed } : {}), ...(unknown || drifted ? { remedyUnquantified: true } : {}) } : entry),
        judiciary: { ...next.judiciary, proceedings: next.judiciary.proceedings?.map((entry) => (entry.subject.kind === "executive-order" || entry.subject.kind === "statutory-authority")
                && entry.subject.recordId === effect.ruleId && entry.partyRelief?.active
                ? { ...entry, partyRelief: { ...entry.partyRelief, active: false, outstanding: {} } } : entry) } };
}
