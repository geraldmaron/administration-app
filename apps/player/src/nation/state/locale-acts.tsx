import type { ReactNode } from "react";
import type { LocaleActId } from "@admin/engine";
import { REVIEW_WEEKS, formatRatio, localeIncident, stateApprovalReading, type LocaleActOption, type LocaleMatter } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Column, Text, type IconName } from "@admin/ui";
import { TrackRow, type ChoiceOptionView, type ChoiceRowView } from "@admin/ui/nation";
import type { DoneAct, NationAct } from "../act";
import type { ReviewLine } from "../presidential-review-seam";
import { forceReviewLines, forceRows, governorShiftWords } from "./act-terms";

// The pieces of a locale act shared by the act desk and the Nation page's
// selection panel: the verbs, the comparison rows, the review and the receipt
// lines. Both surfaces take an act through the same take(), so an act behaves
// the same wherever the President starts it.

/** Each act's one named verb. */
export const VERBS: Readonly<Record<LocaleActId, string>> = {
  relief: "Send the relief",
  "request-deployment": "Ask the governor",
  waiver: "Grant the waiver",
  review: "Order the review",
  "property-surge": "Send the officers",
  "immigration-operation": "Start the operation",
  "task-force": "Stand up the task force",
  federalize: "Take command of the Guard",
  proclaim: "Issue the proclamation",
  troops: "Send in the troops",
  priority: "Send the memorandum",
  surveil: "Order the surveillance",
  "surveil-under-order": "Begin the collection",
};

/** Each act's emblem: what it sends, so a row reads as force, money or paper before its name is read. */
export const COERCION_ICON: Readonly<Record<LocaleActId, IconName>> = {
  relief: "instrumentAssistance",
  "request-deployment": "dispatch",
  waiver: "order",
  review: "review",
  "property-surge": "building",
  "immigration-operation": "departmentHomelandSecurity",
  "task-force": "departmentInvestigation",
  federalize: "unitGroundFormation",
  proclaim: "subjectSeal",
  troops: "instrumentMilitary",
  priority: "departmentJustice",
  surveil: "intel",
  "surveil-under-order": "instrumentCovert",
};

/**
 * The acts drawn as force: armed troops, the Guard taken from its governor,
 * the proclamation that opens the way to them, and an operation that arrests
 * people in their homes and workplaces. Their review is the full one and their
 * verb is red.
 */
export const FORCE_ACTS: ReadonlySet<LocaleActId> = new Set<LocaleActId>(["troops", "proclaim", "immigration-operation", "federalize"]);

export const isForceAct = (id: LocaleActId): boolean => FORCE_ACTS.has(id);

export const DONE_WORDS: Readonly<Record<LocaleActId, string>> = {
  relief: "You sent relief",
  "request-deployment": "You asked the governor to call out the Guard",
  waiver: "You granted a waiver",
  review: "You ordered a federal review",
  "property-surge": "You sent federal officers to guard federal property",
  "immigration-operation": "You started an immigration operation",
  "task-force": "You stood up a federal task force",
  federalize: "You put the state's Guard under federal command",
  proclaim: "You ordered the insurgents to disperse",
  troops: "You sent in active-duty troops",
  priority: "You asked the Attorney General to put the disorder first",
  surveil: "You asked for surveillance",
  "surveil-under-order": "You began collection under the court's order",
};

export function requestCell(option: LocaleActOption, matter: LocaleMatter): string {
  if (!matter.request) return "The state didn't ask";
  if (option.answers) return "Gives them what they asked for";
  if (option.defers) return `Gives you ${REVIEW_WEEKS} more weeks to answer`;
  return "Leaves it unanswered";
}

/** The chance force or collection aimed at Americans goes wrong; only the odds are shown, whether it happens is read on the receipt. */
export function RiskCell({ option }: { readonly option: LocaleActOption }): ReactNode {
  if (!option.risk) return <Text variant="caption" tone="tertiary">No force or spying involved</Text>;
  const { odds, recent, erratic } = option.risk;
  return (
    <Column gap="2xs">
      <TrackRow name="Chance of an incident" figure={`${Math.round(odds * 100)}%`} value={odds} tone={odds >= 0.4 ? "bad" : "watch"} />
      <Text variant="caption" tone="secondary">
        {option.unprovoked ? "With no unrest to deal with, people will see this as going too far. " : ""}
        {recent > 0 ? `You've done this ${recent} ${recent === 1 ? "time" : "times"} lately, which makes trouble more likely and more serious.` : "If someone dies or it gets exposed, it turns into a scandal."}
        {erratic ? " Doing it again so soon looks careless and costs extra." : ""}
      </Text>
    </Column>
  );
}

