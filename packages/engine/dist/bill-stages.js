import { selectBills, } from "./state.js";
import { CHAMBERS, carried, floorThreshold, majorityOf, seatedOf } from "./congress.js";
import { legislativeVoteOn } from "./congress-votes.js";
import { createRngStreams } from "./rng.js";
import { readingsFor } from "./caucus-count.js";
import { actForText, amendableAct, actOf } from "./legislative-acts.js";
import { fiscalAppetite, FISCAL_ACT_IDS } from "./legislative-acts-fiscal.js";
import { committeeDisposition } from "./committees.js";
import { sittingDate } from "./signing-window.js";
import { legislativeTrack } from "./reconciliation.js";
import { addDays, selectDateOfTurn } from "./clock.js";
// How a bill gets to the desk, as opposed to what happens once it is there.
//
// A bill used to be a single roll: the week Congress took a measure up, the
// count either carried it onto the desk or buried it, and the whole of the
// legislative process a player ever saw was the result. That is not what
// passing a law is. A measure is referred, it is marked up, and only then is it
// called — and it is at every one of those stages, not at the vote, that most
// legislation actually dies.
//
// So a bill in progress runs one week at a time through three stages, and each
// week resolves into one of four things: it moved, it gained ground, it became
// the argument, or it stalled. A stall is a setback, and three setbacks bury it.
// Nothing here is a certainty in either direction — a bill the floor loved on
// the day it was introduced can lose the room over a month of markup, and one
// nobody rated can pick up enough ground to carry.
//
// Split out of legislation.ts on the seam legislative-acts.ts and
// appropriation.ts were split on: that file owns the desk, the veto, the
// override and Congress's own calendar, and this one owns the passage in front
// of all of it. The floor count lives here because the count is the last stage
// rather than a separate subject; the dependency runs one way, and legislation.ts
// reads this file rather than the other way round.
/** The stages, in the order a measure moves through them. */
export const BILL_STAGES = ["referral", "markup", "floor", "conference"];
/** How many weeks of stalling bury a bill. */
export const BILL_SETBACK_LIMIT = 3;
/** Three weekly sittings leave the President time to answer a late conference briefing. */
export const CONFERENCE_RECOMMENDATION_WEEKS = 3;
/**
 * How much the room's own disposition is worth to a bill in committee.
 *
 * Half a point of chance for a full point of disposition, which leaves the act's
 * own appeal and the argument so far as the other half. A Hill that despises an
 * administration still reports out a farm bill; it just takes longer.
 */
const DISPOSITION_WEIGHT = 0.5;
/** The chance a stage moves before anything is known about the bill or the room. */
const BASE_ADVANCE = 0.3;
/**
 * What each stage is worth on top of that.
 *
 * Referral is procedural and mostly moves. Markup is where a bill is rewritten,
 * gutted or quietly held, and it is the hardest week of the three. The floor is
 * a calendar and a count: what decides it is the arithmetic below, not this.
 */
const STAGE_BIAS = {
    referral: 0.15,
    markup: 0,
    floor: 0.1,
    conference: 0.1,
};
/** What a week of ground gained, or of becoming the argument, is worth on the floor. */
const PROGRESS_STEP = 0.04;
const CONTROVERSY_SWING = 0.05;
const STAGNATION_DRAG = 0.03;
/** The share of the remaining weeks that are ground gained rather than a stall. */
const PROGRESS_BAND = 0.2;
const CONTROVERSY_BAND = 0.15;
/**
 * The floor votes that would carry one act to the desk.
 *
 * Exposed rather than internal because a president lobbies against a count, and
 * a count nobody can read is not something anyone can lobby against.
 *
 * The Senate's count is against cloture rather than against a majority for
 * everything but the budget track, which is the arithmetic that actually
 * decides whether a bill becomes law.
 *
 * `momentum` is what the weeks in committee have done to the measure. It is
 * added to the act's own appeal rather than to the count, so a bill that
 * gained the room reads as a more attractive bill rather than as a chamber
 * that changed its mind.
 *
 * A measure that restrains the President is counted from the other end: the
 * yeas are members voting to bind him, so a hostile chamber is the one that
 * passes it.
 */
