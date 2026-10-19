import { compareDates } from "./clock.js";
import type { PersonId, StateId } from "@admin/world";
import { stateById } from "@admin/world";
import type { Campaign, HillCaucus, HillFigure, HillPostId, LobbyApproach } from "./state.js";
import { selectBillsInProgress } from "./state.js";
import type { Effect } from "./effects.js";
import { selectHill, type HillMember } from "./hill.js";
import { stateOfBirthplace } from "./cast-home.js";
import { administrationAlignment, partyForCaucus, towardAdministrationSign } from "./party.js";
import { actOf } from "./legislative-acts.js";
import { SHARED_CREDIT_FRACTION } from "./credit-share.js";
import { withTie, type TieEffect } from "./ties.js";
import { turnsFor } from "./pace.js";

// What working one member costs with everyone else.
//
// A play on a member is never only between the President and that member. The
// President's own caucus leaders watch who gets courted across the aisle and
// who gets handed the credit; the President's own voters watch whose campaign
// the President turns up at; the member who was attacked at home and survived
// it remembers. Each of those is priced here, once, so the card that shows the
// price and the packet that charges it read the same numbers.

/**
 * How far back a second call with nothing asked still reads as a second call.
 *
 * Three weeks: inside a month a member's office remembers the last time the
 * White House rang, and a call that asks for nothing reads as the President
 * checking up rather than asking. Authored in days so it means the same at any
 * pace; turned into turns where it is checked.
 */
export const REPEAT_CALL_WINDOW_DAYS = 21;
/** What a call repeated for nothing costs with the member. */
export const REPEAT_CALL_RAPPORT = -0.03;
/** Why it cost that, on the member's tie. */
export const REPEAT_CALL_CAUSE = "It was another call inside three weeks with nothing to ask.";
/** What the President's caucus leaders think of a budget deal cut with the other side. */
export const ACROSS_THE_AISLE_TRADE_RESENTMENT = -0.02;
/** What the President's caucus leaders think of credit handed to someone who is not them. */
export const SHARED_CREDIT_RESENTMENT = -0.03;
/** What the other side's leaders think of the President campaigning for one of the President's own in their member's state. */
export const CAMPAIGN_RESENTMENT = -0.02;
/** The weight of the grudge a member keeps after a public appeal against them failed. */
export const PUBLIC_MISS_GRUDGE = 0.25;
/**
 * The lowest standing in a member's home state at which a public appeal is
 * open: the state has to lean the administration's way at all, or the voters
 * being asked to lean on the member are not the President's to ask.
 */
export const PUBLIC_APPEAL_MIN_STANDING = 0;
/** How far campaigning beside a member moves their state toward the member's party. */
export const CAMPAIGN_LEAN = 0.01;
/** What campaigning beside them does to their trust, if they answer and if they do not. */
export const CAMPAIGN_TRUST = { landed: 0.06, missed: 0.03 } as const;

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

/**
 * Whether the member sits across the aisle from the President.
 *
 * Read the way the party words read it: a leader in the administration caucus
 * is of the President's party, or of the caucus an independent President sits
 * nearest, and neither is "the other party". Only the opposition caucus is.
 */
export function acrossTheAisle(figure: HillFigure): boolean {
  return figure.caucus === "opposition";
}

export type Resentment = {
  readonly person: PersonId;
  readonly post: HillPostId;
  readonly name: string;
  readonly delta: number;
  readonly cause: string;
};

function caucusLeaders(campaign: Campaign, caucus: HillCaucus, except: HillPostId): readonly HillMember[] {
  return selectHill(campaign).filter(
    (member) => member.post.role === "role-congressional-leader" && member.figure.caucus === caucus && member.figure.post !== except,
  );
}

function resenting(leaders: readonly HillMember[], delta: number, cause: string): readonly Resentment[] {
  return leaders.map((leader) => ({ person: leader.figure.person, post: leader.figure.post, name: leader.name, delta, cause }));
}

/**
 * Who holds this play against the President, by how much, and why. For a
 * budget negotiation it is charged only if the member takes the deal; for
 * shared credit and a campaign stop it is charged when the President acts.
 */
export function resentmentsFor(
  campaign: Campaign,
  member: HillMember,
  approach: LobbyApproach,
  title: string,
  matterTitle: string | undefined,
): readonly Resentment[] {
  const post = member.figure.post;
  if (approach === "trade" && acrossTheAisle(member.figure)) {
    const cause = `${title} cut a budget deal with ${member.name}, across the aisle, over the heads of the President's own leaders.`;
    return resenting(caucusLeaders(campaign, "administration", post), ACROSS_THE_AISLE_TRADE_RESENTMENT, cause);
  }
  if (approach === "credit") {
    const cause = `${title} handed ${member.name} the credit for ${matterTitle ?? "a bill"} that the President's own leaders carried.`;
    return resenting(caucusLeaders(campaign, "administration", post), SHARED_CREDIT_RESENTMENT, cause);
  }
  // Across the aisle it is the President's own leaders who pay for the stop,
  // not the public's belief in the President's word: lending a name to the
  // other side is a breach with the party, not a lie, and the voters behind it
  // have no store of their own to hold it in.
  if (approach === "campaign") {
    const across = acrossTheAisle(member.figure);
    const cause = across
      ? `${title} campaigned beside ${member.name}, across the aisle, against the President's own leaders' candidates.`
      : `${title} campaigned beside ${member.name} at home, against the side these leaders answer to.`;
    return resenting(caucusLeaders(campaign, across ? "administration" : "opposition", post), CAMPAIGN_RESENTMENT, cause);
  }
  return [];
}

