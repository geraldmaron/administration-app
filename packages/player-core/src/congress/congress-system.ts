import {
  CHAMBERS,
  CHAMBER_NAMES,
  chamberMajority,
  clotureOf,
  majorityOf,
  selectBills,
  selectDateOfTurn,
  supermajorityOf,
  usPartyWord,
  type Bill,
  type Campaign,
  type Chamber,
  type ChamberVote,
  type UsParty,
} from "@admin/engine";
import { STATE_IDS, stateById, type StateId } from "@admin/world";
import { formatDate } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { floorSchedule, type FloorGroupKey } from "./floor-schedule.js";
import { chamberParties, delegationReading, hillPosts, type DelegationReading } from "./hill-reading.js";
import { caucusName, chamberMajorityLine, presidentialRelation } from "./party-words.js";

// Congress as one system: every seat with the member who holds it, what the
// caucus nearest the President can carry on its own against each threshold the
// chambers count by, the last roll call each chamber recorded, and every bill
// on the one path it travels. Positions come from the member's public record;
// a member's support for a future vote is never inferred here.

export type SeatVote = "yea" | "nay" | "unrecorded";

export type CongressSeat = {
  readonly seat: string;
  readonly chamber: Chamber;
  readonly state: StateId;
  readonly stateName: string;
  readonly party: UsParty;
  readonly name: string;
  readonly personId?: string;
  readonly href?: string;
  /** Economic position from the member's public record, -1 left to 1 right; absent when no member is recorded. */
  readonly lean?: number;
  /** The leadership post the member holds, by title. */
  readonly post?: string;
  /** No living member holds the seat. */
  readonly vacant: boolean;
  readonly seatClass?: 1 | 2 | 3;
};

export type ThresholdKey = "majority" | "cloture" | "override" | "sustain";

export type ChamberThreshold = {
  readonly key: ThresholdKey;
  readonly label: string;
  readonly votes: number;
  /** Seats the President's nearest caucus is short of this line on its own; 0 when it clears it. */
  readonly short: number;
  /** The caucus reaches this line only through the Vice President's tie-breaking vote. */
  readonly tieBreak?: boolean;
};

export type CongressChamber = {
  readonly chamber: Chamber;
  readonly name: string;
  readonly seats: number;
  /** Members in seating order, left to right: Democrats, independents, Republicans, each by recorded position. */
  readonly members: readonly CongressSeat[];
  /** Seats the chamber has that no record fills. Drawn hollow, never as a party. */
  readonly unrecorded: number;
  readonly parties: readonly { readonly party: UsParty; readonly label: string; readonly seats: number }[];
  /** The caucus the President stands nearest, independents counted where they caucus. */
  readonly caucus: { readonly name: string; readonly relation: string; readonly parties: readonly UsParty[]; readonly seats: number; readonly opposing: number };
  readonly thresholds: readonly ChamberThreshold[];
  readonly holdsMajority: boolean;
  readonly majorityLine: string;
  readonly lastRoll?: RecordedRoll;
  /** The seated members' parties do not add up to the chamber's count, which is what votes run on. */
  readonly recordsDisagree: boolean;
};

export type RecordedRoll = {
  readonly billId: string;
  readonly title: string;
  readonly href: string;
  readonly question: string;
  readonly date: string;
  readonly turn: number;
  readonly yeas: number;
  readonly nays: number;
  readonly required: number;
  readonly passed: boolean;
  /** Each member's recorded vote by seat. A seat missing here has no recorded vote. */
  readonly votes: ReadonlyMap<string, boolean>;
};

export type BillLane = FloorGroupKey;

export type CongressBill = {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly lane: BillLane;
  readonly sponsor: string;
  readonly line: string;
};

export type CongressSystem = {
  readonly chambers: readonly CongressChamber[];
  readonly delegations: readonly DelegationReading[];
  readonly bills: readonly CongressBill[];
};

export const BILL_LANES: readonly BillLane[] = ["referral", "markup", "floor", "conference", "desk"];

const PARTY_ORDER: Readonly<Record<UsParty, number>> = { democrat: 0, independent: 1, republican: 2 };

function seatsOf(campaign: Campaign, chamber: Chamber): readonly CongressSeat[] {
  const posts = new Map(hillPosts(campaign).filter((post) => post.holderId).map((post) => [post.holderId!, post.title]));
  const rows = (campaign.congress.members ?? []).filter((member) => member.chamber === chamber).map((member): CongressSeat => {
    const person = campaign.people[member.person];
    const vacant = !person || !person.alive;
    const post = posts.get(member.person);
    return {
      seat: member.seat,
      chamber,
      state: member.state,
      stateName: stateById.get(member.state)?.name ?? member.state,
      party: member.party,
      name: person?.base.name ?? "Unrecorded member",
      vacant,
      ...(person ? { personId: member.person as string, href: place.person(member.person) } : {}),
      ...(person && !vacant ? { lean: person.base.ideology.economicLeftRight } : {}),
      ...(post ? { post } : {}),
      ...(member.seatClass ? { seatClass: member.seatClass } : {}),
    };
  });
  return [...rows].sort((a, b) => PARTY_ORDER[a.party] - PARTY_ORDER[b.party] || (a.lean ?? 0) - (b.lean ?? 0) || a.seat.localeCompare(b.seat));
}