export function restrainsThePresident(act) {
    const constraint = act.constrains;
    return (act.disapproves === true ||
        act.emergencyAction === "terminate" ||
        constraint?.barsUnilateralForce === true ||
        constraint?.bindsTheExecutive === true ||
        (constraint?.blocksOrders?.length ?? 0) > 0);
}
/** Whose bill this is, on the floor's own terms. A bipartisan bill is nobody's. */
export function stanceOf(act) {
    return act.sponsor === "bipartisan" ? "neutral" : act.sponsor;
}
export function projectPassage(campaign, act, momentum = 0, billId) {
    // A fiscal bill is worth more on the floor as the books get worse, whatever
    // the chamber thinks of the President. Nothing else in the catalogue reads it:
    // a deficit is not an argument for a farm bill.
    const appetite = FISCAL_ACT_IDS.has(act.id) ? fiscalAppetite(campaign) : 0;
    const appeal = act.appeal + appetite + momentum;
    const readings = act.domestic ? readingsFor(act.domestic, campaign.congress.caucusAnchor) : undefined;
    // A measure that restrains the President is counted from the other end — the
    // yeas are members voting to bind him — and on what the act does rather than
    // on who wrote it, so a bipartisan war-powers bill counts against him too.
    const counted = restrainsThePresident(act) ? "against" : "with";
    return CHAMBERS.map((chamber) => legislativeFloor(campaign, chamber, act, appeal, counted, readings, billId));
}
export function recordFloorVotes(votes, turn) {
    return votes.map((vote) => ({ ...vote,
        ...(vote.cloture && !vote.cloture.passed ? {} : { recordedTurn: turn }),
        ...(vote.cloture ? { cloture: { ...vote.cloture, recordedTurn: turn } } : {}),
    }));
}
function legislativeFloor(campaign, chamber, act, appeal, counted, readings, billId) {
    const question = { chamber, appeal, required: majorityOf(seatedOf(campaign.congress, chamber)),
        actId: act.id, stance: stanceOf(act), counted, ...(act.domestic ? { signature: act.domestic } : {}),
        ...(counted === "with" && readings ? { readings } : {}) };
    return legislativeVoteOn(campaign, { ...question,
        required: floorThreshold(campaign.congress, chamber, legislativeTrack(campaign, act, billId)) });
}
/**
  * Where a bill sits. A discharged measure carries no stage at all — it jumped
  * the calendar and never sat in one — and reads as referral here because that
  * is the foot of the ladder, not because anything was lost.
  */
export function billStage(bill) {
    return bill.stage ?? "referral";
}
function textOnFloor(bill, chamber) {
    return chamber === "senate" ? bill.text?.proposed ?? "base" : "base";
}
function chamberPassage(campaign, bill, stage) {
    if (!amendableAct(bill.act))
        return projectPassage(campaign, actOf(bill), bill.momentum ?? 0, bill.id);
    return ["house", "senate"].map((chamber) => {
        const text = stage === "conference" ? bill.text?.conference ?? "base" : textOnFloor(bill, chamber);
        return projectPassage(campaign, actForText(bill.act, text), bill.momentum ?? 0, bill.id).find((vote) => vote.chamber === chamber);
    });
}
function conferenceChoice(campaign, bill, tieBreak) {
    const choices = [bill.text?.house, bill.text?.senate].filter((text) => text !== undefined);
    const ranked = [...new Set(choices)].map((text) => {
        const votes = projectPassage(campaign, actForText(bill.act, text), bill.momentum ?? 0, bill.id);
        const margins = votes.flatMap((vote) => [vote.yeas - vote.required,
            ...(vote.cloture ? [vote.cloture.yeas - vote.cloture.required] : [])]);
        return { text, margin: Math.min(...margins) };
    }).sort((a, b) => b.margin - a.margin);
    if (ranked.length === 0)
        return "base";
    if (ranked.length === 1 || ranked[0].margin > ranked[1].margin)
        return ranked[0].text;
    return ranked[Math.floor(tieBreak * ranked.length)].text;
}
function conferenceWithoutRecommendation(campaign, bill, tieBreak) {
    const choice = conferenceChoice(campaign, bill, tieBreak);
    const account = `The President offered no recommendation on ${bill.title}; conferees choose the ${choice === "base" ? "original" : "targeted"} text. Both chambers must vote again.`;
    const beat = { turn: campaign.turn, stage: "conference", outcome: "progress", account };
    return { next: { ...bill, text: { ...bill.text, conference: choice }, beats: [...(bill.beats ?? []), beat] }, account };
}
function conferenceEntryTurn(bill) {
    return bill.beats?.at(-1)?.turn ?? bill.introducedTurn;
}
/** Case due date: default runs before the weekly phase in which conferees choose. */
export function conferenceRecommendationDeadline(campaign, bill) {
    if (bill.status !== "in-progress" || bill.stage !== "conference" || bill.text?.conference)
        return undefined;
    return addDays(selectDateOfTurn(campaign, conferenceEntryTurn(bill) + CONFERENCE_RECOMMENDATION_WEEKS + 1), -1);
}
/**
 * What a bill in progress faces this week, for the screen that has to show it.
 *
 * The same numbers the phase itself draws against, computed here once so that
 * the odds a folio prints and the odds the week is resolved on can never be two
 * different readings.
 */
