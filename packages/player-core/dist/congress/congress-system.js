import { CHAMBERS, CHAMBER_NAMES, chamberMajority, clotureOf, majorityOf, selectBills, selectDateOfTurn, supermajorityOf, usPartyWord, } from "@admin/engine";
import { STATE_IDS, stateById } from "@admin/world";
import { formatDate } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { floorSchedule } from "./floor-schedule.js";
import { chamberParties, delegationReading, hillPosts } from "./hill-reading.js";
import { caucusName, chamberMajorityLine, presidentialRelation } from "./party-words.js";
export const BILL_LANES = ["referral", "markup", "floor", "conference", "desk"];
const PARTY_ORDER = { democrat: 0, independent: 1, republican: 2 };
function seatsOf(campaign, chamber) {
    const posts = new Map(hillPosts(campaign).filter((post) => post.holderId).map((post) => [post.holderId, post.title]));
    const rows = (campaign.congress.members ?? []).filter((member) => member.chamber === chamber).map((member) => {
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
            ...(person ? { personId: member.person, href: place.person(member.person) } : {}),
            ...(person && !vacant ? { lean: person.base.ideology.economicLeftRight } : {}),
            ...(post ? { post } : {}),
            ...(member.seatClass ? { seatClass: member.seatClass } : {}),
        };
    });
    return [...rows].sort((a, b) => PARTY_ORDER[a.party] - PARTY_ORDER[b.party] || (a.lean ?? 0) - (b.lean ?? 0) || a.seat.localeCompare(b.seat));
}
function caucusOf(campaign, chamber) {
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
function thresholdsOf(chamber, seats, caucus) {
    const override = supermajorityOf(seats);
    const lines = [
        { key: "majority", label: "Pass a bill", votes: majorityOf(seats) },
        ...(chamber === "senate" ? [{ key: "cloture", label: "End debate (cloture)", votes: clotureOf(seats) }] : []),
        { key: "override", label: "Override a veto", votes: override },
        { key: "sustain", label: "Uphold a veto", votes: seats - override + 1 },
    ];
    // The Vice President breaks a tied Senate on a simple majority, never on
    // cloture or an override, so an evenly split Senate carries a measure.
    const tied = chamber === "senate" && caucus * 2 === seats;
    return lines.map((line) => (tied && line.key === "majority" ? { ...line, short: 0, tieBreak: true } : { ...line, short: Math.max(0, line.votes - caucus) }));
}
function votesOf(bill) {
    const passage = bill.passage.flatMap((vote) => [
        ...(vote.cloture ? [{ vote: vote.cloture, question: "Cloture" }] : []),
        { vote, question: vote.procedure === "cloture" ? "Cloture" : "Passage" },
    ]);
    const override = (bill.override ?? []).map((vote) => ({ vote, question: "Veto override" }));
    return [...passage, ...override];
}
/** The newest roll call a chamber recorded on any bill, with every member's vote. */
function lastRollOf(campaign, chamber) {
    const candidates = selectBills(campaign).flatMap((bill) => votesOf(bill)
        .filter(({ vote }) => vote.chamber === chamber && vote.rollCall && vote.rollCall.length > 0 && vote.recordedTurn !== undefined)
        .map((entry) => ({ bill, ...entry })));
    const latest = [...candidates].sort((a, b) => b.vote.recordedTurn - a.vote.recordedTurn || a.bill.id.localeCompare(b.bill.id))[0];
    if (!latest)
        return undefined;
    const { bill, vote, question } = latest;
    return {
        billId: bill.id,
        title: bill.title,
        href: place.bill(bill.id),
        question,
        date: formatDate(selectDateOfTurn(campaign, vote.recordedTurn)),
        turn: vote.recordedTurn,
        yeas: vote.yeas,
        nays: vote.nays,
        required: vote.required,
        passed: vote.passed,
        votes: new Map(vote.rollCall.map((member) => [member.seat, member.yea])),
    };
}
function chamberOf(campaign, chamber) {
    const composition = campaign.congress.chambers[chamber];
    const members = seatsOf(campaign, chamber);
    const caucus = caucusOf(campaign, chamber);
    // An old save seats no individual members; the composition still counts the parties.
    const parties = members.length === 0
        ? chamberParties(campaign, chamber)
        : ["democrat", "independent", "republican"]
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
export function congressSystem(campaign) {
    const bills = floorSchedule(campaign).flatMap((group) => group.rows.map((row) => ({ id: row.id, title: row.title, href: row.href, lane: group.key, sponsor: row.sponsor, line: row.line })));
    return {
        chambers: CHAMBERS.map((chamber) => chamberOf(campaign, chamber)),
        delegations: STATE_IDS.flatMap((state) => delegationReading(campaign, state) ?? []),
        bills,
    };
}
