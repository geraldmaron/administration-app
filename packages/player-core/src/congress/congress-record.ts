import {
  COMMITTEE_IDS,
  committeePanel,
  nextElection,
  selectBills,
  selectDateOfTurn,
  selectInquiriesFor,
  isMatterOpen,
  senateClassUpIn,
  stateApproval,
  type Bill,
  type Campaign,
  type Chamber,
  type ChamberVote,
  type UsParty,
} from "@admin/engine";
import { formatDate } from "../format/figures.js";
import { place } from "../navigation/places.js";
import type { CongressChamber, CongressSeat, RecordedRoll } from "./congress-system.js";
import { hillPosts, standingOf, type HillStanding } from "./hill-reading.js";

// The Hill's record and its people: every roll call the term recorded, split by
// party so a crossing vote shows; what the President's bills and vetoes came
// to; the leaders and chairs a President deals with by name; and, on public
// positions alone, which members across the aisle sit nearest the President.

export type PartySplit = { readonly yea: number; readonly nay: number };

export type RollHistoryEntry = {
  readonly key: string;
  readonly turn: number;
  readonly date: string;
  readonly chamber: Chamber;
  readonly title: string;
  readonly href: string;
  readonly question: string;
  readonly yeas: number;
  readonly nays: number;
  readonly required: number;
  readonly passed: boolean;
  /** Recorded member votes by party; absent when the record kept only the totals. */
  readonly byParty?: Readonly<Record<UsParty, PartySplit>>;
};

export type TermTally = {
  readonly signed: number;
  readonly unsigned: number;
  readonly vetoed: number;
  readonly overridden: number;
  readonly died: number;
  readonly pending: number;
};

export type HillLeader = {
  readonly id: string;
  readonly title: string;
  readonly chamber: Chamber;
  readonly name: string;
  readonly personId?: string;
  readonly href: string;
  readonly party: UsParty;
  readonly standing: HillStanding;
  readonly following: string;
  /** An outreach play already in flight with them, said as its due date. */
  readonly pending?: string;
};

export type HillCommittee = {
  readonly id: string;
  readonly name: string;
  readonly chair?: string;
  readonly chairId?: string;
  readonly chairHref?: string;
  readonly standing: HillStanding;
  readonly inquiries: readonly string[];
};

export type ReachableMember = CongressSeat & {
  /** Distance between the member's recorded economic position and the President's, 0 to 2. */
  readonly distance: number;
};

export type ChamberReach = {
  readonly chamber: Chamber;
  /** Votes the President's nearest caucus lacks for a majority, or for cloture in the Senate. */
  readonly need: number;
  readonly line: string;
  /** Members of the other caucus whose public positions sit nearest the President's, nearest first. */
  readonly nearest: readonly ReachableMember[];
};

export type NextSenateClass = { readonly seatClass: 1 | 2 | 3; readonly year: number; readonly weeks: number };

function split(vote: ChamberVote): Readonly<Record<UsParty, PartySplit>> | undefined {
  if (!vote.rollCall || vote.rollCall.length === 0) return undefined;
  const tally = (party: UsParty): PartySplit => {
    const members = vote.rollCall!.filter((member) => member.party === party);
    const yea = members.filter((member) => member.yea).length;
    return { yea, nay: members.length - yea };
  };
  return { democrat: tally("democrat"), independent: tally("independent"), republican: tally("republican") };
}

export function recordedVotes(bill: Bill): readonly { readonly vote: ChamberVote; readonly question: string }[] {
  const passage = bill.passage.flatMap((vote) => [
    ...(vote.cloture ? [{ vote: vote.cloture, question: "Cloture" }] : []),
    { vote, question: vote.procedure === "cloture" ? "Cloture" : "Passage" },
  ]);
  return [...passage, ...(bill.override ?? []).map((vote) => ({ vote, question: "Veto override" }))].filter(({ vote }) => vote.recordedTurn !== undefined);
}

/** Every roll call the term recorded on a bill, oldest first. */
export function rollHistory(campaign: Campaign): readonly RollHistoryEntry[] {
  return selectBills(campaign)
    .flatMap((bill) =>
      recordedVotes(bill).map(({ vote, question }, i): RollHistoryEntry => {
        const byParty = split(vote);
        return {
          key: `${bill.id}:${vote.chamber}:${question}:${i}`,
          turn: vote.recordedTurn!,
          date: formatDate(selectDateOfTurn(campaign, vote.recordedTurn!)),
          chamber: vote.chamber,
          title: bill.title,
          href: place.bill(bill.id),
          question,
          yeas: vote.yeas,
          nays: vote.nays,
          required: vote.required,
          passed: vote.passed,
          ...(byParty ? { byParty } : {}),
        };
      }),
    )
    .sort((a, b) => a.turn - b.turn || a.key.localeCompare(b.key));
}

