import { assessMemberSupport, type ChamberSupportAssessment } from "./support-assessment.js";
import {
  CHAMBERS,
  actOf,
  restrainsThePresident,
  type Bill,
  type Campaign,
  type Chamber,
  type ChamberVote,
} from "@admin/engine";
import { STATE_IDS, stateById, type StateId } from "@admin/world";
import { CHAMBER_TITLE } from "./floor-schedule.js";

// Future support uses public context only; historical delegation counts require a recorded roll call.

/** Which count the bill faces next. */
export type WhipQuestion = "passage" | "override" | "recorded";

/** Whether a yea is a vote with the President or against him. */
export type WhipFrame = "with" | "against";

export type DelegationWhip = {
  readonly state: StateId;
  readonly name: string;
  readonly seats: number;
  readonly yeas: number;
  readonly nays: number;
  /** Members on the administration's side of this question, whichever way the question is put. */
  readonly withYou: number;
};

export type ChamberWhip = {
  readonly chamber: Chamber;
  readonly name: string;
  /** The engine's count, which the totals below always sum to. */
  readonly vote: ChamberVote;
  /** Every delegation with a seat, in state order. Empty when the save's delegations do not add up to the chamber. */
  readonly delegations: readonly DelegationWhip[];
  /** Delegations that split on the question, the largest first: where a vote could still be found. */
  readonly swing: readonly DelegationWhip[];
  /** The presiding officer's vote on a tied Senate, which no delegation cast: +1 for, -1 against, 0 otherwise. */
  readonly presiding: number;
};

export type WhipCount = {
  readonly assessment: readonly ChamberSupportAssessment[];
  readonly question: WhipQuestion;
  readonly frame: WhipFrame;
  readonly chambers: readonly ChamberWhip[];
};

const SWING_SHOWN = 5;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

type Share = { readonly key: StateId; readonly cap: number; readonly weight: number };

/** Each row's share of a quota scaled to `total`, holding every row at or under its cap. */
function waterFill(total: number, rows: readonly Share[], desired: readonly number[]): readonly number[] {
  const out = rows.map(() => 0);
  const fixed = new Set<number>();
  for (let pass = 0; pass <= rows.length; pass += 1) {
    const free = rows.map((_, i) => i).filter((i) => !fixed.has(i));
    const remaining = total - [...fixed].reduce((sum, i) => sum + rows[i]!.cap, 0);
    const mass = free.reduce((sum, i) => sum + desired[i]!, 0);
    const capMass = free.reduce((sum, i) => sum + rows[i]!.cap, 0);
    const over: number[] = [];
    for (const i of free) {
      const value = mass > 0 ? (desired[i]! * remaining) / mass : capMass > 0 ? (rows[i]!.cap * remaining) / capMass : 0;
      out[i] = value;
      if (value > rows[i]!.cap) over.push(i);
    }
    if (over.length === 0) break;
    for (const i of over) {
      fixed.add(i);
      out[i] = rows[i]!.cap;
    }
  }
  return out;
}

