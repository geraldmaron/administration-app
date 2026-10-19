import type { Campaign, FedState, GameDate, PersonRuntime } from "./state.js";
/** Starting bound: public pressure moves the tilt by at most this much. */
export declare const FED_PRESSURE_TILT = 0.05;
/** Starting credibility premium: 25 basis points a year when the public leans. */
export declare const FED_CREDIBILITY_PREMIUM = 0.0025;
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
export declare const FED_RATE_ADJUSTMENT: number;
export type FedWeights = {
    readonly inflation: number;
    readonly unemployment: number;
};
export type FedPressure = -1 | 0 | 1;
export type FedLean = {
    readonly tilt: number;
    readonly premium: number;
};
export type FedRuleInput = {
    readonly expectedInflation: number;
    readonly inflation: number;
    readonly unemployment: number;
    readonly policyRate: number;
    readonly date: GameDate;
    readonly pressure?: FedPressure;
    readonly tilt?: number;
};
export declare function fedWeights(tilt: number): FedWeights;
/**
 * Public pressure on the rate. `pressure` is -1, 0 or 1. A positive lean
 * adds to the tilt, and the addition is capped at the starting bound.
 * Any lean, either way, carries the starting credibility premium.
 */
export declare function leanOnFed(tilt: number, pressure: FedPressure): FedLean;
export declare function isFomcDecision(date: GameDate): boolean;
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
export declare function fomcDecisionInWeekEnding(date: GameDate): GameDate | undefined;
/**
 * Through a week with no decision in it the current rate comes back unchanged,
 * so the weekly step holds still. Through a week that held one the rule is
 * floored at zero.
 */
export declare function fedRule(input: FedRuleInput): number;
/**
 * `fed-pressure` of 1 or -1 is that pressure. A boolean true is pressure 1.
 * Anything else, including a flags value that is not a record of booleans, is 0.
 */
export declare function fedPressure(flags: unknown): FedPressure;
/** What the Fed decided at a meeting: the rate it set and the weights it set it by. */
export type FedDecision = {
    readonly date: GameDate;
    /** Where the rule put the rate. */
    readonly target: number;
    /** Where the meeting left it: the rate closes part of the way to the rule at each decision. */
    readonly rate: number;
    readonly weights: FedWeights;
};
/**
 * Planning value: how far the seated chair's economic outlook tilts the weights.
 * A chair on the economic right reads as a hawk, on the left as a dove; at the
 * ends of the axis the tilt is the whole bound the rule allows.
 */
export declare const FED_CHAIR_TILT_SCALE = 0.1;
/** The person chairing the Board of Governors, confirmed or acting. */
export declare function fedChair(campaign: Campaign): PersonRuntime | undefined;
/** The chair's tilt on the weights: positive leans on prices, negative on jobs; zero with the chair empty. */
export declare function chairTilt(campaign: Campaign): number;
/**
 * The public pressure standing on the decision that falls on `decision`: the
 * President's lean counts at the first meeting on or after the day it was made,
 * and at no meeting after that one. A campaign that only carries the older
 * `fed-pressure` flag reads it as before.
 */
export declare function leanStanding(campaign: Campaign, decision: GameDate | undefined): FedPressure;
/** The rule's inputs for the United States this week, the one place both the drift and the record read them from. */
export declare function usFedInput(campaign: Campaign, policyRate: number, expectedInflation: number): FedRuleInput;
/**
 * The Federal Reserve's decision this week, if a meeting falls in it: the
 * same rule, on the same inputs, the macro drift will read the same day, so
 * the record and the rate cannot disagree.
 */
export declare function fedDecision(campaign: Campaign): FedDecision | undefined;
/**
 * The Fed's record after this week: its rate, its chair's tilt, the lean still
 * standing, and this week's meeting if one fell in it. A lean already answered
 * at an earlier meeting falls away.
 */
export declare function fedRecord(campaign: Campaign): FedState | undefined;
/** The next decision day on the calendar, on or after `from`. */
export declare function nextFomcDecision(from: GameDate): GameDate;
