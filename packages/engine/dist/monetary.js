// The United States' policy rate, on a planning calendar of Federal Reserve
// decisions. Every other country keeps the reduced-form rule in macro-state.
// The weights, the public-pressure bound and the credibility premium are
// starting values.
import { addDays, compareDates, weekdayOf } from "./clock.js";
import { weekOpenDate } from "./feed-cap.js";
import { openingMacroState, POLICY_RATE_ADJUSTMENT, US_NEUTRAL_REAL_RATE } from "./macro-state.js";
import { FED_MEETINGS_WINDOW } from "./state-world.js";
/** Starting inflation target. */
const FED_INFLATION_TARGET = 0.02;
/** Full employment benchmark, the same 0.05 floor the engine already uses. */
const FED_FULL_EMPLOYMENT = 0.05;
const FED_WEIGHT = 0.5;
/** A tilt outside this span is pulled back before it changes a weight. */
const FED_TILT_LIMIT = 0.1;
/** Starting bound: public pressure moves the tilt by at most this much. */
export const FED_PRESSURE_TILT = 0.05;
/** Starting credibility premium: 25 basis points a year when the public leans. */
export const FED_CREDIBILITY_PREMIUM = 0.0025;
/** The rate does not go below zero. */
const FED_RATE_FLOOR = 0;
/**
 * The United States' authored resting economy — the inflation anchor and the
 * unemployment rate the dataset opens on.
 *
 * Here because this is where the rule has to be neutral. `US_NEUTRAL_REAL_RATE`
 * was derived so the reduced-form rule reproduces the observed three-month bill
 * yield *at exactly these figures*, which means the intercept already carries
 * the country's opening stance. A rule that then adds its own two gaps on top of
 * it charges the same stance twice: the board reads a hundred basis points above
 * the rate it actually opens on, in every week of every term, and interest cost,
 * the books and the ten-year yield all carry it. That is the level half of the
 * same defect as the rule never being reached at all, and it only became visible
 * once the rule was reached.
 */
const US_RESTING_INFLATION = 0.029495;
const US_RESTING_UNEMPLOYMENT = 0.040167;
/** Sunday is 0, so Thursday is 4. Same numbering as `weekdayOf`. */
const THURSDAY = 4;
/**
 * Planning FOMC calendar. The 2026 day list was opened and is not in the
 * repo, so a decision is the Thursday of a week that contains the 15th,
 * in eight months: January, March, May, June, July, September, November
 * and December. Day 15 through 21 holds exactly one Thursday.
 */
const FOMC_MONTHS = [1, 3, 5, 6, 7, 9, 11, 12];
const FOMC_DAY_START = 15;
const FOMC_DAY_END = 21;
/** One decision in each planning month. */
const FOMC_DECISIONS_PER_YEAR = FOMC_MONTHS.length;
const WEEKS_PER_YEAR = 52;
/**
 * How much of the distance to the rule the United States' rate closes at a
 * decision.
 *
 * `POLICY_RATE_ADJUSTMENT` is a weekly speed, written for the reduced-form rule
 * every other country runs, which is read every week. This rate is read eight
 * times a year, so spending the weekly share once per decision stretched the
 * eleven-week half-life it was calibrated at into a year and a half, and easing
 * arrived long after the slump it was answering. Compounding the weekly share
 * over the weeks between decisions keeps that half-life while the rate still
 * only moves on a decision.
 */
export const FED_RATE_ADJUSTMENT = 1 - (1 - POLICY_RATE_ADJUSTMENT) ** (WEEKS_PER_YEAR / FOMC_DECISIONS_PER_YEAR);
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
/** A weight stays above zero so a tilt cannot drop a mandate out of the rule. */
function positiveWeight(weight) {
    return weight > 0 ? weight : Number.MIN_VALUE;
}
export function fedWeights(tilt) {
    const bounded = clamp(tilt, -FED_TILT_LIMIT, FED_TILT_LIMIT);
    return {
        inflation: positiveWeight(FED_WEIGHT + bounded),
        unemployment: positiveWeight(FED_WEIGHT - bounded),
    };
}
/**
 * Public pressure on the rate. `pressure` is -1, 0 or 1. A positive lean
 * adds to the tilt, and the addition is capped at the starting bound.
 * Any lean, either way, carries the starting credibility premium.
 */
