import type { PersonId, RoleId } from "@admin/world";
import type { CaucusReadings } from "./caucus-count.js";
import { voteOn, type CaucusVote, type VoteQuestion } from "./congress-votes.js";
import { majorityOf } from "./congress.js";
import { crossesTheAisle, usPartyOfPerson, type FitPresident } from "./cast-fit.js";
import { selectCabinet, selectPerson, type Campaign } from "./state.js";
import type { Effect } from "./effect-types.js";

// How the Senate counts one nominee, and what a nominee from across the aisle
// changes about the count and about the President's own side.
//
// A nomination is nobody's measure: the deference a Senate gives a President's
// own officers is priced once, for the whole chamber. What it is not is
// indifferent to who the nominee is. A Democrat who sends up a Republican for
// Defense gets votes from across the aisle that no Democrat nominee would, and
// loses a little of the enthusiasm of the members who expected one of their
// own; the same President's own Secretaries notice who got the chair.

/**
 * How far the Senate defers to a President on their own officers. The same
 * figure the chamber's standing projection reads, stated here because every
 * confirmation gate the nomination pipeline and the seal run counts through
 * this module.
 */
const CONFIRMATION_DEFERENCE = 0.25;

/**
 * What a nominee from the other side is worth in each caucus. The mirror of a
 * sponsor term, and smaller than one on the President's own side: members who
 * wanted the chair for one of their own are cool on it, not opposed to it.
 */
const CROSSING_OWN_SIDE = -0.06;
const CROSSING_OTHER_SIDE = 0.08;

/**
 * How far clear of the majority a pick has to be to be confirmed on the first
 * day rather than sent to the calendar. Five votes, because inside five a
 * single committee finding or a bad hearing is the whole margin.
 */
export const CONSENSUS_MARGIN = 5;

/**
 * What a President's own Secretaries give up in loyalty when a chair goes to
 * the other party: two points each, about one overruling's worth, because it
 * is read as a judgment about them.
 */
export const CROSSING_LOYALTY_COST = -0.02;

/**
 * A nominee's own record, on the scale the count reads.
 *
 * Competence and integrity sit against the middle, and a thin record or a
 * restless ambition is what a hearing is for. The weight is large enough that
 * two nominees from the same party do not share a count: a confirmation that
 * ignored the file would be the Senate deferring to the office, not the person.
 *
 * It is read by each senator rather than by the room (`merit`, not `appeal`).
 * Added to the room it was clipped at the ceiling: early in a term the room
 * plus the deference below already reached it, so every capable nominee counted
 * the same 68 to 32, the administration's caucus to a member and a fixed third
 * of the other side.
 */
function nomineeAppeal(campaign: Campaign, nominee: PersonId): number {
  const person = selectPerson(campaign, nominee)?.base;
  if (!person) return 0;
  const record = (person.competence * 0.6 + person.integrity * 0.4 - 0.5) * 0.85;
  const hearing = (person.integrity < 0.35 ? -0.06 : 0) + (person.competence < 0.4 ? -0.05 : 0) + (person.ambition > 0.85 ? -0.05 : 0);
  return record + hearing;
}

/**
 * How much of the record a senator reads into their own vote. Half: added to
 * every member it moves a count about as far as the same record moved the
 * room's share of the other side when the room was below its ceiling, so the
 * fix that stops the ceiling erasing a record does not also make every
 * nominee easier to confirm.
 */
const RECORD_PER_MEMBER = 0.5;

/** The President as the count reads them. */
function presidentOf(campaign: Campaign): FitPresident {
  return { party: campaign.founding.leader.party, ideology: campaign.founding.leader.ideology };
}

/** Whether this nominee sits across the aisle from the President. A nominee of no party does not. */
export function nomineeCrossesTheAisle(campaign: Campaign, nominee: PersonId): boolean {
  const person = selectPerson(campaign, nominee)?.base;
  if (!person || usPartyOfPerson(person) === undefined) return false;
  return crossesTheAisle(person, presidentOf(campaign));
}

/** Each caucus's reading of this nominee, or none for a nominee from the President's own side. */
export function nomineeReadings(campaign: Campaign, nominee: PersonId): CaucusReadings | undefined {
  if (!nomineeCrossesTheAisle(campaign, nominee)) return undefined;
  return { administration: CROSSING_OWN_SIDE, opposition: CROSSING_OTHER_SIDE };
}

/** The question a confirmation puts to the Senate. */
export function confirmationQuestion(campaign: Campaign, nominee: PersonId): VoteQuestion {
  const readings = nomineeReadings(campaign, nominee);
  return {
    chamber: "senate",
    appeal: CONFIRMATION_DEFERENCE,
    merit: Math.round(nomineeAppeal(campaign, nominee) * RECORD_PER_MEMBER * 1000) / 1000,
    required: majorityOf(campaign.congress.chambers.senate.seats),
    stance: "neutral",
    ...(readings ? { readings } : {}),
  };
}

/** The Senate's count on this nominee today, tallied by caucus. */
export function confirmationVote(campaign: Campaign, nominee: PersonId): CaucusVote {
  return voteOn(campaign, confirmationQuestion(campaign, nominee));
}

/** Whether a count clears the majority comfortably enough to need no fight. */
export function isConsensus(vote: Pick<CaucusVote, "yeas" | "required">): boolean {
  return vote.yeas >= vote.required + CONSENSUS_MARGIN;
}

/**
 * What seating a nominee from across the aisle costs inside the cabinet: every
 * seated Secretary of the President's own side takes it a little personally.
 * Empty for a nominee from the President's own side.
 */
export function crossingLoyaltyEffects(campaign: Campaign, nominee: PersonId, role?: RoleId): readonly Effect[] {
  const president = presidentOf(campaign);
  // An Independent's Secretaries are nobody's side, so nobody is passed over.
  if (president.party === "independent" || !nomineeCrossesTheAisle(campaign, nominee)) return [];
  return Object.entries(selectCabinet(campaign)).flatMap(([seat, person]): Effect[] => {
    if (seat === (campaign.founding.leadRole as string) || seat === (role as string | undefined) || person === nominee) return [];
    const holder = selectPerson(campaign, person);
    if (!holder?.alive || crossesTheAisle(holder.base, president)) return [];
    return [{ kind: "person", person, changes: {}, loyaltyShift: CROSSING_LOYALTY_COST }];
  });
}