export function projectStage(campaign, bill) {
    const act = amendableAct(bill.act) && bill.stage === "conference" && bill.text?.conference
        ? actForText(bill.act, bill.text.conference) : actOf(bill);
    if (act === undefined || bill.status !== "in-progress")
        return undefined;
    const stage = billStage(bill);
    const advances = stage === "conference" && !bill.text?.conference ? 0 : advanceChance(campaign, act, stage, bill.momentum ?? 0);
    const floor = chamberPassage(campaign, bill, stage);
    const setbacks = bill.setbacks ?? 0;
    return {
        stage,
        advances,
        stalls: Math.max(0, 1 - advances - PROGRESS_BAND - CONTROVERSY_BAND),
        setbacks,
        setbacksRemaining: Math.max(0, BILL_SETBACK_LIMIT - setbacks),
        floor,
        floorCarries: carried(floor),
    };
}
/**
 * The disposition a stage is decided against.
 *
 * Markup happens in a committee room, so a routed act is marked up against the
 * panel that has it rather than against the whole Hill: a chair who wants a
 * farm bill reports one out of a Congress that is refusing the President
 * everything else. Referral and the floor are the leadership's calendar and the
 * whole chamber's count, and both stay the room's. An act the catalogue routes
 * nowhere reads the room at every stage, which is what every act did before.
 */
function stageDisposition(campaign, act, stage) {
    return stage === "markup" ? committeeDisposition(campaign, act.committee) : campaign.congress.disposition;
}
function advanceChance(campaign, act, stage, momentum) {
    const room = DISPOSITION_WEIGHT * (stageDisposition(campaign, act, stage) - 0.5);
    return clamp01(BASE_ADVANCE + STAGE_BIAS[stage] + room + act.appeal + momentum);
}
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const bounded = (value) => Math.round(Math.max(-1, Math.min(1, value)) * 1000) / 1000 + 0;
function outcomeOf(draw, advances) {
    if (draw < advances)
        return "success";
    if (draw < advances + PROGRESS_BAND)
        return "progress";
    if (draw < advances + PROGRESS_BAND + CONTROVERSY_BAND)
        return "controversy";
    return "stagnation";
}
/**
 * What the week did, in the words the wire prints and the folio keeps.
 *
 * One line per stage and outcome, because "the bill stalled" three weeks running
 * in three different rooms is three different facts about a presidency and one
 * sentence would flatten them into a status light.
 */
const STAGE_ACCOUNT = {
    referral: {
        success: (title) => `${title} is referred, and the committee agrees to take it up.`,
        progress: (title) => `The chairman puts ${title} on the calendar and says he means to move it.`,
        controversy: (title) => `Two committees claim ${title}, and the fight over which one gets it is the story.`,
        stagnation: (title) => `${title} is referred and nothing else happens to it.`,
    },
    markup: {
        success: (title) => `The committee marks up ${title} and reports it out.`,
        progress: (title) => `An amendment buys votes for ${title} without costing it the ones it had.`,
        controversy: (title) => `${title} is reopened in markup, and what comes out is not quite what went in.`,
        stagnation: (title) => `Markup on ${title} is postponed, and the chairman will not say until when.`,
    },
    floor: {
        success: (title) => `${title} is called up and carries.`,
        progress: (title) => `The leadership schedules ${title} for a vote and starts counting.`,
        controversy: (title) => `${title} is held at the desk while the leadership argues over the rule.`,
        stagnation: (title) => `${title} is pulled from the calendar rather than lose the count.`,
    },
    conference: {
        success: (title) => `Both chambers approve the same text of ${title}.`,
        progress: (title) => `The chambers continue work on a common text of ${title}.`,
        controversy: (title) => `The chambers dispute the compromise text of ${title}.`,
        stagnation: (title) => `Conference on ${title} stalls.`,
    },
};
/**
 * Whether this measure could carry the floor on the day it was filed.
 *
 * Read off the count the bill already stores rather than from a flag: every bill
 * records the whip count it was introduced on, so a measure filed knowing it
 * fails is a fact about the record and not a second field somebody has to
 * remember to set.
 */
