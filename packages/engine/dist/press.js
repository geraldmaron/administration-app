import { selectNation, selectPerson } from "./state.js";
import { FORMAT_PARTISANSHIP, LEAN_WEIGHT, PRESS_OUTLETS, clamp01, round3, outletDisposition, outletSpreadAt, outletStance, } from "./press-outlets.js";
import { placementOf } from "./press-placement.js";
import { isPublicAct, presidentsWeekItems } from "./press-week.js";
import { confidenceFromEvidence, likelihoodFromUnitInterval } from "./assessments.js";
import { PRESS_BELIEF_WEIGHT, outletActReading, outletReading, presidentialActs, recentActPull, } from "./press-beliefs.js";
import { selectLiveScandals } from "./press-scandal.js";
import { FRAMING_WEIGHT, framingCaughtItems, outletFramingReading } from "./press-framing.js";
export { FORMAT_PARTISANSHIP, NATIONAL_OUTLETS, PRESS_OUTLETS, outletDisposition, outletSpreadAt, outletStance, } from "./press-outlets.js";
import { fileAtDesks } from "./press-filing.js";
export { WEEK_SHARE_CAP, fileAtDesk, fileAtDesks, localeRegion, pickOutletForFeedItem, pressOutletById, secondOutletFor } from "./press-filing.js";
export { placementOf, placementFor, PLATFORM_PLACEMENT_WEIGHT } from "./press-placement.js";
export { outletAudience } from "./outlet-audience.js";
// The people who explain the administration to the country.
//
// Coverage was prose and nothing else. Articles were composed from feed items,
// the mastheads were four names picked by a hash, and no matter what a
// government did — went to war without a vote, had two orders thrown out, spent
// forty weeks without taking a question — the papers wrote about it in exactly
// the same register forever. So the lever a president spends more of the week on
// than any instrument on the board was not a lever: it was scenery with a serif
// face on.
//
// Three things make it one here. The corps has a standing that moves, and it
// moves off the administration's actual record rather than off a mood. The
// outlets sit on a spectrum around that standing, so "the press" is never one
// voice and a government hated by half of it is still explained by the other
// half. And there are three ways to spend on it, each with a real price:
// answering questions is cheap and small, standing at a podium is neither, and
// putting a story out through somebody who was never there is the one that can
// come back with the administration's name on it.
//
// Standing reaches approval two ways, and both of them go through what the
// country believes rather than through the headline figure. It is read by the
// three coalitions, which decompose the public's judgment without writing it
// back; and it is a capped term in the `integrity` and `competence` targets in
// opinion.ts, so a term of hostile coverage is eventually worth a few points of
// approval. Coverage still writes no metric of its own — a direct path from a
// masthead to the number every ending is decided by would be a second opinion
// of the same country, which is precisely the defect the coalitions exist to
// have fixed.
// --- The outlets ------------------------------------------------------------
function meanDisposition(dispositions) {
    const values = PRESS_OUTLETS.map((outlet) => dispositions[outlet.id]).filter((value) => value !== undefined);
    if (values.length === 0)
        return 0.5;
    return round3(values.reduce((total, value) => total + value, 0) / values.length);
}
/**
 * A corps whose standing is the aggregate of what its mastheads think.
 *
 * The one writer of `standing`, and the reason there can be four numbers and a
 * fifth without the fifth being a second opinion of the first four. Everything
 * that moves the press moves an outlet and comes back through here, so the
 * figure the coalitions read is never one somebody set by hand beside four that
 * say otherwise.
 */
