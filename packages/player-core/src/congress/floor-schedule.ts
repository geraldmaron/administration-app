import {
  billStage,
  amendableAct,
  otherMajorParty,
  BILL_SETBACK_LIMIT,
  selectBills,
  selectBillsAwaitingSignature,
  selectBillsInProgress,
  selectSigningWindow,
  usPartyWord,
  type Bill,
  type BillSponsor,
  type BillStage,
  type Campaign,
  type ChamberVote,
} from "@admin/engine";
import { formatDate, type MetricStance } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { BILL_STAGE_NAME } from "../legislation/bill-reading.js";

/** A chamber as a heading or a count names it. */
export const CHAMBER_TITLE = { house: "House", senate: "Senate" } as const;

// The public docket carries procedural history and requirements, not private future votes.

export type FloorCount = {
  readonly chamber: ChamberVote["chamber"];
  readonly name: string;
  readonly yeas: number;
  readonly required: number;
  readonly seats: number;
  readonly passed: boolean;
  readonly supportKnown?: boolean;
};

export type FloorRow = {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly sponsor: string;
  readonly stageName: string;
  /** One line on where it stands and what it faces. */
  readonly line: string;
  /** For a bill in the chambers, the floor count; for one on the desk, the override count. */
  readonly counts: readonly FloorCount[];
  /** Whether that count carries: for a desk bill, whether a veto would be overridden. */
  readonly carries: boolean | undefined;
  readonly stance: MetricStance;
};

export type FloorGroupKey = "desk" | BillStage;

export type FloorGroup = {
  readonly key: FloorGroupKey;
  readonly title: string;
  readonly rows: readonly FloorRow[];
};

export const FLOOR_GROUP_TITLE: Readonly<Record<FloorGroupKey, string>> = {
  desk: "On your desk",
  floor: "On the floor",
  conference: "In conference",
  markup: "Being edited in committee",
  referral: "In committee",
};

const GROUP_ORDER: readonly FloorGroupKey[] = ["desk", "conference", "floor", "markup", "referral"];

/** Whose bill it is, the way a whip would say it. */
export function sponsorWords(campaign: Campaign, sponsor: BillSponsor): string {
  if (sponsor === "administration") return "Your bill";
  if (sponsor === "bipartisan") return "Written by both parties";
  return `The ${usPartyWord(otherMajorParty(campaign.congress.caucusAnchor))}s' bill`;
}

function countsOf(campaign: Campaign, votes: readonly ChamberVote[]): readonly FloorCount[] {
  return votes.map((vote) => ({
    chamber: vote.chamber,
    name: CHAMBER_TITLE[vote.chamber],
    yeas: vote.yeas,
    required: vote.required,
    seats: campaign.congress.chambers[vote.chamber].seats,
    passed: vote.passed,
    supportKnown: true,
  }));
}

function publicCounts(campaign: Campaign, override = false): readonly FloorCount[] {
  return (["house", "senate"] as const).map((chamber) => {
    const seats = campaign.congress.chambers[chamber].seats;
    return { chamber, name: CHAMBER_TITLE[chamber], seats, required: override ? Math.ceil(seats * 2 / 3) : Math.floor(seats / 2) + 1, yeas: 0, passed: false, supportKnown: false };
  });
}

function recordedPassage(bill: Bill): readonly ChamberVote[] {
  return bill.status === "dead" ? bill.passage.filter((vote) => vote.recordedTurn !== undefined) : bill.passage;
}

function deskRow(campaign: Campaign, bill: Bill): FloorRow {
  const deadline = formatDate(selectSigningWindow(campaign, bill).deadline);
  return {
    id: bill.id,
    title: bill.title,
    href: place.bill(bill.id),
    sponsor: sponsorWords(campaign, bill.sponsor),
    stageName: "Waiting for your signature",
    line: `Sign it or send it back by ${deadline}, or it becomes law without you. No one knows yet whether Congress has the votes to override a veto.`,
    counts: publicCounts(campaign, true),
    carries: undefined,
    stance: "neutral",
  };
}

