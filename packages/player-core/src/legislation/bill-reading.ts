import {
  BUDGET_ACCOUNT_SPECS,
  CHAMBER_NAMES,
  BILL_SETBACK_LIMIT,
  LAW_OFFSETS,
  lawOffsetForBill,
  actCost,
  actOf,
  billStage,
  executiveOrder,
  otherMajorParty,
  selectHillMember,
  selectCurrentLaws,
  selectNation,
  selectPerson,
  usPartyWord,
  type Bill,
  type BillStage,
  type Campaign,
  type Chamber,
  type ChamberVote,
  type Effect,
  type HillPostId,
  type LegislativeAct,
  type MetricSet,
  type UsMajorParty,
} from "@admin/engine";
import type { ProjectedEffect } from "../reading";
import { METRIC_LABELS, formatSignedPoints, statPathLabel, type MetricStance } from "../format/figures";
import { formatMoney, type MoneyFormatter } from "../format/money";

// Bill procedure and published policy effects, without private future vote forecasts.

/**
 * The bill as it would stand the day it became law, as an effect the fiscal
 * preview can price. A law's substance for the books is its offset to the take
 * and the lines, which lives in the statute's own row rather than on the act,
 * so a preview that read only the act's effects priced a $220 billion tax cut
 * at nothing.
 */
export function enactmentEffects(campaign: Campaign, bill: Bill): readonly Effect[] {
  return [{ kind: "bill", set: { ...bill, status: "law", enactedBy: "signed", resolvedTurn: campaign.turn } }];
}

/** How many years a law's offset to the books runs, where the statute writes one. */
export function lawOffsetYears(act: string): number | undefined {
  return LAW_OFFSETS[act]?.years;
}

/** The law's annual flows and any separate charge to available authority when enacted. */
export function billFundingLines(campaign: Campaign, act: LegislativeAct, bill?: Bill): readonly string[] {
  const predecessor = bill?.revises ? campaign.bills[bill.revises.billId]
    : act.revises?.family === "housing-supply"
      ? selectCurrentLaws(campaign).find((entry) => ["act-housing-supply", "act-housing-renewal", "act-housing-replacement"].includes(entry.act))
      : undefined;
  const offered = predecessor && act.revises ? {
    ...predecessor, act: act.id, revises: { billId: predecessor.id, kind: act.revises.kind,
      provision: predecessor.revises?.provision
        ?? (predecessor.revises?.kind === "replacement" ? "targeted" : predecessor.text?.enrolled ?? "base") },
  } : undefined;
  const offset = bill ? lawOffsetForBill(bill) : offered ? lawOffsetForBill(offered) : LAW_OFFSETS[act.id];
  const gdp = selectNation(campaign, campaign.founding.nation)?.stats.economy.gdp ?? 0;
  if (act.revises && predecessor) {
    const previous = lawOffsetForBill(predecessor)?.outlays ?? 0;
    if (act.revises.kind === "repeal") return [`Ends ${formatMoney(previous * gdp)} a year in grants once it becomes law. Money already promised will still be paid.`];
    const annual = formatMoney((offset?.outlays ?? 0) * gdp);
    if (act.revises.kind === "renewal") return [`Keeps ${annual} a year in grants going for 4 more years once it becomes law.`];
    return [`Replaces ${formatMoney(previous * gdp)} a year in grants with ${annual} a year for 4 years.`];
  }
  const lines: string[] = [];
  if (offset?.outlays) lines.push(`${formatMoney(Math.abs(offset.outlays * gdp))} a year in ${offset.outlays > 0 ? "new spending" : "spending cuts"}`);
  if (offset?.revenue) lines.push(`${formatMoney(Math.abs(offset.revenue * gdp))} a year in ${offset.revenue > 0 ? "new revenue" : "lost revenue"}`);
  if (offset?.outlays || offset?.revenue) lines.push(offset.years ? `The yearly change lasts ${offset.years} ${offset.years === 1 ? "year" : "years"}` : "The yearly change lasts until the law is repealed");
  const authority = actCost(campaign, act).treasury;
  if (authority) lines.push(`${formatMoney(Math.abs(authority))} ${authority < 0 ? "taken from" : "given back to"} the money available to spend once it becomes law`);
  return lines;
}

