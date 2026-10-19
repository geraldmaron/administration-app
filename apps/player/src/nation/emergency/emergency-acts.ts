import { createRngStreams, declareEmergency, endEmergency, hazardLabel, renewEmergency, requestGuardFederalization, type Campaign } from "@admin/engine";
import { declarationChoices, endChoices, guardChoices, renewChoices, scopeOfChoice, scopeWords, type ChoiceTable, type ConditionBoardRow, type EmergencyBoard } from "@admin/player-core";
import type { StateId } from "@admin/world";
import type { BuiltAct } from "../act";

/** The emergency act the President has open, if any. */
export type EmergencyAct =
  | { readonly kind: "declare"; readonly conditionId: string }
  | { readonly kind: "renew"; readonly id: string }
  | { readonly kind: "end"; readonly id: string }
  | { readonly kind: "guard"; readonly state: StateId };

export type ActSpec = {
  readonly title: string;
  readonly table: ChoiceTable;
  readonly verb: string;
  readonly danger: boolean;
  readonly review: (selected: string) => string;
  /** The law the act rests on, as registry citations. */
  readonly cites: readonly string[];
  readonly build: (selected: string) => BuiltAct;
};

function refused(reason: string): never {
  throw new Error(`That didn't go through. ${reason}.`);
}

/** Each condition and incident running at home, the most severe first; ties by headline so the order never shifts. */
export function prioritizedIncidents(board: Pick<EmergencyBoard, "conditions" | "incidents">): readonly ConditionBoardRow[] {
  return [...board.conditions, ...board.incidents].sort((a, b) => b.severity.fraction - a.severity.fraction || a.headline.localeCompare(b.headline));
}

const NEA = "50 U.S.C. §§1601–1651";

function declareSpec(campaign: Campaign, conditionId: string): ActSpec | undefined {
  const table = declarationChoices(campaign, conditionId);
  const condition = campaign.conditions[conditionId];
  if (!table || !condition) return undefined;
  return {
    title: `Declare an emergency over the ${hazardLabel(condition.kind).toLowerCase()}${condition.state ? ` in ${scopeWords({ kind: "state", state: condition.state })}` : ""}`,
    table,
    verb: "Declare the emergency",
    danger: true,
    cites: [NEA, "42 U.S.C. §5191"],
    review: (selected) => {
      const scope = scopeOfChoice(selected);
      const where = scope?.kind === "state" ? `in ${scopeWords(scope)}` : "across the whole country";
      return `You'll declare a state of emergency ${where}. It lowers your International Standing every week it lasts, and it ends after a year unless you continue it.`;
    },
    build: (selected) => {
      const scope = scopeOfChoice(selected) ?? refused("Choose where it applies");
      const result = declareEmergency(campaign, scope, condition.kind);
      if (!result.ok) refused(result.reason);
      const where = scope.kind === "nation" ? "nationwide" : `in ${scopeWords(scope)}`;
      return { packet: result.packet, title: `Declared: a state of emergency ${where}`, lines: [{ label: "Covers", value: scope.kind === "state" ? scopeWords(scope) : "The whole country" }] };
    },
  };
}

function declarationSpec(campaign: Campaign, act: Extract<EmergencyAct, { kind: "renew" | "end" }>): ActSpec | undefined {
  const emergency = campaign.emergencies[act.id];
  const table = act.kind === "end" ? endChoices(campaign, act.id) : renewChoices(campaign, act.id);
  if (!emergency || !table) return undefined;
  const where = scopeWords(emergency.scope);
  const ending = act.kind === "end";
  return {
    title: `${ending ? "End" : "Continue"} the emergency in ${where}`,
    table,
    verb: ending ? "End the emergency" : "Continue it for a year",
    danger: false,
    cites: [NEA],
    review: () => (ending ? "You'll end this emergency, and its weekly cost stops. Disaster declarations, orders you've signed, and money already promised stay as they are." : "You'll publish a notice that keeps it going (50 U.S.C. §1622(d)). It lasts another year and keeps lowering your International Standing every week."),
    build: () => {
      const result = ending ? endEmergency(campaign, act.id) : renewEmergency(campaign, act.id);
      if (!result.ok) refused(result.reason);
      return { packet: result.packet, title: ending ? `Ended: the emergency in ${where}` : `Continued: the emergency in ${where}` };
    },
  };
}

function guardSpec(campaign: Campaign, state: StateId): ActSpec | undefined {
  const table = guardChoices(campaign, state);
  if (!table) return undefined;
  const name = scopeWords({ kind: "state", state });
  return {
    title: `Ask ${name}'s governor for the National Guard`,
    table,
    verb: "Ask the governor",
    danger: false,
    cites: ["10 U.S.C. §12406", "18 U.S.C. §1385"],
    review: () => `You'll ask the governor of ${name} to work with you on emergency help. The governor decides. A yes doesn't put the state's Guard under your command or send troops anywhere.`,
    build: () => {
      const result = requestGuardFederalization(campaign, state, createRngStreams(campaign.seed));
      if (!result.ok) refused(result.reason);
      return { packet: result.packet, title: `Asked: the governor of ${name} ${result.consents ? "agreed to help" : "refused"}`, ...(result.consents ? {} : { outcome: "refused" as const }) };
    },
  };
}

/** The table, verb and commit for an open emergency act, or undefined when its subject has gone. */
export function actSpec(campaign: Campaign, act: EmergencyAct): ActSpec | undefined {
  if (act.kind === "declare") return declareSpec(campaign, act.conditionId);
  if (act.kind === "guard") return guardSpec(campaign, act.state);
  return declarationSpec(campaign, act);
}
