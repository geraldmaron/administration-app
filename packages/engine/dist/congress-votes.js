import { majorityOf, seatedOf } from "./congress.js";
import { memberVote } from "./member-votes.js";
import { splitSupport } from "./caucus-count.js";
import { breakSenateTie } from "./senate-tie.js";
import { chamberDisposition } from "./hill.js";
import { administrationReach } from "./party.js";
// One way to ask a chamber a question, and one arithmetic behind it.
//
// Ten call sites take a floor count — passage, override, confirmation, cloture,
// consent, the articles, conviction, a force authorization, an appropriation, a
// stopgap — and each used to assemble the same three numbers itself before
// handing them to the counter. That is why a change to how the Senate counts
// had to be made ten times, and why a room that forgot one of them counted the
// old way for a release.
//
// Beside congress.ts rather than inside it because congress.ts is at its size
// budget. The counter itself moved here with `voteOn`: the entry point and the
// arithmetic it guards are one subject, and splitting them would leave the
// gate in one file and the thing it gates in another. congress.ts re-exports
// the four counting functions, so every caller's import is where it was.
//
// What the count knows that it did not before: whose measure this is. A chamber
// does not hold one opinion of every bill in front of it. The President's own
// caucus turns out for the President's own bill and has to be carried on the
// other side's; the other side is the mirror of that. Counting both through one
// support figure made an opposition bill a measure the President's party was
// whipped for, which is the single most consequential falsehood the legislature
// could tell about a divided government.
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/**
 * How reliably the caucus in the administration column votes with the
 * president.
 *
 * The floor is what a president is owed for being of that party. The range
 * above it is standing, which anyone can earn.
 */
const OWN_PARTY_FLOOR = 0.8;
const OWN_PARTY_RANGE = 0.2;
/** How much of the other side a president can win over at full standing. */
const CROSSOVER_CEILING = 0.35;
/**
 * Deliberately the mirror of the loyalty and crossover bands above: a count
 * against the administration is the same chamber counted from the other end,
 * not a second theory of how members vote.
 */
const OPPOSITION_FLOOR = 0.8;
const OPPOSITION_RANGE = 0.2;
const DEFECTION_CEILING = 0.35;
/**
 * What the sponsor is worth inside the caucus that wrote the bill, and what it
 * costs in the caucus that did not.
 *
 * The two figures the whole chamber used to share: a bill of the
 * administration's read `+0.08` to every member of both caucuses, and one of
 * the opposition's `-0.06` to both. Split, they say what they always meant —
 * a side turns out for its own measure, and the other side has to be carried —
 * and an administration bill and an opposition bill stop having one support
 * figure between them.
 */
const SPONSOR_OWN_SIDE = 0.08;
const SPONSOR_OTHER_SIDE = -0.06;
/** Most of the other side votes to keep the lights on, however they feel about the President. */
export const KEEP_GOVERNMENT_OPEN_FLOOR = 0.61;
export const KEEP_GOVERNMENT_OPEN_OPPOSITION = 0.55;
/**
 * Which side of the aisle a chamber's independents vote with.
 *
 * The one convention `majorityCaucus` and the committee panels already count
 * by: every independent senator of the last two decades has caucused with the
 * Democrats, so they sit with the administration under a Democrat-anchored
 * presidency and across the aisle under a Republican-anchored one.
 */
export function independentsSitWith(caucusAnchor) {
    return caucusAnchor === "democrat" ? "administration" : "opposition";
}
/**
 * Take one chamber's count on a question, through the one counter.
 *
 * Every count in the game comes out of here, and comes out tallied by bloc: a
 * screen that has to say how many of the President's own members would have to
 * break can always read it, and a count that could not say so was the reason
 * the removal arc needed a counter of its own.
 */
