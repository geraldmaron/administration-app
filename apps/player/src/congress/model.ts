import { confirmationVote, hasLawRevisionTakenEffect, officeDef, selectActiveNominations, selectCurrentLaws, selectPerson, type Bill, type BillText, type Campaign, type ChamberVote, type NominationStage } from "@admin/engine";
import { nominationStanding, place, type CongressChamber, type CongressSeat, type FloorCount, type RecordedRoll } from "@admin/player-core";

/** The constitutional and statutory authorities the Congress screens cite (DECISIONS §8.12). */
export const LAW = {
  presentment: "U.S. Const. art. I, §7",
  recommend: "U.S. Const. art. II, §3",
  appointments: "U.S. Const. art. II, §2, cl. 2",
  reconciliation: "2 U.S.C. §641",
  warPowers: "50 U.S.C. §§1541–1548",
  appropriations: "U.S. Const. art. I, §9, cl. 7",
  antideficiency: "31 U.S.C. §§1341–1342, 1517",
} as const;

export const CONGRESS_VIEWS = ["overview", "bills", "nominations", "members", "delegations", "powers"] as const;
export type CongressView = (typeof CONGRESS_VIEWS)[number];

export function congressView(value: unknown): CongressView {
  return CONGRESS_VIEWS.find((entry) => entry === value) ?? "overview";
}

export type Caucus = "democrat" | "republican";

/** The party filter a sponsor link puts in the address; anything else falls away. */
export function congressCaucus(value: unknown): Caucus | undefined {
  return value === "democrat" || value === "republican" ? value : undefined;
}

export type SeatMode = "party" | "vote";
export type CongressSelection = { readonly state?: string; readonly seat?: string };

/** A member's recorded vote on the chamber's newest roll call, or none. */
export function voteOf(roll: RecordedRoll | undefined, seat: string): "yea" | "nay" | "none" {
  const vote = roll?.votes.get(seat);
  return vote === undefined ? "none" : vote ? "yea" : "nay";
}

/** The party that holds the chamber, by its caucus anchor. */
export function holderOf(chamber: CongressChamber): "democrat" | "republican" {
  const ours = chamber.caucus.parties[0] === "republican" ? "republican" : "democrat";
  return chamber.holdsMajority ? ours : ours === "democrat" ? "republican" : "democrat";
}

const AISLE_SLICE = 0.08;
export type AisleLens = { readonly kind: "across" | "holdouts" | "near" | "all" | "opponents" } | { readonly kind: "slice"; readonly at: number };
export type AisleShown = { readonly members: readonly CongressSeat[]; readonly title: string; readonly line: string; readonly from: number; readonly to: number };

const these = (count: number) => (count === 1 ? "This is the 1 member" : `These are the ${count} members`);

function pickAisle(chamber: CongressChamber, you: number, lens: AisleLens): Omit<AisleShown, "from" | "to"> {
  const seated = chamber.members.filter((member) => member.lean !== undefined && !member.vacant);
  const ours = new Set(chamber.caucus.parties);
  const byDistance = (rows: readonly CongressSeat[]) => [...rows].sort((a, b) => Math.abs(a.lean! - you) - Math.abs(b.lean! - you) || a.seat.localeCompare(b.seat));
  const shown = (members: readonly CongressSeat[], title: string, line: (count: number) => string) => ({ members, title, line: line(members.length) });
  switch (lens.kind) {
    case "slice":
      return shown(byDistance(seated.filter((member) => Math.abs(member.lean! - lens.at) <= AISLE_SLICE)), "Members at this spot", (count) => `${these(count)} from every party who sit at this spot on the economic scale.`);
    case "all":
      return shown(byDistance(seated), "Everyone", (count) => `${these(count)} of ${chamber.name}, starting with the ones closest to you on the economy.`);
    case "opponents":
      return shown(byDistance(seated).reverse(), "Farthest from you", (count) => `${these(count)} of ${chamber.name}, starting with the ones who agree with you least on the economy. That doesn't mean they'll vote against you or dislike you.`);
    case "holdouts":
      return shown(byDistance(seated.filter((member) => ours.has(member.party))).reverse(), "Your party, least in agreement first", (count) => `${these(count)} of your party in ${chamber.name}, starting with the ones who agree with you least. Disagreeing with you on the economy doesn't mean they'll vote against you.`);
    case "near":
      return shown(byDistance(seated.filter((member) => Math.abs(member.lean! - you) <= AISLE_SLICE * 1.5)), "Everyone near you", (count) => `${these(count)} from either party whose records on the economy are closest to yours, closest first.`);
    default:
      return shown(byDistance(seated.filter((member) => !ours.has(member.party))), "Closest in the other party", (count) => `${these(count)} of the other party, starting with the ones who agree with you most. Agreeing with you on the economy doesn't mean they'll vote with you.`);
  }
}

/** The members one aisle lens lists, in its own order, and the span of the scale they cover. */
export function lensMembers(chamber: CongressChamber, you: number, lens: AisleLens): AisleShown {
  const shown = pickAisle(chamber, you, lens);
  const leans = shown.members.map((member) => member.lean!);
  return { ...shown, from: leans.length > 0 ? Math.min(...leans) : you, to: leans.length > 0 ? Math.max(...leans) : you };
}

