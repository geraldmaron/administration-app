import { STATE_IDS } from "@admin/world";
import { salientWeights, selectApproval } from "./opinion.js";
import { priceLevelScar } from "./opinion-causes.js";
import { selectNation } from "./state.js";
import { stateShareShifts } from "./states.js";
// Approval, state by state, as a reading of the one national figure rather than
// a second public. Each state sits where the electoral map already puts it
// relative to the country (`stateShareShifts`, the same alignment and home-state
// tilt the call reads), moved by how much harder the economy's change since the
// oath lands there, and the whole map is then slid by one offset so the
// population-weighted mean is the headline. Grievance marks are not read here:
// they already move lean, and lean is in the shift.
//
// Display only. Nothing decides an outcome on these figures, which is what lets
// them be derived each read instead of simulated.
/**
 * How a point of two-way share becomes a step in log-odds.
 *
 * The slope of the logit at one half. At a headline of 50% a state the map puts
 * three points above the country reads three points above it; toward either end
 * the logistic compresses the spread, so a state can never be read past 0% or
 * 100% and the mean still holds there.
 */
export const STATE_APPROVAL_LOGIT_SLOPE = 4;
/**
 * Approval lost per point of unemployment, before the weight the week gives
 * prosperity: the rate the prosperity judgment charges the country
 * (`opinion-causes.ts`'s unemployment term), so a state carries the same
 * price for a lost job the nation does.
 */
export const STATE_UNEMPLOYMENT_STRAIN = 2;
// The bracket and the step count of the offset search. Forty log-odds either
// side reaches past the smallest and largest probability a double can tell from
// 0 and 1, and a hundred halvings of eighty is below a double's own spacing, so
// the search ends converged rather than early.
const OFFSET_BOUND = 40;
const BISECTION_STEPS = 100;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const logistic = (value) => 1 / (1 + Math.exp(-value));
/**
 * The figure the states average to: the headline. The honeymoon is part of the
 * record every bloc reads now, the ballot's blocs included, so a state reading
 * carries it the way the country's does.
 */
export function stateApprovalTarget(campaign) {
    return clamp01(selectApproval(campaign));
}
function nationalChange(campaign) {
    const nation = selectNation(campaign, campaign.founding.nation);
    if (!nation)
        return undefined;
    const opening = nation.base.stats.economy.unemployment;
    return {
        jobless: opening > 0 ? (nation.stats.economy.unemployment - opening) / opening : 0,
        priceScar: priceLevelScar(campaign),
        prosperity: salientWeights(campaign).prosperity,
    };
}
/**
 * How much more of the economy's change since the oath a state carries, in
 * points of share.
 *
 * A state's anchors are its standing deviation from the national figure and
 * average to zero across the population, so this is zero while the economy
 * stands where it was authored and roughly centered whatever it does: it moves
 * states against each other, and the offset below holds the mean.
 * A state already above the country's unemployment loses proportionally more
 * when the country's rises, and a costlier state pays more in dollars for the
 * same rise in the price level.
 */
function economicShift(campaign, id, change) {
    const anchor = campaign.states[id]?.base.character.vitalAnchor;
    if (!change || !anchor)
        return 0;
    const jobs = anchor.unemployment * change.jobless * STATE_UNEMPLOYMENT_STRAIN;
    const prices = anchor.costOfLiving * change.priceScar;
    return -(jobs + prices) * change.prosperity;
}
function stateTerms(campaign) {
    const shifts = stateShareShifts(campaign);
    const change = nationalChange(campaign);
    return STATE_IDS.flatMap((id) => {
        const runtime = campaign.states[id];
        const shift = shifts[id];
        if (!runtime || shift === undefined)
            return [];
        const logit = STATE_APPROVAL_LOGIT_SLOPE * (shift + economicShift(campaign, id, change));
        return [{ id, weight: runtime.population, logit }];
    });
}
function weightedMean(terms, offset, mass) {
    return terms.reduce((sum, term) => sum + term.weight * logistic(offset + term.logit), 0) / mass;
}
/** The one offset that puts the population-weighted mean on `target`. The mean rises with the offset, so halving the bracket finds it. */
function solveOffset(terms, target, mass) {
    let low = -OFFSET_BOUND;
    let high = OFFSET_BOUND;
    for (let step = 0; step < BISECTION_STEPS; step += 1) {
        const middle = (low + high) / 2;
        if (weightedMean(terms, middle, mass) < target)
            low = middle;
        else
            high = middle;
    }
    return (low + high) / 2;
}
/**
 * Every state's approval this week, 0..1, keyed in `STATE_IDS` order.
 *
 * Solved before it is clamped, never the other way round: a constant shift
 * clipped at zero would leave the opposed states pinned at the floor and the
 * mean above the headline in exactly the weeks removal pressure is reading it.
 */
export function stateApprovals(campaign) {
    const terms = stateTerms(campaign);
    const mass = terms.reduce((sum, term) => sum + term.weight, 0);
    if (mass <= 0)
        return {};
    const target = stateApprovalTarget(campaign);
    // The two ends have no finite offset; every state is where the country is.
    const offset = target <= 0 || target >= 1 ? undefined : solveOffset(terms, target, mass);
    return Object.fromEntries(terms.map((term) => [term.id, offset === undefined ? target : clamp01(logistic(offset + term.logit))]));
}
/** One state's approval this week; undefined where the campaign carries no such state. */
export function stateApproval(campaign, id) {
    return stateApprovals(campaign)[id];
}
const round3 = (value) => Math.round(value * 1000) / 1000;
/** This week's map of approval, rounded for the save, as the weekly history keeps it. */
export function stateApprovalSample(campaign, turn) {
    const approvals = stateApprovals(campaign);
    const approval = Object.fromEntries(STATE_IDS.flatMap((id) => {
        const value = approvals[id];
        return value === undefined ? [] : [[id, round3(value)]];
    }));
    return { turn, approval };
}