export function voteOn(campaign, question) {
    return countQuestion(campaign.congress, campaign.states, campaign.people, { ...question, asOf: campaign.calendar });
}
/** Ordinary legislative business has a debate gate and a distinct majority decision. */
export function legislativeVoteOn(campaign, question) {
    return legislativeCount(campaign.congress, campaign.states, campaign.people, { ...question, asOf: campaign.calendar });
}
function legislativeCount(congress, states, people, question) {
    const majority = majorityOf(seatedOf(congress, question.chamber));
    const needsCloture = question.chamber === "senate" && question.required > majority;
    const final = { ...countQuestion(congress, states, people, { ...question, required: majority }), procedure: "final-passage" };
    if (!needsCloture)
        return final;
    const cloture = { ...countQuestion(congress, states, people, { ...question, appeal: question.appeal + 0.06 }), procedure: "cloture" };
    return { ...final, cloture };
}
function countQuestion(congress, states, people, question) {
    const room = chamberDisposition(congress, question.chamber, states, people);
    const shares = (question.counted ?? "with") === "against"
        ? sharesAgainst(congress, room, question)
        : sharesWith(congress, room, question);
    return memberVote(congress, states, people, question, shares) ?? counted(congress, question.chamber, question.required, withMerit(shares, question.merit), question.counted ?? "with");
}
/** The aggregate counter's reading of a member-level merit: each caucus's share moved by it. */
function withMerit(shares, merit) {
    if (!merit)
        return shares;
    return { administration: clamp01(shares.administration + merit), opposition: clamp01(shares.opposition + merit), independent: clamp01(shares.independent + merit) };
}
/**
 * What the sponsor is worth to one caucus. Zero for a measure that is nobody's:
 * a stopgap is the bill that passes when the two sides have agreed on nothing
 * except that the lights stay on, and neither side is whipped for it.
 */
function sponsorTerm(stance, caucus) {
    if (stance === "neutral")
        return 0;
    return stance === caucus ? SPONSOR_OWN_SIDE : SPONSOR_OTHER_SIDE;
}
/**
 * A measure the chamber is asked to pass, counted from the President's end.
 *
 * `appeal` is what this particular question is worth to a member on top of how
 * they feel about the administration generally — a country that has just been
 * attacked moves votes that a nomination never would. The disposition it counts
 * against is the chamber's rather than the room's: the leadership carries part
 * of its own chamber, so a president who has spent a month on the Speaker is
 * counting a different House than one who has not.
 */
function sharesWith(congress, room, question) {
    const support = Math.max(question.floor ?? 0, clamp01(room + question.appeal));
    const split = splitSupport(support, question.readings, {
        administration: sponsorTerm(question.stance, "administration"),
        opposition: sponsorTerm(question.stance, "opposition"),
    });
    const opposition = question.oppositionShare ?? CROSSOVER_CEILING * Math.max(0, split.opposition - 0.5) * 2;
    return {
        administration: anchorShare(congress, OWN_PARTY_FLOOR + OWN_PARTY_RANGE * split.own, opposition),
        opposition,
        // The bloc that joined neither party reads the room and nothing else: there
        // is no leadership to whip it and no platform for the act to agree with.
        independent: support,
    };
}
/**
 * The same chamber counted from the other end: the yeas are members voting
 * against the President.
 *
 * The base is the opposition's own seats; what carries the count past a
 * supermajority is defection from the President's own side, and defection is a
 * function of how badly the chamber is disposed toward him. A question about the
 * President himself is decided by who holds the seats instead — his own caucus
 * votes at the share the caller has decided breaks, and independents vote with
 * the caucus they sit with.
 */
