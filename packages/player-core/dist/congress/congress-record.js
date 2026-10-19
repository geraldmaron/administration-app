import { COMMITTEE_IDS, committeePanel, nextElection, selectBills, selectDateOfTurn, selectInquiriesFor, isMatterOpen, senateClassUpIn, stateApproval, } from "@admin/engine";
import { formatDate } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { hillPosts, standingOf } from "./hill-reading.js";
function split(vote) {
    if (!vote.rollCall || vote.rollCall.length === 0)
        return undefined;
    const tally = (party) => {
        const members = vote.rollCall.filter((member) => member.party === party);
        const yea = members.filter((member) => member.yea).length;
        return { yea, nay: members.length - yea };
    };
    return { democrat: tally("democrat"), independent: tally("independent"), republican: tally("republican") };
}
export function recordedVotes(bill) {
    const passage = bill.passage.flatMap((vote) => [
        ...(vote.cloture ? [{ vote: vote.cloture, question: "Cloture" }] : []),
        { vote, question: vote.procedure === "cloture" ? "Cloture" : "Passage" },
    ]);
    return [...passage, ...(bill.override ?? []).map((vote) => ({ vote, question: "Veto override" }))].filter(({ vote }) => vote.recordedTurn !== undefined);
}
/** Every roll call the term recorded on a bill, oldest first. */
export function rollHistory(campaign) {
    return selectBills(campaign)
        .flatMap((bill) => recordedVotes(bill).map(({ vote, question }, i) => {
        const byParty = split(vote);
        return {
            key: `${bill.id}:${vote.chamber}:${question}:${i}`,
            turn: vote.recordedTurn,
            date: formatDate(selectDateOfTurn(campaign, vote.recordedTurn)),
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
    }))
        .sort((a, b) => a.turn - b.turn || a.key.localeCompare(b.key));
}
/** What the term's bills came to. */
export function termTally(campaign) {
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
export function hillLeaders(campaign) {
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
export function hillCommittees(campaign) {
    return COMMITTEE_IDS.map((id) => {
        const panel = committeePanel(campaign, id);
        const chair = panel.chair ? campaign.people[panel.chair]?.base.name : undefined;
        const inquiries = selectInquiriesFor(campaign, id).filter(isMatterOpen).map((matter) => matter.subject);
        return {
            id,
            name: panel.name,
            ...(chair && panel.chair ? { chair, chairId: panel.chair, chairHref: place.person(panel.chair) } : {}),
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
export function chamberReach(chamber, presidentLean, shown = 8) {
    const line = chamber.thresholds.find((entry) => entry.key === "cloture") ?? chamber.thresholds.find((entry) => entry.key === "majority");
    const ours = new Set(chamber.caucus.parties);
    const theirs = chamber.members.filter((member) => !ours.has(member.party) && member.lean !== undefined && !member.vacant);
    const nearest = [...theirs]
        .map((member) => ({ ...member, distance: Math.abs(member.lean - presidentLean) }))
        .sort((a, b) => a.distance - b.distance || a.seat.localeCompare(b.seat))
        .slice(0, shown);
    return { chamber: chamber.chamber, need: line.short, line: line.label, nearest };
}
/** The Senate class that faces the voters at the next November election, if one is scheduled. */
export function nextSenateClass(campaign) {
    const election = nextElection(campaign);
    if (!election)
        return undefined;
    const year = election.date.year;
    const seatClass = senateClassUpIn(year);
    return seatClass ? { seatClass, year, weeks: election.turnsAway } : undefined;
}
/** The President's own economic position, which every member's is measured against. */
export function presidentLean(campaign) {
    return campaign.founding.leader.ideology.economicLeftRight;
}
/** One member read in depth from public records only: position against the President's, home-state approval, the next election and the last recorded vote. */
export function memberDepth(campaign, member, you, senateClass, roll) {
    const approval = stateApproval(campaign, member.state);
    const vote = roll?.votes.get(member.seat);
    return {
        ...member,
        ...(member.lean !== undefined ? { fromYou: member.lean - you } : {}),
        ...(approval !== undefined ? { homeApproval: approval } : {}),
        upNext: member.chamber === "house" ? nextElection(campaign) !== undefined : senateClass !== undefined && member.seatClass === senateClass.seatClass,
        ...(vote === undefined ? {} : { lastVote: vote ? "yea" : "nay" }),
    };
}