export function leanOnFed(tilt, pressure) {
    const added = clamp(pressure * FED_PRESSURE_TILT, -FED_PRESSURE_TILT, FED_PRESSURE_TILT);
    return {
        tilt: tilt + added,
        premium: pressure === 0 ? 0 : FED_CREDIBILITY_PREMIUM,
    };
}
export function isFomcDecision(date) {
    if (!FOMC_MONTHS.includes(date.month))
        return false;
    if (date.day < FOMC_DAY_START || date.day > FOMC_DAY_END)
        return false;
    return weekdayOf(date) === THURSDAY;
}
/** The days one weekly step covers: the day it runs on and the six before it. */
const DECISION_WINDOW_DAYS = 7;
/**
 * The decision this week held, if it held one.
 *
 * The rule is read once a week, and the weekday a week is read on is set by the
 * weekday the oath fell on — a Saturday for the term the game opens in, and a
 * Wednesday for the day the macro group runs on inside that week. Neither is a
 * Thursday, and neither ever will be, so a rule that asked whether *today* is a
 * decision day never once ran its own body in a campaign: the rate came back
 * unchanged every week of every term. Asking whether the seven days this step
 * covers held a decision is the same eight decisions a year, reached on whatever
 * weekday the week happens to be read on. Consecutive steps are exactly seven
 * days apart, so the windows tile the calendar and no decision is counted twice.
 */
export function fomcDecisionInWeekEnding(date) {
    for (let back = 0; back < DECISION_WINDOW_DAYS; back += 1) {
        const day = addDays(date, -back);
        if (isFomcDecision(day))
            return day;
    }
    return undefined;
}
/**
 * The real rate this rule settles at with nothing to answer: the reduced form's
 * neutral rate less what this rule's own two gaps read at the country's resting
 * economy. The opening decision is then the opening rate, and every move away
 * from it is a move the rule made rather than a step it took on its first day.
 */
const FED_NEUTRAL_REAL_RATE = US_NEUTRAL_REAL_RATE -
    FED_WEIGHT * (US_RESTING_INFLATION - FED_INFLATION_TARGET) -
    FED_WEIGHT * (FED_FULL_EMPLOYMENT - US_RESTING_UNEMPLOYMENT);
function decisionRate(input) {
    const lean = leanOnFed(input.tilt ?? 0, input.pressure ?? 0);
    const weights = fedWeights(lean.tilt);
    // Both halves of the mandate lean the way the rate has to move, so both are
    // written as the gap that calls for a *higher* rate: prices above the target,
    // and a labor market tighter than full employment. Written the other way up,
    // as unemployment over the benchmark, the employment half pointed backwards —
    // a slump raised the rate and a boom cut it — and the reduced-form rule every
    // other country runs on (`policyRule`) leans on the output gap, which has the
    // opposite sign to unemployment.
    const employmentGap = FED_FULL_EMPLOYMENT - input.unemployment;
    return (FED_NEUTRAL_REAL_RATE +
        input.expectedInflation +
        weights.inflation * (input.inflation - FED_INFLATION_TARGET) +
        weights.unemployment * employmentGap +
        lean.premium);
}
/**
 * Through a week with no decision in it the current rate comes back unchanged,
 * so the weekly step holds still. Through a week that held one the rule is
 * floored at zero.
 */
export function fedRule(input) {
    if (!fomcDecisionInWeekEnding(input.date))
        return input.policyRate;
    return Math.max(FED_RATE_FLOOR, decisionRate(input));
}
function isFlagRecord(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return false;
    return Object.values(value).every((entry) => typeof entry === "boolean" || entry === 1 || entry === -1);
}
/**
 * `fed-pressure` of 1 or -1 is that pressure. A boolean true is pressure 1.
 * Anything else, including a flags value that is not a record of booleans, is 0.
 */
export function fedPressure(flags) {
    if (!isFlagRecord(flags))
        return 0;
    const value = flags["fed-pressure"];
    if (value === 1 || value === -1)
        return value;
    if (value === true)
        return 1;
    return 0;
}
/**
 * Planning value: how far the seated chair's economic outlook tilts the weights.
 * A chair on the economic right reads as a hawk, on the left as a dove; at the
 * ends of the axis the tilt is the whole bound the rule allows.
 */