export function corpsFrom(corps, dispositions) {
    return { ...corps, dispositions, standing: meanDisposition(dispositions) };
}
/** The spectrum, hostile end first, for a room that has to show it as one. */
export function selectOutlets(campaign) {
    return [...PRESS_OUTLETS]
        .sort((a, b) => a.lean - b.lean)
        .map((outlet) => {
        const disposition = outletDisposition(campaign.press, outlet);
        return {
            outlet,
            disposition,
            stance: outletStance(disposition),
            target: outletTarget(campaign, outlet),
            read: outletActRead(campaign, outlet),
        };
    });
}
// --- What the corps is reading ---------------------------------------------
/**
 * How far one desk's politics carry it toward or away from this President,
 * before anything the administration has done.
 *
 * Signed agreement rather than raw distance: for a fixed President, the squared
 * distance between a desk and the President differs from the dot product only
 * by a term in the desk's own extremity and a constant, and it is the dot
 * product that sums to zero across a balanced roster — so the corps's standing
 * stays the institutional figure however the President is placed. The format
 * multiplier is what makes a partisan channel partisan.
 */
function partisanReading(outlet, placement) {
    return outletReading(outlet.beliefs, placement) * FORMAT_PARTISANSHIP[outlet.format];
}
/**
 * The corps a presidency opens with: each desk's institutional term, plus how
 * far its politics carry it toward or away from the President it is meeting.
 *
 * With no placement, every desk sits on the institutional lean alone, which is
 * the neutral corps a fixture wants; the founding always passes the President's
 * placement (`placementFor`). The partisan reading sums to zero across the
 * roster, and the partisan desks come in mirrored pairs whose clamp is
 * symmetric, so the corps's standing stays the institutional figure and opening
 * approval does not move.
 */
export function openingPressCorps(turn, placement) {
    const institutional = outletSpreadAt(0.5);
    const dispositions = placement
        ? Object.fromEntries(PRESS_OUTLETS.map((outlet) => [
            outlet.id,
            round3(clamp01((institutional[outlet.id] ?? 0.5) + partisanReading(outlet, placement))),
        ]))
        : institutional;
    return corpsFrom({ standing: 0.5, dispositions: {}, lastSpokeTurn: turn, engagements: [] }, dispositions);
}
/**
 * How long an administration can go without saying anything before the silence
 * is itself the story. Six weeks: long enough that a quiet month is quiet, short
 * enough that a government which has stopped explaining itself is covered as
 * one.
 */
export const SILENCE_TOLERANCE_TURNS = 6;
/**
 * One press reading, for content to gate on. Undefined only for an outlet id
 * that is not on the roster, which a condition can never honestly satisfy.
 */
export function pressReading(campaign, measure, outletId) {
    const corps = campaign.press;
    if (measure === "standing")
        return corps.standing;
    if (measure === "silenceWeeks")
        return Math.max(0, campaign.turn - corps.lastSpokeTurn);
    if (measure === "hostileShare") {
        const hostile = PRESS_OUTLETS.filter((outlet) => outletStance(outletDisposition(corps, outlet)) === "hostile");
        return round3(hostile.length / PRESS_OUTLETS.length);
    }
    const outlet = outletId ? PRESS_OUTLETS.find((entry) => entry.id === outletId) : undefined;
    return outlet ? outletDisposition(corps, outlet) : undefined;
}
const DRIVER_CAP = 0.3;
const capped = (value) => Math.max(-DRIVER_CAP, Math.min(DRIVER_CAP, value));
/**
 * Where the corps would stand if it had finished reading everything the
 * administration has done.
 *
 * Derived, never accumulated, for the reason removal pressure is: a press corps
 * warm to a government that has since had three orders struck down is not a
 * press corps with a memory, it is a stale number. What accumulates is only the
 * record itself, which is already stored.
 */
