import {
  GUARD_SUPPORT_COORDINATION_USD_MILLIONS,
  EMERGENCY_WEEKLY_STANDING_COST,
  apply,
  availableOrders,
  authorityDeadline,
  compareDates,
  declareEmergency,
  emergencyAuthorityClock,
  endEmergency,
  hazardLabel,
  renewEmergency,
  selectDeclaredEmergencies,
  selectConditionsFor,
  weeklyStandingCost,
  type Campaign,
  type DeclarationResult,
  type DeclaredEmergency,
  type EmergencyScope,
} from "@admin/engine";
import type { StateId } from "@admin/world";
import { WILLINGNESS_WORDS } from "../act/preview";
import { guardRequestCandidates } from "../desk/attention-requests";
import { formatDate, formatSignedPoints } from "../format/figures";
import { formatMoney } from "../format/money";
import { cell, weeksWords, type ChoiceCell, type ChoiceColumn, type ChoiceRow, type ChoiceTable } from "../policy/choice-table";
import { scopeWords } from "./emergency-board";

// The four emergency acts, each as a table read as its change from today: declaring
// over a running condition, continuing a declaration, ending one, and asking a
// governor for the Guard. What a declaration opens or closes is read by
// applying the act's own packet to a copy of the campaign, so the powers named
// are the powers the desk will show the week after.

/** The id a declaration column carries: its scope. */
export function scopeChoiceId(scope: EmergencyScope): string {
  return scope.kind === "nation" ? "nation" : `state:${scope.state as string}`;
}

/** The scope a column id names, or undefined for the baseline or a malformed id. */
export function scopeOfChoice(id: string): EmergencyScope | undefined {
  if (id === "nation") return { kind: "nation" };
  if (id.startsWith("state:")) return { kind: "state", state: id.slice("state:".length) as StateId };
  return undefined;
}

/** Order names open after an act and not before (or the reverse, for an act that gives power back). */
function powersMoved(before: Campaign, result: DeclarationResult, direction: "opens" | "closes"): readonly string[] {
  if (!result.ok) return [];
  const after = apply(before, result.packet);
  const [from, to] = direction === "opens" ? [before, after] : [after, before];
  const had = new Set(availableOrders(from).map((order) => order.id));
  return availableOrders(to).filter((order) => !had.has(order.id)).map((order) => order.name);
}

function powersCell(names: readonly string[], none: string): ChoiceCell {
  return names.length === 0 ? cell(none) : cell(names.join(", "));
}

const standingWords = (cost: number): string => `International standing ${formatSignedPoints(-cost)} pts a week`;

function deadlineWords(campaign: Campaign, emergency: DeclaredEmergency): string {
  const clock = emergencyAuthorityClock(campaign, emergency);
  const deadline = authorityDeadline(campaign, clock);
  const continuation = compareDates(deadline, clock.expiresDate) === 0 ? "unless you renew it" : "unless Congress renews the authority";
  return `${formatDate(deadline)}, ${continuation}`;
}

function resultDeadline(campaign: Campaign, result: DeclarationResult): string {
  if (!result.ok) return `No change. ${result.reason}`;
  const record = result.packet.effects.find((effect) => effect.kind === "emergency")!.set;
  return deadlineWords(apply(campaign, result.packet), record);
}

/** Declaring over one running condition, at each scope it could take. */
export function declarationChoices(campaign: Campaign, conditionId: string): ChoiceTable | undefined {
  const condition = selectConditionsFor(campaign, campaign.founding.nation).find((entry) => entry.id === conditionId);
  if (!condition) return undefined;
  const scopes: EmergencyScope[] = [...(condition.state ? [{ kind: "state" as const, state: condition.state }] : []), { kind: "nation" as const }];
  const results = scopes.map((scope) => ({ scope, result: declareEmergency(campaign, scope, condition.kind) }));
  const columns: ChoiceColumn[] = [
    ...results.map(({ scope, result }) => ({
      id: scopeChoiceId(scope),
      label: scope.kind === "nation" ? "Declare nationally" : `Declare in ${scopeWords(scope)}`,
      ...(result.ok ? {} : { locked: `Not available right now. ${result.reason}` }),
    })),
  ];
  const row = (id: string, label: string, read: (entry: (typeof results)[number]) => ChoiceCell): ChoiceRow => ({ id, label, cells: results.map(read) });
  const rows: ChoiceRow[] = [
    row("reach", "Where it applies", ({ scope }) => cell(scopeWords(scope))),
    row("opens", "Powers it gives you", ({ result }) => powersCell(powersMoved(campaign, result, "opens"), "None you don't already have")),
    row("cost", "What it costs", () => cell(`${standingWords(EMERGENCY_WEEKLY_STANDING_COST)}, growing every week it lasts`, "adverse")),
    row("lapses", "When it ends", ({ result }) => cell(resultDeadline(campaign, result))),
  ];
  return { columns, rows };
}

