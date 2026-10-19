import { COHORT_AXES, COHORT_AXIS, COHORT_IDS, STATE_IDS, cohortsOfAxis } from "@admin/world";
import { STRAIN_SCALE, cohortSupport } from "./demos.js";
import { STATE_APPROVAL_LOGIT_SLOPE, stateApprovals } from "./regional-opinion.js";
import { STATE_COHORT_SENSITIVITY } from "./state-cohort-sensitivity.js";
import { stateShareShifts } from "./states.js";
// Support for the administration by state and group: a reading of two figures
// the engine already holds, never a third public. Each state's approval
// (`stateApprovals`) and each group's national support (`cohortSupport`) are
// the margins; this fills the table between them in the way multilevel
// regression with poststratification does, one cohort axis at a time because
// each axis is its own partition of a state's people:
//
//   logit p(g, s) = a_g + b_s + beta_g * z_s + tilt(g, s)
//
// z_s is the state's partisan context, beta_g how much more or less than the
// average voter group g's politics follow that context (sourced, and jittered
// once at founding), and tilt the part of the group's own memory that landed
// on this state. a_g and b_s are then raked in logit space until the state
// margins and the national margins both hold.
//
// Derived, never stored, and read by screens only. Nothing decides an outcome
// on it, which is what lets it be recomputed every read.
/** Raking stops at this many sweeps whether or not it has converged; the residual says how close it got. */
export const RAKE_MAX_SWEEPS = 200;
/** Raking stops once no margin is off by more than this, in share. */
export const RAKE_TOLERANCE = 1e-7;
/**
 * The jitter on each campaign's sensitivities, as a fraction of the estimate's
 * own bootstrap standard error: campaigns differ, and none differs by more than
 * the data could tell apart.
 */
