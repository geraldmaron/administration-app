import { CHAMBER_NAMES, chamberMajority, partyForCaucus } from "@admin/engine";
// Party, caucus and the President's relation to each, said as separate facts.
//
// The engine counts Congress along one axis, administration against opposition,
// anchored on the major party the President sits nearest. That axis is a count,
// not an identity: an independent President has no party in Congress, and the
// Democrats a Democratic President works with are still the Democrats rather
// than "yours". So the player never reads "your side". A chamber is held by a
// named party; the President's party is named as such only when the President
// belongs to it; and an independent President's nearest caucus is called that.
const PLURAL = {
    democrat: "Democrats",
    republican: "Republicans",
    independent: "Independents",
};
const CAUCUS_NAME = {
    democrat: "Democratic caucus",
    republican: "Republican caucus",
};
const ADJECTIVE = {
    democrat: "Democratic",
    republican: "Republican",
};
export function partyAdjective(party) {
    return ADJECTIVE[party];
}
export function partyPlural(party) {
    return PLURAL[party];
}
export function caucusName(party) {
    return CAUCUS_NAME[party];
}
/** The major party a caucus column stands for in this campaign. */
export function caucusParty(campaign, caucus) {
    return partyForCaucus(caucus, campaign.congress.caucusAnchor);
}
/**
 * How the President stands to a party: a member of it, sitting nearest it as an
 * independent, or neither. Undefined is the honest answer for the other party
 * and for the independents in Congress, who caucus on their own account.
 */
export function presidentialRelation(campaign, party) {
    const { administrationParty, caucusAnchor } = campaign.congress;
    if (party === "independent")
        return undefined;
    if (administrationParty === party)
        return "the President's party";
    if (administrationParty === "independent" && caucusAnchor === party)
        return "the caucus nearest the President";
    return undefined;
}
/** Which party controls a chamber, counted the way the engine seats its leaders. */
export function chamberMajorityParty(campaign, chamber) {
    return caucusParty(campaign, chamberMajority(campaign.congress, chamber));
}
/**
 * "Democrats hold the Senate, with 2 independents." The independents are named
 * when they make up part of the count, because they caucus rather than belong.
 */
export function chamberMajorityLine(campaign, chamber) {
    const party = chamberMajorityParty(campaign, chamber);
    const independents = campaign.congress.chambers[chamber].independent;
    const withIndependents = party === "democrat" && independents > 0 ? `, counting ${independents} independent${independents === 1 ? "" : "s"} who vote with them` : "";
    const relation = presidentialRelation(campaign, party);
    return `${PLURAL[party]}${relation ? ` (${relation === "the President's party" ? relation : "the party closest to the President"})` : ""} hold ${CHAMBER_NAMES[chamber]}${withIndependents}.`;
}
