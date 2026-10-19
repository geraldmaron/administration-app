import { CHAMBER_NAMES, chamberMajority, partyForCaucus, type Campaign, type Chamber, type HillCaucus, type UsMajorParty, type UsParty } from "@admin/engine";

// Party, caucus and the President's relation to each, said as separate facts.
//
// The engine counts Congress along one axis, administration against opposition,
// anchored on the major party the President sits nearest. That axis is a count,
// not an identity: an independent President has no party in Congress, and the
// Democrats a Democratic President works with are still the Democrats rather
// than "yours". So the player never reads "your side". A chamber is held by a
// named party; the President's party is named as such only when the President
// belongs to it; and an independent President's nearest caucus is called that.

const PLURAL: Readonly<Record<UsParty, string>> = {
  democrat: "Democrats",
  republican: "Republicans",
  independent: "Independents",
};

const CAUCUS_NAME: Readonly<Record<UsMajorParty, string>> = {
  democrat: "Democratic caucus",
  republican: "Republican caucus",
};

const ADJECTIVE: Readonly<Record<UsMajorParty, string>> = {
  democrat: "Democratic",
  republican: "Republican",
};

export function partyAdjective(party: UsMajorParty): string {
  return ADJECTIVE[party];
}

export function partyPlural(party: UsParty): string {
  return PLURAL[party];
}

export function caucusName(party: UsMajorParty): string {
  return CAUCUS_NAME[party];
}

/** The major party a caucus column stands for in this campaign. */
export function caucusParty(campaign: Campaign, caucus: HillCaucus): UsMajorParty {
  return partyForCaucus(caucus, campaign.congress.caucusAnchor);
}

/**
 * How the President stands to a party: a member of it, sitting nearest it as an
 * independent, or neither. Undefined is the honest answer for the other party
 * and for the independents in Congress, who caucus on their own account.
 */
export function presidentialRelation(campaign: Campaign, party: UsParty): "the President's party" | "the caucus nearest the President" | undefined {
  const { administrationParty, caucusAnchor } = campaign.congress;
  if (party === "independent") return undefined;
  if (administrationParty === party) return "the President's party";
  if (administrationParty === "independent" && caucusAnchor === party) return "the caucus nearest the President";
  return undefined;
}

/** Which party controls a chamber, counted the way the engine seats its leaders. */
export function chamberMajorityParty(campaign: Campaign, chamber: Chamber): UsMajorParty {
  return caucusParty(campaign, chamberMajority(campaign.congress, chamber));
}

/**
 * "Democrats hold the Senate, with 2 independents." The independents are named
 * when they make up part of the count, because they caucus rather than belong.
 */
export function chamberMajorityLine(campaign: Campaign, chamber: Chamber): string {
  const party = chamberMajorityParty(campaign, chamber);
  const independents = campaign.congress.chambers[chamber].independent;
  const withIndependents = party === "democrat" && independents > 0 ? `, counting ${independents} independent${independents === 1 ? "" : "s"} who vote with them` : "";
  const relation = presidentialRelation(campaign, party);
  return `${PLURAL[party]}${relation ? ` (${relation === "the President's party" ? relation : "the party closest to the President"})` : ""} hold ${CHAMBER_NAMES[chamber]}${withIndependents}.`;
}