export function resentmentEffects(resentments: readonly Resentment[]): readonly TieEffect[] {
  return resentments.map((entry) => ({ kind: "tie", person: entry.person, cause: entry.cause, rapport: { delta: entry.delta } }));
}

/** The people table with the resentments landed: for a projection, never a write. */
export function peopleResenting(people: Campaign["people"], resentments: readonly Resentment[]): Campaign["people"] {
  return resentmentEffects(resentments).reduce((current, effect) => withTie(current, effect) as Campaign["people"], people);
}

/**
 * What a call costs the member when it asks for nothing and they were called
 * inside the window: zero otherwise. A call with live business behind it is
 * never "for nothing", however often it is made.
 */
export function repeatCallPenalty(campaign: Campaign, post: HillPostId, asking: boolean, asOfTurn: number): number {
  if (asking) return 0;
  const windowTurns = turnsFor(REPEAT_CALL_WINDOW_DAYS);
  const recent = campaign.congress.lobbying.some(
    (record) => record.post === post && record.approach === "call" && asOfTurn - record.turn <= windowTurns,
  );
  return recent ? REPEAT_CALL_RAPPORT : 0;
}

export function homeStateOf(member: HillMember): StateId | undefined {
  return member.state ?? stateOfBirthplace(member.person?.birthplace);
}

const stateName = (state: StateId): string => stateById.get(state)?.name ?? state;

/** How the administration stands in the member's home state, −1..1; undefined when their state is not on the record. */
export function homeAlignment(campaign: Campaign, member: HillMember): number | undefined {
  const state = homeStateOf(member);
  const runtime = state ? campaign.states?.[state] : undefined;
  return runtime ? administrationAlignment(runtime.lean, campaign.congress) : undefined;
}

/**
 * Why a public appeal is closed, when the member's own voters lean against the
 * administration. A member whose home state is not on the record is not
 * refused: there is no reading to refuse on.
 */
export function publicAppealRefusal(campaign: Campaign, member: HillMember): string | undefined {
  const alignment = homeAlignment(campaign, member);
  const state = homeStateOf(member);
  if (alignment === undefined || !state || alignment >= PUBLIC_APPEAL_MIN_STANDING) return undefined;
  return `${stateName(state)} leans against this administration, so ${member.name}'s voters are not the President's to ask.`;
}

export type CreditMatter = { readonly billId: string; readonly title: string };

/** The first live bill whose law would move opinion for the President and whose credit is still the President's to give. */
export function creditMatter(campaign: Campaign): CreditMatter | undefined {
  const bill = selectBillsInProgress(campaign).find((entry) => !entry.sharedCredit && actOf(entry)?.domestic !== undefined);
  return bill ? { billId: bill.id, title: bill.title } : undefined;
}

export const NO_CREDIT_TO_SHARE = "No bill on the floor would move the country toward the President, so there is no credit to share.";

/** The bill, rewritten with the credit filed on it, so the enactment reads what was given away. */
export function creditFiling(campaign: Campaign, member: HillMember, matter: CreditMatter): Effect | undefined {
  const bill = campaign.bills[matter.billId];
  if (!bill) return undefined;
  return {
    kind: "bill",
    set: { ...bill, sharedCredit: { person: member.figure.person, post: member.figure.post, fraction: SHARED_CREDIT_FRACTION, turn: campaign.turn } },
  };
}

export type CampaignCharge = {
  readonly state: StateId;
  readonly stateName: string;
  readonly leanAfter: number;
  /** The administration's standing there, before and after the stop. */
  readonly standingBefore: number;
  readonly standingAfter: number;
  readonly effects: readonly Effect[];
};

export const NO_HOME_STATE = "Their home state is not on the record, so there is nowhere to campaign beside them.";

/** What a campaign stop beside the member charges, built from the state it is shown on. Undefined with no home state. */
export function campaignCharge(campaign: Campaign, member: HillMember, title: string): CampaignCharge | undefined {
  const state = homeStateOf(member);
  const runtime = state ? campaign.states?.[state] : undefined;
  if (!state || !runtime) return undefined;
  const party = partyForCaucus(member.figure.caucus, campaign.congress.caucusAnchor);
  const delta = round3(towardAdministrationSign(party) * CAMPAIGN_LEAN);
  const leanAfter = Math.max(-1, Math.min(1, round3(runtime.lean + delta)));
  const reason = `${title} lends the President's name to ${member.name} at home in ${stateName(state)}.`;
  const lean: Effect = { kind: "state", state, deltas: { lean: delta }, reason };
  return {
    state,
    stateName: stateName(state),
    leanAfter,
    standingBefore: administrationAlignment(runtime.lean, campaign.congress),
    standingAfter: administrationAlignment(leanAfter, campaign.congress),
    effects: [lean],
  };
}

/** Shared daily attention accounting for authorized Hill and ordinary-member outreach. */
export function outreachAttentionSpent(campaign: Campaign): number {
  return Object.values(campaign.issuedActs ?? {}).reduce((spent, act) => {
    if ((act.kind !== "member-lobby" && act.kind !== "lobby") || compareDates(act.issuedDate, campaign.calendar) !== 0) return spent;
    return spent + (act.kind === "member-lobby" && act.coalition ? 2 : 1);
  }, 0);
}
export const OUTREACH_DAILY_LIMIT = 2;