function everCarried(bill) {
    // A bill with no count on the record has not reached a floor yet, so there is
    // nothing to read a losing margin off. It counts as a measure filed to win,
    // which is what a bill is until the other side files one to make a point.
    return bill.passage.length === 0 || carried(bill.passage);
}
/** The line the record keeps on a measure that was called up and lost. */
function defeatAccount(title, floor) {
    const cloture = floor.find((vote) => vote.cloture && !vote.cloture.passed)?.cloture;
    if (cloture)
        return `${title} fails to close debate in the Senate, ${cloture.yeas} to ${cloture.nays}; final passage is not called.`;
    const lost = floor.find((vote) => !vote.passed) ?? floor[0];
    const count = lost ? `, ${lost.yeas} to ${lost.nays}` : "";
    return `${title} is called up and fails${count}.`;
}
/**
 * Every bill in progress, one week on.
 *
 * The draw is seeded on the campaign and keyed on the bill and the week, so a
 * replay legislates identically and a bill's own history is independent of what
 * else the turn happened to resolve first.
 *
 * A bill that carries the floor only reaches the desk if the desk is free.
 * Congress sends one at a time, and the alternative — two enrolled bills waiting
 * on one signature — is the desk nobody reads that the origination gate exists
 * to prevent. It waits at the floor without a setback: the calendar being full
 * is not the bill stalling.
 */