export function pressDrivers(campaign) {
    const runtime = selectNation(campaign, campaign.founding.nation);
    const pressFreedom = runtime?.stats.politics.pressFreedom ?? 0.5;
    const struck = campaign.orders.filter((record) => record.review?.status === "struck-down").length;
    const contested = campaign.orders.filter((record) => record.contested).length;
    const silence = Math.max(0, campaign.turn - campaign.press.lastSpokeTurn - SILENCE_TOLERANCE_TURNS);
    return [
        { reason: "how freely the press is able to work", delta: capped((pressFreedom - 0.5) * 0.6) },
        { reason: "how the country stands with the administration", delta: capped((campaign.player.metrics.approval - 0.5) * 0.4) },
        { reason: "force used without a vote", delta: capped(-campaign.congress.unauthorized.length * 0.06) },
        { reason: "orders the courts threw out", delta: capped(-struck * 0.07) },
        { reason: "orders that had to be defended in court", delta: capped(-contested * 0.03) },
        { reason: "how long it has been since anyone answered a question", delta: capped(-silence * 0.02) },
    ].map((driver) => ({ ...driver, delta: round3(driver.delta) }));
}
export function pressStandingTarget(campaign) {
    return round3(clamp01(0.5 + pressDrivers(campaign).reduce((total, driver) => total + driver.delta, 0)));
}
/**
 * Where the record would put one masthead if it had finished reading it.
 *
 * The drivers are shared, because a struck-down order is a struck-down order at
 * every desk; the lean is what the paper was before this president. That is
 * what makes one week's record a different destination on the adversarial daily
 * and on the sympathetic weekly, and it is why the two can be pulling opposite
 * ways in the same week.
 */
export function outletTarget(campaign, outlet) {
    const total = outletDrivers(campaign, outlet).reduce((sum, driver) => sum + driver.delta, 0);
    return round3(clamp01(0.5 + total));
}
/**
 * Why one masthead is heading where it is, term by term: the record every desk
 * reads alike, what the paper is toward any President, who this President is
 * to it, what it makes of what the administration has signed, and how the
 * administration explained itself. Their sum around the middle is the desk's
 * target, so the profile and the drift can never disagree.
 */
export function outletDrivers(campaign, outlet) {
    const acts = outletReading(outlet.beliefs, recentActPull(campaign).pull) * PRESS_BELIEF_WEIGHT;
    // How the administration explained itself, worth less than what it did and
    // read in the same space. The one term a framing writes anywhere: it moves
    // where a desk is heading and touches no metric, cost or outcome.
    const framing = outletFramingReading(campaign, outlet.beliefs) * FRAMING_WEIGHT;
    return [
        { key: "record", reason: "the record every desk reads the same way", delta: pressStandingTarget(campaign) - 0.5 },
        { key: "institution", reason: "what it is toward any administration", delta: outlet.lean * LEAN_WEIGHT },
        { key: "partisan", reason: "who the President is to its audience", delta: partisanReading(outlet, placementOf(campaign)) },
        { key: "acts", reason: "what it makes of what you have signed", delta: acts },
        { key: "framing", reason: "how you explained it", delta: framing },
    ];
}
export function outletActRead(campaign, outlet) {
    const { pull, act } = recentActPull(campaign);
    const reading = outletActReading(outlet.beliefs, pull);
    return act && reading !== 0 ? { reading, act } : { reading };
}
export const PRESS_PLAYS = {
    interview: {
        kind: "interview",
        name: "Sit for an interview",
        summary: "One reporter, one hour, and a transcript the whole building will read twice.",
        good: 0.05,
        bad: -0.02,
        cost: {},
        backfire: { standing: -0.007 },
        onTheRecord: true,
        targeting: "outlet",
        // The transcript is read by the whole building either way, but the hour
        // itself was one masthead's: the good line is theirs to run, and the line
        // the follow-up produced is everybody's.
        spillover: { good: 0.2, bad: 0.4 },
    },
    "press-conference": {
        kind: "press-conference",
        name: "Hold a press conference",
        summary: "The full corps in the room, on camera, for as long as they have questions.",
        good: 0.12,
        bad: -0.1,
        cost: { standing: 0.01 },
        backfire: { standing: -0.02, stability: -0.007 },
        // An hour of being unable to answer the room is read as a government that
        // has dropped something, not as a dishonest one.
        moodBackfire: { competence: -0.012 },
        onTheRecord: true,
        targeting: "corps",
    },
    leak: {
        kind: "leak",
        name: "Put the story out through someone else",
        summary: "A senior official familiar with the matter, speaking on condition of anonymity.",
        good: 0.08,
        bad: -0.14,
        cost: {},
        // Attribution is the whole risk: the story runs either way, and what changes
        // is whether the country reads it as reporting or as the government
        // briefing against its own institutions.
        backfire: { standing: -0.027, stability: -0.01 },
        // The heaviest of the three, and the only one that lands on honesty: being
        // caught briefing anonymously against your own government is a question
        // about what else is being said off the record.
        moodBackfire: { integrity: -0.02, competence: -0.008 },
        onTheRecord: false,
        targeting: "outlet",
        // The scoop is worth almost nothing to the papers that did not get it, and
        // the traced sourcing is worth the whole of it to every paper alive.
        spillover: { good: 0.15, bad: 1 },
    },
};
/**
 * How far each masthead moves on a play, aimed or not.
 *
 * The desk the play was with takes it in full; the rest take the play's own
 * share of it. A corps play has no desk and no share — everybody was in the
 * room.
 */