/** Whole votes from a fractional split, largest remainders first, ties in state order. */
function roundToTotal(total: number, rows: readonly Share[], shares: readonly number[]): readonly number[] {
  const floors = shares.map((share, i) => Math.min(rows[i]!.cap, Math.floor(share + 1e-9)));
  let left = total - floors.reduce((sum, n) => sum + n, 0);
  const order = shares
    .map((share, i) => ({ i, rest: share - floors[i]! }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  const out = [...floors];
  for (const { i } of order) {
    if (left <= 0) break;
    if (out[i]! < rows[i]!.cap) {
      out[i] = out[i]! + 1;
      left -= 1;
    }
  }
  return out;
}

/**
 * Place `total` yeas across rows of members, each row voting yea at the
 * caucus's own rate moved by how far its weight sits from the caucus's mean.
 * Sums to `total` exactly and never exceeds a row's seats.
 */
export function spreadVotes(total: number, rows: readonly Share[]): ReadonlyMap<StateId, number> {
  const seats = rows.reduce((sum, row) => sum + row.cap, 0);
  const target = Math.max(0, Math.min(seats, Math.round(total)));
  if (seats === 0) return new Map();
  const rate = target / seats;
  const mean = rows.reduce((sum, row) => sum + row.cap * row.weight, 0) / seats;
  const desired = rows.map((row) => row.cap * clamp01(rate + row.weight - mean));
  const placed = roundToTotal(target, rows, waterFill(target, rows, desired));
  return new Map(rows.map((row, i) => [row.key, placed[i]!]));
}

function delegationsFor(campaign: Campaign, vote: ChamberVote, frame: WhipFrame): readonly DelegationWhip[] {
  if (vote.rollCall) return STATE_IDS.flatMap((state): DelegationWhip[] => {
    const members = vote.rollCall!.filter((member) => member.state === state);
    if (members.length === 0) return [];
    const yeas = members.filter((member) => member.yea).length;
    const nays = members.length - yeas;
    return [{ state, name: stateById.get(state)?.name ?? state, seats: members.length, yeas, nays, withYou: frame === "with" ? yeas : nays }];
  });
  return []; // Legacy aggregate votes do not establish any individual or state vote.

}

function chamberWhip(campaign: Campaign, vote: ChamberVote, frame: WhipFrame): ChamberWhip {
  const delegations = delegationsFor(campaign, vote, frame);
  const swing = delegations
    .filter((row) => row.yeas > 0 && row.nays > 0)
    .sort((a, b) => Math.min(b.yeas, b.nays) - Math.min(a.yeas, a.nays) || b.seats - a.seats || a.state.localeCompare(b.state))
    .slice(0, SWING_SHOWN);
  const placed = delegations.reduce((sum, row) => sum + row.yeas, 0);
  const presiding = delegations.length > 0 ? vote.yeas - placed : 0;
  return { chamber: vote.chamber, name: CHAMBER_TITLE[vote.chamber], vote, delegations, swing, presiding };
}

function countFor(campaign: Campaign, bill: Bill): { readonly question: WhipQuestion; readonly frame: WhipFrame; readonly votes: readonly ChamberVote[] } {
  const act = actOf(bill);
  const passageFrame: WhipFrame = act && restrainsThePresident(act) ? "against" : "with";
  if (bill.status === "in-progress") {
    return { question: "passage", frame: passageFrame, votes: [] };
  }
  if (bill.status === "on-the-desk") return { question: "override", frame: "against", votes: [] };
  const votes = bill.status === "dead" ? bill.passage.filter((vote) => vote.recordedTurn !== undefined || vote.cloture?.recordedTurn !== undefined).map((vote) => vote.recordedTurn === undefined ? vote.cloture! : vote) : bill.passage;
  return { question: "recorded", frame: passageFrame, votes };
}

/**
 * The count a bill faces next, by chamber and by delegation: the floor count
 * while it is in the chambers, the override count while it is on the desk,
 * and the recorded count once it is settled.
 */
export function whipCount(campaign: Campaign, bill: Bill): WhipCount {
  const { question, frame, votes } = countFor(campaign, bill);
  const ordered = CHAMBERS.flatMap((chamber) => votes.filter((vote) => vote.chamber === chamber));
  return { question, frame, assessment: question === "recorded" ? [] : assessMemberSupport(campaign, bill, question === "override"), chambers: ordered.map((vote) => chamberWhip(campaign, vote, frame)) };
}

/** One chamber's whip, by state, for the map: how much of each delegation is with the administration. */
export function whipByState(whip: WhipCount, chamber: Chamber): ReadonlyMap<string, DelegationWhip> {
  const found = whip.chambers.find((entry) => entry.chamber === chamber);
  return new Map((found?.delegations ?? []).map((row) => [row.state as string, row]));
}
