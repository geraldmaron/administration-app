/** A campaign's forecasts beyond this are dropped oldest first: a term of weekly decisions, without growing the save without bound. */
export const FORECAST_RECORD_LIMIT = 200;
export function applyForecast(state, effect) {
    const kept = (state.forecasts ?? []).filter((record) => record.id !== effect.record.id);
    return { ...state, forecasts: [...kept, effect.record].slice(-FORECAST_RECORD_LIMIT) };
}
/** Approval at the close of `turn`, while the metric record still holds it; the live figure for the week now running. */
export function approvalAtTurn(campaign, turn) {
    if (turn === campaign.turn)
        return campaign.player.metrics.approval;
    const history = campaign.player.metricHistory;
    const index = history.length - (campaign.turn - turn);
    return index >= 0 && index < history.length ? history[index].approval : undefined;
}
export function forecastOutcome(campaign, record) {
    if (campaign.turn <= record.dueTurn)
        return { state: "pending" };
    const approval = approvalAtTurn(campaign, record.dueTurn);
    if (approval === undefined)
        return { state: "unrecorded" };
    return { state: "settled", approval, within: approval >= record.approval.low && approval <= record.approval.high, error: approval - record.approval.median };
}
/** Every adviser's forecasts with what happened, one entry per seat and person, newest forecast last. */
export function selectForecastRecord(campaign) {
    const byAdviser = new Map();
    for (const record of campaign.forecasts ?? []) {
        const key = `${record.role}:${record.person ?? ""}`;
        const entry = byAdviser.get(key) ?? { role: record.role, ...(record.person ? { person: record.person } : {}), records: [] };
        byAdviser.set(key, { ...entry, records: [...entry.records, { record, outcome: forecastOutcome(campaign, record) }] });
    }
    return [...byAdviser.values()];
}
