import { isOpenCase, prospectiveOrderAuthority, selectDateOfTurn, selectTurnOfDate, type Campaign, type CourtCase, type CourtProceeding, type CourtStage } from "@admin/engine";
import { formatDate } from "../format/figures";
import type { CourtDate } from "./court-system";

// One case's process as the record holds it: the steps it has taken with
// their dates and outcomes, the step it stands at with the next dated event,
// the steps still possible, and what governs the challenged action right now.
// A step the record does not hold is a possibility, never history.

export type CaseStepId = "filed" | "interim" | "district" | "appeal" | "supreme" | "final";

export type CaseStepState = "done" | "now" | "possible" | "not-reached";

export type CaseStep = {
  readonly id: CaseStepId;
  readonly state: CaseStepState;
  readonly moments: readonly { readonly date: string; readonly text: string }[];
};

/** What the challenged action is governed by today, from the weakest restraint to the final word. */
export type CaseGoverning =
  | { readonly kind: "final"; readonly upheld: boolean; readonly dismissed: boolean }
  | { readonly kind: "circuit"; readonly setAside: boolean }
  | { readonly kind: "stay-granted" }
  | { readonly kind: "lower-in-force"; readonly setAside: boolean }
  | { readonly kind: "lower-stayed"; readonly setAside: boolean }
  | { readonly kind: "interim" }
  | { readonly kind: "none" };

export type CaseProcess = {
  readonly steps: readonly CaseStep[];
  readonly current?: CaseStepId;
  readonly next?: CourtDate;
  readonly response?: CourtDate;
  /** `superseded` when a later judgment replaced the one the stay was about. */
  readonly stay?: { readonly status: "pending" | "granted" | "denied"; readonly requested: string; readonly decided?: string; readonly superseded: boolean };
  readonly governing: CaseGoverning;
  /** The order's own authority to operate, for a challenge to an executive order. */
  readonly operative?: ReturnType<typeof prospectiveOrderAuthority>;
  readonly remanded: boolean;
};

const STEP_OF: Readonly<Record<CourtStage, CaseStepId>> = {
  threshold: "filed",
  interim: "interim",
  "lower-merits": "district",
  remand: "district",
  appeal: "appeal",
  "circuit-merits": "appeal",
  "supreme-merits": "supreme",
  final: "final",
};

const ORDER: readonly CaseStepId[] = ["filed", "interim", "district", "appeal", "supreme", "final"];

/**
 * The step a recorded moment belongs to. The engine files each moment under
 * the stage it moves the case into, so a decision that closes a step carries
 * the next step's stage; it belongs to the step it decided. A higher court's
 * own entry (granting review) and the final disposition stay where they land.
 */
function ownerOf(history: CourtProceeding["history"], index: number): CaseStepId {
  const moment = history[index]!;
  const before = index > 0 ? history[index - 1] : undefined;
  if (!before || moment.stage === before.stage || moment.stage === "supreme-merits" || moment.stage === "final") return STEP_OF[moment.stage];
  return STEP_OF[before.stage];
}

/** A dated deadline named by its real date and placed by its week. */
function deadline(campaign: Campaign, due: { readonly year: number; readonly month: number; readonly day: number }): CourtDate {
  const turn = selectTurnOfDate(campaign, due);
  return { turn, date: formatDate(due), weeks: turn - campaign.turn };
}

function governingOf(proceeding: CourtProceeding | undefined, ruled: CourtCase | undefined, final: boolean): CaseGoverning {
  if (final) {
    return { kind: "final", upheld: ruled?.holding === "upheld", dismissed: ruled?.procedure?.dismissedAtThreshold === true };
  }
  // As the engine reads it: a circuit panel's judgment replaces the district court's, and with it any stay of that judgment.
  if (proceeding?.circuit) return { kind: "circuit", setAside: proceeding.circuit.holding === "struck-down" };
  if (proceeding?.stayApplication?.status === "granted") return { kind: "stay-granted" };
  if (proceeding?.lower) {
    const setAside = proceeding.lower.holding === "struck-down";
    return proceeding.lower.enforcement === "in-force" ? { kind: "lower-in-force", setAside } : { kind: "lower-stayed", setAside };
  }
  return proceeding?.interim && proceeding.interim !== "denied" ? { kind: "interim" } : { kind: "none" };
}

export function caseProcess(campaign: Campaign, id: string): CaseProcess | undefined {
  const proceeding = (campaign.judiciary.proceedings ?? []).find((entry) =>
    entry.id === id || (entry.subject.kind === "executive-order" && entry.subject.recordId === id));
  const ruled = campaign.judiciary.cases.find((entry) => entry.id === id || entry.id === proceeding?.id);
  const history = proceeding?.history ?? ruled?.procedure?.history ?? [];
  if (!proceeding && !ruled) return undefined;
  const date = (turn: number) => formatDate(selectDateOfTurn(campaign, turn));
  const dated = (turn: number): CourtDate => ({ turn, date: date(turn), weeks: turn - campaign.turn });
  const final = ruled !== undefined || proceeding?.stage === "final";
  const current: CaseStepId | undefined = final ? "final" : proceeding ? STEP_OF[proceeding.stage] : undefined;
  const reached = new Set(history.map((moment) => STEP_OF[moment.stage]));
  if (current) reached.add(current);
  const currentIndex = current ? ORDER.indexOf(current) : -1;
  const steps = ORDER.map((step, index): CaseStep => {
    const moments = history.flatMap((moment, index) => (ownerOf(history, index) === step ? [{ date: date(moment.turn), text: moment.account }] : []));
    const state: CaseStepState = step === current ? (final ? "done" : "now")
      : reached.has(step) ? "done"
        : final || index < currentIndex ? "not-reached" : "possible";
    return { id: step, state, moments };
  });
  // A legacy ruling with no recorded procedure still has its own decision as the final step's moment.
  const withLegacy = ruled && history.length === 0
    ? steps.map((step) => (step.id === "final" ? { ...step, moments: [{ date: date(ruled.ruledTurn), text: ruled.holding === "struck-down" ? "The Court struck the order down." : "The Court upheld the order." }] } : step))
    : steps;
  const response = proceeding ? campaign.cases?.[`case:review:${proceeding.id}`] : undefined;
  const responseDue = response && isOpenCase(response.status) && "dueAt" in response.clock ? deadline(campaign, response.clock.dueAt) : undefined;
  const stay = proceeding?.stayApplication;
  const subject = proceeding?.subject ?? ruled?.subject;
  return {
    steps: withLegacy,
    ...(current ? { current } : {}),
    ...(proceeding && !final ? { next: dated(proceeding.nextTurn) } : {}),
    ...(responseDue ? { response: responseDue } : {}),
    ...(stay ? { stay: { status: stay.status, requested: date(stay.requestedTurn), ...(stay.decidedTurn !== undefined ? { decided: date(stay.decidedTurn) } : {}),
      superseded: final || (proceeding?.circuit !== undefined && proceeding.circuit.ruledTurn >= (stay.decidedTurn ?? stay.requestedTurn)) } } : {}),
    governing: governingOf(proceeding, ruled, final),
    ...(subject?.kind === "executive-order" ? { operative: prospectiveOrderAuthority(campaign, subject.recordId) } : {}),
    remanded: proceeding?.remanded === true || history.some((moment) => moment.stage === "remand"),
  };
}