/** Ending a declaration; kept, it goes on costing standing every week, which is the waiting line. */
export function endChoices(campaign: Campaign, id: string): ChoiceTable | undefined {
  const emergency = selectDeclaredEmergencies(campaign).find((record) => record.id === id);
  if (!emergency) return undefined;
  const result = endEmergency(campaign, id);
  const cost = weeklyStandingCost(emergency, campaign.turn);
  return {
    columns: [
      { id: "end", label: "End it", ...(result.ok ? {} : { locked: `Not available right now. ${result.reason}` }) },
    ],
    rows: [
      { id: "cost", label: "Every week", cells: [cell(`Nothing, because the cost stops. Today: ${standingWords(cost).toLowerCase()}`, "favorable")] },
      { id: "closes", label: "Powers it gives back", cells: [powersCell(powersMoved(campaign, result, "closes"), "None that another emergency or a war doesn't still give you")] },
      { id: "after", label: "Afterward", cells: [cell("To declare again, the problem has to still be going on")] },
    ],
    waiting: `Until you end it, it costs ${standingWords(cost).toLowerCase()}, growing every week, and it runs to ${deadlineWords(campaign, emergency)}.`,
  };
}

/** Continuing a declaration for a year; unrenewed, it lapses on its date, which is the waiting line. */
export function renewChoices(campaign: Campaign, id: string): ChoiceTable | undefined {
  const emergency = selectDeclaredEmergencies(campaign).find((record) => record.id === id);
  if (!emergency) return undefined;
  const result = renewEmergency(campaign, id);
  const lapses = formatDate(authorityDeadline(campaign, emergencyAuthorityClock(campaign, emergency)));
  return {
    columns: [
      { id: "renew", label: "Renew it for a year", ...(result.ok ? {} : { locked: `Not yet. ${result.reason}` }) },
    ],
    rows: [
      { id: "until", label: "Lasts until", cells: [cell(resultDeadline(campaign, result))] },
      { id: "cost", label: "Every week", cells: [cell(`${standingWords(weeklyStandingCost(emergency, campaign.turn))}, and still growing`, "adverse")] },
      { id: "public", label: "In public", cells: [cell("You publish a renewal notice")] },
    ],
    waiting: `If you don't renew it, it ends on ${lapses}, its powers end with it, and so does its weekly cost.`,
  };
}

/** Asking a state's governor to coordinate support. */
export function guardChoices(campaign: Campaign, state: StateId): ChoiceTable | undefined {
  const candidate = guardRequestCandidates(campaign).find((entry) => entry.state === state);
  if (!candidate) return undefined;
  return {
    columns: [
      { id: "ask", label: `Ask the governor of ${candidate.stateName}` },
    ],
    rows: [
      { id: "answer", label: "The governor's likely answer", cells: [cell(WILLINGNESS_WORDS[candidate.forecast.forecast], candidate.forecast.forecast === "unlikely" ? "adverse" : candidate.forecast.forecast === "likely" ? "favorable" : "neutral")] },
      { id: "yes", label: "If the governor agrees", cells: [cell(`The state agrees to work with you. ${formatMoney(GUARD_SUPPORT_COORDINATION_USD_MILLIONS)} is spent, and stability goes up a little. No troops are sent, and nobody new takes command.`)] },
      { id: "no", label: "If the governor refuses", cells: [cell("Asking costs you nothing")] },
      { id: "again", label: "Asking again", cells: [cell(`Not about this ${hazardLabel(candidate.condition.kind).toLowerCase()} for a season`)] },
    ],
  };
}

/** Weeks, for a declaration's clock line. */
export function lapseWords(weeks: number): string {
  return weeks <= 0 ? "Ends this week" : `Ends in ${weeksWords(weeks)}`;
}