/** How near the line counts as too close to call, as a share of the chamber's seats. */
const CLOSE_SHARE = 0.02;

/**
 * A count's standing against its line, in words. A passage count that clears
 * it carries; an override count that clears it is the President losing the
 * veto. Within a few seats of the line is too close to call either way.
 */
export function countWord(count: FloorCount, against = false): string {
  if (count.supportKnown !== true) return "Support not known yet";
  const margin = count.yeas - count.required;
  const near = count.seats > 0 && Math.abs(margin) <= count.seats * CLOSE_SHARE;
  if (against) return near ? "Override too close to call" : margin >= 0 ? "Override would carry" : `Override short by ${-margin}`;
  return near ? "Too close to call" : margin >= 0 ? "Carries" : `Short by ${-margin}`;
}

/** The line a count is measured against, in words: a majority, three-fifths, two-thirds. */
export function lineWords(required: number, seats: number, against = false): string {
  if (against) return "two-thirds to override";
  const share = seats > 0 ? required / seats : 0;
  return share > 0.64 ? "two-thirds" : share > 0.58 ? "three-fifths to end debate" : "a majority";
}

const PREPARING: readonly NominationStage[] = ["shortlist", "vetting", "prepared"];

export type SenateNomination = {
  readonly id: string;
  readonly name: string;
  readonly personHref: string;
  readonly nominee: string;
  readonly office: string;
  readonly stage: string;
  readonly days: number;
  readonly committee?: string;
  readonly controversies: readonly string[];
  /** The Senate's count on the name today; absent while the name has not been sent up. */
  readonly vote?: ChamberVote;
};

/** Every open nomination, split into those the Senate holds and those still with the President. */
export function senateNominations(campaign: Campaign, today: number): { readonly before: readonly SenateNomination[]; readonly preparing: readonly SenateNomination[] } {
  const rows = [...selectActiveNominations(campaign)]
    .sort((a, b) => a.openedDay - b.openedDay || a.id.localeCompare(b.id))
    .map((nomination) => {
      const sent = !PREPARING.includes(nomination.stage);
      const row: SenateNomination = {
        id: nomination.id,
        name: selectPerson(campaign, nomination.nominee)?.base.name ?? "The nominee",
        personHref: place.person(nomination.nominee as string),
        nominee: nomination.nominee as string,
        office: officeDef(nomination.office)?.title ?? "An office",
        stage: nominationStanding(nomination),
        days: Math.max(0, today - nomination.openedDay),
        ...(nomination.committee ? { committee: nomination.committee } : {}),
        controversies: nomination.controversies,
        ...(sent ? { vote: confirmationVote(campaign, nomination.nominee) } : {}),
      };
      return { row, sent };
    });
  return { before: rows.filter((entry) => entry.sent).map((entry) => entry.row), preparing: rows.filter((entry) => !entry.sent).map((entry) => entry.row) };
}

/** Where a bill stands as one label, including a law the statute book no longer carries. */
export function billStateLabel(campaign: Campaign, bill: Bill): string {
  if (bill.status === "in-progress") return "In Congress";
  if (bill.status === "on-the-desk") return "Awaiting signature";
  if (bill.status === "dead") return "Died in Congress";
  if (bill.status === "vetoed") return "Vetoed";
  if (bill.revises && !hasLawRevisionTakenEffect(campaign, bill.id)) return "Passed but never took effect";
  if (bill.revises?.kind === "repeal") return "Repeal enacted";
  if (!selectCurrentLaws(campaign).some((entry) => entry.id === bill.id)) return "Replaced by a newer law";
  return bill.enactedBy === "unsigned" ? "Law without signature" : bill.enactedBy === "veto-overridden" ? "Law over veto" : "Law";
}


const TEXT_NAMES: Readonly<Record<string, Readonly<Record<BillText, string>>>> = {
  "act-housing-supply": { base: "Original grants", targeted: "Targeted grants" },
  "act-health-coverage": { base: "Broad premium assistance", targeted: "Lower-income assistance" },
  "act-clean-grid": { base: "New routes and hardening", targeted: "Existing-corridor hardening" },
};

export const textName = (bill: Bill, text: BillText): string => TEXT_NAMES[bill.act]?.[text] ?? (text === "base" ? "Original text" : "Targeted text");

/** The objections a veto message may carry; the fiscal one only where the bill moves money. */
export function vetoObjections(title: string, fiscal: boolean): readonly { readonly id: string; readonly label: string; readonly message: string }[] {
  return [
    { id: "policy", label: "Object to the policy", message: `I return the ${title} to Congress because I disagree with its policy approach.` },
    ...(fiscal ? [{ id: "fiscal", label: "Object to the cost", message: `I return the ${title} to Congress because I object to the fiscal terms in this measure.` }] : []),
    { id: "revision", label: "Ask for changes", message: `I return the ${title} to Congress and ask that its present provisions be reconsidered before I can approve it.` },
  ];
}