export const SENSITIVITY_JITTER_SHARE = 0.5;
const NEWTON_STEPS = 30;
const SHARE_FLOOR = 1e-4;
const clampShare = (value) => Math.min(1 - SHARE_FLOOR, Math.max(SHARE_FLOOR, value));
const logistic = (value) => 1 / (1 + Math.exp(-value));
const logit = (value) => Math.log(clampShare(value) / (1 - clampShare(value)));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
function gaussian(stream) {
    const u = Math.max(stream.next(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * stream.next());
}
/** This campaign's sensitivities, drawn once at founding on their own stream and stored. */
export function openingCohortSensitivity(streams) {
    const stream = streams.stream("founding", "electorate", "state-cohort-sensitivity");
    return Object.fromEntries(COHORT_IDS.map((cohort) => {
        const { beta, se } = STATE_COHORT_SENSITIVITY[cohort];
        return [cohort, round3(beta + gaussian(stream) * se * SENSITIVITY_JITTER_SHARE)];
    }));
}
/** The stored draw, or the sourced point estimates on a save founded before the draw existed. */
export function cohortSensitivity(campaign) {
    const stored = campaign.cohortSensitivity;
    return Object.fromEntries(COHORT_IDS.map((cohort) => [cohort, stored?.[cohort] ?? STATE_COHORT_SENSITIVITY[cohort].beta]));
}
/**
 * How much of a remembered act landed on one state's members of the group,
 * against the group's average: 1 where the act carried no geography, 0 in a
 * state it did not reach. The people-weighted mean across states is one, so
 * redistributing a strain this way leaves the group's national figure alone.
 */
export function strainIntensity(strain, state) {
    if (!strain.where)
        return 1;
    return strain.where[state] ?? 0;
}
/** The logit step a group's own memory adds in one state beyond what it adds everywhere. */
export function strainTilt(strains, state) {
    const extra = strains.reduce((sum, strain) => sum + strain.valence * strain.weight * (strainIntensity(strain, state) - 1), 0);
    return STATE_APPROVAL_LOGIT_SLOPE * STRAIN_SCALE * extra;
}
function contextRows(campaign) {
    const approvals = stateApprovals(campaign);
    const shifts = stateShareShifts(campaign);
    return STATE_IDS.flatMap((state) => {
        const runtime = campaign.states[state];
        const approval = approvals[state];
        if (!runtime || approval === undefined || !runtime.base.character.cohorts)
            return [];
        return [{ state, people: runtime.population, approval, context: logit(0.5 + (shifts[state] ?? 0)) }];
    });
}
function axisProblem(campaign, axis, rows, beta) {
    const groups = cohortsOfAxis(axis);
    const mix = rows.map((row) => {
        const shares = campaign.states[row.state].base.character.cohorts[axis];
        return groups.map((group) => shares[group] ?? 0);
    });
    const prior = rows.map((row) => groups.map((group) => beta[group] * row.context + strainTilt(campaign.cohorts[group] ?? [], row.state)));
    return { axis, groups, rows, mix, prior, national: groups.map((group) => cohortSupport(campaign, group)) };
}
/** The value of x where a rising f(x) meets target, by Newton steps on a monotone logistic sum, from a start near the answer. */
function solveMonotone(f, target, start) {
    let x = start;
    for (let step = 0; step < NEWTON_STEPS; step += 1) {
        const { value, slope } = f(x);
        const miss = value - target;
        if (Math.abs(miss) < RAKE_TOLERANCE / 10 || slope <= 0)
            break;
        // A Newton step is bounded so a flat tail cannot throw it past the answer.
        x -= Math.max(-4, Math.min(4, miss / slope));
    }
    return x;
}
function weightedLogistic(terms, total) {
    return (x) => {
        let value = 0;
        let slope = 0;
        for (const term of terms) {
            const p = logistic(x + term.logit);
            value += term.weight * p;
            slope += term.weight * p * (1 - p);
        }
        return { value: value / total, slope: slope / total };
    };
}
/** Group g's people across the country, as the states' own mixes add up. */
function groupPeople(problem) {
    return problem.groups.map((_, g) => problem.rows.reduce((sum, row, s) => sum + row.people * problem.mix[s][g], 0));
}
/**
 * The national figures moved by one shared log-odds offset so they average,
 * over the people, to the same figure the states do. The two margins are read
 * by different rules (each group through its own lens, the states through the
 * map) and need not agree to the thousandth; raking cannot meet two margins
 * whose totals differ, so the gap is closed on the groups' side, where it moves
 * every group of the axis alike and keeps the order and spacing between them.
 */
function reconciledNational(problem, people) {
    const total = people.reduce((sum, value) => sum + value, 0);
    const statesMean = problem.rows.reduce((sum, row) => sum + row.people * row.approval, 0) / total;
    const terms = problem.national.map((value, g) => ({ weight: people[g], logit: logit(value) }));
    const offset = solveMonotone(weightedLogistic(terms, total), statesMean, 0);
    return { targets: problem.national.map((value) => logistic(logit(value) + offset)), offset };
}
function rakeStates(problem, fit) {
    problem.rows.forEach((row, s) => {
        const terms = problem.groups.map((_, g) => ({ weight: problem.mix[s][g], logit: fit.a[g] + problem.prior[s][g] }));
        const total = terms.reduce((sum, term) => sum + term.weight, 0);
        fit.b[s] = solveMonotone(weightedLogistic(terms, total), row.approval, fit.b[s]);
    });
}
function rakeGroups(problem, fit, targets, people) {
    problem.groups.forEach((_, g) => {
        const terms = problem.rows.map((row, s) => ({ weight: row.people * problem.mix[s][g], logit: fit.b[s] + problem.prior[s][g] }));
        if (people[g] <= 0)
            return;
        fit.a[g] = solveMonotone(weightedLogistic(terms, people[g]), targets[g], fit.a[g]);
    });
}
function cellShare(problem, fit, s, g) {
    return logistic(fit.a[g] + fit.b[s] + problem.prior[s][g]);
}
/** The largest miss on either margin, in share. */
function marginResiduals(problem, fit, targets, people) {
    const state = problem.rows.reduce((worst, row, s) => {
        const mass = problem.groups.reduce((sum, _, g) => sum + problem.mix[s][g], 0);
        const mean = problem.groups.reduce((sum, _, g) => sum + problem.mix[s][g] * cellShare(problem, fit, s, g), 0) / mass;
        return Math.max(worst, Math.abs(mean - row.approval));
    }, 0);
    const national = problem.groups.reduce((worst, _, g) => {
        if (people[g] <= 0)
            return worst;
        const mean = problem.rows.reduce((sum, row, s) => sum + row.people * problem.mix[s][g] * cellShare(problem, fit, s, g), 0) / people[g];
        return Math.max(worst, Math.abs(mean - targets[g]));
    }, 0);
    return { state, national };
}
function rakeAxis(problem) {
    const people = groupPeople(problem);
    const { targets, offset } = reconciledNational(problem, people);
    const fit = { a: targets.map((value) => logit(value)), b: problem.rows.map(() => 0), sweeps: 0 };
    let residuals = { state: 1, national: 1 };
    while (fit.sweeps < RAKE_MAX_SWEEPS) {
        rakeStates(problem, fit);
        rakeGroups(problem, fit, targets, people);
        fit.sweeps += 1;
        residuals = marginResiduals(problem, fit, targets, people);
        if (residuals.state < RAKE_TOLERANCE && residuals.national < RAKE_TOLERANCE)
            break;
    }
    const support = Object.fromEntries(problem.rows.map((row, s) => [row.state, Object.fromEntries(problem.groups.map((group, g) => [group, cellShare(problem, fit, s, g)]))]));
    const national = Object.fromEntries(problem.groups.map((group, g) => [group, problem.national[g]]));
    return { axis: problem.axis, support, national, reconciliation: offset, residuals, sweeps: fit.sweeps };
}
// Campaigns are immutable values, so a reading keyed on the object itself can
// never go stale: a new week is a new object.
const memo = new WeakMap();
/** Support for the administration by state and group, every axis. Derived each read; memoized per campaign value. */
export function stateCohortOpinion(campaign) {
    const cached = memo.get(campaign);
    if (cached)
        return cached;
    const rows = contextRows(campaign);
    const beta = cohortSensitivity(campaign);
    const axes = Object.fromEntries(COHORT_AXES.map((axis) => [axis, rakeAxis(axisProblem(campaign, axis, rows, beta))]));
    const reading = { axes };
    memo.set(campaign, reading);
    return reading;
}
/** One group's support in one state, or undefined where the campaign carries no such state. */
export function stateCohortSupport(campaign, state, cohort) {
    return stateCohortOpinion(campaign).axes[COHORT_AXIS[cohort]].support[state]?.[cohort];
}
