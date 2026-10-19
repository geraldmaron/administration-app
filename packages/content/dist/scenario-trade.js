import { fittingTariffStatute, tradeSector } from "@admin/engine";
export function tradeMeasureGate(conditions) {
    return conditions.find((condition) => condition.kind === "tradeMeasure");
}
/** A landed, still-active answer by the foreign government, never an expectation. */
export function selectScenarioTradeMeasure(campaign, gate, scenarioId) {
    return Object.values(campaign.trade.measures)
        .filter((measure) => measure.origin === "retaliation" && measure.kind === "tariff" &&
        measure.liftedTurn === undefined && measure.actor !== undefined &&
        measure.actor !== campaign.founding.nation && measure.target === measure.actor &&
        campaign.cases?.[`scenario:${scenarioId}@trade:${measure.id}`] === undefined &&
        fittingTariffStatute(campaign, measure.actor, gate.responseSector, gate.responseRate) !== undefined)
        .sort((a, b) => b.imposedTurn - a.imposedTurn || a.id.localeCompare(b.id))
        .map((measure) => ({ id: measure.id, actor: measure.actor, sector: measure.sector,
        rate: measure.rate, imposedTurn: measure.imposedTurn }))[0];
}
export function tradeMeasureStillLive(campaign, frozen) {
    const current = campaign.trade.measures[frozen.id];
    return current !== undefined && current.origin === "retaliation" && current.kind === "tariff" &&
        current.liftedTurn === undefined && current.actor === frozen.actor && current.target === frozen.actor &&
        current.sector === frozen.sector && current.rate === frozen.rate && current.imposedTurn === frozen.imposedTurn;
}
export function tradeResponseAvailable(campaign, frozen, gate) {
    return tradeMeasureStillLive(campaign, frozen) &&
        fittingTariffStatute(campaign, frozen.actor, gate.responseSector, gate.responseRate) !== undefined;
}
export function tradeMeasureDisplayName(frozen) {
    return tradeSector(frozen.sector)?.name.toLowerCase() ?? frozen.sector;
}