function caucusOf(campaign: Campaign, chamber: Chamber): CongressChamber["caucus"] {
  const { caucusAnchor } = campaign.congress;
  const composition = campaign.congress.chambers[chamber];
  const independentsHere = caucusAnchor === "democrat" ? composition.independent : 0;
  const independentsThere = caucusAnchor === "republican" ? composition.independent : 0;
  const relation = presidentialRelation(campaign, caucusAnchor) ?? "the caucus nearest the President";
  return {
    name: caucusName(caucusAnchor),
    relation,
    parties: caucusAnchor === "democrat" ? ["democrat", "independent"] : ["republican"],
    seats: composition.administration + independentsHere,
    opposing: composition.opposition + independentsThere,
  };
}

function thresholdsOf(chamber: Chamber, seats: number, caucus: number): readonly ChamberThreshold[] {
  const override = supermajorityOf(seats);
  const lines: readonly Omit<ChamberThreshold, "short">[] = [
    { key: "majority", label: "Pass a bill", votes: majorityOf(seats) },
    ...(chamber === "senate" ? [{ key: "cloture" as const, label: "End debate (cloture)", votes: clotureOf(seats) }] : []),
    { key: "override", label: "Override a veto", votes: override },
    { key: "sustain", label: "Uphold a veto", votes: seats - override + 1 },
  ];
  // The Vice President breaks a tied Senate on a simple majority, never on
  // cloture or an override, so an evenly split Senate carries a measure.
  const tied = chamber === "senate" && caucus * 2 === seats;
  return lines.map((line) => (tied && line.key === "majority" ? { ...line, short: 0, tieBreak: true } : { ...line, short: Math.max(0, line.votes - caucus) }));
}

function votesOf(bill: Bill): readonly { readonly vote: ChamberVote; readonly question: string }[] {
  const passage = bill.passage.flatMap((vote) => [
    ...(vote.cloture ? [{ vote: vote.cloture, question: "Cloture" }] : []),
    { vote, question: vote.procedure === "cloture" ? "Cloture" : "Passage" },
  ]);
  const override = (bill.override ?? []).map((vote) => ({ vote, question: "Veto override" }));
  return [...passage, ...override];
}

/** The newest roll call a chamber recorded on any bill, with every member's vote. */
function lastRollOf(campaign: Campaign, chamber: Chamber): RecordedRoll | undefined {
  const candidates = selectBills(campaign).flatMap((bill) =>
    votesOf(bill)
      .filter(({ vote }) => vote.chamber === chamber && vote.rollCall && vote.rollCall.length > 0 && vote.recordedTurn !== undefined)
      .map((entry) => ({ bill, ...entry })),
  );
  const latest = [...candidates].sort((a, b) => b.vote.recordedTurn! - a.vote.recordedTurn! || a.bill.id.localeCompare(b.bill.id))[0];
  if (!latest) return undefined;
  const { bill, vote, question } = latest;
  return {
    billId: bill.id,
    title: bill.title,
    href: place.bill(bill.id),
    question,
    date: formatDate(selectDateOfTurn(campaign, vote.recordedTurn!)),
    turn: vote.recordedTurn!,
    yeas: vote.yeas,
    nays: vote.nays,
    required: vote.required,
    passed: vote.passed,
    votes: new Map(vote.rollCall!.map((member) => [member.seat, member.yea])),
  };
}

function chamberOf(campaign: Campaign, chamber: Chamber): CongressChamber {
  const composition = campaign.congress.chambers[chamber];
  const members = seatsOf(campaign, chamber);
  const caucus = caucusOf(campaign, chamber);
  // An old save seats no individual members; the composition still counts the parties.
  const parties = members.length === 0
    ? chamberParties(campaign, chamber)
    : (["democrat", "independent", "republican"] as const)
        .map((party) => ({ party, label: `${usPartyWord(party)}s`, seats: members.filter((member) => member.party === party).length }))
        .filter((entry) => entry.seats > 0);
  const lastRoll = lastRollOf(campaign, chamber);
  const seatedCaucus = members.filter((member) => caucus.parties.includes(member.party)).length;
  return {
    chamber,
    name: CHAMBER_NAMES[chamber],
    seats: composition.seats,
    members,
    unrecorded: Math.max(0, composition.seats - members.length),
    parties,
    caucus,
    thresholds: thresholdsOf(chamber, composition.seats, caucus.seats),
    holdsMajority: chamberMajority(campaign.congress, chamber) === "administration",
    majorityLine: chamberMajorityLine(campaign, chamber),
    ...(lastRoll ? { lastRoll } : {}),
    recordsDisagree: members.length > 0 && seatedCaucus !== caucus.seats,
  };
}

/** Congress as one system, read from recorded state. */
export function congressSystem(campaign: Campaign): CongressSystem {
  const bills = floorSchedule(campaign).flatMap((group) =>
    group.rows.map((row): CongressBill => ({ id: row.id, title: row.title, href: row.href, lane: group.key, sponsor: row.sponsor, line: row.line })),
  );
  return {
    chambers: CHAMBERS.map((chamber) => chamberOf(campaign, chamber)),
    delegations: STATE_IDS.flatMap((state) => delegationReading(campaign, state) ?? []),
    bills,
  };
}
