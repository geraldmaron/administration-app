// Honest US party words for the Hill, and the one reading that says how far a
// piece of the country sits from the administration.
//
// Composition and caucus stay administration/opposition/independent. Two party
// labels are sealed at founding and never recomputed from live alignments: what
// the president ran as (`administrationParty`, which may be Independent) and
// the major caucus they sit nearest (`caucusAnchor`, always one of the two).
// Nothing is stored per figure, and nothing is ever "Your party".
//
// An independent president has no caucus, so "is this bloc mine" is a question
// with no honest answer. `administrationAlignment` answers the question that
// does have one — how far this lean sits from the administration — and every
// site that used to compare identity reads it instead.

import type {
  AdministrationParty,
  HillCaucus,
  UsMajorParty,
  UsParty,
} from "./state-legislature.js";
import { partiesOf, presidentPartyFromIdeology, usaCharter, type Party } from "@admin/world";

export type { AdministrationParty } from "./state-legislature.js";

/**
 * The caucus the ideology suggestion falls back to. A default for a *suggestion*
 * only — nothing seals a party from this. What the administration is, is what
 * the player chose.
 */
export const DEFAULT_ADMINISTRATION_PARTY: UsMajorParty = "democrat";

/** The two caucuses, in the order every list of them is written. */
export const US_MAJOR_PARTIES: readonly UsMajorParty[] = ["democrat", "republican"];

export const US_PARTY_WORD: Readonly<Record<UsParty, "Democrat" | "Republican" | "Independent">> = {
  democrat: "Democrat",
  republican: "Republican",
  independent: "Independent",
};

export function usPartyWord(party: UsParty): "Democrat" | "Republican" | "Independent" {
  return US_PARTY_WORD[party];
}

/**
 * The major party a set of politics suggests — a suggestion, not the answer.
 *
 * Party is chosen outright at founding; this preselects the control from the
 * ideology sliders and seals the caucus anchor for a president who picked
 * neither major party. It stays a major party by construction: it names a
 * caucus, and Independent is not one.
 */
export function resolveAdministrationParty(ideology: {
  readonly economicLeftRight: number;
}): UsMajorParty {
  const ticket = presidentPartyFromIdeology(partiesOf(usaCharter), ideology.economicLeftRight);
  return (ticket?.id as string) === "party-usa-republican" ? "republican" : DEFAULT_ADMINISTRATION_PARTY;
}

/**
 * The caucus an administration is counted against, sealed beside the party.
 *
 * A Democrat anchors on the Democrats and a Republican on the Republicans. An
 * independent has no caucus of their own, so they anchor on the one their
 * economics is nearest — read off the same charter tickets the founding control
 * preselects from, so no fact about them is invented to fill the field.
 */
export function sealCaucusAnchor(
  party: AdministrationParty,
  ideology: { readonly economicLeftRight: number },
): UsMajorParty {
  return party === "independent" ? resolveAdministrationParty(ideology) : party;
}

/**
 * The other caucus. A statement about the two majors, not about the president —
 * ask `oppositionParties` for who is actually across the aisle.
 */
export function otherMajorParty(party: UsMajorParty): UsMajorParty {
  return party === "democrat" ? "republican" : "democrat";
}

/**
 * Every caucus that is not the administration's.
 *
 * One for a Democrat or a Republican. Two for an independent, who has no
 * caucus of their own and therefore no single opposition: both majors are
 * across the aisle, and a bill has to be argued to each of them separately.
 * The shape is a list rather than a value for exactly that reason — an
 * independent does not have a differently-named opposition, they have a
 * differently-shaped one.
 */
export function oppositionParties(party: AdministrationParty): readonly UsMajorParty[] {
  return party === "independent" ? US_MAJOR_PARTIES : [otherMajorParty(party)];
}

/**
 * The charter ticket an administration of this party runs on.
 *
 * Throws rather than falling back to a major: a silent fallback is how an
 * independent administration came to read as the Republican Party everywhere
 * beliefs were consulted.
 */
export function usTicket(party: AdministrationParty): Party {
  const id = partyTicketId(party);
  const ticket = partiesOf(usaCharter).find((entry) => (entry.id as string) === id);
  if (!ticket) throw new Error(`USA charter is missing ticket ${id}`);
  return ticket;
}

