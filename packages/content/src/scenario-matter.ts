import { isMatterOpen, matterSource, selectOpenMatters, selectMatter, type Campaign } from "@admin/engine";
import type { ScenarioCondition } from "./scenario-conditions.js";

export type MatterGate = Extract<ScenarioCondition, { kind: "oversightMatter" }>;

export type FrozenOversightMatter = {
  readonly id: string;
  readonly institution: string;
  readonly subject: string;
  readonly openedTurn: number;
  readonly stage: "opened" | "gathering" | "reported";
  readonly public: boolean;
  readonly source: string;
};

export function matterGate(conditions: readonly ScenarioCondition[]): MatterGate | undefined {
  return conditions.find((condition): condition is MatterGate => condition.kind === "oversightMatter");
}

/** Freeze the actual inquiry rather than letting a later draw substitute another one. */
export function selectScenarioMatter(campaign: Campaign, gate: MatterGate, scenarioId: string): FrozenOversightMatter | undefined {
  return selectOpenMatters(campaign)
    .filter((matter) => matter.origin.kind === "inspector-general" &&
      (gate.origin === undefined || gate.origin === "inspector-general") &&
      (gate.institution === undefined || matter.origin.institution === gate.institution) &&
      (gate.stage === undefined || matter.stage === gate.stage) &&
      (gate.public === undefined || matter.public === gate.public) &&
      (gate.obstructed === undefined || matter.obstructed === gate.obstructed) &&
      campaign.cases?.[`scenario:${scenarioId}@matter:${matter.id}`] === undefined)
    .sort((a, b) => b.openedTurn - a.openedTurn || a.id.localeCompare(b.id))
    .map((matter) => ({ id: matter.id, institution: matter.origin.kind === "inspector-general" ? matter.origin.institution : "",
      subject: matter.subject, openedTurn: matter.openedTurn, stage: matter.stage as FrozenOversightMatter["stage"],
      public: matter.public, source: matterSource(matter) }))[0];
}

export function matterStillLive(campaign: Campaign, frozen: FrozenOversightMatter): boolean {
  const matter = selectMatter(campaign, frozen.id);
  return matter !== undefined && isMatterOpen(matter) && matter.origin.kind === "inspector-general" &&
    matter.origin.institution === frozen.institution && matter.subject === frozen.subject &&
    matter.openedTurn === frozen.openedTurn && matter.stage === frozen.stage && matter.public === frozen.public &&
    matterSource(matter) === frozen.source;
}