/** Annual changes to the underlying economy while the enacted provision runs. */
export function billRestingLines(act: LegislativeAct, bill?: Bill): readonly string[] {
  return Object.entries((bill ? lawOffsetForBill(bill) : LAW_OFFSETS[act.id])?.rest ?? {}).map(
    ([path, value]) => `${statPathLabel(path)}: ${formatSignedPoints(value)} points to the basic rate while the program runs`,
  );
}

/** A floor count as a line a player can read: "House 291 of 290 needed". */
export function voteLine(vote: ChamberVote): string {
  return `${CHAMBER_NAMES[vote.chamber]}: ${vote.yeas} for, ${vote.nays} against, ${vote.required} needed`;
}

const MINORITY_POST: Readonly<Record<Chamber, HillPostId>> = {
  house: "post-house-minority-leader",
  senate: "post-senate-minority-leader",
};

/**
 * Who a president short of the votes is actually dealing with: the chamber's
 * minority leader, named rather than left as an arithmetic gap. Undefined
 * where the count carries, or where the post sits vacant.
 */
export function shortfallCounterparty(campaign: Campaign, vote: ChamberVote): string | undefined {
  if (vote.passed) return undefined;
  return selectHillMember(campaign, MINORITY_POST[vote.chamber])?.name;
}

/**
 * What the presiding officer's tie-break reads as, on the one vote it ever
 * touches: a fifty-fifty Senate on a simple majority. Undefined on every other
 * count, which is what `tieBrokenBy` already guarantees.
 */
export function tieBreakLine(campaign: Campaign, vote: ChamberVote): string | undefined {
  if (vote.tieBrokenBy === undefined) return undefined;
  const name = selectPerson(campaign, vote.tieBrokenBy)?.base.name ?? "The presiding officer";
  return vote.castingVote ? `${name} cast an additional ${vote.castingVote.yea ? "yea" : "nay"} as President of the Senate, breaking the 50-50 tie.` : `${name} broke the 50-50 tie as President of the Senate.`;
}

/**
 * The chamber and status line printed directly under the bill's title —
 * "Passed the House and the Senate. Awaiting the President's signature." —
 * so the document names where it came from and what has already happened to
 * it before a player reads a word of the text itself.
 */
export function billStatusLine(bill: Bill): string {
  const chambers = bill.passage.map((vote) => CHAMBER_NAMES[vote.chamber]);
  const passed = chambers.length === 2 ? `${chambers[0]} and ${chambers[1]}` : chambers.join(", ");
  switch (bill.status) {
    case "in-progress":
      // A bill still in the chambers has passed nothing, and a line that named
      // the two houses it is sitting in would read as though it had.
      return `${BILL_STAGE_NAME[billStage(bill)]}. Not on your desk yet.`;
    case "on-the-desk":
      return `Passed ${passed}. Waiting for your signature.`;
    case "law":
      // How it became law is a fact the engine records; the line never says signed over a bill that was not.
      return `Passed ${passed}. ${bill.enactedBy === "unsigned" ? "Became law without your signature." : bill.enactedBy === "veto-overridden" ? "Became law over your veto." : "Signed into law."}`;
    case "vetoed":
      return `Passed ${passed}. Vetoed and returned to Congress.`;
    case "dead":
      return `Passed ${passed}. Died without becoming law.`;
  }
}

/** What each stage is called on the docket row and at the head of the folio. */
export const BILL_STAGE_NAME: Readonly<Record<BillStage, string>> = {
  referral: "In committee",
  markup: "Being edited in committee",
  floor: "On the floor",
  conference: "In conference",
};

const STAGE_WHERE: Readonly<Record<BillStage, string>> = {
  referral: "Sent to a committee, and waiting for its chair to take it up.",
  markup: "A committee is working on it. It can send the bill to the full chamber for a vote, rewrite it, or hold it back.",
  floor: "Out of committee, and waiting to be scheduled for a vote.",
  conference: "The House and Senate passed different versions. Once they agree on one version, both have to vote on it again.",
};

