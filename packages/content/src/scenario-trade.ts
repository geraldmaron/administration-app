import { fittingTariffStatute, tradeSector, type Campaign, type TradeSectorId } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { ScenarioCondition } from "./scenario-conditions.js";

export type FrozenTradeMeasure = {
  readonly id: string;
  readonly actor: NationId;
  readonly sector: string;
  readonly rate: number;
  readonly imposedTurn: number;
};

export type TradeMeasureGate = Extract<ScenarioCondition, { kind: "tradeMeasure" }>;

export function tradeMeasureGate(conditions: readonly ScenarioCondition[]): TradeMeasureGate | undefined {
  return conditions.find((condition): condition is TradeMeasureGate => condition.kind === "tradeMeasure");
}

/** A landed, still-active answer by the foreign government, never an expectation. */
export function selectScenarioTradeMeasure(campaign: Campaign, gate: TradeMeasureGate, scenarioId: string): FrozenTradeMeasure | undefined {
  return Object.values(campaign.trade.measures)
    .filter((measure) => measure.origin === "retaliation" && measure.kind === "tariff" &&
      measure.liftedTurn === undefined && measure.actor !== undefined &&
      measure.actor !== campaign.founding.nation && measure.target === measure.actor &&
      campaign.cases?.[`scenario:${scenarioId}@trade:${measure.id}`] === undefined &&
      fittingTariffStatute(campaign, measure.actor as NationId, gate.responseSector as TradeSectorId, gate.responseRate) !== undefined)
    .sort((a, b) => b.imposedTurn - a.imposedTurn || a.id.localeCompare(b.id))
    .map((measure) => ({ id: measure.id, actor: measure.actor as NationId, sector: measure.sector,
      rate: measure.rate, imposedTurn: measure.imposedTurn }))[0];
}

export function tradeMeasureStillLive(campaign: Campaign, frozen: FrozenTradeMeasure): boolean {
  const current = campaign.trade.measures[frozen.id];
  return current !== undefined && current.origin === "retaliation" && current.kind === "tariff" &&
    current.liftedTurn === undefined && current.actor === frozen.actor && current.target === frozen.actor &&
    current.sector === frozen.sector && current.rate === frozen.rate && current.imposedTurn === frozen.imposedTurn;
}

export function tradeResponseAvailable(campaign: Campaign, frozen: FrozenTradeMeasure, gate: TradeMeasureGate): boolean {
  return tradeMeasureStillLive(campaign, frozen) &&
    fittingTariffStatute(campaign, frozen.actor, gate.responseSector as TradeSectorId, gate.responseRate) !== undefined;
}

export function tradeMeasureDisplayName(frozen: FrozenTradeMeasure): string {
  return tradeSector(frozen.sector as TradeSectorId)?.name.toLowerCase() ?? frozen.sector;
}