export function playMovement(play, wentWell, outletId) {
    const full = wentWell ? play.good : play.bad;
    const share = wentWell ? (play.spillover?.good ?? 1) : (play.spillover?.bad ?? 1);
    return Object.fromEntries(PRESS_OUTLETS.map((outlet) => [
        outlet.id,
        play.targeting === "corps" || outlet.id === outletId ? full : full * share,
    ]));
}
export function movedCorps(corps, movement) {
    return corpsFrom(corps, Object.fromEntries(PRESS_OUTLETS.map((outlet) => [
        outlet.id,
        round3(clamp01(outletDisposition(corps, outlet) + (movement[outlet.id] ?? 0))),
    ])));
}
export function podiumSubject(campaign) {
    const story = [...selectLiveScandals(campaign)].sort((a, b) => b.intensity - a.intensity)[0];
    if (story)
        return { kind: "story", text: story.subject };
    // Booking the engagement is itself on the ledger, and is not what anyone asks about.
    const asked = new Set(campaign.ledger.filter(isPublicAct).map((entry) => entry.description));
    const act = presidentialActs(campaign)
        .filter((entry) => entry.kind === "order" || asked.has(entry.name))
        .at(-1);
    if (act)
        return { kind: "act", text: act.name, act: act.kind };
    return { kind: "record", text: "the administration's record so far" };
}
/** The White House post that speaks for the President from the briefing room. */
export const PRESS_SECRETARY_ROLE = "role-press-secretary";
/** The flag a press secretary leaves once they have spent their credibility taking a bad cycle for the President. */
export function secretarySpentFlag(person) {
    return `press-secretary-spent:${person}`;
}
function roomSkill(person) {
    return person ? clamp01(person.base.charisma * 0.6 + person.base.competence * 0.4) : undefined;
}
/** The seated press secretary, if the post is filled and the holder alive. */
export function pressSecretary(campaign) {
    const id = campaign.founding.staff?.[PRESS_SECRETARY_ROLE];
    const runtime = id ? selectPerson(campaign, id) : undefined;
    return runtime?.alive ? { id: runtime.base.id, name: runtime.base.name } : undefined;
}
/**
 * How much of each play the press secretary delivers. An interview is the
 * President alone in a room. A press conference is the President at the podium
 * in a room the press shop has spent the week briefing, so a third of how it
 * goes is theirs. A story put out through someone else is placed by the press
 * shop from start to finish.
 */
const SECRETARY_SHARE = {
    interview: 0,
    "press-conference": 0.35,
    leak: 1,
};
/**
 * How well the people at the podium handle a room, for this play.
 *
 * Read off the same charisma and competence every other reading of a person
 * uses. The President is the one member of the cabinet the player authored, so
 * this is the one place the biography they wrote at the founding is worth
 * something concrete. The press secretary is read only for a play they deliver,
 * never week by week: a good secretary makes the briefings land, and does not
 * move the corps while nobody is speaking. One who has already taken a bad cycle
 * for the President has spent the room's trust, and briefs at half.
 */