export type BillStageReading = {
  readonly stage: BillStage;
  readonly stageName: string;
  readonly where: string;
  /** What the chambers did to it last week, in the words the wire used. */
  readonly lastWeek?: string;
  readonly rows: readonly StageRow[];
  readonly votes: readonly ChamberVote[];
  readonly stance: MetricStance;
};

export type StageRow = {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly stance: MetricStance;
};

/** Procedural history is public; future scheduling and member support are unresolved. */
export function billStageReading(_campaign: Campaign, bill: Bill): BillStageReading | undefined {
  if (bill.status !== "in-progress") return undefined;
  const stage = billStage(bill);
  const setbacks = bill.setbacks ?? 0;
  const remaining = Math.max(0, BILL_SETBACK_LIMIT - setbacks);
  return { stage, stageName: BILL_STAGE_NAME[stage], where: STAGE_WHERE[stage], lastWeek: bill.beats?.[bill.beats.length - 1]?.account,
    votes: [], stance: remaining <= 1 ? "adverse" : "neutral", rows: [
      { label: "Scheduling", value: "Unresolved", detail: "No one has said publicly when the next step will happen.", stance: "neutral" },
      { label: "Stalls before it dies", value: `${remaining} of ${BILL_SETBACK_LIMIT}`, detail: `It has stalled ${setbacks} ${setbacks === 1 ? "time" : "times"}. A bill that stalls 3 times dies.`, stance: remaining <= 1 ? "adverse" : "neutral" },
      { label: "Member support", value: "Unknown", detail: "What each party and each member's voters want gives some idea, but no member has promised a vote.", stance: "neutral" },
    ] };
}

export type OverrideReading = {
  readonly votes: readonly ChamberVote[];
  readonly wouldCarry: boolean | undefined;
  readonly headline: string;
  readonly detail: string;
  readonly stance: MetricStance;
};

/**
 * The two-thirds count on the veto, before the veto.
 *
 * This is the whole drama of the instrument: a veto Congress can overturn is a
 * bill that becomes law anyway with the presidency publicly overruled on the
 * way, and a veto it cannot is the end of the matter. A player shown that
 * arithmetic only afterward has been shown it too late to have decided
 * anything.
 */
export function overrideReading(campaign: Campaign, bill: Bill): OverrideReading {
  const lines = (["house", "senate"] as const).map((chamber) => `${CHAMBER_NAMES[chamber]} needs ${Math.ceil(campaign.congress.chambers[chamber].seats * 2 / 3)} votes`);
  return { votes: [], wouldCarry: undefined, headline: "No one knows yet if Congress can override", detail: `${lines.join("; ")}. No member has promised a vote, so no one knows whether Congress would override ${bill.title}.`, stance: "neutral" };
}

const METRIC_ORDER: readonly (keyof MetricSet)[] = ["treasury", "stability", "militaryReadiness", "standing"];

function metricStance(delta: number): MetricStance {
  return delta >= 0 ? "favorable" : "caution";
}

/**
 * What an act does, as the ceremony's effect preview reads it.
 *
 * Two vocabularies, kept apart on purpose: what it costs the administration
 * (the five readings) and what it does to the country (the sixteen stat paths).
 * A president signing a bill is spending one to move the other, and a preview
 * that mixed them into one list would hide which is which.
 */