function governorCell(option: LocaleActOption): string {
  const shift = governorShiftWords(option.governorShift);
  return [option.assent ?? "Doesn't need their OK", shift].filter(Boolean).join(". ");
}

/** The options a comparison offers: a direct order the law refuses is said beside them as why, never as a card to pick. */
export function offered(options: readonly LocaleActOption[]): readonly LocaleActOption[] {
  return options.filter((option) => !option.refusedByLaw);
}

/**
 * Each option's terms, read as its change from today; the state's own clock
 * is the waiting line, not a column. `proclaimed` lights the troop act's first
 * step when a proclamation is already in force.
 */
export function rowsFor(options: readonly LocaleActOption[], matter: LocaleMatter | undefined, proclaimed = false): readonly ChoiceRowView[] {
  const cells = (cell: (option: LocaleActOption) => ReactNode) => Object.fromEntries(options.map((option) => [option.id, cell(option)]));
  return [
    { id: "does", label: "What it does", lead: true, cells: cells((option) => option.summary) },
    { id: "cost", label: "Cost now", icon: "budget", cells: cells((option) => option.costText) },
    { id: "standing", label: "International standing", icon: "mapPin", cells: cells((option) => `${option.standingText}${option.unrequested ? " (the state didn't ask)" : ""}`) },
    ...(matter ? [{ id: "request", label: "The state's request", icon: "dispatch" as const, cells: cells((option) => requestCell(option, matter)) }] : []),
    { id: "governor", label: "The governor", icon: "subjectPerson", cells: cells(governorCell) },
    ...forceRows(options, proclaimed),
    ...(options.some((option) => option.risk) ? [{ id: "risk", label: "If it goes wrong", icon: "caution" as const, cells: cells((option) => <RiskCell option={option} />) }] : []),
  ];
}

export function optionsFor(options: readonly LocaleActOption[]): readonly ChoiceOptionView[] {
  return options.map((option) => ({ id: option.id, label: option.name, icon: COERCION_ICON[option.id], ...(option.locked ? { unavailable: `Not available right now. ${option.locked}` } : {}) }));
}

/** One locale act's commit, put to the review with its terms; a force act takes the full review and a red verb. */
export function take(act: NationAct, option: LocaleActOption, name: string, extra: readonly ReviewLine[] = []) {
  const force = isForceAct(option.id);
  void act.run(
    () => {
      if (!option.packet) throw new Error(option.locked ?? "You can't do this right now.");
      return { packet: option.packet, title: `${DONE_WORDS[option.id]}: ${name}`, lines: [{ label: "Cost", value: option.costText }, { label: "International standing", value: option.standingText }] };
    },
    { tier: force ? "full" : "confirm", title: option.name, lines: [{ label: "What it does", value: option.summary }, { label: "Cost", value: option.costText }, ...forceReviewLines(option), ...extra], verb: VERBS[option.id], danger: force || option.risk !== undefined },
  );
}

/** What the state's open requests became: answered, deferred, or still waiting. */
export function requestLine(done: DoneAct, state: StateId, option: LocaleActOption | undefined): string {
  const before = done.before.states[state]?.claims.length ?? 0;
  const after = done.after.states[state]?.claims ?? [];
  if (after.length < before) return "Answered. The state will remember that you helped.";
  if (option?.defers) return "Still open. You have more time before not answering counts against you.";
  return before > 0 ? "Still open." : "The state didn't ask for anything.";
}


/** The receipt's lines for a locale act: its cost, what went wrong if anything, what became of the request, and approval there now. */
export function receiptLines(done: DoneAct, state: StateId, option: LocaleActOption | undefined): DoneAct["lines"] {
  const approval = stateApprovalReading(done.after, state);
  const incident = option?.risk ? (localeIncident(done.before, state, option.id, !option.unprovoked) ?? "Nothing went wrong this time.") : undefined;
  return [...done.lines, ...(incident ? [{ label: "What happened", value: incident }] : []), { label: "The state's request", value: requestLine(done, state, option) }, ...(approval ? [{ label: "Approval here now", value: formatRatio(approval.approval) }] : [])];
}