export const FED_CHAIR_TILT_SCALE = FED_TILT_LIMIT;
const FED_INSTITUTION = "INST-FED";
/** The person chairing the Board of Governors, confirmed or acting. */
export function fedChair(campaign) {
    const runtime = campaign.institutions[FED_INSTITUTION];
    const id = runtime?.leader ?? runtime?.actingLeader;
    return id ? campaign.people[id] : undefined;
}
/** The chair's tilt on the weights: positive leans on prices, negative on jobs; zero with the chair empty. */
export function chairTilt(campaign) {
    const chair = fedChair(campaign);
    const outlook = chair?.base.ideology.economicLeftRight ?? 0;
    return clamp(outlook * FED_CHAIR_TILT_SCALE, -FED_TILT_LIMIT, FED_TILT_LIMIT);
}
const signOf = (value) => (value > 0 ? 1 : value < 0 ? -1 : 0);
/**
 * The public pressure standing on the decision that falls on `decision`: the
 * President's lean counts at the first meeting on or after the day it was made,
 * and at no meeting after that one. A campaign that only carries the older
 * `fed-pressure` flag reads it as before.
 */
export function leanStanding(campaign, decision) {
    const pressure = campaign.markets?.fed?.pressure;
    if (!pressure)
        return fedPressure(campaign.player.flags);
    if (!decision || compareDates(pressure.since, decision) > 0)
        return 0;
    const met = (campaign.markets?.fed?.meetings ?? []).some((meeting) => compareDates(meeting.date, pressure.since) >= 0 && compareDates(meeting.date, decision) < 0);
    return met ? 0 : signOf(pressure.bound);
}
/** The rule's inputs for the United States this week, the one place both the drift and the record read them from. */
export function usFedInput(campaign, policyRate, expectedInflation) {
    const runtime = campaign.nations[campaign.founding.nation];
    const economy = runtime?.stats.economy;
    const date = weekOpenDate(campaign);
    return {
        expectedInflation,
        inflation: economy?.inflation ?? expectedInflation,
        unemployment: economy?.unemployment ?? FED_FULL_EMPLOYMENT,
        policyRate,
        date,
        pressure: leanStanding(campaign, fomcDecisionInWeekEnding(date)),
        tilt: chairTilt(campaign),
    };
}
/**
 * The Federal Reserve's decision this week, if a meeting falls in it: the
 * same rule, on the same inputs, the macro drift will read the same day, so
 * the record and the rate cannot disagree.
 */
export function fedDecision(campaign) {
    const us = campaign.founding.nation;
    const runtime = campaign.nations[us];
    if (!runtime)
        return undefined;
    const state = campaign.macro?.[us] ?? openingMacroState(runtime, us);
    const input = usFedInput(campaign, state.policyRate, state.expectedInflation);
    const date = fomcDecisionInWeekEnding(input.date);
    if (!date)
        return undefined;
    const target = fedRule(input);
    const rate = state.policyRate + (Math.max(FED_RATE_FLOOR, target) - state.policyRate) * FED_RATE_ADJUSTMENT;
    const lean = leanOnFed(input.tilt ?? 0, input.pressure ?? 0);
    return { date, target: round6(target), rate: round6(rate), weights: fedWeights(lean.tilt) };
}
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000 + 0;
/**
 * A decision filed on the record, once per meeting date. The opening week
 * records the seeded decision and then runs the same week's own; the later
 * one is the rate that stood, so it replaces the first rather than filing a
 * second meeting on one day.
 */
function fileMeeting(earlier, meeting) {
    const last = earlier[earlier.length - 1];
    const kept = last && compareDates(last.date, meeting.date) === 0 ? earlier.slice(0, -1) : earlier;
    return [...kept, meeting].slice(-FED_MEETINGS_WINDOW);
}
/**
 * The Fed's record after this week: its rate, its chair's tilt, the lean still
 * standing, and this week's meeting if one fell in it. A lean already answered
 * at an earlier meeting falls away.
 */
export function fedRecord(campaign) {
    const us = campaign.founding.nation;
    const runtime = campaign.nations[us];
    if (!runtime)
        return undefined;
    const kept = campaign.markets?.fed;
    const state = campaign.macro?.[us] ?? openingMacroState(runtime, us);
    const decision = fedDecision(campaign);
    const earlier = kept?.meetings ?? [];
    const answered = kept?.pressure && earlier.some((meeting) => compareDates(meeting.date, kept.pressure.since) >= 0);
    const meetings = decision ? fileMeeting(earlier, { date: decision.date, target: decision.target, rate: decision.rate }) : earlier;
    return {
        rate: decision?.rate ?? state.policyRate,
        chairTilt: round6(chairTilt(campaign)),
        ...(kept?.pressure && !answered ? { pressure: kept.pressure } : {}),
        ...(meetings.length > 0 ? { meetings } : {}),
    };
}
/** The next decision day on the calendar, on or after `from`. */
export function nextFomcDecision(from) {
    let day = from;
    for (let step = 0; step < 400; step += 1) {
        if (isFomcDecision(day))
            return day;
        day = addDays(day, 1);
    }
    return day;
}
