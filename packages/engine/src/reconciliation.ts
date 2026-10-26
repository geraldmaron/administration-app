import { fiscalYearOf } from "./clock.js";
import { majorityOf, seatedOf } from "./congress.js";
import { legislativeVoteOn } from "./congress-votes.js";
import { committeeName } from "./committees.js";
import { actOf, type LegislativeAct } from "./legislative-acts.js";
import type { EffectPacket } from "./effects.js";
import type { Bill, BudgetResolution, BudgetSubject, Campaign } from "./state.js";

// A concurrent resolution instructs a committee on a budget subject. It is
// neither an enacted law nor a substitute for the bill's later passage.
const SUBJECT_BY_ACT: Readonly<Record<string, BudgetSubject>> = {
  "act-health-coverage": "spending",
  "act-unemployment-extension": "spending",
  "act-tax-relief-and-growth": "revenue",
  "act-tax-fairness-and-revenue": "revenue",
  "act-debt-limit-increase": "debt-limit",
};

export function reconciliationSubject(act: LegislativeAct): BudgetSubject | undefined {
  return act.track === "reconciliation" ? SUBJECT_BY_ACT[act.id] : undefined;
}

/** A bill has the expedited route only after both chambers adopted its specific instruction. */
export function hasReconciliationInstruction(campaign: Campaign, act: LegislativeAct, billId: string): boolean {
  const subject = reconciliationSubject(act);
  if (!subject) return false;
  const year = fiscalYearOf(campaign.calendar);
  return (campaign.congress.budgetResolutions ?? []).some((record) =>
    record.adopted && record.fiscalYear === year && record.subject === subject &&
    record.committee === act.committee && record.actId === act.id && record.billId === billId);
}

/** The effective floor procedure, including old saves without a budget resolution. */
export function legislativeTrack(campaign: Campaign, act: LegislativeAct, billId?: string): "ordinary" | "reconciliation" | "privileged" {
  if (act.track !== "reconciliation") return act.track ?? "ordinary";
  return billId && hasReconciliationInstruction(campaign, act, billId) ? "reconciliation" : "ordinary";
}

export type BudgetResolutionResult =
  | { readonly ok: true; readonly record: BudgetResolution; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

/** Ask the chambers to adopt a narrow budget instruction for a pending bill. */
export function requestBudgetResolution(campaign: Campaign, billId: string): BudgetResolutionResult {
  const bill: Bill | undefined = campaign.bills[billId];
  if (!bill || bill.status !== "in-progress") return { ok: false, reason: "The proposal is not moving through Congress." };
  const act = actOf(bill);
  const subject = act && reconciliationSubject(act);
  if (!act || !subject || !act.committee) return { ok: false, reason: "This bill is not eligible for budget reconciliation." };
  const fiscalYear = fiscalYearOf(campaign.calendar);
  const prior = campaign.congress.budgetResolutions ?? [];
  if (prior.some((entry) => entry.fiscalYear === fiscalYear && entry.subject === subject && entry.adopted)) {
    return { ok: false, reason: `Congress already adopted a ${subject} instruction for fiscal year ${fiscalYear}.` };
  }
  if (prior.some((entry) => entry.requestedTurn === campaign.turn && entry.actId === act.id)) {
    return { ok: false, reason: "Congress already voted on this instruction this week." };
  }
  const votes = (["house", "senate"] as const).map((chamber) => legislativeVoteOn(campaign, {
    chamber, appeal: act.appeal, required: majorityOf(seatedOf(campaign.congress, chamber)),
    stance: act.sponsor === "bipartisan" ? "neutral" : act.sponsor,
  })).map((vote) => ({ ...vote, recordedTurn: campaign.turn }));
  const adopted = votes.every((vote) => vote.passed);
  const record: BudgetResolution = {
    id: `budget-resolution:${fiscalYear}:${subject}:${campaign.turn}:${act.id}`,
    fiscalYear, subject, committee: act.committee, actId: act.id, billId: bill.id,
    requestedTurn: campaign.turn, votes, adopted,
  };
  const summary = adopted
    ? `Both chambers adopt a fiscal year ${fiscalYear} budget resolution instructing the ${committeeName(act.committee)} on ${subject} for ${act.title}. The bill may now use reconciliation.`
    : `Congress rejects a fiscal year ${fiscalYear} budget instruction for ${act.title}. The bill remains on the ordinary legislative route.`;
  return { ok: true, record, packet: {
    source: "action", actor: "player", turn: campaign.turn,
    narration: { summary },
    effects: [{ kind: "congress", set: { ...campaign.congress, budgetResolutions: [...prior, record] } }],
  } };
}
