import { actForText, amendableAct, compareDates, conferenceRecommendationDeadline, proposeBillText, recommendBillConferenceText, type BillText, type Campaign, type GameDate } from "@admin/engine";
import type { ScenarioCondition } from "./scenario-conditions.js";

export type BillGate = Extract<ScenarioCondition, { kind: "liveBill" }>;
export type FrozenBill = {
  readonly id: string;
  readonly act: string;
  readonly title: string;
  readonly introducedTurn: number;
  readonly stage: "markup" | "conference";
  readonly text?: Campaign["bills"][string]["text"];
  /** Exclusive response deadline, before autonomous conferees select a text. */
  readonly conferenceDeadline?: GameDate;
};

export function billGate(conditions: readonly ScenarioCondition[]): BillGate | undefined {
  return conditions.find((condition): condition is BillGate => condition.kind === "liveBill");
}

export function selectScenarioBill(campaign: Campaign, gate: BillGate, scenarioId: string): FrozenBill | undefined {
  return Object.values(campaign.bills)
    .filter((bill) => {
      const deadline = gate.stage === "conference" ? conferenceRecommendationDeadline(campaign, bill) : undefined;
      return bill.status === "in-progress" && bill.stage === gate.stage && amendableAct(bill.act) &&
      (gate.act === undefined || bill.act === gate.act) &&
      campaign.cases?.[`scenario:${scenarioId}@bill:${bill.id}`] === undefined &&
      (gate.stage !== "conference" || (deadline !== undefined && compareDates(campaign.calendar, deadline) < 0)) &&
      (gate.stage === "markup" ? proposeBillText(campaign, bill.id).ok :
        gate.responseText === "both" ? bill.text?.house !== undefined && bill.text?.senate !== undefined &&
          bill.text.house !== bill.text.senate && recommendBillConferenceText(campaign, bill.id, bill.text.house).ok &&
          recommendBillConferenceText(campaign, bill.id, bill.text.senate).ok :
          gate.responseText !== undefined && recommendBillConferenceText(campaign, bill.id, gate.responseText).ok);
    })
    .sort((a, b) => b.introducedTurn - a.introducedTurn || a.id.localeCompare(b.id))
    .map((bill) => ({ id: bill.id, act: bill.act, title: bill.title, introducedTurn: bill.introducedTurn,
      stage: bill.stage as FrozenBill["stage"], ...(bill.text ? { text: structuredClone(bill.text) } : {}),
      ...(bill.stage === "conference" ? { conferenceDeadline: conferenceRecommendationDeadline(campaign, bill) } : {}) }))[0];
}

export function billStillLive(campaign: Campaign, frozen: FrozenBill): boolean {
  const bill = campaign.bills?.[frozen.id];
  return bill !== undefined && bill.status === "in-progress" && bill.act === frozen.act && bill.title === frozen.title &&
    bill.introducedTurn === frozen.introducedTurn && bill.stage === frozen.stage &&
    (frozen.conferenceDeadline === undefined ||
      JSON.stringify(conferenceRecommendationDeadline(campaign, bill)) === JSON.stringify(frozen.conferenceDeadline)) &&
    JSON.stringify(bill.text ?? null) === JSON.stringify(frozen.text ?? null);
}

export function billProvision(frozen: FrozenBill, responseText?: BillText | "both"): string {
  const choice = frozen.stage === "markup" ? "targeted" : responseText === "both" ? frozen.text?.house ?? "base" : responseText ?? frozen.text?.house ?? "base";
  return actForText(frozen.act, choice)?.summary ?? "the bill's proposed provision";
}

export function billChamberProvision(frozen: FrozenBill, chamber: "house" | "senate"): string {
  return actForText(frozen.act, frozen.text?.[chamber] ?? "base")?.summary ?? "the chamber's passed provision";
}