export function podiumSkill(campaign, kind) {
    const seated = campaign.player.cabinet[campaign.founding.leadRole];
    const president = roomSkill(seated ? selectPerson(campaign, seated) : undefined) ?? 0.5;
    const secretary = pressSecretary(campaign);
    const secretarySkill = secretary ? roomSkill(selectPerson(campaign, secretary.id)) : undefined;
    if (secretarySkill === undefined)
        return president;
    const spent = campaign.player.flags[secretarySpentFlag(secretary.id)] === true;
    const briefing = spent ? secretarySkill * 0.5 : secretarySkill;
    const share = SECRETARY_SHARE[kind];
    return clamp01(president * (1 - share) + briefing * share);
}
/**
 * What the player reads before deciding to say anything. Pure and
 * seed-independent, the same contract `projectOrder` holds: `issuePressAction`
 * calls this and nothing else for the odds, so the number shown is the number
 * rolled against.
 */
export function projectPressAction(campaign, kind, outletId) {
    const play = PRESS_PLAYS[kind];
    const skill = podiumSkill(campaign, kind);
    // A hostile room is harder than a friendly one, and a record with counts on it
    // is harder than a clean one — the corps has the same file the electorate
    // does, and unlike the electorate they are in the room asking about it.
    const record = pressStandingTarget(campaign);
    const exposure = kind === "leak" ? 0.35 : kind === "press-conference" ? 0.25 : 0.1;
    const chance = clamp01(0.35 + skill * 0.4 + (record - 0.5) * 0.5 - exposure);
    const outcome = (wentWell) => movedCorps(campaign.press, playMovement(play, wentWell, outletId));
    const good = outcome(true);
    const bad = outcome(false);
    const named = play.targeting === "outlet" && outletId !== undefined ? outletId : undefined;
    const evidence = clamp01(0.4 + skill * 0.25 + Math.max(0, record - 0.35) * 0.3);
    const confidence = confidenceFromEvidence(evidence);
    return {
        play,
        successChance: round3(chance),
        standingIfGood: good.standing,
        standingIfBad: bad.standing,
        ...(named === undefined
            ? {}
            : { outletIfGood: good.dispositions[named], outletIfBad: bad.dispositions[named] }),
        reasoning: record < 0.45
            ? "The room has a list of things this administration has not answered for, and it will be read out."
            : "The room is not friendly, but nothing on the file gives it a place to start.",
        forecast: {
            likelihood: likelihoodFromUnitInterval(chance),
            confidence,
            confidenceBasis: confidence === "high"
                ? "Recent coverage and the president's own record give the briefing room a clear read."
                : confidence === "moderate"
                    ? "The read rests on how the corps has treated this administration so far."
                    : "Little stable evidence about how this room will take the next hour.",
            supporting: kind === "leak"
                ? "An unnamed source can move a story without putting the podium in the room."
                : "How the room has been treating this administration is the strongest available factor.",
            uncertainty: "A single follow-up can rewrite the hour, and that cannot be priced from standing alone.",
            source: "White House Communications",
        },
        subject: podiumSubject(campaign),
    };
}
// --- The week ---------------------------------------------------------------
/** How far the corps can move on its own in one week. */
const PRESS_DRIFT = 0.03;
/** The flag that stands while the corps has turned, so it is reported once. */
export const PRESS_HOSTILE_FLAG = "press:hostile";
/**
 * The one thing moving the corps hardest in the direction it is moving.
 *
 * A line that says the coverage turned and does not say what turned it is a
 * mood, not news. Every driver already carries its own reason in plain words,
 * so the report is a read of the record rather than a second opinion of it.
 */