function chamberRow(campaign: Campaign, bill: Bill): FloorRow {
  const left = Math.max(0, BILL_SETBACK_LIMIT - (bill.setbacks ?? 0));
  return {
    id: bill.id,
    title: bill.title,
    href: place.bill(bill.id),
    sponsor: sponsorWords(campaign, bill.sponsor),
    stageName: BILL_STAGE_NAME[billStage(bill)],
    line: `It can stall ${left} more time${left === 1 ? "" : "s"} before it dies. No one knows yet when it gets a vote or who will support it.`,
    counts: publicCounts(campaign),
    carries: undefined,
    stance: left <= 1 ? "adverse" : "neutral",
  };
}

/**
 * Congress's floor schedule: the bills awaiting the President's signature and
 * every bill in the chambers by the stage it has reached, furthest along first.
 */
export function floorSchedule(campaign: Campaign): readonly FloorGroup[] {
  const desk = selectBillsAwaitingSignature(campaign).map((bill) => deskRow(campaign, bill));
  const inChambers = selectBillsInProgress(campaign);
  const rowsFor = (key: FloorGroupKey): readonly FloorRow[] =>
    key === "desk" ? desk : inChambers.filter((bill) => billStage(bill) === key).map((bill) => chamberRow(campaign, bill));
  return GROUP_ORDER.map((key) => ({ key, title: FLOOR_GROUP_TITLE[key], rows: rowsFor(key) })).filter((group) => group.rows.length > 0);
}

export type PipelineStep = {
  readonly key: string;
  readonly label: string;
  readonly state: "done" | "current" | "ahead";
};

const OUTCOME_LABEL: Readonly<Record<Bill["status"], string>> = {
  "in-progress": "Law",
  "on-the-desk": "Law",
  law: "Law",
  vetoed: "Vetoed",
  dead: "Died",
};

/** Where a bill is on the road from referral to the statute book. */
export function billPipeline(bill: Bill): readonly PipelineStep[] {
  const steps = [
    { key: "referral", label: BILL_STAGE_NAME.referral },
    { key: "markup", label: BILL_STAGE_NAME.markup },
    { key: "floor", label: BILL_STAGE_NAME.floor },
    ...(amendableAct(bill.act) && bill.text?.house !== undefined ? [{ key: "conference", label: BILL_STAGE_NAME.conference }] : []),
    { key: "desk", label: "On your desk" },
    { key: "outcome", label: OUTCOME_LABEL[bill.status] },
  ];
  const at = bill.status === "in-progress" ? steps.findIndex((step) => step.key === billStage(bill)) : bill.status === "on-the-desk" ? steps.findIndex((step) => step.key === "desk") : steps.length - 1;
  return steps.map((step, i) => ({ ...step, state: i < at ? "done" : i === at ? "current" : "ahead" }));
}

/** Bills that have left the chambers this term, newest first, for the floor's own record. */
export function settledBills(campaign: Campaign, limit = 5): readonly FloorRow[] {
  return selectBills(campaign)
    .filter((bill) => bill.status === "law" || bill.status === "vetoed" || bill.status === "dead")
    .sort((a, b) => (b.resolvedTurn ?? b.introducedTurn) - (a.resolvedTurn ?? a.introducedTurn) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((bill) => ({
      id: bill.id,
      title: bill.title,
      href: place.bill(bill.id),
      sponsor: sponsorWords(campaign, bill.sponsor),
      stageName: OUTCOME_LABEL[bill.status] === "Law" ? (bill.enactedBy === "unsigned" ? "Law without your signature" : "Law") : OUTCOME_LABEL[bill.status],
      line: recordedPassage(bill).map((vote) => `${CHAMBER_TITLE[vote.chamber]} ${vote.yeas} to ${vote.nays}`).join(", ") || "It never got a vote.",
      counts: countsOf(campaign, recordedPassage(bill)),
      carries: bill.status === "law",
      stance: bill.status === "law" ? "favorable" : "neutral",
    }));
}
