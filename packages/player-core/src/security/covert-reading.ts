import {
  apply,
  closeFinding,
  findingRefusal,
  selectFindings,
  selectNation,
  selectUnfoundedActions,
  signFinding,
  standingFinding,
  type Campaign,
  type CovertFinding,
  type EffectPacket,
  type FindingResult,
  type FindingState,
  type NotificationTier,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import { formatDate, formatSignedPoints } from "../format/figures.js";
import { cell, type ChoiceColumn, type ChoiceTable } from "../policy/choice-table.js";

// The President's covert findings: the paper that has to exist before an
// operation does, who was told, and what has been done without any. Signing
// and closing are the two acts; a signing that counsel will not paper still
// goes through the engine as a recorded attempt, and is receipted as refused.

export const FINDING_TIERS: readonly { readonly id: NotificationTier; readonly label: string; readonly who: string }[] = [
  { id: "full-committees", label: "Brief the full committees", who: "The House and Senate intelligence committees, before anything happens" },
  { id: "gang-of-eight", label: "Brief the Gang of Eight", who: "Eight leaders of Congress, including the heads of both intelligence committees, before anything happens" },
  { id: "withheld", label: "Don't tell them first", who: "Nobody yet. Afterward, you owe the committees a written explanation of why" },
];

export const FINDING_STATES: readonly { readonly id: Exclude<FindingState, "unwritten">; readonly label: string; readonly detail: string }[] = [
  { id: "written", label: "Written before the act", detail: "A finding is your signed approval for a secret operation. This one is signed and reported before anything happens, which is the usual, slower way." },
  { id: "contemporaneous", label: "Recorded at the time", detail: "There's no time to write a full finding, so your decision is written down now and turned into a finding within 48 hours." },
];

const STATE_WORDS: Readonly<Record<FindingState, string>> = { written: "Written before the act", contemporaneous: "Recorded at the time, finding to follow", unwritten: "Unwritten" };

export type FindingRow = {
  readonly id: string;
  readonly objective: string;
  readonly target: NationId;
  readonly targetName: string;
  readonly signed: string;
  readonly state: string;
  readonly told: string;
  /** Notice was withheld and the committees have not yet been told. */
  readonly owesNotice: boolean;
  readonly reasons?: string;
  readonly activities: number;
  readonly closed: boolean;
};

export type UnfoundedRow = { readonly id: string; readonly targetName: string; readonly description: string };

export type CovertReading = { readonly open: readonly FindingRow[]; readonly closed: readonly FindingRow[]; readonly unfounded: readonly UnfoundedRow[] };

const nameOf = (campaign: Campaign, id: NationId): string => selectNation(campaign, id)?.base.identity.name ?? (id as string);

function rowOf(campaign: Campaign, finding: CovertFinding): FindingRow {
  const tier = FINDING_TIERS.find((entry) => entry.id === finding.notification);
  return {
    id: finding.id,
    objective: finding.objective,
    target: finding.target,
    targetName: nameOf(campaign, finding.target),
    signed: formatDate(finding.signedDate),
    state: STATE_WORDS[finding.state],
    told: finding.notification === "withheld" && finding.notifiedDay !== undefined ? "Told late, with your reasons" : (tier?.label.replace("Brief", "Briefed").replace("Don't tell them first", "Not told beforehand") ?? finding.notification),
    owesNotice: finding.notification === "withheld" && finding.notifiedDay === undefined,
    ...(finding.reasonsWithheld ? { reasons: finding.reasonsWithheld } : {}),
    activities: finding.activities,
    closed: finding.closedDay !== undefined,
  };
}

/** Findings open and closed, newest first, and the covert acts taken with no paper behind them. */
export function covertReading(campaign: Campaign): CovertReading {
  const rows = selectFindings(campaign).map((finding) => rowOf(campaign, finding));
  return {
    open: rows.filter((row) => !row.closed),
    closed: rows.filter((row) => row.closed),
    unfounded: selectUnfoundedActions(campaign).map((action) => ({ id: action.id, targetName: nameOf(campaign, action.target), description: action.description })),
  };
}

/** The governments a finding could be aimed at today: every one but the homeland and any that already has one standing. */
export function findingTargets(campaign: Campaign): readonly { readonly id: NationId; readonly name: string }[] {
  return Object.keys(campaign.nations)
    .map((id) => id as NationId)
    .filter((id) => id !== campaign.founding.nation && !standingFinding(campaign, id))
    .map((id) => ({ id, name: nameOf(campaign, id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type FindingDraft = { readonly target: NationId; readonly objective: string; readonly state: Exclude<FindingState, "unwritten">; readonly reasons: string };

function signing(campaign: Campaign, draft: FindingDraft, tier: NotificationTier): FindingResult {
  return signFinding(campaign, draft.objective.trim(), draft.target, draft.state, tier, draft.reasons.trim() || undefined);
}

/** Why counsel will not paper this objective, or nothing. */
export function counselRefusal(campaign: Campaign, draft: FindingDraft): string | undefined {
  return draft.objective.trim() ? findingRefusal(campaign, draft.objective.trim(), draft.target) : undefined;
}

function dispositionMove(campaign: Campaign, result: FindingResult): string {
  if (!result.ok) return "Nothing";
  const move = apply(campaign, result.packet).congress.disposition - campaign.congress.disposition;
  return Math.abs(move) < 0.0005 ? "Nothing" : `How Congress feels about you ${formatSignedPoints(move)} pts`;
}

function lockReason(draft: FindingDraft, tier: NotificationTier, result: FindingResult): string | undefined {
  if (!draft.objective.trim()) return "Not available right now. Write what the operation is allowed to do first.";
  if (!result.ok) return `Not available right now. ${result.reason}`;
  if (tier === "withheld" && !draft.reasons.trim()) return "Not available right now. If you don't tell the committees first, you have to write down why.";
  return undefined;
}

/** The three ways to tell the committees, each read as what signing adds; the paper and what it costs are on the same rows. */
export function signChoices(campaign: Campaign, draft: FindingDraft): ChoiceTable {
  const refusal = counselRefusal(campaign, draft);
  const results = FINDING_TIERS.map((tier) => ({ tier, result: signing(campaign, draft, tier.id) }));
  const columns: ChoiceColumn[] = [
    ...results.map(({ tier, result }) => {
      const locked = lockReason(draft, tier.id, result);
      return { id: tier.id, label: tier.label, ...(locked ? { locked } : {}) };
    }),
  ];
  return {
    columns,
    rows: [
      { id: "told", label: "Who is told", cells: results.map(({ tier }) => cell(tier.who)) },
      { id: "counsel", label: "What your lawyers say", cells: results.map(() => (refusal ? cell(`Your lawyers won't put it in writing. ${refusal} The attempt is still recorded.`, "adverse") : cell("Your lawyers will put it in writing"))) },
      { id: "hill", label: "In Congress", cells: results.map(({ result }) => cell(dispositionMove(campaign, result), dispositionMove(campaign, result) === "Nothing" ? "neutral" : "adverse")) },
      { id: "after", label: "Afterward", cells: results.map(() => cell(refusal ? "Nothing is authorized" : "Secret operations against that government are approved until you close the finding")) },
    ],
  };
}

export function signOrder(campaign: Campaign, draft: FindingDraft, tier: NotificationTier): EffectPacket {
  const result = signing(campaign, draft, tier);
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}

/** Closing a finding out, read as what it ends. */
export function closeFindingChoices(campaign: Campaign, id: string): ChoiceTable | undefined {
  const finding = selectFindings(campaign).find((entry) => entry.id === id);
  if (!finding) return undefined;
  const result = closeFinding(campaign, id);
  const name = nameOf(campaign, finding.target);
  return {
    columns: [
      { id: "close", label: "Close it out", ...(result.ok ? {} : { locked: `Not available right now. ${result.reason}` }) },
    ],
    rows: [
      { id: "cover", label: `Secret operations against ${name}`, cells: [cell("Not approved. Any operation without a finding in place is recorded forever as one you ordered without legal authority", "adverse")] },
      { id: "now", label: "Cost now", cells: [cell("Nothing")] },
    ],
  };
}

export function closeFindingOrder(campaign: Campaign, id: string): EffectPacket {
  const result = closeFinding(campaign, id);
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}
