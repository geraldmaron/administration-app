import { CHAMBERS, CHAMBER_NAMES, COMMITTEE_IDS, chamberDisposition, committeePanel, otherMajorParty, selectHill, selectHillMember, selectInquiriesFor, selectDateOfTurn, selectPerson, stateOfBirthplace, usPartyWord, figureRapport, isMatterOpen, } from "@admin/engine";
import { stateById } from "@admin/world";
import { formatDate, formatRatio, stanceForRatio } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { DISPOSITION_WORD } from "./congress-reading.js";
import { presidentialRelation } from "./party-words.js";
export function standingOf(value) {
    const stance = stanceForRatio(value);
    return { value, percent: formatRatio(value), word: DISPOSITION_WORD[stance], stance };
}
/** How each chamber's floor reads the administration once its leaders and delegations are counted. */
export function chamberStandings(campaign) {
    return CHAMBERS.map((chamber) => ({
        chamber,
        name: CHAMBER_NAMES[chamber],
        standing: standingOf(chamberDisposition(campaign.congress, chamber, campaign.states, campaign.people)),
    }));
}
/** A chamber's seats by party, in the order they sit from the left. */
export function chamberParties(campaign, chamber) {
    const composition = campaign.congress.chambers[chamber];
    const anchor = campaign.congress.caucusAnchor;
    const of = (party) => (party === anchor ? composition.administration : composition.opposition);
    const parties = [
        { party: "democrat", seats: of("democrat"), label: "Democrats" },
        { party: "independent", seats: composition.independent, label: "Independents" },
        { party: "republican", seats: of("republican"), label: "Republicans" },
    ];
    return parties.filter((party) => party.seats > 0);
}
const APPROACH_WORD = {
    call: "Private call",
    trade: "Budget negotiation",
    public: "Public appeal",
    credit: "Shared credit",
    campaign: "Campaign at home",
};
/** About one member in N, from a share of the chamber. */
export function followingWords(influence) {
    const inN = Math.max(2, Math.round(1 / Math.max(influence, 0.01)));
    return `About 1 member in ${inN} follows their lead`;
}
function partyOf(member, anchor) {
    return member.figure.caucus === "administration" ? anchor : otherMajorParty(anchor);
}
function pendingLine(campaign, post) {
    const act = Object.values(campaign.issuedActs ?? {}).find((entry) => entry.kind === "lobby" && entry.post === post && (entry.status === "issued" || entry.status === "awaiting-response" || entry.status === "in-progress"));
    return act ? `${APPROACH_WORD[act.approach]} in progress. You'll hear back by ${formatDate(act.dueDate)}.` : undefined;
}
/** "Democrat, of the President's party", or the party alone: never "your side". */
function sideLine(campaign, party) {
    const relation = presidentialRelation(campaign, party);
    return relation ? `${usPartyWord(party)}, ${relation === "the President's party" ? "in the President's party" : "in the party closest to the President"}` : `${usPartyWord(party)}, not in the President's party`;
}
function postReading(campaign, member) {
    const anchor = campaign.congress.caucusAnchor;
    const party = partyOf(member, anchor);
    const homeState = stateOfBirthplace(member.person?.birthplace);
    const pending = pendingLine(campaign, member.post.id);
    return {
        id: member.post.id,
        title: member.post.title,
        chamber: member.post.chamber,
        chamberName: CHAMBER_NAMES[member.post.chamber],
        brief: member.post.brief,
        href: place.post(member.post.id),
        ...(member.person ? { holderId: member.person.id } : {}),
        name: member.name,
        party,
        side: sideLine(campaign, party),
        standing: standingOf(figureRapport(campaign.people, member.figure)),
        following: followingWords(member.figure.influence),
        ...(homeState ? { homeState, homeStateName: stateById.get(homeState)?.name ?? homeState } : {}),
        ...(pending ? { pending } : {}),
        history: campaign.congress.lobbying
            .filter((record) => record.post === member.post.id)
            .map((record) => ({ id: record.id, when: formatDate(selectDateOfTurn(campaign, record.turn)), approach: APPROACH_WORD[record.approach], landed: record.landed, account: record.account }))
            .reverse(),
    };
}
/** The leaders and chairs, in the order the posts are listed. */
export function hillPosts(campaign) {
    return selectHill(campaign).map((member) => postReading(campaign, member));
}
export function hillPostReading(campaign, post) {
    const member = selectHillMember(campaign, post);
    return member ? postReading(campaign, member) : undefined;
}
/** Every committee, the ones investigating the administration first. */
export function committeeReadings(campaign) {
    return COMMITTEE_IDS.map((id) => {
        const panel = committeePanel(campaign, id);
        const chair = panel.chair ? selectPerson(campaign, panel.chair)?.base.name : undefined;
        const inquiries = selectInquiriesFor(campaign, id)
            .filter(isMatterOpen)
            .map((matter) => matter.subject);
        return { id, name: panel.name, ...(chair ? { chair } : {}), standing: standingOf(panel.disposition), inquiries };
    }).sort((a, b) => Number(b.inquiries.length > 0) - Number(a.inquiries.length > 0) || a.name.localeCompare(b.name));
}
const SENATE_CLASS_WORD = { 1: "Class I", 2: "Class II", 3: "Class III" };
/** One state's bloc in Congress, as the campaign seats it today. */
export function delegationReading(campaign, state) {
    const id = state;
    const delegation = campaign.states[id]?.delegation;
    if (!delegation)
        return undefined;
    const anchor = campaign.congress.caucusAnchor;
    const { administration, opposition, independent, seats } = delegation.house;
    const democrat = anchor === "democrat" ? administration : opposition;
    const republican = anchor === "democrat" ? opposition : administration;
    const senators = id === "DC" ? [] : delegation.senate.map((seat) => ({ party: usPartyWord(seat.party), up: SENATE_CLASS_WORD[seat.seatClass] }));
    return { state: id, name: stateById.get(id)?.name ?? id, house: { democrat, republican, independent, seats }, senators, standing: standingOf(delegation.disposition) };
}