function sharesAgainst(congress, room, question) {
    const against = clamp01(1 - room + question.appeal);
    const opposition = OPPOSITION_FLOOR + OPPOSITION_RANGE * against;
    const aboutThePresident = question.administrationBreak !== undefined;
    const administration = question.administrationBreak !== undefined
        ? clamp01(question.administrationBreak)
        : (question.defection ?? DEFECTION_CEILING) * Math.max(0, against - 0.5) * 2;
    const independent = aboutThePresident
        ? independentsSitWith(congress.caucusAnchor) === "administration"
            ? administration
            : opposition
        : against;
    return { administration: anchorShare(congress, administration, opposition), opposition, independent };
}
/**
 * What the caucus in the administration's column actually votes at.
 *
 * The column is not the same thing as a party. A president of a party owns the
 * whole of it; an independent owns the share of it their politics reach, and the
 * rest of those members answer the question the way the other side does — they
 * were nominated on a ticket with neither of them. The consequence is
 * arithmetic rather than a penalty: an independent needs a chamber better
 * disposed to reach the same count, and reaches it by moving the room instead of
 * by having won a primary.
 *
 * At full reach this is the co-partisan share and nothing else, to the bit, so
 * every count under a president with a party is the count it always was.
 */
function anchorShare(congress, coPartisan, otherSide) {
    const reach = administrationReach(congress.administrationParty);
    if (reach === 1)
        return coPartisan;
    return reach * coPartisan + (1 - reach) * otherSide;
}
function tally(seats, share) {
    return { seats, yeas: Math.round(seats * share) };
}
/** The tallies, the total, and the Vice President where the Constitution lets him vote. */
function counted(congress, chamber, required, shares, frame) {
    const composition = congress.chambers[chamber];
    const byCaucus = {
        administration: tally(composition.administration, shares.administration),
        opposition: tally(composition.opposition, shares.opposition),
        independent: tally(composition.independent, shares.independent),
    };
    const yeas = Math.min(composition.seats, byCaucus.administration.yeas + byCaucus.opposition.yeas + byCaucus.independent.yeas);
    return {
        ...breakSenateTie(congress, { chamber, yeas, nays: composition.seats - yeas, required, passed: yeas >= required }, frame),
        byCaucus,
    };
}
// --- The four questions the rest of the engine asks, by name -----------------
//
// Kept as their own functions because a caller that holds a `Congress` and no
// campaign — a projection run against a hypothetical chamber, a test that builds
// one — has no campaign to hand `voteOn`. They are the same arithmetic with the
// question spelled out, never a second counter. Without the people table a
// seated holder's rapport cannot be read, and each counts as neutral toward the
// administration; a caller counting a real chamber hands it over.
const NO_PEOPLE = {};
/** A floor vote on a measure, counted rather than decided. */
export function countVote(congress, chamber, appeal, required, states, readings, stance = "neutral", people = NO_PEOPLE) {
    return countQuestion(congress, states, people, { chamber, appeal, required, stance, readings });
}
/**
 * A clean stopgap is the one vote where members answer to the government
 * staying open, not to how much they like the President who signed nothing else.
 *
 * The floor and the other side's share together are what keep a sixty-vote
 * stopgap from being a shutdown with no way out of it: at any disposition the
 * chamber can hold, a clean continuing resolution clears sixty in the Senate.
 * The minority leader is the counterparty on this one measure, and this is what
 * that means arithmetically.
 */
export function countFundingContinuityVote(congress, chamber, appeal, required, states, people = NO_PEOPLE) {
    return legislativeCount(congress, states, people, {
        chamber,
        appeal,
        required,
        stance: "neutral",
        floor: KEEP_GOVERNMENT_OPEN_FLOOR,
        oppositionShare: KEEP_GOVERNMENT_OPEN_OPPOSITION,
    });
}
/** A veto override, or any question whose yeas are members voting to bind the President. */
export function countVoteAgainst(congress, chamber, appeal, required, states, defection = DEFECTION_CEILING, people = NO_PEOPLE) {
    return countQuestion(congress, states, people, {
        chamber,
        appeal,
        required,
        stance: "neutral",
        counted: "against",
        defection,
    });
}
/** A question about the President himself, counted bloc by bloc. */
export function countVoteAgainstByCaucus(congress, chamber, appeal, required, states, administrationBreak, people = NO_PEOPLE) {
    return countQuestion(congress, states, people, {
        chamber,
        appeal,
        required,
        stance: "neutral",
        counted: "against",
        administrationBreak,
    });
}