/**
 * Leadership posts are always one of the two major parties. Counted against the
 * caucus anchor rather than the president's own label: the Speaker and the
 * Majority Leader are whoever holds the chamber, and a chamber does not stop
 * having two sides because the president belongs to neither.
 */
export function partyForCaucus(caucus: HillCaucus, caucusAnchor: UsMajorParty): UsMajorParty {
  return caucus === "administration" ? caucusAnchor : otherMajorParty(caucusAnchor);
}

export function partyForShare(
  share: "administration" | "opposition" | "independent",
  caucusAnchor: UsMajorParty,
): UsParty {
  if (share === "administration") return caucusAnchor;
  if (share === "opposition") return otherMajorParty(caucusAnchor);
  return "independent";
}

/** The charter ticket a president of this party runs on. */
export function partyTicketId(party: AdministrationParty): string {
  return `party-usa-${party}`;
}

// --- Alignment: what an administration with no caucus can still read ---------

/**
 * The two ways an administration without a party is worse off, both stated
 * once and read everywhere rather than applied as a difficulty dial.
 *
 * `INDEPENDENT_REACH` is how much of a co-partisan's pull an independent
 * commands over the caucus nearest them: three quarters, because the members
 * closest to their politics are still closest to their politics, and none of
 * them owe them a nomination. `INDEPENDENT_STANDING_GAP` is what they give up
 * everywhere for having no party at all — the floor a major-party president
 * stands on before any state's lean is counted, and an independent does not.
 *
 * Together they make governing harder in a way a whip count can show: an
 * independent needs a chamber that likes them roughly twenty points more than a
 * party president does to pass the same bill, and needs a broader country to be
 * re-elected. Neither number multiplies a result; both move the reading the
 * result is counted from.
 */
export const INDEPENDENT_REACH = 0.75;
export const INDEPENDENT_STANDING_GAP = 0.15;

/**
 * The pair of labels every alignment reading is taken against. Structurally the
 * relevant slice of `Congress`, spelled out so this file stays free of the
 * campaign's shape.
 */
export type AdministrationStanding = {
  readonly administrationParty: AdministrationParty;
  readonly caucusAnchor: UsMajorParty;
};

/** Which way along the Dem ← → Rep axis is toward the administration. */
export function towardAdministrationSign(caucusAnchor: UsMajorParty): 1 | -1 {
  return caucusAnchor === "democrat" ? -1 : 1;
}

/**
 * How much of a co-partisan president's pull this administration commands.
 * One for a president with a party; less for one without.
 */
export function administrationReach(party: AdministrationParty): number {
  return party === "independent" ? INDEPENDENT_REACH : 1;
}

/**
 * How far a Dem ← → Rep lean sits from the administration, −1..1.
 *
 * The one reading that replaced "is this bloc the president's party". For a
 * Democrat or a Republican it is exactly the state's lean signed toward them,
 * which is what every one of these sites computed before. For an independent it
 * is that lean at three-quarter reach, minus the standing every president
 * without a caucus gives up: nothing is fully with them, and the far side is
 * further away than it would be from a partisan they at least share a party
 * machine's enemies with.
 */
export function administrationAlignment(lean: number, standing: AdministrationStanding): number {
  // `+ 0` for the same reason every other reading in the engine carries it:
  // a negative zero survives arithmetic and does not survive a JSON round-trip.
  const signed = towardAdministrationSign(standing.caucusAnchor) * lean + 0;
  if (standing.administrationParty !== "independent") return signed;
  const damped = INDEPENDENT_REACH * signed - INDEPENDENT_STANDING_GAP;
  return Math.max(-1, Math.min(1, Math.round(damped * 1000) / 1000 + 0));
}

/**
 * A displacement along the partisan axis, signed and scaled for who is asking.
 *
 * Distinct from `administrationAlignment`, which reads a level: this converts
 * an administration-relative quantity (a favor done, a grievance earned) into
 * movement on the Dem ← → Rep axis. An independent's acts still move a state,
 * but less of that movement is banked by any party — including the one they
 * sit nearest, which did not do it.
 */
export function towardAdministration(raw: number, standing: AdministrationStanding): number {
  return (
    raw *
      towardAdministrationSign(standing.caucusAnchor) *
      administrationReach(standing.administrationParty) +
    0
  );
}