function leadingReason(campaign, hardening) {
    const drivers = pressDrivers(campaign).filter((driver) => (hardening ? driver.delta < 0 : driver.delta > 0));
    if (drivers.length === 0)
        return undefined;
    // Ties break on the reason itself so the same week always names the same one.
    return [...drivers].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.reason.localeCompare(b.reason))[0].reason;
}
function coverageItem(campaign, turn, hostile) {
    const reason = leadingReason(campaign, hostile);
    const headline = hostile
        ? "The White House press corps has stopped giving this administration the benefit of the doubt."
        : "The White House press corps has started giving this administration the benefit of the doubt again.";
    return {
        turn,
        kind: "press",
        visibility: "public",
        headline: reason ? `${headline} What turned it is ${reason}.` : headline,
        target: campaign.founding.nation,
        ...(reason ? { facts: { stake: `what turned the coverage is ${reason}` } } : {}),
    };
}
/**
 * Each masthead's own week: every desk settles toward what the record supports
 * on its own reading of it.
 *
 * Drifted rather than snapped, for the reason congressional disposition is: a
 * newsroom's opinion of a government is slow, and a disposition that tracked
 * the record exactly would be the record under another name. Drifted desk by
 * desk rather than as one figure because two papers can be moving opposite ways
 * in the same week — a record that pulls the sympathetic weekly up past its
 * ceiling is the same record leaving the adversarial daily where it was.
 */
function driftedSpread(state) {
    return Object.fromEntries(PRESS_OUTLETS.map((outlet) => {
        const current = outletDisposition(state.press, outlet);
        const target = outletTarget(state, outlet);
        const next = Math.abs(target - current) < PRESS_DRIFT ? target : current + Math.sign(target - current) * PRESS_DRIFT;
        return [outlet.id, round3(next)];
    }));
}
export const pressPhase = (state) => {
    const turn = state.turn + 1;
    const spread = driftedSpread(state);
    const corps = corpsFrom(state.press, spread);
    const wasHostile = state.player.flags[PRESS_HOSTILE_FLAG] === true;
    const isHostile = outletStance(corps.standing) === "hostile";
    const effects = [{ kind: "press", set: corps }];
    const stories = [
        // The week the desks finish reading an order the podium described as
        // something else. Reported once, on the week the record catches up.
        ...framingCaughtItems(state, turn),
        // What the President did this week, as the desks that covered it wrote it.
        ...presidentsWeekItems(state, turn),
    ];
    if (wasHostile !== isHostile) {
        effects.push({ kind: "flag", ...(isHostile ? { set: [PRESS_HOSTILE_FLAG] } : { clear: [PRESS_HOSTILE_FLAG] }) });
        stories.push(coverageItem(state, turn, isHostile));
    }
    if (stories.length > 0)
        effects.push({ kind: "feed", items: fileAtDesks({ ...state, press: corps }, stories) });
    // A week where every desk was already where the record puts it and nothing
    // crossed is not a week worth a line in the ledger.
    const settled = PRESS_OUTLETS.every((outlet) => spread[outlet.id] === outletDisposition(state.press, outlet));
    if (settled && effects.length === 1)
        return [];
    return [
        {
            source: "simulate",
            actor: "world",
            turn,
            narration: { summary: weekSummary(state, corps.standing, pressStandingTarget(state)) },
            effects,
        },
    ];
};
function weekSummary(campaign, standing, target) {
    if (target < standing) {
        const reason = leadingReason(campaign, true);
        return reason
            ? `The papers turned a little harder on the administration this week, mostly over ${reason}.`
            : "The papers turned a little harder on the administration this week.";
    }
    if (target > standing) {
        const reason = leadingReason(campaign, false);
        return reason
            ? `The papers eased off the administration a little this week, helped by ${reason}.`
            : "The papers eased off the administration a little this week.";
    }
    return "The papers wrote about the administration this week much as they wrote about it last week.";
}