/** What the term's bills came to. */
export function termTally(campaign: Campaign): TermTally {
  const bills = selectBills(campaign);
  const law = bills.filter((bill) => bill.status === "law");
  return {
    signed: law.filter((bill) => (bill.enactedBy ?? "signed") === "signed").length,
    unsigned: law.filter((bill) => bill.enactedBy === "unsigned").length,
    overridden: law.filter((bill) => bill.enactedBy === "veto-overridden").length,
    vetoed: bills.filter((bill) => bill.status === "vetoed").length,
    died: bills.filter((bill) => bill.status === "dead").length,
    pending: bills.filter((bill) => bill.status === "in-progress" || bill.status === "on-the-desk").length,
  };
}

/** The leaders a President deals with by name, each with how they stand toward the administration. */
export function hillLeaders(campaign: Campaign): readonly HillLeader[] {
  return hillPosts(campaign).map((post) => ({
    id: post.id,
    title: post.title,
    chamber: post.chamber,
    name: post.name,
    ...(post.holderId ? { personId: post.holderId } : {}),
    href: post.href,
    party: post.party,
    standing: post.standing,
    following: post.following,
    ...(post.pending ? { pending: post.pending } : {}),
  }));
}

/** Every committee with its chair and its reading of the administration. */
export function hillCommittees(campaign: Campaign): readonly HillCommittee[] {
  return COMMITTEE_IDS.map((id): HillCommittee => {
    const panel = committeePanel(campaign, id);
    const chair = panel.chair ? campaign.people[panel.chair]?.base.name : undefined;
    const inquiries = selectInquiriesFor(campaign, id).filter(isMatterOpen).map((matter) => matter.subject);
    return {
      id,
      name: panel.name,
      ...(chair && panel.chair ? { chair, chairId: panel.chair as string, chairHref: place.person(panel.chair) } : {}),
      standing: standingOf(panel.disposition),
      inquiries,
    };
  }).sort((a, b) => b.inquiries.length - a.inquiries.length || a.standing.value - b.standing.value);
}

/**
 * The members across the aisle a President would call first, read only from
 * public positions: the other caucus, ordered by how near each member's
 * recorded economic position sits to the President's own. A position is not a
 * commitment, so this never says how anyone will vote.
 */
export function chamberReach(chamber: CongressChamber, presidentLean: number, shown = 8): ChamberReach {
  const line = chamber.thresholds.find((entry) => entry.key === "cloture") ?? chamber.thresholds.find((entry) => entry.key === "majority")!;
  const ours = new Set(chamber.caucus.parties);
  const theirs = chamber.members.filter((member) => !ours.has(member.party) && member.lean !== undefined && !member.vacant);
  const nearest = [...theirs]
    .map((member) => ({ ...member, distance: Math.abs(member.lean! - presidentLean) }))
    .sort((a, b) => a.distance - b.distance || a.seat.localeCompare(b.seat))
    .slice(0, shown);
  return { chamber: chamber.chamber, need: line.short, line: line.label, nearest };
}

/** The Senate class that faces the voters at the next November election, if one is scheduled. */
export function nextSenateClass(campaign: Campaign): NextSenateClass | undefined {
  const election = nextElection(campaign);
  if (!election) return undefined;
  const year = election.date.year;
  const seatClass = senateClassUpIn(year);
  return seatClass ? { seatClass, year, weeks: election.turnsAway } : undefined;
}

/** The President's own economic position, which every member's is measured against. */
export function presidentLean(campaign: Campaign): number {
  return campaign.founding.leader.ideology.economicLeftRight;
}

export type MemberDepth = CongressSeat & {
  /** Where their recorded economic position sits against the President's: negative is to the left. */
  readonly fromYou?: number;
  /** Their home state's approval of the President, 0 to 1; absent where no state reading is kept. */
  readonly homeApproval?: number;
  /** Their seat faces the voters at the next November election. */
  readonly upNext: boolean;
  /** Their vote on the chamber's newest roll call, when they cast a recorded one. */
  readonly lastVote?: "yea" | "nay";
};

/** One member read in depth from public records only: position against the President's, home-state approval, the next election and the last recorded vote. */
export function memberDepth(campaign: Campaign, member: CongressSeat, you: number, senateClass: NextSenateClass | undefined, roll: RecordedRoll | undefined): MemberDepth {
  const approval = stateApproval(campaign, member.state);
  const vote = roll?.votes.get(member.seat);
  return {
    ...member,
    ...(member.lean !== undefined ? { fromYou: member.lean - you } : {}),
    ...(approval !== undefined ? { homeApproval: approval } : {}),
    upNext: member.chamber === "house" ? nextElection(campaign) !== undefined : senateClass !== undefined && member.seatClass === senateClass.seatClass,
    ...(vote === undefined ? {} : { lastVote: vote ? "yea" as const : "nay" as const }),
  };
}