export function actEffects(
  campaign: Campaign,
  act: LegislativeAct,
  money: MoneyFormatter = formatMoney,
): readonly ProjectedEffect[] {
  const cost = actCost(campaign, act);
  const costs = METRIC_ORDER.flatMap((key) => {
    const delta = cost[key];
    if (delta === undefined || delta === 0) return [];
    const value =
      key === "treasury"
        ? `${delta > 0 ? "+" : "−"}${money(Math.abs(delta))}`
        : `${formatSignedPoints(delta)} points`;
    return [{ label: METRIC_LABELS[key], value, stance: metricStance(delta) }];
  });
  // An authorization's whole substance. Without a line for it the ceremony
  // would preview the defense authorization as a bill that does almost
  // nothing, which is the reading the act's own effects now honestly produce
  // and exactly the wrong conclusion: what it does is make the money
  // appropriable, and that is what the player is signing.
  const authorized = act.raisesCap
    ? [
        {
          label: `${BUDGET_ACCOUNT_SPECS[act.raisesCap.account].name} ceiling`,
          value: `+${(act.raisesCap.share * 100).toFixed(1)}% of national income, for ${act.raisesCap.turns} weeks`,
          stance: "favorable" as const,
        },
      ]
    : [];
  const country = Object.entries(act.nationEffects).flatMap(([path, delta]) =>
    delta === undefined || delta === 0
      ? []
      : [
          {
            label: statPathLabel(path),
            value: `${formatSignedPoints(delta)} points`,
            stance: "neutral" as const,
          },
        ],
  );
  return [...costs, ...authorized, ...country];
}

/**
 * The bill itself, at length.
 *
 * Nobody reads a statute in a summary box, so the ceremony scrolls the
 * instrument: what Congress enacted, who wrote it, and the count that carried
 * it in each chamber — all of it quoted off the bill on the record rather than
 * composed for the screen.
 */
export function billInstrument(bill: Bill, act: LegislativeAct, caucusAnchor: UsMajorParty): string {
  const sponsor =
    bill.sponsor === "administration"
      ? "Introduced at your request."
      : bill.sponsor === "opposition"
        ? `Introduced by the ${usPartyWord(otherMajorParty(caucusAnchor))}s in Congress.`
        : "Introduced with sponsors from both parties.";
  const preamble = `Be it enacted by the Congress of the United States: ${act.summary}`;
  // A resolution of disapproval is about one rule this administration made,
  // and the catalogue entry cannot name it — Congress chose it. Reading it off
  // the enrolled instance is the only way the document says what it is
  // actually about.
  const named = bill.target === undefined ? [] : [`The rule disapproved: ${orderName(bill.target) ?? bill.target}.`];
  const counts = bill.passage.map(voteLine).join("\n");
  return [preamble, ...named, sponsor, `Passed:\n${counts}`, "Presented to the President for signature."].join("\n\n");
}

export type LawBinding = {
  readonly bill: Bill;
  /** What the act forbids the presidency, one clause per line, or empty where it binds nothing. */
  readonly binds: readonly string[];
};

/**
 * The statute book, and what each entry closes.
 *
 * A law that makes an executive order unsignable is the reason a button
 * elsewhere is disabled, and a player who cannot trace the closure back to the
 * act that caused it reads the app as broken rather than the presidency as
 * constrained.
 */
export function lawBindings(campaign: Campaign): readonly LawBinding[] {
  return selectCurrentLaws(campaign).map((bill) => {
    const act = actOf(bill);
    const constrains = act?.constrains;
    const blocked = (constrains?.blocksOrders ?? []).flatMap((orderId) => {
      const name = orderName(orderId);
      return name === undefined ? [] : [`Takes ${name.toLowerCase()} completely out of your hands.`];
    });
    const force = constrains?.barsUnilateralForce
      ? ["Takes away your power to send forces into combat first and report to Congress afterward."]
      : [];
    // The bar a resolution of disapproval creates, read off the enrolled bill
    // rather than the catalogue, for the same reason the engine reads it there.
    const disapproved =
      act?.disapproves === true && bill.target !== undefined
        ? [
            `Cancels the rule behind ${(orderName(bill.target) ?? bill.target).toLowerCase()}, and bans any rule that's basically the same.`,
          ]
        : [];
    return { bill, binds: [...blocked, ...force, ...disapproved] };
  });
}

/** A blocked order's name, read off the same catalogue the orders desk offers. */
export function orderName(orderId: string): string | undefined {
  return executiveOrder(orderId)?.name;
}

/** The act behind a bill id, for the route that opens one. */
export function billAndAct(
  campaign: Campaign,
  id: string,
): { readonly bill: Bill; readonly act: LegislativeAct } | undefined {
  const bill = campaign.bills[id];
  if (!bill) return undefined;
  const act = actOf(bill);
  return act ? { bill, act } : undefined;
}