export function advanceBills(state, clearedThisWeek = []) {
    const streams = createRngStreams(state.seed);
    const inProgress = selectBills(state).filter((bill) => bill.status === "in-progress");
    let deskFree = selectBills(state).every((bill) => bill.status !== "on-the-desk" || clearedThisWeek.includes(bill.id));
    const effects = [];
    const accounts = [];
    let disposition = 0;
    for (const bill of inProgress) {
        const projection = projectStage(state, bill);
        if (projection === undefined) {
            // An act this build no longer carries cannot be marked up, and leaving it
            // in progress forever would block Congress's whole agenda behind it.
            effects.push({ kind: "bill", set: { ...bill, status: "dead", resolvedTurn: state.turn } });
            continue;
        }
        if (projection.stage === "conference" && !bill.text?.conference) {
            const entered = conferenceEntryTurn(bill);
            if (state.turn < entered + CONFERENCE_RECOMMENDATION_WEEKS)
                continue;
            const negotiated = conferenceWithoutRecommendation(state, bill, streams.stream("bill-conference-text", bill.id, entered).next());
            effects.push({ kind: "bill", set: negotiated.next });
            accounts.push(negotiated.account);
            continue;
        }
        const draw = streams.stream("bill-stage", bill.id, state.turn).next();
        const outcome = outcomeOf(draw, projection.advances);
        const step = resolveWeek(state, bill, projection, outcome, deskFree, streams.stream("bill-swing", bill.id, state.turn).next());
        if (step.next.status === "on-the-desk")
            deskFree = false;
        effects.push({ kind: "bill", set: step.next });
        accounts.push(step.beat.account);
        disposition += step.disposition;
        if (step.standing !== 0)
            effects.push({ kind: "metric", deltas: { standing: step.standing } });
    }
    // One write, however many bills moved: `congress` is a whole-object effect,
    // and two of them in a packet would have the second silently overwrite the
    // first's disposition with a figure read before the first was applied.
    if (disposition !== 0) {
        effects.push({
            kind: "congress",
            set: { ...state.congress, disposition: clamp01(state.congress.disposition + disposition) },
        });
    }
    return { effects, accounts };
}
/** One bill, one week: where it goes, what it cost, and what the record says. */
function resolveWeek(state, bill, projection, outcome, deskFree, swing) {
    const stage = projection.stage;
    // The floor is a count, not a mood: a bill called up that cannot carry has
    // stalled whatever the week's draw said, and one that carries when the desk
    // is occupied simply waits for it.
    const settled = (stage === "floor" || stage === "conference") && outcome === "success" && (!projection.floorCarries || (!deskFree && (stage === "conference" || !amendableAct(bill.act) || textOnFloor(bill, "senate") === "base")))
        ? projection.floorCarries
            ? "progress"
            : "stagnation"
        : outcome;
    // Unless it was never going to carry, in which case the vote is the point. The
    // leadership pulls a measure it hoped to win; it holds the vote on one it filed
    // to lose, and the record keeps the count rather than a fourth week of the
    // calendar.
    const defeated = (stage === "floor" || stage === "conference") && outcome === "success" && !projection.floorCarries && !everCarried(bill);
    const beat = {
        turn: state.turn,
        stage,
        outcome: settled,
        account: defeated ? defeatAccount(bill.title, projection.floor) : STAGE_ACCOUNT[stage][settled](bill.title),
    };
    if (defeated) {
        return {
            next: { ...bill, status: "dead", beats: [...(bill.beats ?? []), beat], passage: recordFloorVotes(projection.floor, state.turn), resolvedTurn: state.turn },
            beat,
            // The chamber spent a day on a measure it buried. That is a week of the
            // President's calendar either way, and no standing of theirs is on a bill
            // the other side filed to lose.
            disposition: -0.005,
            standing: bill.sponsor === "administration" ? -0.01 : 0,
        };
    }
    const beats = [...(bill.beats ?? []), beat];
    const momentum = bill.momentum ?? 0;
    const setbacks = (bill.setbacks ?? 0) + (settled === "stagnation" ? 1 : 0);
    if (settled === "success") {
        if (stage === "floor" && amendableAct(bill.act) && textOnFloor(bill, "house") !== textOnFloor(bill, "senate")) {
            const text = { ...bill.text, house: "base", senate: textOnFloor(bill, "senate"), initialPassage: recordFloorVotes(projection.floor, state.turn) };
            const conferenceBeat = { ...beat, account: `${bill.title} passes both chambers in different forms and goes to conference.` };
            return { next: { ...bill, stage: "conference", text, beats: [...(bill.beats ?? []), conferenceBeat], setbacks: 0 }, beat: conferenceBeat, disposition: 0.005, standing: 0 };
        }
        return { next: advanced(bill, stage, beats, projection, sittingDate(state)), beat, disposition: 0.005, standing: 0 };
    }
    if (settled === "stagnation" && setbacks >= BILL_SETBACK_LIMIT) {
        return {
            next: { ...bill, status: "dead", setbacks, beats, resolvedTurn: state.turn },
            beat,
            disposition: -0.005,
            // A measure that died in committee is a week of the President's agenda
            // that produced nothing, and the country reads it that way.
            standing: -0.01,
        };
    }
    const moved = settled === "progress"
        ? momentum + PROGRESS_STEP
        : settled === "controversy"
            ? momentum + (swing < 0.5 ? -CONTROVERSY_SWING : CONTROVERSY_SWING)
            : momentum - STAGNATION_DRAG;
    return {
        next: { ...bill, momentum: bounded(moved), setbacks, beats },
        beat,
        disposition: settled === "stagnation" ? -0.005 : 0,
        standing: settled === "controversy" && moved < momentum ? -0.01 : 0,
    };
}
/** A bill one stage further on, or on the desk with the count that put it there. */
function advanced(bill, stage, beats, projection, presentedOn) {
    const next = BILL_STAGES[BILL_STAGES.indexOf(stage) + 1];
    if (next === undefined || (stage === "floor" && (!amendableAct(bill.act) || textOnFloor(bill, "senate") === "base"))) {
        // Dropped rather than written as undefined: an explicit undefined does not
        // survive the JSON round trip a save is, and a bill on the desk is not at
        // a stage — it is past all of them.
        const { stage: _cleared, ...rest } = bill;
        return { ...rest, status: "on-the-desk", beats, passage: recordFloorVotes(projection.floor, beats.at(-1)?.turn ?? bill.introducedTurn), presentedOn,
            ...(amendableAct(bill.act) ? { text: { ...bill.text, enrolled: stage === "conference" ? bill.text?.conference ?? "base" : "base" } } : {}) };
    }
    return { ...bill, stage: next, beats };
}
